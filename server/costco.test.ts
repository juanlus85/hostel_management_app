import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName, type SQL } from "drizzle-orm";
import { MySqlDialect } from "drizzle-orm/mysql-core";
import { COSTCO_CATALOG } from "../shared/costcoCatalog";
import {
  DEFAULT_COSTCO_ORDER,
  calculateCostcoOrderItem,
  calculateCostcoOrderTotal,
  calculateCostcoTotalExpected,
} from "../shared/costcoOrders";
import { costcoOrderCopy, costcoOrderCsv } from "../shared/costcoOrderExport";
import { costcoRouter } from "./costcoRouter";
import { COSTCO_SETTING_PREFIX, costcoSettingKey } from "./costcoStore";
import { getDb } from "./db";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", () => ({ getDb: vi.fn() }));

const dialect = new MySqlDialect();
type MemorySetting = { settingKey: string; settingValue: string | null };
type MemoryProduct = {
  id: number;
  handle: string | null;
  name: string;
  inStock: string;
  createdAt: Date;
};
type Selection = Record<string, { name: string }> | undefined;

/** Mock de las primitivas Drizzle usadas; los filtros se compilan con el dialecto MySQL real. */
function memoryDatabase() {
  const settings = new Map<string, MemorySetting>();
  let products: MemoryProduct[] = [];
  const queries: {
    table: string;
    params: unknown[];
    columns: string[];
    locked: boolean;
  }[] = [];
  const writes: string[] = [];
  let failSelect = false;
  let failUpdate = false;
  let beforeInsert: (() => void) | undefined;
  let transactionTail = Promise.resolve();

  function select(selection?: Selection) {
    let table = "";
    let params: unknown[] = [];
    let max = Infinity;
    let locked = false;
    const query = {
      from(target: Parameters<typeof getTableName>[0]) {
        table = getTableName(target);
        return query;
      },
      where(condition: SQL) {
        params = dialect.sqlToQuery(condition).params;
        return query;
      },
      limit(limit: number) {
        max = limit;
        return query;
      },
      orderBy() {
        return query;
      },
      for(mode: string) {
        expect(mode).toBe("update");
        locked = true;
        return query;
      },
      then(
        resolve: (value: unknown[]) => unknown,
        reject: (error: unknown) => unknown
      ) {
        return Promise.resolve()
          .then(() => {
            if (failSelect) throw new Error("Connection lost");
            queries.push({
              table,
              params,
              columns: Object.keys(selection ?? {}),
              locked,
            });
            let rows: Record<string, unknown>[] =
              table === "app_settings" ? [...settings.values()] : products;
            if (table === "app_settings" && params.length)
              rows = rows.filter(row => params.includes(row.settingKey));
            if (table === "inventory_products" && params.length)
              rows = rows.filter(row => params.includes(row.id));
            return rows
              .slice(0, max)
              .map(row =>
                selection
                  ? Object.fromEntries(
                      Object.entries(selection).map(([key, column]) => [
                        key,
                        row[column.name],
                      ])
                    )
                  : row
              );
          })
          .then(resolve, reject);
      },
    };
    return query;
  }

  const db = {
    select,
    insert(target: Parameters<typeof getTableName>[0]) {
      expect(getTableName(target)).toBe("app_settings");
      return {
        values(values: MemorySetting[]) {
          return {
            async onDuplicateKeyUpdate({ set }: { set: Record<string, SQL> }) {
              // Inicialización debe usar no-op, nunca escribir settingValue en duplicado.
              expect(Object.keys(set)).toEqual(["settingKey"]);
              expect(dialect.sqlToQuery(set.settingKey).sql).toContain(
                "settingKey"
              );
              beforeInsert?.();
              for (const row of values) {
                writes.push("insert app_settings");
                if (!settings.has(row.settingKey))
                  settings.set(row.settingKey, { ...row });
              }
              return [{ affectedRows: values.length }];
            },
          };
        },
      };
    },
    update(target: Parameters<typeof getTableName>[0]) {
      expect(getTableName(target)).toBe("app_settings");
      return {
        set(values: { settingValue: string }) {
          return {
            async where(condition: SQL) {
              if (failUpdate) throw new Error("MySQL write failed");
              const [key] = dialect.sqlToQuery(condition).params;
              const row = settings.get(String(key));
              if (!row) throw new Error("Missing setting");
              settings.set(String(key), {
                ...row,
                settingValue: values.settingValue,
              });
              writes.push("update app_settings");
              return [{ affectedRows: 1 }];
            },
          };
        },
      };
    },
    async transaction<T>(work: (tx: typeof db) => Promise<T>): Promise<T> {
      const previous = transactionTail;
      let release!: () => void;
      transactionTail = new Promise<void>(resolve => {
        release = resolve;
      });
      await previous;
      const backup = new Map(
        [...settings.entries()].map(([key, value]) => [key, { ...value }])
      );
      try {
        return await work(db);
      } catch (error) {
        settings.clear();
        for (const [key, value] of backup) settings.set(key, value);
        throw error;
      } finally {
        release();
      }
    },
  };
  return {
    db,
    settings,
    queries,
    writes,
    setProducts(value: MemoryProduct[]) {
      products = value;
    },
    failReads() {
      failSelect = true;
    },
    failWrites() {
      failUpdate = true;
    },
    onBeforeInsert(work: () => void) {
      beforeInsert = work;
    },
  };
}

function caller(role: string | null = "admin") {
  const ctx = {
    user:
      role === null
        ? null
        : {
            id: 1,
            openId: "costco-test",
            email: "admin@example.test",
            name: "Costco admin",
            role,
            loginMethod: "test",
            createdAt: new Date(),
            updatedAt: new Date(),
            lastSignedIn: new Date(),
          },
    req: { headers: {}, protocol: "https" },
    res: {},
  } as TrpcContext;
  return costcoRouter.createCaller(ctx);
}
const product = (overrides: Partial<MemoryProduct> = {}): MemoryProduct => ({
  id: 7,
  handle: "stable-water",
  name: "Agua inventario",
  inStock: "12.500",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  ...overrides,
});
let memory: ReturnType<typeof memoryDatabase>;
beforeEach(() => {
  vi.clearAllMocks();
  memory = memoryDatabase();
  vi.mocked(getDb).mockResolvedValue(
    memory.db as unknown as NonNullable<Awaited<ReturnType<typeof getDb>>>
  );
});

const allCalls = (api: ReturnType<typeof caller>) => [
  () => api.list(),
  () => api.order(),
  () => api.setBinding({ id: "costco-08", inventoryProductId: null }),
  () => api.setOrderItem({ id: "costco-08", quantity: 2 }),
  () => api.addOrderItem({ id: "costco-05" }),
  () => api.removeOrderItem({ id: "costco-08" }),
  () => api.resetOrder(),
];

describe("Costco permissions", () => {
  it.each([null, "user", "tablet", "housekeeping", "maintenance"])(
    "denies all procedures for %s before touching DB",
    async role => {
      for (const call of allCalls(caller(role))) {
        await expect(call()).rejects.toMatchObject({
          code: role === null ? "UNAUTHORIZED" : "FORBIDDEN",
        });
      }
      expect(getDb).not.toHaveBeenCalled();
    }
  );
  it("registers trpc.costco on the application router", async () => {
    const { appRouter } = await import("./routers");
    expect(appRouter._def.record.costco).toBeDefined();
  });
});

describe("Costco MySQL persistence", () => {
  it("seeds the exact 31 independent rows and keeps duplicate Costco codes separate", async () => {
    const result = await caller().list();
    expect(result).toEqual(
      COSTCO_CATALOG.map(item => ({
        ...item,
        inventoryProductId: null,
        inventoryProductName: null,
        inventoryStock: null,
        bindingMissing: false,
      }))
    );
    expect(memory.settings.size).toBe(31);
    expect([...memory.settings.keys()].every(key => key.length <= 100)).toBe(
      true
    );
    expect(
      result.filter(row => row.costcoCode === "1008215").map(row => row.id)
    ).toEqual(["costco-06", "costco-17"]);
    expect(
      JSON.parse(
        memory.settings.get(costcoSettingKey("costco-06"))!.settingValue!
      ).catalog.cost
    ).toBe("5.99");
    expect(
      JSON.parse(
        memory.settings.get(costcoSettingKey("costco-17"))!.settingValue!
      ).catalog.cost
    ).toBe("4.49");
  });
  it("seeds exact 13 order defaults in order with no inferred package sizes", async () => {
    const rows = await caller().order();
    expect(
      rows.map(({ id, quantity, unitsPerPackage }) => ({
        id,
        quantity,
        unitsPerPackage,
      }))
    ).toEqual(DEFAULT_COSTCO_ORDER);
    expect(
      rows.every(
        row => row.totalExpected === null && row.inventoryStock === null
      )
    ).toBe(true);
    expect(calculateCostcoOrderTotal(rows)).toBe("296.89");
  });
  it("saves/reloads binding and field changes through a new caller without overwriting existing catalog", async () => {
    memory.setProducts([product()]);
    await caller().setBinding({ id: "costco-08", inventoryProductId: 7 });
    await caller().setOrderItem({ id: "costco-08", quantity: 9 });
    await caller().setOrderItem({ id: "costco-08", unitsPerPackage: 8 });
    const key = costcoSettingKey("costco-08");
    const persisted = JSON.parse(memory.settings.get(key)!.settingValue!);
    persisted.catalog.name = "Nombre persistido";
    memory.settings.set(key, {
      settingKey: key,
      settingValue: JSON.stringify(persisted),
    });
    const row = (await caller().order()).find(item => item.id === "costco-08")!;
    expect(row).toMatchObject({
      name: "Nombre persistido",
      inventoryProductId: 7,
      inventoryProductName: "Agua inventario",
      inventoryStock: "12.500",
      quantity: 9,
      unitsPerPackage: 8,
      totalExpected: "84.500",
      totalCost: "44.91",
      bindingMissing: false,
    });
    expect(Object.keys(row).sort()).toEqual(
      [
        "id",
        "name",
        "costcoCode",
        "cost",
        "inventoryProductId",
        "inventoryProductName",
        "inventoryStock",
        "bindingMissing",
        "quantity",
        "unitsPerPackage",
        "totalExpected",
        "totalCost",
      ].sort()
    );
  });
  it("initializes missing keys without overwriting any existing or concurrently inserted setting", async () => {
    await caller().setOrderItem({ id: "costco-08", quantity: 8 });
    const key = costcoSettingKey("costco-08");
    const original = memory.settings.get(key)!;
    const missingKey = costcoSettingKey("costco-09");
    const missing = JSON.parse(memory.settings.get(missingKey)!.settingValue!);
    missing.order.quantity = 77;
    memory.settings.delete(missingKey);
    memory.onBeforeInsert(() =>
      memory.settings.set(missingKey, {
        settingKey: missingKey,
        settingValue: JSON.stringify(missing),
      })
    );
    const rows = await caller().order();
    expect(memory.settings.get(key)).toEqual(original);
    expect(rows.find(row => row.id === "costco-09")!.quantity).toBe(77);
  });
  it("reads only exact Costco keys, returns no unrelated settings or secrets and never writes inventory", async () => {
    memory.settings.set("smtp_password", {
      settingKey: "smtp_password",
      settingValue: "PRIVATE-SMTP",
    });
    memory.settings.set(`${COSTCO_SETTING_PREFIX}evil`, {
      settingKey: `${COSTCO_SETTING_PREFIX}evil`,
      settingValue: "PRIVATE-UNKNOWN-KEY",
    });
    await caller().setOrderItem({ id: "costco-08", quantity: 2 });
    const result = await caller().list();
    expect(JSON.stringify(result)).not.toMatch(
      /PRIVATE-|settingKey|settingValue|inventoryProductHandle/
    );
    for (const query of memory.queries.filter(
      query => query.table === "app_settings"
    )) {
      expect(query.params.length).toBeGreaterThan(0);
      expect(
        query.params.every(param =>
          COSTCO_CATALOG.some(row => costcoSettingKey(row.id) === param)
        )
      ).toBe(true);
    }
    expect(memory.writes.every(write => write.endsWith("app_settings"))).toBe(
      true
    );
    expect(memory.settings.get("smtp_password")!.settingValue).toBe(
      "PRIVATE-SMTP"
    );
  });
  it("keeps quantity 0 in template while copy and CSV omit it and every internal field", async () => {
    memory.setProducts([product()]);
    await caller().setBinding({ id: "costco-08", inventoryProductId: 7 });
    await caller().setOrderItem({ id: "costco-08", quantity: 0 });
    const rows = await caller().order();
    const zeroRow = rows.find(row => row.id === "costco-08")!;
    expect(zeroRow).toMatchObject({
      quantity: 0,
      unitsPerPackage: 40,
      totalCost: "0.00",
      totalExpected: "12.500",
    });
    for (const exported of [costcoOrderCopy(rows), costcoOrderCsv(rows)]) {
      expect(exported).not.toContain(zeroRow.name);
      expect(exported).not.toContain(zeroRow.costcoCode);
      expect(exported).not.toMatch(
        /costco-\d|Agua inventario|12\.500|Total previsto|Unidades\/paquete/
      );
      expect(exported).toContain("1224834");
    }
  });
  it("adds/removes independent rows and reset clears quantities while preserving template and bindings", async () => {
    memory.setProducts([product()]);
    await caller().setBinding({ id: "costco-05", inventoryProductId: 7 });
    expect(await caller().addOrderItem({ id: "costco-05" })).toEqual({
      success: true,
    });
    expect(
      (await caller().order()).find(row => row.id === "costco-05")?.quantity
    ).toBe(0);
    await caller().setOrderItem({
      id: "costco-05",
      quantity: 2,
      unitsPerPackage: 18,
    });
    let rows = await caller().order();
    expect(rows.at(-1)).toMatchObject({
      id: "costco-05",
      quantity: 2,
      unitsPerPackage: 18,
    });
    await caller().removeOrderItem({ id: "costco-08" });
    expect((await caller().order()).some(row => row.id === "costco-08")).toBe(
      false
    );
    const beforeReset = await caller().order();
    await caller().resetOrder();
    rows = await caller().order();
    expect(
      rows.map(({ id, quantity, unitsPerPackage }) => ({
        id,
        quantity,
        unitsPerPackage,
      }))
    ).toEqual(
      beforeReset.map(({ id, unitsPerPackage }) => ({
        id,
        quantity: 0,
        unitsPerPackage,
      }))
    );
    expect(rows.some(row => row.id === "costco-08")).toBe(false);
    expect(rows.find(row => row.id === "costco-05")?.unitsPerPackage).toBe(18);
    expect(
      (await caller().list()).find(row => row.id === "costco-05")
    ).toMatchObject({ inventoryProductId: 7, inventoryStock: "12.500" });
  });
  it("saving quantity and units concurrently patches only supplied fields under SQL row locks", async () => {
    await caller().order();
    memory.queries.length = 0;
    await Promise.all([
      caller().setOrderItem({ id: "costco-08", quantity: 6 }),
      caller().setOrderItem({ id: "costco-08", unitsPerPackage: 17 }),
    ]);
    expect(
      (await caller().order()).find(row => row.id === "costco-08")
    ).toMatchObject({ quantity: 6, unitsPerPackage: 17 });
    expect(
      memory.queries.filter(
        query =>
          query.locked && query.params[0] === costcoSettingKey("costco-08")
      )
    ).toHaveLength(2);
  });
  it("saving a binding concurrently with quantity preserves both", async () => {
    memory.setProducts([product()]);
    await caller().order();
    await Promise.all([
      caller().setBinding({ id: "costco-08", inventoryProductId: 7 }),
      caller().setOrderItem({ id: "costco-08", quantity: 33 }),
    ]);
    expect(
      (await caller().order()).find(row => row.id === "costco-08")
    ).toMatchObject({ quantity: 33, inventoryProductId: 7 });
  });
});

describe("Costco live inventory identity", () => {
  it("refreshes stock on every read and distinguishes unlinked, zero and negative stock", async () => {
    memory.setProducts([product()]);
    await caller().setBinding({ id: "costco-08", inventoryProductId: 7 });
    expect((await caller().order())[0]).toMatchObject({
      inventoryStock: "12.500",
      totalExpected: "612.500",
    });
    memory.setProducts([product({ inStock: "0.000" })]);
    expect((await caller().order())[0]).toMatchObject({
      inventoryStock: "0.000",
      totalExpected: "600.000",
      bindingMissing: false,
    });
    memory.setProducts([product({ inStock: "-3.125" })]);
    expect((await caller().order())[0]).toMatchObject({
      inventoryStock: "-3.125",
      totalExpected: "596.875",
    });
    await caller().setBinding({ id: "costco-08", inventoryProductId: null });
    expect((await caller().order())[0]).toMatchObject({
      inventoryProductId: null,
      inventoryProductName: null,
      inventoryStock: null,
      totalExpected: null,
      bindingMissing: false,
    });
  });
  it("prefers the stable handle after CSV changes IDs instead of binding to reused IDs", async () => {
    memory.setProducts([product()]);
    await caller().setBinding({ id: "costco-08", inventoryProductId: 7 });
    memory.setProducts([
      product({
        id: 7,
        handle: "other-product",
        name: "Producto incorrecto",
        inStock: "999.000",
      }),
      product({ id: 55, inStock: "30.250" }),
    ]);
    expect((await caller().order())[0]).toMatchObject({
      inventoryProductId: 55,
      inventoryProductName: "Agua inventario",
      inventoryStock: "30.250",
      totalExpected: "630.250",
      bindingMissing: false,
    });
  });
  it("marks deleted or missing-handle inventory unknown, never falsely zero or arbitrarily reused", async () => {
    memory.setProducts([product()]);
    await caller().setBinding({ id: "costco-08", inventoryProductId: 7 });
    memory.setProducts([]);
    expect((await caller().order())[0]).toMatchObject({
      inventoryProductId: 7,
      inventoryProductName: "Agua inventario",
      inventoryStock: null,
      totalExpected: null,
      bindingMissing: true,
    });
    memory.setProducts([product({ handle: "other" })]);
    expect((await caller().order())[0]).toMatchObject({
      inventoryStock: null,
      bindingMissing: true,
    });
  });
  it("does not guess a new product when a product with no handle is replaced", async () => {
    memory.setProducts([product({ handle: null })]);
    await caller().setBinding({ id: "costco-08", inventoryProductId: 7 });
    expect((await caller().order())[0].bindingMissing).toBe(false);
    memory.setProducts([
      product({
        handle: null,
        createdAt: new Date("2026-02-01"),
        inStock: "999.000",
      }),
    ]);
    expect((await caller().order())[0]).toMatchObject({
      inventoryStock: null,
      bindingMissing: true,
    });
    memory.setProducts([product({ id: 99, handle: null })]);
    expect((await caller().order())[0].bindingMissing).toBe(true);
  });
});

describe("Costco input and DB failures", () => {
  it("rejects unknown catalog IDs and nonexistent inventory IDs without changing binding", async () => {
    await expect(
      caller().setBinding({ id: "1008215", inventoryProductId: null })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller().addOrderItem({ id: "costco-99" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(getDb).not.toHaveBeenCalled();
    await expect(
      caller().setBinding({ id: "costco-08", inventoryProductId: 999 })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect((await caller().list())[7].inventoryProductId).toBeNull();
  });
  it.each([
    { quantity: -1 },
    { quantity: 1.5 },
    { quantity: 100001 },
    { quantity: Infinity },
    { unitsPerPackage: 0 },
    { unitsPerPackage: 2.5 },
    { unitsPerPackage: 100001 },
  ])("rejects invalid order field %j before DB access", async fields => {
    await expect(
      caller().setOrderItem({ id: "costco-08", ...fields })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(getDb).not.toHaveBeenCalled();
  });
  it("supports zero quantity and the maximum valid limits", async () => {
    await caller().setOrderItem({
      id: "costco-08",
      quantity: 100000,
      unitsPerPackage: 100000,
    });
    expect((await caller().order())[0]).toMatchObject({
      quantity: 100000,
      unitsPerPackage: 100000,
      totalCost: "499000.00",
    });
    await caller().setOrderItem({ id: "costco-08", quantity: 0 });
    expect((await caller().order())[0].totalCost).toBe("0.00");
  });
  it("does not silently fallback or report mutation success when getDb is absent", async () => {
    vi.mocked(getDb).mockResolvedValue(null);
    for (const call of allCalls(caller()))
      await expect(call()).rejects.toMatchObject({
        code: "INTERNAL_SERVER_ERROR",
      });
  });
  it("propagates read failures and rolls back failed mutations", async () => {
    await caller().order();
    const original = memory.settings.get(costcoSettingKey("costco-08"))!;
    memory.failWrites();
    await expect(
      caller().setOrderItem({ id: "costco-08", quantity: 12 })
    ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
    expect(memory.settings.get(costcoSettingKey("costco-08"))).toEqual(
      original
    );
    memory.failReads();
    await expect(caller().list()).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
    });
    await expect(caller().order()).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
    });
  });
  it("never overwrites a malformed persisted row with defaults", async () => {
    await caller().list();
    const key = costcoSettingKey("costco-08");
    memory.settings.set(key, { settingKey: key, settingValue: "broken-json" });
    await expect(caller().order()).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
    });
    await expect(
      caller().setOrderItem({ id: "costco-08", quantity: 2 })
    ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
    expect(memory.settings.get(key)!.settingValue).toBe("broken-json");
  });
});

describe("Costco exact pure calculations", () => {
  it("multiplies package price by quantity, not by package units, in exact cents", () => {
    expect(
      calculateCostcoOrderItem({
        cost: "4.99",
        inventoryStock: "0.001",
        quantity: 15,
        unitsPerPackage: 40,
      })
    ).toEqual({ totalCost: "74.85", totalExpected: "600.001" });
    expect(
      calculateCostcoOrderItem({
        cost: "0.10",
        inventoryStock: null,
        quantity: 3,
        unitsPerPackage: 100,
      })
    ).toEqual({ totalCost: "0.30", totalExpected: null });
    expect(
      calculateCostcoOrderTotal([
        { cost: "0.10", quantity: 3 },
        { cost: "0.20", quantity: 1 },
      ])
    ).toBe("0.50");
    expect(calculateCostcoOrderTotal([])).toBe("0.00");
    expect(calculateCostcoTotalExpected("9999999.999", 100000, 100000)).toBe(
      "10009999999.999"
    );
  });
  it("rejects invalid pure helper inputs rather than producing NaN", () => {
    expect(() =>
      calculateCostcoOrderItem({
        cost: "0.999",
        inventoryStock: null,
        quantity: 1,
        unitsPerPackage: 1,
      })
    ).toThrow();
    expect(() =>
      calculateCostcoOrderItem({
        cost: "1.00",
        inventoryStock: "bad",
        quantity: 1,
        unitsPerPackage: 1,
      })
    ).toThrow();
    expect(() =>
      calculateCostcoOrderTotal([{ cost: "1.00", quantity: 1.1 }])
    ).toThrow();
  });
});

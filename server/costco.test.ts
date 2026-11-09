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
import {
  COSTCO_SETTING_PREFIX,
  costcoSettingKey,
  validateCostcoId,
} from "./costcoStore";
import { getDb } from "./db";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", () => ({ getDb: vi.fn() }));

const dialect = new MySqlDialect();
type MemorySetting = {
  id?: number;
  settingKey: string;
  settingValue: string | null;
};
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
    sql: string;
    params: unknown[];
    columns: string[];
    locked: boolean;
  }[] = [];
  const writes: string[] = [];
  let nextSettingId = 1;
  let failSelect = false;
  let failUpdate = false;
  let beforeInsert: (() => void) | undefined;
  let transactionTail = Promise.resolve();

  function select(selection?: Selection) {
    let table = "";
    let querySql = "";
    let params: unknown[] = [];
    let max = Infinity;
    let locked = false;
    let orderColumn: string | undefined;
    const query = {
      from(target: Parameters<typeof getTableName>[0]) {
        table = getTableName(target);
        return query;
      },
      where(condition: SQL) {
        const compiled = dialect.sqlToQuery(condition);
        params = compiled.params;
        querySql = compiled.sql;
        return query;
      },
      limit(limit: number) {
        max = limit;
        return query;
      },
      orderBy(column: { name: string }) {
        orderColumn = column.name;
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
              sql: querySql,
              params,
              columns: Object.keys(selection ?? {}),
              locked,
            });
            let rows: Record<string, unknown>[] =
              table === "app_settings" ? [...settings.values()] : products;
            if (table === "app_settings" && params.length) {
              if (/\blike\b/i.test(querySql)) {
                expect(querySql).toMatch(/\bREGEXP\b/);
                expect(params).toHaveLength(2);
                const prefix = String(params[0]).replace(/%$/, "");
                const pattern = new RegExp(String(params[1]));
                rows = rows.filter(
                  row =>
                    String(row.settingKey).startsWith(prefix) &&
                    pattern.test(String(row.settingKey))
                );
              } else {
                rows = rows.filter(row => params.includes(row.settingKey));
              }
            }
            if (table === "inventory_products" && params.length)
              rows = rows.filter(row => params.includes(row.id));
            if (orderColumn) {
              const column = orderColumn;
              rows.sort((a, b) =>
                column === "id"
                  ? Number(a.id ?? 0) - Number(b.id ?? 0)
                  : String(a[column]).localeCompare(String(b[column]))
              );
            }
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
        values(value: MemorySetting | MemorySetting[]) {
          const values = Array.isArray(value) ? value : [value];
          const execute = async (ignoreDuplicate: boolean) => {
            if (failUpdate) throw new Error("MySQL write failed");
            beforeInsert?.();
            for (const row of values) {
              if (settings.has(row.settingKey)) {
                if (!ignoreDuplicate) throw new Error("Duplicate key");
              } else {
                settings.set(row.settingKey, { ...row, id: nextSettingId++ });
                writes.push("insert app_settings");
              }
            }
            return [{ affectedRows: values.length }];
          };
          return {
            then(
              resolve: (value: unknown[]) => unknown,
              reject: (error: unknown) => unknown
            ) {
              return execute(false).then(resolve, reject);
            },
            async onDuplicateKeyUpdate({ set }: { set: Record<string, SQL> }) {
              // Inicialización debe usar no-op, nunca escribir settingValue en duplicado.
              expect(Object.keys(set)).toEqual(["settingKey"]);
              expect(dialect.sqlToQuery(set.settingKey).sql).toContain(
                "settingKey"
              );
              return execute(true);
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
  () => api.create({ name: "Artículo", costcoCode: "123", cost: "1.00" }),
  () =>
    api.update({
      id: "costco-08",
      name: "Agua",
      costcoCode: "123",
      cost: "1.00",
    }),
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
  it("reads only the closed Costco prefix/pattern, returns no secrets and never writes inventory", async () => {
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
      if (/\blike\b/i.test(query.sql)) {
        expect(query.params[0]).toBe(`${COSTCO_SETTING_PREFIX}%`);
        expect(query.sql).toMatch(/\bREGEXP\b/);
        const pattern = new RegExp(String(query.params[1]));
        expect(pattern.test(`${COSTCO_SETTING_PREFIX}evil`)).toBe(false);
        expect(pattern.test("smtp_password")).toBe(false);
        expect(pattern.test(costcoSettingKey("costco-99"))).toBe(false);
      } else {
        expect(query.params).toHaveLength(1);
        expect(query.params[0]).toBe(costcoSettingKey("costco-08"));
      }
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

describe("Costco dynamic catalog", () => {
  const input = { name: "Artículo nuevo", costcoCode: "1008215", cost: "2.5" };
  const unknownId = "costco-custom-00000000-0000-4000-8000-000000000000";
  const savedRow = (id: string) =>
    JSON.parse(memory.settings.get(costcoSettingKey(id))!.settingValue!);

  it("creates a UUID row with normalized fields and empty order/binding, then reloads it", async () => {
    const created = await caller().create({
      name: "  Artículo nuevo  ",
      costcoCode: "  1008215  ",
      cost: "2.5",
    });
    expect(created).toMatchObject({ success: true });
    expect(created.id).toMatch(
      /^costco-custom-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
    expect(() => validateCostcoId(created.id)).not.toThrow();
    expect(costcoSettingKey(created.id).length).toBeLessThanOrEqual(100);
    expect(savedRow(created.id)).toEqual({
      version: 1,
      catalog: { id: created.id, ...input, cost: "2.50" },
      binding: {
        inventoryProductId: null,
        inventoryProductHandle: null,
        inventoryProductName: null,
        inventoryProductCreatedAt: null,
      },
      order: { included: false, quantity: 0, unitsPerPackage: 1, position: 0 },
    });
    const rows = await caller().list();
    expect(rows).toHaveLength(32);
    expect(rows.at(-1)).toMatchObject({
      id: created.id,
      name: input.name,
      costcoCode: input.costcoCode,
      cost: "2.50",
      inventoryProductId: null,
      inventoryStock: null,
      bindingMissing: false,
    });
    expect((await caller().order()).some(row => row.id === created.id)).toBe(
      false
    );
  });

  it("persists seed edits across new callers and missing-seed initialization without changing binding/order", async () => {
    memory.setProducts([product()]);
    await caller().setBinding({ id: "costco-08", inventoryProductId: 7 });
    await caller().setOrderItem({
      id: "costco-08",
      quantity: 3,
      unitsPerPackage: 8,
    });
    const before = savedRow("costco-08");
    expect(
      await caller().update({
        id: "costco-08",
        name: "  Agua editada  ",
        costcoCode: "  NUEVO  ",
        cost: "9",
      })
    ).toEqual({ success: true });
    expect(savedRow("costco-08")).toEqual({
      ...before,
      catalog: {
        id: "costco-08",
        name: "Agua editada",
        costcoCode: "NUEVO",
        cost: "9.00",
      },
    });
    memory.settings.delete(costcoSettingKey("costco-09"));
    const rows = await caller().list();
    expect(rows.map(row => row.id)).toEqual(COSTCO_CATALOG.map(row => row.id));
    expect(rows[7]).toMatchObject({
      name: "Agua editada",
      costcoCode: "NUEVO",
      cost: "9.00",
    });
    expect(savedRow("costco-09").catalog).toEqual(COSTCO_CATALOG[8]);
    expect(savedRow("costco-08").binding).toEqual(before.binding);
    expect(savedRow("costco-08").order).toEqual(before.order);
    expect(
      (await caller().order()).find(row => row.id === "costco-08")
    ).toMatchObject({
      cost: "9.00",
      quantity: 3,
      unitsPerPackage: 8,
      totalCost: calculateCostcoOrderTotal([{ cost: "9.00", quantity: 3 }]),
    });
    expect(COSTCO_CATALOG[7].cost).toBe("4.99");
  });

  it("keeps seed order followed by stable custom creation order despite edits and order positions", async () => {
    const first = await caller().create({ ...input, name: "Zulu" });
    const second = await caller().create({ ...input, name: "Alpha" });
    const third = await caller().create({ ...input, name: "Medio" });
    await caller().addOrderItem({ id: third.id });
    await caller().update({ ...input, id: first.id, name: "Último nombre" });
    memory.settings.delete(costcoSettingKey("costco-01"));
    expect((await caller().list()).map(row => row.id)).toEqual([
      ...COSTCO_CATALOG.map(row => row.id),
      first.id,
      second.id,
      third.id,
    ]);
    expect(savedRow(first.id).order.included).toBe(false);
    expect(savedRow(third.id).order.included).toBe(true);
  });

  it("adds custom items to orders and refreshes edited names/codes/prices and totals while retaining quantities/binding", async () => {
    memory.setProducts([product()]);
    const { id } = await caller().create(input);
    await caller().setBinding({ id, inventoryProductId: 7 });
    await caller().addOrderItem({ id });
    await caller().setOrderItem({ id, quantity: 3, unitsPerPackage: 8 });
    const before = savedRow(id);
    const oldOrders = await caller().order();
    await caller().update({
      id,
      name: "Producto editado",
      costcoCode: "EDITADO",
      cost: "3.99",
    });
    const persisted = savedRow(id);
    expect(persisted.binding).toEqual(before.binding);
    expect(persisted.order).toEqual(before.order);
    expect((await caller().list()).find(row => row.id === id)).toMatchObject({
      name: "Producto editado",
      costcoCode: "EDITADO",
      cost: "3.99",
      inventoryProductId: 7,
    });
    const rows = await caller().order();
    expect(rows.find(row => row.id === id)).toMatchObject({
      name: "Producto editado",
      costcoCode: "EDITADO",
      cost: "3.99",
      quantity: 3,
      unitsPerPackage: 8,
      inventoryProductId: 7,
      inventoryStock: "12.500",
      totalCost: calculateCostcoOrderTotal([{ cost: "3.99", quantity: 3 }]),
      totalExpected: calculateCostcoTotalExpected("12.500", 3, 8),
    });
    expect(calculateCostcoOrderTotal(rows)).not.toBe(
      calculateCostcoOrderTotal(oldOrders)
    );
    for (const exported of [costcoOrderCopy(rows), costcoOrderCsv(rows)]) {
      expect(exported).toContain("Producto editado");
      expect(exported).toContain("EDITADO");
      expect(exported).not.toContain("Artículo nuevo");
    }
  });

  it("intentionally allows duplicate codes for distinct custom and seeded IDs", async () => {
    const first = await caller().create(input);
    const second = await caller().create(input);
    expect(first.id).not.toBe(second.id);
    await caller().update({ id: second.id, ...input, name: "Otro formato" });
    const rows = await caller().list();
    expect(
      rows.filter(row => row.costcoCode === input.costcoCode).map(row => row.id)
    ).toEqual(["costco-06", "costco-17", first.id, second.id]);
    expect(rows.find(row => row.id === first.id)!.name).toBe(input.name);
    expect(rows.find(row => row.id === second.id)!.name).toBe("Otro formato");
  });

  it("clears custom bindings and resets quantities on included/excluded custom rows without changing other fields", async () => {
    memory.setProducts([product()]);
    const included = await caller().create(input);
    const excluded = await caller().create(input);
    await caller().setBinding({ id: included.id, inventoryProductId: 7 });
    await caller().setBinding({ id: excluded.id, inventoryProductId: 7 });
    await caller().addOrderItem({ id: included.id });
    await caller().setOrderItem({
      id: included.id,
      quantity: 5,
      unitsPerPackage: 9,
    });
    await caller().setOrderItem({
      id: excluded.id,
      quantity: 7,
      unitsPerPackage: 11,
    });
    const before = [savedRow(included.id), savedRow(excluded.id)];
    memory.settings.set(`${COSTCO_SETTING_PREFIX}evil`, {
      settingKey: `${COSTCO_SETTING_PREFIX}evil`,
      settingValue: "SECRET-DO-NOT-RESET",
    });
    await caller().resetOrder();
    [included.id, excluded.id].forEach((id, index) => {
      expect(savedRow(id)).toEqual({
        ...before[index],
        order: { ...before[index].order, quantity: 0 },
      });
    });
    expect(
      memory.settings.get(`${COSTCO_SETTING_PREFIX}evil`)!.settingValue
    ).toBe("SECRET-DO-NOT-RESET");
    expect((await caller().order()).some(row => row.id === excluded.id)).toBe(
      false
    );
    expect(
      (await caller().order()).find(row => row.id === included.id)
    ).toMatchObject({ quantity: 0, unitsPerPackage: 9 });
    expect(
      await caller().setBinding({ id: included.id, inventoryProductId: null })
    ).toEqual({ success: true });
    expect(savedRow(included.id).order).toEqual({
      ...before[0].order,
      quantity: 0,
    });
    expect(
      (await caller().list()).find(row => row.id === included.id)
    ).toMatchObject({
      inventoryProductId: null,
      inventoryProductName: null,
      inventoryStock: null,
      bindingMissing: false,
    });
  });

  it("patches catalog concurrently with quantities, units and bindings under row locks", async () => {
    memory.setProducts([product()]);
    const { id } = await caller().create(input);
    await caller().addOrderItem({ id });
    const position = savedRow(id).order.position;
    memory.queries.length = 0;
    await Promise.all([
      caller().update({
        id,
        name: "Edición concurrente",
        costcoCode: "NUEVO",
        cost: "6.7",
      }),
      caller().setOrderItem({ id, quantity: 23 }),
      caller().setOrderItem({ id, unitsPerPackage: 4 }),
      caller().setBinding({ id, inventoryProductId: 7 }),
    ]);
    expect((await caller().order()).find(row => row.id === id)).toMatchObject({
      name: "Edición concurrente",
      costcoCode: "NUEVO",
      cost: "6.70",
      quantity: 23,
      unitsPerPackage: 4,
      inventoryProductId: 7,
    });
    expect(savedRow(id).order.position).toBe(position);
    expect(
      memory.queries.filter(
        query => query.locked && query.params[0] === costcoSettingKey(id)
      )
    ).toHaveLength(4);
  });

  it.each(["0", "0.0", "0.00", "1", "1.2", "99999999.99"])(
    "accepts canonical price %s and always persists two decimals",
    async cost => {
      const { id } = await caller().create({ ...input, cost });
      const [whole, fraction = ""] = cost.split(".");
      expect(savedRow(id).catalog.cost).toBe(
        `${whole}.${fraction.padEnd(2, "0")}`
      );
      await caller().update({ ...input, id, cost });
      expect(savedRow(id).catalog.cost).toBe(
        `${whole}.${fraction.padEnd(2, "0")}`
      );
    }
  );

  it("accepts maximum trimmed name/code lengths", async () => {
    const { id } = await caller().create({
      name: `  ${"n".repeat(255)}  `,
      costcoCode: `  ${"c".repeat(50)}  `,
      cost: "0",
    });
    expect(savedRow(id).catalog.name).toHaveLength(255);
    expect(savedRow(id).catalog.costcoCode).toHaveLength(50);
  });

  it.each([
    { cost: "" },
    { cost: " " },
    { cost: "-1" },
    { cost: "-0.00" },
    { cost: "+1" },
    { cost: "1e2" },
    { cost: "1,25" },
    { cost: ".5" },
    { cost: "1." },
    { cost: "00" },
    { cost: "01.20" },
    { cost: "0.001" },
    { cost: "1.234" },
    { cost: "100000000" },
    { cost: "99999999.999" },
    { cost: "NaN" },
    { cost: "Infinity" },
    { name: "" },
    { name: "  " },
    { name: "n".repeat(256) },
    { costcoCode: "" },
    { costcoCode: "  " },
    { costcoCode: "c".repeat(51) },
  ])(
    "rejects invalid catalog fields %j for both create and update before DB",
    async fields => {
      await expect(
        caller().create({ ...input, ...fields })
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      await expect(
        caller().update({ ...input, id: "costco-08", ...fields })
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      expect(getDb).not.toHaveBeenCalled();
      expect(memory.settings.size).toBe(0);
    }
  );

  it("requires all catalog fields as strings for create and update", async () => {
    for (const fields of [
      { name: input.name, costcoCode: input.costcoCode },
      { costcoCode: input.costcoCode, cost: input.cost },
      { name: input.name, cost: input.cost },
      { ...input, name: null },
      { ...input, costcoCode: 123 },
      { ...input, cost: 2.5 },
    ]) {
      await expect(
        caller().create(fields as typeof input)
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      await expect(
        caller().update({ ...fields, id: "costco-08" } as typeof input & {
          id: string;
        })
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    }
    expect(getDb).not.toHaveBeenCalled();
  });

  it.each([
    "costco-99",
    "smtp_password",
    `${COSTCO_SETTING_PREFIX}costco-08`,
    "costco-custom-not-a-uuid",
    `${unknownId}suffix`,
    `${unknownId}\n`,
    "costco-custom-FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF",
    "../costco-08",
  ])("rejects invalid IDs %s without DB access", async id => {
    expect(() => validateCostcoId(id)).toThrow();
    await expect(caller().update({ ...input, id })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    await expect(
      caller().setBinding({ id, inventoryProductId: null })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(getDb).not.toHaveBeenCalled();
  });

  it("requires unknown or deleted custom rows to exist for every ID mutation and never recreates them", async () => {
    expect(() => validateCostcoId(unknownId)).not.toThrow();
    const { id: deletedId } = await caller().create(input);
    memory.settings.delete(costcoSettingKey(deletedId));
    for (const id of [unknownId, deletedId]) {
      for (const call of [
        () => caller().update({ ...input, id }),
        () => caller().setBinding({ id, inventoryProductId: null }),
        () => caller().setOrderItem({ id, quantity: 3 }),
        () => caller().addOrderItem({ id }),
        () => caller().removeOrderItem({ id }),
      ]) {
        await expect(call()).rejects.toMatchObject({ code: "BAD_REQUEST" });
      }
      expect(memory.settings.has(costcoSettingKey(id))).toBe(false);
    }
    expect(await caller().list()).toHaveLength(31);
  });

  it("excludes lookalike prefixes, invalid IDs and secrets during dynamic list and reset", async () => {
    const { id } = await caller().create(input);
    const keys = [
      "smtp_password",
      `other.${costcoSettingKey(id)}`,
      `costcoXrowXv1.${id}`,
      `${COSTCO_SETTING_PREFIX}costco-99`,
      `${COSTCO_SETTING_PREFIX}costco-custom-not-a-uuid`,
      `${costcoSettingKey(id)}-extra`,
      `${COSTCO_SETTING_PREFIX}costco-08.extra`,
    ];
    keys.forEach(key =>
      memory.settings.set(key, {
        settingKey: key,
        settingValue: "PRIVATE-SECRET",
      })
    );
    const rows = await caller().list();
    expect(rows).toHaveLength(32);
    expect(JSON.stringify(rows)).not.toMatch(
      /PRIVATE-|settingKey|settingValue|inventoryProductHandle/
    );
    await caller().resetOrder();
    keys.forEach(key =>
      expect(memory.settings.get(key)!.settingValue).toBe("PRIVATE-SECRET")
    );
    const filters = memory.queries.filter(
      query => query.table === "app_settings" && /\blike\b/i.test(query.sql)
    );
    expect(filters.length).toBeGreaterThan(0);
    filters.forEach(query => {
      expect(query.params[0]).toBe(`${COSTCO_SETTING_PREFIX}%`);
      expect(query.sql).toMatch(/\bREGEXP\b/);
      const regex = new RegExp(String(query.params[1]));
      expect(regex.test(costcoSettingKey(id))).toBe(true);
      keys.forEach(key => expect(regex.test(key)).toBe(false));
    });
  });

  it("rolls back failed catalog edits and never reports successful custom creation on write failure", async () => {
    const { id } = await caller().create(input);
    const before = memory.settings.get(costcoSettingKey(id));
    memory.failWrites();
    await expect(
      caller().update({ ...input, id, name: "No guardar" })
    ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
    expect(memory.settings.get(costcoSettingKey(id))).toEqual(before);
    await expect(caller().create(input)).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
    });
    expect(memory.settings.size).toBe(32);
  });

  it("never replaces malformed custom data on list, update or reset", async () => {
    const { id } = await caller().create(input);
    const key = costcoSettingKey(id);
    memory.settings.set(key, {
      ...memory.settings.get(key)!,
      settingValue: "broken-json",
    });
    await expect(caller().list()).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
    });
    await expect(caller().update({ ...input, id })).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
    });
    await expect(caller().resetOrder()).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
    });
    expect(memory.settings.get(key)!.settingValue).toBe("broken-json");
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

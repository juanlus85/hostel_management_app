import { TRPCError } from "@trpc/server";
import { randomUUID } from "node:crypto";
import { and, eq, like, sql } from "drizzle-orm";
import { z } from "zod";
import { appSettings, inventoryProducts } from "../drizzle/schema";
import { COSTCO_CATALOG } from "../shared/costcoCatalog";
import {
  DEFAULT_COSTCO_ORDER,
  calculateCostcoOrderItem,
  type CostcoCatalogRow,
  type CostcoOrderRow,
} from "../shared/costcoOrders";
import { getDb } from "./db";

export const COSTCO_SETTING_PREFIX = "costco.row.v1.";
export const costcoSettingKey = (id: string) => `${COSTCO_SETTING_PREFIX}${id}`;
const catalogIds = new Set(COSTCO_CATALOG.map(item => item.id));
const customIdPattern =
  "costco-custom-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const customIdRegex = new RegExp(`^${customIdPattern}$`);
const settingKeyPattern = `^costco[.]row[.]v1[.](${COSTCO_CATALOG.map(item => item.id).join("|")}|${customIdPattern})$`;
const isCostcoId = (id: string) => catalogIds.has(id) || customIdRegex.test(id);
const costcoSettingsFilter = () =>
  and(
    like(appSettings.settingKey, `${COSTCO_SETTING_PREFIX}%`),
    sql`${appSettings.settingKey} REGEXP ${settingKeyPattern}`
  );
const orderNumber = z.number().int().min(0).max(100000);

export const costcoCatalogInputSchema = z.object({
  name: z.string().trim().min(1).max(255),
  costcoCode: z.string().trim().min(1).max(50),
  cost: z
    .string()
    .trim()
    .regex(
      /^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/,
      "El coste debe estar entre 0 y 99999999.99, con un máximo de dos decimales"
    )
    .transform(value => {
      const [whole, fraction = ""] = value.split(".");
      return `${whole}.${fraction.padEnd(2, "0")}`;
    }),
});
type CatalogInput = z.input<typeof costcoCatalogInputSchema>;

const storedRowSchema = z.object({
  version: z.literal(1),
  catalog: z.object({
    id: z.string(),
    name: z.string(),
    costcoCode: z.string(),
    cost: z.string().regex(/^\d+\.\d{2}$/),
  }),
  binding: z.object({
    inventoryProductId: z.number().int().positive().nullable(),
    inventoryProductHandle: z.string().nullable(),
    inventoryProductName: z.string().nullable(),
    inventoryProductCreatedAt: z.string().nullable(),
  }),
  order: z.object({
    included: z.boolean(),
    quantity: orderNumber,
    unitsPerPackage: z.number().int().min(1).max(100000),
    position: z.number().int().nonnegative().safe(),
  }),
});
type StoredRow = z.infer<typeof storedRowSchema>;
type Database = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Connection = Database | Transaction;
type Product = Pick<
  typeof inventoryProducts.$inferSelect,
  "id" | "handle" | "name" | "inStock" | "createdAt"
>;
const productColumns = {
  id: inventoryProducts.id,
  handle: inventoryProducts.handle,
  name: inventoryProducts.name,
  inStock: inventoryProducts.inStock,
  createdAt: inventoryProducts.createdAt,
};

export function validateCostcoId(id: string): void {
  if (!isCostcoId(id))
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Artículo Costco desconocido",
    });
}

function emptyBinding(): StoredRow["binding"] {
  return {
    inventoryProductId: null,
    inventoryProductHandle: null,
    inventoryProductName: null,
    inventoryProductCreatedAt: null,
  };
}

function defaultRow(id: string): StoredRow {
  const catalog = COSTCO_CATALOG.find(item => item.id === id)!;
  const position = DEFAULT_COSTCO_ORDER.findIndex(item => item.id === id);
  const order = DEFAULT_COSTCO_ORDER[position];
  return {
    version: 1,
    catalog: { ...catalog },
    binding: emptyBinding(),
    order: {
      included: !!order,
      quantity: order?.quantity ?? 0,
      unitsPerPackage: order?.unitsPerPackage ?? 1,
      position:
        position >= 0
          ? position
          : DEFAULT_COSTCO_ORDER.length + COSTCO_CATALOG.indexOf(catalog),
    },
  };
}

function parseRow(value: string | null, id: string): StoredRow {
  try {
    const row = storedRowSchema.parse(JSON.parse(value ?? ""));
    if (row.catalog.id !== id) throw new Error("Mismatched Costco ID");
    return row;
  } catch {
    // No sustituir datos guardados dañados por defaults, ni ocultar el fallo.
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "La fila Costco guardada no es válida",
    });
  }
}

async function readSettings(db: Connection) {
  // Prefijo Y patrón cerrados en SQL: no cargar otros ajustes ni secretos.
  return (
    db
      .select({
        settingKey: appSettings.settingKey,
        settingValue: appSettings.settingValue,
      })
      .from(appSettings)
      .where(costcoSettingsFilter())
      // ID autoincremental: orden de creación estable incluso en el mismo segundo.
      .orderBy(appSettings.id)
  );
}

async function ensureRows(db: Database): Promise<void> {
  const existing = new Set((await readSettings(db)).map(row => row.settingKey));
  const missing = COSTCO_CATALOG.filter(
    item => !existing.has(costcoSettingKey(item.id))
  );
  if (missing.length === 0) return;
  await db
    .insert(appSettings)
    .values(
      missing.map(item => ({
        settingKey: costcoSettingKey(item.id),
        settingValue: JSON.stringify(defaultRow(item.id)),
        isEncrypted: false,
        description: "Catálogo, vínculo y pedido Costco",
      }))
    )
    .onDuplicateKeyUpdate({
      // Otra petición puede haber inicializado/actualizado mientras tanto: NO sobrescribir.
      set: { settingKey: sql`${appSettings.settingKey}` },
    });
}

async function withDatabase<T>(work: (db: Database) => Promise<T>): Promise<T> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");
    await ensureRows(db);
    return await work(db);
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "No se han podido cargar o guardar los datos Costco en MySQL",
      cause: error,
    });
  }
}

function resolveProduct(
  binding: StoredRow["binding"],
  products: Product[]
): Product | undefined {
  if (binding.inventoryProductId === null) return undefined;
  if (binding.inventoryProductHandle) {
    // Nunca usar el antiguo ID si el handle ha desaparecido o pertenece a otro producto.
    const matches = products.filter(
      product => product.handle === binding.inventoryProductHandle
    );
    return matches.length === 1 ? matches[0] : undefined;
  }
  // Sin handle no hay identidad portable tras un CSV: exigir también la identidad guardada.
  return products.find(
    product =>
      product.id === binding.inventoryProductId &&
      !product.handle &&
      product.name === binding.inventoryProductName &&
      product.createdAt.toISOString() === binding.inventoryProductCreatedAt
  );
}

function publicRow(row: StoredRow, products: Product[]): CostcoCatalogRow {
  const product = resolveProduct(row.binding, products);
  return {
    ...row.catalog,
    inventoryProductId: product?.id ?? row.binding.inventoryProductId,
    inventoryProductName: product?.name ?? row.binding.inventoryProductName,
    inventoryStock: product?.inStock ?? null,
    bindingMissing: row.binding.inventoryProductId !== null && !product,
  };
}

async function loadRows(db: Database) {
  const saved = new Map(
    (await readSettings(db))
      .filter(
        item =>
          item.settingKey.startsWith(COSTCO_SETTING_PREFIX) &&
          isCostcoId(item.settingKey.slice(COSTCO_SETTING_PREFIX.length))
      )
      .map(item => [item.settingKey, item.settingValue])
  );
  const rows = COSTCO_CATALOG.map(item =>
    parseRow(saved.get(costcoSettingKey(item.id)) ?? null, item.id)
  );
  for (const [key, value] of Array.from(saved.entries())) {
    const id = key.slice(COSTCO_SETTING_PREFIX.length);
    if (!catalogIds.has(id)) rows.push(parseRow(value, id));
  }
  const products = await db.select(productColumns).from(inventoryProducts);
  return { rows, products };
}

export async function listCostco(): Promise<CostcoCatalogRow[]> {
  return withDatabase(async db => {
    const { rows, products } = await loadRows(db);
    return rows.map(row => publicRow(row, products));
  });
}

// Compartir el desempate con los movimientos: posiciones heredadas pueden repetirse.
function compareOrderRows(a: StoredRow, b: StoredRow): number {
  return (
    a.order.position - b.order.position ||
    a.catalog.id.localeCompare(b.catalog.id)
  );
}

export async function getCostcoOrder(): Promise<CostcoOrderRow[]> {
  return withDatabase(async db => {
    const { rows, products } = await loadRows(db);
    return rows
      .filter(row => row.order.included)
      .sort(compareOrderRows)
      .map(row => {
        const item = {
          ...publicRow(row, products),
          quantity: row.order.quantity,
          unitsPerPackage: row.order.unitsPerPackage,
        };
        return { ...item, ...calculateCostcoOrderItem(item) };
      });
  });
}

async function mutateRow(
  id: string,
  mutate: (row: StoredRow, tx: Transaction) => Promise<void>
): Promise<void> {
  validateCostcoId(id);
  await withDatabase(db =>
    db.transaction(async tx => {
      // MySQL lock serializa los cambios de esta fila incluso entre varios procesos/VPS.
      const [saved] = await tx
        .select({ settingValue: appSettings.settingValue })
        .from(appSettings)
        .where(eq(appSettings.settingKey, costcoSettingKey(id)))
        .for("update");
      if (!saved)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Artículo Costco desconocido",
        });
      const row = parseRow(saved.settingValue, id);
      await mutate(row, tx);
      await tx
        .update(appSettings)
        .set({ settingValue: JSON.stringify(row), updatedAt: new Date() })
        .where(eq(appSettings.settingKey, costcoSettingKey(id)));
    })
  );
}

function parseCatalogInput(input: CatalogInput) {
  const result = costcoCatalogInputSchema.safeParse(input);
  if (!result.success)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Nombre, código o coste Costco no válidos",
    });
  return result.data;
}

export async function createCostco(input: CatalogInput): Promise<string> {
  const catalog = parseCatalogInput(input);
  const id = `costco-custom-${randomUUID()}`;
  const row: StoredRow = {
    version: 1,
    catalog: { id, ...catalog },
    binding: emptyBinding(),
    order: { included: false, quantity: 0, unitsPerPackage: 1, position: 0 },
  };
  await withDatabase(async db => {
    // Insert puro: jamás reemplazar filas existentes, ni deduplicar códigos.
    await db.insert(appSettings).values({
      settingKey: costcoSettingKey(id),
      settingValue: JSON.stringify(row),
      isEncrypted: false,
      description: "Catálogo, vínculo y pedido Costco",
    });
  });
  return id;
}

export async function updateCostco(
  input: CatalogInput & { id: string }
): Promise<void> {
  const catalog = parseCatalogInput(input);
  await mutateRow(input.id, async row => {
    // Solo catálogo sobre la fila bloqueada: conservar binding/order/position.
    row.catalog = { ...row.catalog, ...catalog };
  });
}

export async function setCostcoBinding(
  id: string,
  inventoryProductId: number | null
): Promise<void> {
  await mutateRow(id, async (row, tx) => {
    if (inventoryProductId === null) {
      row.binding = emptyBinding();
      return;
    }
    const [product] = await tx
      .select(productColumns)
      .from(inventoryProducts)
      .where(eq(inventoryProducts.id, inventoryProductId))
      .limit(1);
    if (!product)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "El producto de inventario no existe",
      });
    row.binding = {
      inventoryProductId: product.id,
      inventoryProductHandle: product.handle || null,
      inventoryProductName: product.name,
      inventoryProductCreatedAt: product.createdAt.toISOString(),
    };
  });
}

export async function setCostcoOrderItem(input: {
  id: string;
  quantity?: number;
  unitsPerPackage?: number;
}): Promise<void> {
  await mutateRow(input.id, async row => {
    // Patch por campo sobre la versión bloqueada: no reemplazar el campo omitido.
    if (input.quantity !== undefined)
      row.order.quantity = orderNumber.parse(input.quantity);
    if (input.unitsPerPackage !== undefined)
      row.order.unitsPerPackage =
        storedRowSchema.shape.order.shape.unitsPerPackage.parse(
          input.unitsPerPackage
        );
  });
}

export async function addCostcoOrderItem(id: string): Promise<void> {
  await mutateRow(id, async row => {
    if (row.order.included) return;
    row.order.included = true;
    row.order.position = Date.now();
    // Añadir no implica pedir: la cantidad se ajusta expresamente en la plantilla.
    row.order.quantity = 0;
  });
}

export async function removeCostcoOrderItem(id: string): Promise<void> {
  await mutateRow(id, async row => {
    row.order.included = false;
  });
}

async function lockCostcoRows(tx: Transaction): Promise<StoredRow[]> {
  // Todas las operaciones multifila adquieren locks en el mismo orden. Nunca
  // bloquear primero el artículo solicitado y después sus vecinos (deadlock).
  // La lectura FOR UPDATE obtiene el estado vigente, no un snapshot previo.
  const saved = await tx
    .select({
      settingKey: appSettings.settingKey,
      settingValue: appSettings.settingValue,
    })
    .from(appSettings)
    .where(costcoSettingsFilter())
    .orderBy(appSettings.settingKey)
    .for("update");
  return saved.map(item =>
    parseRow(
      item.settingValue,
      item.settingKey.slice(COSTCO_SETTING_PREFIX.length)
    )
  );
}

export async function moveCostcoOrderItem(input: {
  id: string;
  direction: "up" | "down";
}): Promise<void> {
  validateCostcoId(input.id);
  if (input.direction !== "up" && input.direction !== "down")
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Dirección de movimiento Costco no válida",
    });
  await withDatabase(db =>
    db.transaction(async tx => {
      const rows = await lockCostcoRows(tx);
      const item = rows.find(row => row.catalog.id === input.id);
      if (!item)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Artículo Costco desconocido",
        });
      if (!item.order.included)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "El artículo Costco no está incluido en el pedido",
        });
      // Pedido completo, también cantidades cero; nunca depende de la búsqueda UI.
      const ordered = rows
        .filter(row => row.order.included)
        .sort(compareOrderRows);
      const index = ordered.indexOf(item);
      const next = index + (input.direction === "up" ? -1 : 1);
      // Extremos son un no-op real, incluso con posiciones heredadas sin normalizar.
      if (next < 0 || next >= ordered.length) return;
      [ordered[index], ordered[next]] = [ordered[next], ordered[index]];
      for (let position = 0; position < ordered.length; position++) {
        const row = ordered[position];
        if (row.order.position === position) continue;
        // Normalizar desde el orden actual evita intercambios ambiguos por empates
        // o Date.now. Solo modificar position sobre la versión recién bloqueada.
        row.order.position = position;
        await tx
          .update(appSettings)
          .set({ settingValue: JSON.stringify(row), updatedAt: new Date() })
          .where(eq(appSettings.settingKey, costcoSettingKey(row.catalog.id)));
      }
    })
  );
}

export async function resetCostcoOrder(): Promise<void> {
  await withDatabase(db =>
    db.transaction(async tx => {
      const rows = await lockCostcoRows(tx);
      for (const row of rows) {
        // Reiniciar solo cantidades, sin reinsertar artículos retirados ni perder paquetes.
        row.order.quantity = 0;
        await tx
          .update(appSettings)
          .set({ settingValue: JSON.stringify(row), updatedAt: new Date() })
          .where(eq(appSettings.settingKey, costcoSettingKey(row.catalog.id)));
      }
    })
  );
}

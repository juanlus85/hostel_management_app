import { TRPCError } from "@trpc/server";
import { eq, inArray, sql } from "drizzle-orm";
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
const settingKeys = COSTCO_CATALOG.map(item => costcoSettingKey(item.id));
const orderNumber = z.number().int().min(0).max(100000);

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
  if (!catalogIds.has(id))
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Artículo Costco desconocido",
    });
}

function defaultRow(id: string): StoredRow {
  const catalog = COSTCO_CATALOG.find(item => item.id === id)!;
  const position = DEFAULT_COSTCO_ORDER.findIndex(item => item.id === id);
  const order = DEFAULT_COSTCO_ORDER[position];
  return {
    version: 1,
    catalog: { ...catalog },
    binding: {
      inventoryProductId: null,
      inventoryProductHandle: null,
      inventoryProductName: null,
      inventoryProductCreatedAt: null,
    },
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
  // Lista cerrada de claves: jamás leer otros ajustes, credenciales o secretos.
  return db
    .select({
      settingKey: appSettings.settingKey,
      settingValue: appSettings.settingValue,
    })
    .from(appSettings)
    .where(inArray(appSettings.settingKey, settingKeys));
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
    (await readSettings(db)).map(item => [item.settingKey, item.settingValue])
  );
  const rows = COSTCO_CATALOG.map(item =>
    parseRow(saved.get(costcoSettingKey(item.id)) ?? null, item.id)
  );
  const products = await db.select(productColumns).from(inventoryProducts);
  return { rows, products };
}

export async function listCostco(): Promise<CostcoCatalogRow[]> {
  return withDatabase(async db => {
    const { rows, products } = await loadRows(db);
    return rows.map(row => publicRow(row, products));
  });
}

export async function getCostcoOrder(): Promise<CostcoOrderRow[]> {
  return withDatabase(async db => {
    const { rows, products } = await loadRows(db);
    return rows
      .filter(row => row.order.included)
      .sort(
        (a, b) =>
          a.order.position - b.order.position ||
          a.catalog.id.localeCompare(b.catalog.id)
      )
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
      const row = parseRow(saved?.settingValue ?? null, id);
      await mutate(row, tx);
      await tx
        .update(appSettings)
        .set({ settingValue: JSON.stringify(row), updatedAt: new Date() })
        .where(eq(appSettings.settingKey, costcoSettingKey(id)));
    })
  );
}

export async function setCostcoBinding(
  id: string,
  inventoryProductId: number | null
): Promise<void> {
  await mutateRow(id, async (row, tx) => {
    if (inventoryProductId === null) {
      row.binding = defaultRow(id).binding;
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

export async function resetCostcoOrder(): Promise<void> {
  await withDatabase(db =>
    db.transaction(async tx => {
      // Bloquear todas las filas para reset atómico, conservando todos los vínculos/catalog.
      const saved = await tx
        .select({
          settingKey: appSettings.settingKey,
          settingValue: appSettings.settingValue,
        })
        .from(appSettings)
        .where(inArray(appSettings.settingKey, settingKeys))
        .orderBy(appSettings.settingKey)
        .for("update");
      for (const item of saved) {
        const id = item.settingKey.slice(COSTCO_SETTING_PREFIX.length);
        const row = parseRow(item.settingValue, id);
        // Reiniciar solo cantidades, sin reinsertar artículos retirados ni perder paquetes.
        row.order.quantity = 0;
        await tx
          .update(appSettings)
          .set({ settingValue: JSON.stringify(row), updatedAt: new Date() })
          .where(eq(appSettings.settingKey, item.settingKey));
      }
    })
  );
}

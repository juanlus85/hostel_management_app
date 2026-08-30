export type LoyverseInventoryProduct = {
  handle: string;
  legacyHandle: string;
  ref: string;
  name: string;
  category: string;
  cost: string;
  price: string;
  inStock: string;
};

type ResourcePayload = Record<string, unknown> & {
  cursor?: string;
  errors?: Array<{ details?: string }>;
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const asText = (value: unknown) =>
  typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : "";

const decimal = (value: unknown) => {
  const number = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(number) ? number.toFixed(3) : "0.000";
};

export function compactLoyverseHandle(itemId: string, variantId: string) {
  const source = `${itemId}:${variantId}`;
  let first = 0x811c9dc5;
  let second = 0x01000193;
  for (let index = 0; index < source.length; index += 1) {
    const code = source.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193);
    second = Math.imul(second ^ (code + index), 0x85ebca6b);
  }
  return `lv_${(first >>> 0).toString(36)}${(second >>> 0).toString(36)}`;
}

async function fetchAll(accessToken: string, resource: string, key: string) {
  const rows: Record<string, unknown>[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 30; page += 1) {
    const url = new URL(`https://api.loyverse.com/v1.0/${resource}`);
    url.searchParams.set("limit", "250");
    if (cursor) url.searchParams.set("cursor", cursor);
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      redirect: "manual",
    });
    const responseText = await response.text();
    let payload: ResourcePayload;
    try {
      payload = JSON.parse(responseText) as ResourcePayload;
    } catch {
      throw new Error(
        `Loyverse devolvió una respuesta no JSON al consultar ${resource} (HTTP ${response.status}).`
      );
    }
    if (!response.ok) {
      throw new Error(
        payload.errors
          ?.map(error => error.details)
          .filter(Boolean)
          .join(" · ") ||
          `Loyverse respondió HTTP ${response.status} al consultar ${resource}`
      );
    }
    const pageRows = payload[key];
    if (Array.isArray(pageRows)) rows.push(...pageRows.map(asRecord));
    if (!payload.cursor) break;
    cursor = payload.cursor;
  }
  return rows;
}

export function normalizeLoyverseInventory(
  items: Record<string, unknown>[],
  categories: Record<string, unknown>[],
  levels: Record<string, unknown>[]
): LoyverseInventoryProduct[] {
  const categoryNames = new Map(
    categories.map(category => [
      asText(category.id),
      asText(category.name) || "Sin familia",
    ])
  );
  const stockByVariant = new Map<string, number>();
  for (const level of levels) {
    const itemId = asText(level.item_id ?? level.itemId);
    const variantId = asText(level.variant_id ?? level.variantId ?? itemId);
    const key = `${itemId}:${variantId}`;
    stockByVariant.set(
      key,
      (stockByVariant.get(key) || 0) +
        Number(decimal(level.in_stock ?? level.inStock))
    );
  }
  return items.flatMap(item => {
    const itemId = asText(item.id);
    if (!itemId) return [];
    const variants =
      Array.isArray(item.variants) && item.variants.length
        ? item.variants.map(asRecord)
        : [item];
    return variants.map(variant => {
      const variantId = asText(variant.id) || itemId;
      const itemName =
        asText(item.item_name ?? item.name) || "Producto sin nombre";
      const variantName = asText(variant.variant_name ?? variant.name);
      const name =
        variantName && variantName.toLowerCase() !== "default"
          ? `${itemName} · ${variantName}`
          : itemName;
      const stock = stockByVariant.get(`${itemId}:${variantId}`) ?? 0;
      return {
        handle: compactLoyverseHandle(itemId, variantId),
        legacyHandle: `loyverse:${itemId}:${variantId}`,
        ref: asText(variant.sku ?? item.sku ?? itemId),
        name,
        category:
          categoryNames.get(asText(item.category_id ?? item.categoryId)) ||
          asText(item.category_name) ||
          "Sin familia",
        cost: decimal(variant.cost ?? item.cost),
        price: decimal(variant.price ?? item.price ?? item.default_price),
        inStock: stock.toFixed(3),
      };
    });
  });
}

export async function fetchLoyverseInventory(accessToken: string) {
  const [items, categories, levels] = await Promise.all([
    fetchAll(accessToken, "items", "items"),
    fetchAll(accessToken, "categories", "categories"),
    fetchAll(accessToken, "inventory", "inventory_levels"),
  ]);
  return normalizeLoyverseInventory(items, categories, levels);
}

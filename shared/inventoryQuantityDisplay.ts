const inventoryQuantityFormatter = new Intl.NumberFormat("es-ES", {
  maximumFractionDigits: 0,
});

/**
 * Formats an inventory quantity for display without changing its stored value.
 * Invalid, empty, or missing quantities are shown as an em dash.
 */
export function formatInventoryQuantity(value: unknown): string {
  if (value === null || value === undefined) return "—";

  if (typeof value === "string" && value.trim() === "") return "—";

  const quantity =
    typeof value === "string" ? Number(value.trim()) : Number(value);

  return Number.isFinite(quantity)
    ? inventoryQuantityFormatter.format(quantity)
    : "—";
}

export type WeeklyShoppingItem = {
  name: string;
  supplier?: string | null;
  category?: string | null;
  currentStock?: string | number | null;
  unit?: string | null;
};

export function buildWeeklyShoppingList(items: WeeklyShoppingItem[], businessLabel: string): string {
  const bySupplier = new Map<string, WeeklyShoppingItem[]>();
  [...items]
    .sort((a, b) => (a.supplier || "Sin proveedor").localeCompare(b.supplier || "Sin proveedor") || a.name.localeCompare(b.name))
    .forEach((item) => {
      const supplier = item.supplier?.trim() || "Sin proveedor asignado";
      bySupplier.set(supplier, [...(bySupplier.get(supplier) || []), item]);
    });

  const sections = Array.from(bySupplier.entries()).map(([supplier, supplierItems]: [string, WeeklyShoppingItem[]]) => [
    `PEDIDO A ${supplier.toUpperCase()}`,
    ...supplierItems.map((item) => `- ${item.name}${item.category ? ` (${item.category})` : ""}: quedan ${Number(item.currentStock || 0)} ${item.unit || "unidades"}`),
  ].join("\n"));

  return [`LISTA DE COMPRA SEMANAL · ${businessLabel.toUpperCase()}`, "", ...sections].join("\n\n");
}

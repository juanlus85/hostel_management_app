import { calculateCostcoOrderTotal } from "./costcoOrders";

export type CostcoExportRow = {
  costcoCode: string;
  name: string;
  cost: string;
  quantity: number;
  totalCost: string;
};
export const costcoCurrency = (amount: string | number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(
    Number(amount)
  );
const cleanCell = (value: string) => value.replace(/[\t\r\n]+/g, " ");
const csvCell = (value: string) => `"${value.replace(/"/g, '""')}"`;

/** La copia incluye solo Item, Descripción y Cantidad, sobre el pedido completo. */
export function costcoOrderCopy(rows: CostcoExportRow[]): string {
  const ordered = rows.filter(row => row.quantity > 0);
  const lines = [
    ["Item", "Descripción", "Cantidad"],
    ...ordered.map(row => [row.costcoCode, row.name, String(row.quantity)]),
  ];
  return lines.map(line => line.map(cleanCell).join("\t")).join("\n");
}

/** El CSV mantiene el detalle de precios y el total; es independiente de la copia. */
export function costcoOrderCsv(rows: CostcoExportRow[]): string {
  const ordered = rows.filter(row => row.quantity > 0);
  const lines = [
    ["Item", "Descripción", "Cantidad", "PVP unidad", "PVP total"],
    ...ordered.map(row => [
      row.costcoCode,
      row.name,
      String(row.quantity),
      costcoCurrency(row.cost),
      costcoCurrency(row.totalCost),
    ]),
    [
      "",
      "TOTAL PEDIDO",
      "",
      "",
      costcoCurrency(calculateCostcoOrderTotal(ordered)),
    ],
  ];
  return lines
    .map(line => line.map(cleanCell).map(csvCell).join(";"))
    .join("\r\n");
}

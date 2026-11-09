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

/** La copia se prepara sobre el pedido completo, no sobre un filtro de pantalla. */
export function costcoOrderCopy(rows: CostcoExportRow[]): string {
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
  return lines.map(line => line.map(cleanCell).join("\t")).join("\n");
}

export function costcoOrderCsv(rows: CostcoExportRow[]): string {
  return costcoOrderCopy(rows)
    .split("\n")
    .map(line => line.split("\t").map(csvCell).join(";"))
    .join("\r\n");
}

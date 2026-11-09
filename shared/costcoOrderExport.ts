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
const htmlCell = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** La copia incluye solo Item, Descripción y Cantidad, sobre el pedido completo. */
export function costcoOrderCopy(rows: CostcoExportRow[]): string {
  const ordered = rows.filter(row => row.quantity > 0);
  const lines = [
    ["Item", "Descripción", "Cantidad"],
    ...ordered.map(row => [row.costcoCode, row.name, String(row.quantity)]),
  ];
  return lines.map(line => line.map(cleanCell).join("\t")).join("\n");
}

/** Tabla de correo con solo Item, Descripción y Cantidad, sin precios ni total. */
export function costcoOrderEmailHtml(rows: CostcoExportRow[]): string {
  const cellStyle =
    "border:1px solid #cccccc;padding:8px 12px;text-align:left;vertical-align:top;";
  const headers = ["Item", "Descripción", "Cantidad"]
    .map(
      (header, index) =>
        `<th scope="col" style="${cellStyle}${index === 2 ? "text-align:right;" : ""}background-color:#f2f2f2;font-weight:bold;">${htmlCell(header)}</th>`
    )
    .join("");
  const body = rows
    .filter(row => row.quantity > 0)
    .map(
      row =>
        `<tr>${[row.costcoCode, row.name, String(row.quantity)]
          .map(
            (value, index) =>
              `<td style="${cellStyle}${index === 2 ? "text-align:right;" : ""}">${htmlCell(value)}</td>`
          )
          .join("")}</tr>`
    )
    .join("");
  return `<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #cccccc;width:100%;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222222;"><thead><tr>${headers}</tr></thead><tbody>${body}</tbody></table>`;
}

/** Alternativa de texto para correo: un bloque legible por artículo pedido. */
export function costcoOrderEmailText(rows: CostcoExportRow[]): string {
  return rows
    .filter(row => row.quantity > 0)
    .map(
      row =>
        `Item: ${cleanCell(row.costcoCode)}\nDescripción: ${cleanCell(row.name)}\nCantidad: ${String(row.quantity)}`
    )
    .join("\n\n");
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

import type { DashboardTrendRow } from "./dashboardTrend";
import type { SupplierExpense } from "./supplierExpenses";

export function buildDashboardExportRows(input: { businessLabel: string; periodLabel: string; startDate: string; endDate: string; stats: { totalIncome?: number; totalExpenses?: number; netResult?: number; totalDifference?: number }; suppliers: SupplierExpense[]; trend: DashboardTrendRow[] }) {
  return [
    [`INFORME DE DASHBOARD · ${input.businessLabel.toUpperCase()}`],
    [`Periodo: ${input.startDate} — ${input.endDate} (${input.periodLabel})`],
    [],
    ["RESUMEN", "IMPORTE (€)"],
    ["Ingresos", input.stats.totalIncome || 0],
    ["Gastos", input.stats.totalExpenses || 0],
    ["Balance", input.stats.netResult || 0],
    ["Descuadre", input.stats.totalDifference || 0],
    [],
    ["GASTOS POR PROVEEDOR"],
    ["Proveedor", "Facturas", "Total (€)"],
    ...input.suppliers.map((supplier) => [supplier.supplier, supplier.invoiceCount, supplier.total]),
    [],
    ["TENDENCIA DIARIA"],
    ["Fecha", "Ingresos (€)", "Gastos (€)", "Balance (€)"],
    ...input.trend.map((row) => [row.date, row.income, row.expenses, row.balance]),
  ];
}

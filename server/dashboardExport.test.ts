import { describe, expect, it } from "vitest";
import { buildDashboardExportRows } from "../shared/dashboardExport";

describe("exportación del dashboard", () => {
  it("incluye resumen, proveedores y la tendencia diaria", () => {
    const rows = buildDashboardExportRows({ businessLabel: "Hostel", periodLabel: "este mes", startDate: "2026-08-01", endDate: "2026-08-31", stats: { totalIncome: 100, totalExpenses: 40, netResult: 60, totalDifference: 2 }, suppliers: [{ supplier: "O2", invoiceCount: 1, total: 12 }], trend: [{ date: "2026-08-01", income: 100, expenses: 40, balance: 60 }] });
    expect(rows).toContainEqual(["Ingresos", 100]);
    expect(rows).toContainEqual(["O2", 1, 12]);
    expect(rows).toContainEqual(["2026-08-01", 100, 40, 60]);
  });
});

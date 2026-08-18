import { describe, expect, it } from "vitest";
import { aggregateDashboardTrend, mergeDashboardTrends } from "../shared/dashboardTrend";

describe("tendencias del dashboard", () => {
  it("agrega ingresos, gastos y balance por fecha", () => {
    expect(aggregateDashboardTrend([{ date: "2026-08-02", amount: "50" }, { date: "2026-08-01", amount: 100 }], [{ date: "2026-08-01", amount: "20" }])).toEqual([
      { date: "2026-08-01", income: 100, expenses: 20, balance: 80 },
      { date: "2026-08-02", income: 50, expenses: 0, balance: 50 },
    ]);
  });

  it("combina las series de ambos negocios por fecha", () => {
    expect(mergeDashboardTrends([{ date: "2026-08-01", income: 50, expenses: 5, balance: 45 }], [{ date: "2026-08-01", income: 10, expenses: 4, balance: 6 }])).toEqual([{ date: "2026-08-01", income: 60, expenses: 9, balance: 51 }]);
  });
});

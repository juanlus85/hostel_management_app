import { describe, expect, it } from "vitest";
import { compareCashByDate } from "../shared/externalCashComparison";

describe("comparación de cierres externos e internos", () => {
  it("suma cada fuente por día sin mezclar los importes originales", () => {
    expect(compareCashByDate(
      [{ date: "2026-08-20", amount: "30" }, { date: "2026-08-20", amount: "20" }],
      [{ date: "2026-08-20", amount: "45" }, { date: "2026-08-21", amount: "12" }],
    )).toEqual([
      { date: "2026-08-21", externalTotal: 0, internalTotal: 12, difference: -12 },
      { date: "2026-08-20", externalTotal: 50, internalTotal: 45, difference: 5 },
    ]);
  });
});

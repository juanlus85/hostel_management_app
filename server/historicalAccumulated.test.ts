import { describe, expect, it } from "vitest";
import { cumulativeMonthlySeries, toggleSelectedYear } from "../shared/historicalAccumulated";

describe("acumulados históricos", () => {
  it("acumula valores mensuales incluyendo meses sin datos", () => {
    expect(cumulativeMonthlySeries([100, "50", null, 25])).toEqual([100, 150, 150, 175]);
  });
  it("permite seleccionar y deseleccionar años", () => {
    expect(toggleSelectedYear([2024, 2026], 2025)).toEqual([2024, 2025, 2026]);
    expect(toggleSelectedYear([2024, 2025, 2026], 2025)).toEqual([2024, 2026]);
  });
});

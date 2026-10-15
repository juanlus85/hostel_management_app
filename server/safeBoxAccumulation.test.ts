import { describe, expect, it } from "vitest";
import { calculateSafeBoxAccumulations } from "../shared/safeBoxAccumulation";

describe("acumulados de Cajas F", () => {
  it("reconstruye todos los saldos cuando se inserta un apunte retroactivo", () => {
    const balances = calculateSafeBoxAccumulations([
      { id: 3, date: "2026-10-15", amount: "20.00" },
      { id: 1, date: "2026-10-10", amount: "100.00" },
      { id: 2, date: "2026-10-12", amount: "-35.50" },
    ]);

    expect(balances.get(1)).toBe("100.00");
    expect(balances.get(2)).toBe("64.50");
    expect(balances.get(3)).toBe("84.50");
  });

  it("mantiene un orden estable entre movimientos del mismo día", () => {
    const balances = calculateSafeBoxAccumulations([
      { id: 4, date: "2026-10-15", amount: "-8" },
      { id: 3, date: "2026-10-15", amount: "10" },
    ]);

    expect(balances.get(3)).toBe("10.00");
    expect(balances.get(4)).toBe("2.00");
  });
});

import { describe, expect, it } from "vitest";
import { currentLoyverseOperationalDate, sumLoyverseReceiptsForOperationalDay } from "../shared/provisionalExternalCash";

describe("importe provisional de Loyverse", () => {
  it("mantiene la jornada anterior antes de las 07:00 de Madrid", () => {
    expect(currentLoyverseOperationalDate(new Date("2026-08-28T04:30:00.000Z"))).toBe("2026-08-27");
    expect(currentLoyverseOperationalDate(new Date("2026-08-28T05:00:00.000Z"))).toBe("2026-08-28");
  });

  it("suma únicamente los recibos de la jornada operativa en curso", () => {
    const result = sumLoyverseReceiptsForOperationalDay([
      { created_at: "2026-08-28T05:30:00.000Z", total_money: 12.5 },
      { created_at: "2026-08-28T06:15:00.000Z", total_money: 7.5 },
    ], "2026-08-28");
    expect(result).toEqual({ total: 20, receiptCount: 2 });
  });
});

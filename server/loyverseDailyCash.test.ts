import { describe, expect, it } from "vitest";
import { aggregateLoyverseShiftsByOperationalDay, loyverseShiftDate, normalizeLoyverseShift } from "../shared/loyverseDailyCash";

describe("normalización de cierres de Loyverse", () => {
  it("convierte un turno cerrado a un registro externo aislado", () => {
    const shift = { id: "shift-1", store_id: "store-1", closed_at: "2026-08-26T21:30:00.000Z", starting_cash: 20, actual_cash: 70, cash_payments: 55, net_sales: 145.5 };
    expect(normalizeLoyverseShift(shift, 12)).toMatchObject({ importRunId: 12, provider: "loyverse", sourceShiftId: "shift-1", sourceStoreId: "store-1", businessDate: "2026-08-26", openingCash: "20", closingCash: "70", cashSales: "55", totalSales: "145.5" });
  });

  it("usa la apertura cuando aún no existe fecha de cierre", () => {
    expect(loyverseShiftDate({ opened_at: "2026-08-25T08:00:00.000Z" })).toBe("2026-08-25");
  });

  it("agrupa varios turnos en una misma jornada operativa de 07:00 a 07:00", () => {
    const result = aggregateLoyverseShiftsByOperationalDay([
      { id: "night", store_id: "store-1", closed_at: "2026-08-26T04:30:00.000Z", net_sales: 20 },
      { id: "day", store_id: "store-1", closed_at: "2026-08-26T12:30:00.000Z", net_sales: 30 },
    ], 1);
    expect(result).toHaveLength(2);
    expect(result.map((row) => row.businessDate)).toEqual(["2026-08-25", "2026-08-26"]);
  });
});

import { describe, expect, it } from "vitest";
import { aggregateClosedCashSummary } from "../shared/dashboardCashSummary";

describe("resumen de retiradas del dashboard", () => {
  it("agrega efectivo y tarjetas retiradas solo desde cierres cerrados", () => {
    expect(aggregateClosedCashSummary([
      { status: "closed", zReading: "100", withdrawnCash: "25", withdrawnCards: "10", prepaidBooking: "5", difference: "1" },
      { status: "draft", zReading: "999", withdrawnCash: "999", withdrawnCards: "999", prepaidBooking: "999", difference: "999" },
      { status: "closed", zReading: "50", withdrawnCash: "5", withdrawnCards: "2", prepaidBooking: "0", difference: "-1" },
    ])).toEqual({ totalIncomeZ: 150, totalDifference: 0, withdrawnCash: 30, withdrawnCards: 12, prepaidBooking: 5 });
  });
});

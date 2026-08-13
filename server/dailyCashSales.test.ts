import { describe, expect, it } from "vitest";
import { aggregateDailyCashSales } from "../shared/dailyCashSales";

describe("aggregateDailyCashSales", () => {
  it("groups daily sales and keeps Hostel and Tienda independent", () => {
    const rows = aggregateDailyCashSales([
      { businessId: 1, date: "2026-03-02", zReading: "120", totalCash: "70", totalCards: "50" },
      { businessId: 2, date: "2026-03-02", zReading: "80", totalCash: "20", totalCards: "60" },
      { businessId: 1, date: "2026-03-03", zReading: "90", totalCash: "40", totalCards: "50" },
    ], 1, 2);

    expect(rows).toEqual([
      { date: "2026-03-03", hostelZ: 90, hostelCash: 40, hostelCards: 50, tiendaZ: 0, tiendaCash: 0, tiendaCards: 0 },
      { date: "2026-03-02", hostelZ: 120, hostelCash: 70, hostelCards: 50, tiendaZ: 80, tiendaCash: 20, tiendaCards: 60 },
    ]);
  });
});

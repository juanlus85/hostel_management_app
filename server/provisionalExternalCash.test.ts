import { describe, expect, it } from "vitest";
import { aggregateLoyverseDashboardProducts, buildLoyverseDashboardReceipts, currentLoyverseOperationalDate, sumLoyverseReceiptsForOperationalDay } from "../shared/provisionalExternalCash";

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

  it("prepara los últimos tickets y los artículos ordenados por unidades", () => {
    const receipts = buildLoyverseDashboardReceipts([
      { id: "older", created_at: "2026-08-28T08:00:00.000Z", total_money: 8, line_items: [{ item_name: "Café", quantity: 2, total_money: 3 }, { item_name: "Tostada", quantity: 1, total_money: 5 }] },
      { id: "latest", created_at: "2026-08-28T10:00:00.000Z", total_money: 9, line_items: [{ item_name: "Café", quantity: 3, total_money: 6 }, { item_name: "Zumo", quantity: 1, total_money: 3 }] },
      { id: "old-day", created_at: "2026-08-27T10:00:00.000Z", total_money: 20 },
    ], "2026-08-28");
    expect(receipts.map(receipt => receipt.id)).toEqual(["latest", "older"]);
    expect(aggregateLoyverseDashboardProducts(receipts)).toEqual([
      { name: "Café", quantity: 5, total: 9 },
      { name: "Tostada", quantity: 1, total: 5 },
      { name: "Zumo", quantity: 1, total: 3 },
    ]);
  });
});

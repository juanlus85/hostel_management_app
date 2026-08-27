import { afterEach, describe, expect, it, vi } from "vitest";
import { aggregateCloudbedsPaymentsByOperationalDay, fetchCloudbedsTransactions } from "./cloudbedsTransactions";

afterEach(() => vi.unstubAllGlobals());

describe("aggregateCloudbedsPaymentsByOperationalDay", () => {
  it("agrupa cobros y devoluciones según la jornada de Sevilla de 07:00", () => {
    const records = aggregateCloudbedsPaymentsByOperationalDay([
      { id: 1, internalTransactionCode: "9300", amount: "-100.00", transactionDatetime: "2026-08-26T04:30:00Z", serviceDate: "2026-08-25" },
      { id: 2, internalCode: "9100", amount: "-20.00", transactionDatetime: "2026-08-26T12:00:00Z", serviceDate: "2026-08-26" },
      { id: 3, internalCode: "9300A", amount: "10.00", transactionDatetime: "2026-08-26T13:00:00Z", serviceDate: "2026-08-26" },
    ], 9, "204754");
    expect(records).toEqual([
      expect.objectContaining({ businessDate: "2026-08-25", totalSales: "100.00" }),
      expect.objectContaining({ businessDate: "2026-08-26", cashSales: "20.00", cardSales: "-10.00", totalSales: "10.00" }),
    ]);
  });

  it("consulta transacciones con rango, API key y Property ID sin exponerlos", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ transactions: [{ id: "1", amount: "-10", internalCode: "9300", transactionDatetime: "2026-08-26T10:00:00Z" }], nextPageToken: null }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const transactions = await fetchCloudbedsTransactions("cbat_private", "204754", "2026-08-26", "2026-08-27");
    expect(transactions).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith("https://api.cloudbeds.com/accounting/v1.0/transactions", expect.objectContaining({ headers: expect.objectContaining({ "X-Property-ID": "204754", Authorization: "Bearer cbat_private" }) }));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ filters: { and: [{ field: "service_date", operator: "greater_than_or_equal" }, { field: "service_date", operator: "less_than_or_equal" }] }, limit: 1100 });
  });
});

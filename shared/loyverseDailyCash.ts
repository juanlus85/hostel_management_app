export type LoyverseShift = Record<string, unknown>;

export function loyverseShiftDate(shift: LoyverseShift): string {
  const value = shift.closed_at || shift.opened_at;
  return typeof value === "string" ? value.slice(0, 10) : "";
}

export function normalizeLoyverseShift(shift: LoyverseShift, importRunId: number) {
  return {
    importRunId,
    provider: "loyverse" as const,
    sourceStoreId: typeof shift.store_id === "string" ? shift.store_id : null,
    sourceStoreName: null,
    sourceShiftId: typeof shift.id === "string" ? shift.id : null,
    businessLabel: "Loyverse",
    businessDate: loyverseShiftDate(shift),
    currency: "EUR",
    openingCash: String(Number(shift.starting_cash || 0)),
    closingCash: String(Number(shift.actual_cash || 0)),
    cashSales: String(Number(shift.cash_payments || 0)),
    cardSales: "0",
    totalSales: String(Number(shift.net_sales || 0)),
    rawData: JSON.stringify(shift),
  };
}

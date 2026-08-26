export type LoyverseShift = Record<string, unknown>;

export function loyverseShiftDate(shift: LoyverseShift): string {
  const value = shift.closed_at || shift.opened_at;
  if (typeof value !== "string") return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date).reduce<Record<string, string>>((result, part) => ({ ...result, [part.type]: part.value }), {});
  const currentDate = `${parts.year}-${parts.month}-${parts.day}`;
  if (Number(parts.hour) >= 7) return currentDate;
  const priorDay = new Date(`${currentDate}T12:00:00Z`);
  priorDay.setUTCDate(priorDay.getUTCDate() - 1);
  return priorDay.toISOString().slice(0, 10);
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

export function aggregateLoyverseShiftsByOperationalDay(shifts: LoyverseShift[], importRunId: number) {
  const grouped = new Map<string, ReturnType<typeof normalizeLoyverseShift>>();
  for (const shift of shifts) {
    const normalized = normalizeLoyverseShift(shift, importRunId);
    if (!normalized.businessDate) continue;
    const key = `${normalized.sourceStoreId || "all"}:${normalized.businessDate}`;
    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, { ...normalized, sourceShiftId: `daily-${key}`, rawData: JSON.stringify([shift]) });
      continue;
    }
    existing.openingCash = String(Number(existing.openingCash) + Number(normalized.openingCash));
    existing.closingCash = String(Number(existing.closingCash) + Number(normalized.closingCash));
    existing.cashSales = String(Number(existing.cashSales) + Number(normalized.cashSales));
    existing.cardSales = String(Number(existing.cardSales) + Number(normalized.cardSales));
    existing.totalSales = String(Number(existing.totalSales) + Number(normalized.totalSales));
    existing.rawData = JSON.stringify([...(JSON.parse(existing.rawData || "[]") as LoyverseShift[]), shift]);
  }
  return Array.from(grouped.values());
}

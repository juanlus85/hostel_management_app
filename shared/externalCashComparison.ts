export type CashSourceRecord = { date: string; amount: string | number | null | undefined };

export function compareCashByDate(external: CashSourceRecord[], internal: CashSourceRecord[]) {
  const totals = new Map<string, { externalTotal: number; internalTotal: number }>();
  for (const record of external) {
    const item = totals.get(record.date) || { externalTotal: 0, internalTotal: 0 };
    item.externalTotal += Number(record.amount || 0);
    totals.set(record.date, item);
  }
  for (const record of internal) {
    const item = totals.get(record.date) || { externalTotal: 0, internalTotal: 0 };
    item.internalTotal += Number(record.amount || 0);
    totals.set(record.date, item);
  }
  return Array.from(totals.entries())
    .map(([date, amounts]) => ({ date, ...amounts, difference: amounts.externalTotal - amounts.internalTotal }))
    .sort((left, right) => right.date.localeCompare(left.date));
}

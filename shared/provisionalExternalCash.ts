import { loyverseReceiptDate, type LoyverseShift } from "./loyverseDailyCash";

export function madridDateParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now).reduce<Record<string, string>>((result, part) => ({ ...result, [part.type]: part.value }), {});
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) };
}

export function currentLoyverseOperationalDate(now = new Date()) {
  const { date, hour } = madridDateParts(now);
  if (hour >= 7) return date;
  const priorDay = new Date(`${date}T12:00:00.000Z`);
  priorDay.setUTCDate(priorDay.getUTCDate() - 1);
  return priorDay.toISOString().slice(0, 10);
}

export function sumLoyverseReceiptsForOperationalDay(receipts: LoyverseShift[], businessDate: string) {
  return receipts.reduce<{ total: number; receiptCount: number }>((summary, receipt) => {
    if (loyverseReceiptDate(receipt) !== businessDate) return summary;
    const amount = Number(receipt.total_money || 0);
    if (!Number.isFinite(amount)) return summary;
    return { total: summary.total + amount, receiptCount: summary.receiptCount + 1 };
  }, { total: 0, receiptCount: 0 });
}

import { loyverseReceiptDate, type LoyverseShift } from "./loyverseDailyCash";

export type LoyverseDashboardLine = {
  name: string;
  quantity: number;
  total: number;
};

export type LoyverseDashboardReceipt = {
  id: string;
  number: string;
  createdAt: string | null;
  total: number;
  payments: Array<{ name: string; amount: number }>;
  lines: LoyverseDashboardLine[];
};

export type LoyverseDashboardProduct = {
  name: string;
  quantity: number;
  total: number;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function asText(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

function numberValue(value: unknown) {
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function receiptLines(receipt: LoyverseShift): LoyverseDashboardLine[] {
  const lineItems = receipt.line_items ?? receipt.lineItems ?? receipt.items;
  if (!Array.isArray(lineItems)) return [];
  return lineItems.map(item => {
    const row = asRecord(item);
    const nestedItem = asRecord(row.item ?? row.product);
    const quantity = numberValue(row.quantity ?? row.qty ?? row.count) || 1;
    const unitPrice = numberValue(row.price ?? row.price_money ?? row.unit_price ?? row.unitPrice);
    const total = numberValue(row.total_money ?? row.total ?? row.gross_total ?? row.amount) || unitPrice * quantity;
    return {
      name: asText(row.item_name, row.itemName, row.product_name, row.productName, row.name, nestedItem.item_name, nestedItem.name, nestedItem.product_name) || "Artículo sin nombre",
      quantity,
      total,
    };
  });
}

function receiptPayments(receipt: LoyverseShift) {
  const payments = receipt.payments ?? receipt.payment_details ?? receipt.paymentDetails;
  if (!Array.isArray(payments)) return [];
  return payments.map(payment => {
    const row = asRecord(payment);
    const paymentType = asRecord(row.payment_type ?? row.paymentType);
    return {
      name: asText(row.name, row.payment_type_name, row.paymentTypeName, paymentType.name, paymentType.type) || "Pago",
      amount: numberValue(row.money_amount ?? row.amount ?? row.total_money ?? row.total),
    };
  });
}

export function buildLoyverseDashboardReceipts(receipts: LoyverseShift[], businessDate: string) {
  return receipts
    .filter(receipt => loyverseReceiptDate(receipt) === businessDate)
    .map(receipt => ({
      id: asText(receipt.id, receipt.receipt_id, receipt.number) || `ticket-${asText(receipt.created_at, receipt.receipt_date)}`,
      number: asText(receipt.receipt_number, receipt.receiptNumber, receipt.number, receipt.id) || "Ticket",
      createdAt: asText(receipt.created_at, receipt.receipt_date) || null,
      total: numberValue(receipt.total_money ?? receipt.total),
      payments: receiptPayments(receipt),
      lines: receiptLines(receipt),
    }))
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
}

export function aggregateLoyverseDashboardProducts(receipts: LoyverseDashboardReceipt[], limit = 15) {
  const products = new Map<string, LoyverseDashboardProduct>();
  for (const receipt of receipts) {
    for (const line of receipt.lines) {
      const key = line.name.trim().toLocaleLowerCase("es-ES");
      const current = products.get(key) || { name: line.name, quantity: 0, total: 0 };
      current.quantity += line.quantity;
      current.total += line.total;
      products.set(key, current);
    }
  }
  return Array.from(products.values())
    .sort((a, b) => b.quantity - a.quantity || b.total - a.total || a.name.localeCompare(b.name, "es"))
    .slice(0, limit);
}

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

export type CloudbedsTransaction = {
  id?: string | number;
  amount?: string | number;
  internalCode?: string;
  internalTransactionCode?: string;
  internal_code?: string;
  transactionDatetime?: string;
  transaction_datetime?: string;
  serviceDate?: string;
  service_date?: string;
  currency?: string;
};

type CloudbedsResponse = { transactions?: CloudbedsTransaction[]; content?: CloudbedsTransaction[]; nextPageToken?: string | null; message?: string; errors?: unknown };

function transactionCode(transaction: CloudbedsTransaction) {
  return String(transaction.internalCode ?? transaction.internalTransactionCode ?? transaction.internal_code ?? "").toUpperCase();
}

function transactionDateTime(transaction: CloudbedsTransaction) {
  return transaction.transactionDatetime ?? transaction.transaction_datetime ?? "";
}

function serviceDate(transaction: CloudbedsTransaction) {
  const value = transaction.serviceDate ?? transaction.service_date ?? "";
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

function paymentDescription(transaction: CloudbedsTransaction) {
  return Object.entries(transaction as Record<string, unknown>)
    .filter(([key, value]) => /payment|type|method|name|description|category/i.test(key) && typeof value === "string")
    .map(([, value]) => String(value).toUpperCase())
    .join(" · ");
}

export function getCloudbedsBookingPrepayment(transactions: CloudbedsTransaction[], targetServiceDate: string) {
  let total = 0;
  let paymentCount = 0;
  for (const transaction of transactions) {
    const code = transactionCode(transaction);
    const label = paymentDescription(transaction);
    if (serviceDate(transaction) !== targetServiceDate || !/^9\d{3}(?:A|V)?$/.test(code) || !/PREPAID\s*BOOKING|BOOKING\s*PREPAID/.test(label)) continue;
    const amount = -Number(transaction.amount || 0);
    if (!Number.isFinite(amount)) continue;
    total += amount;
    paymentCount += 1;
  }
  return { total: total.toFixed(2), paymentCount };
}

export function aggregateCloudbedsPaymentsByOperationalDay(transactions: CloudbedsTransaction[], importRunId: number, propertyId: string) {
  const days = new Map<string, { total: number; cash: number; nonCash: number; transactions: Array<Record<string, unknown>> }>();
  for (const transaction of transactions) {
    const code = transactionCode(transaction);
    if (!/^9\d{3}(?:A|V)?$/.test(code)) continue;
    // La Z del Hostel se obtiene del informe Cloudbeds por Fecha de servicio, no por fecha de contabilización.
    const businessDate = serviceDate(transaction);
    if (!businessDate) continue;
    // Cloudbeds registra los cobros como débitos contables; se invierte el signo para mostrar caja recibida.
    const amount = -Number(transaction.amount || 0);
    if (!Number.isFinite(amount)) continue;
    const existing = days.get(businessDate) || { total: 0, cash: 0, nonCash: 0, transactions: [] };
    existing.total += amount;
    if (code.startsWith("9100")) existing.cash += amount;
    else existing.nonCash += amount;
    existing.transactions.push({ id: transaction.id ?? null, internalCode: code, amount: transaction.amount ?? 0, serviceDate: businessDate });
    days.set(businessDate, existing);
  }

  return Array.from(days.entries()).map(([businessDate, day]) => ({
    importRunId,
    provider: "cloudbeds" as const,
    sourceStoreId: propertyId,
    sourceStoreName: "Cloudbeds",
    sourceShiftId: `cloudbeds-${propertyId}-${businessDate}`,
    businessLabel: "Cloudbeds (pagos)",
    businessDate,
    currency: "EUR",
    openingCash: "0",
    closingCash: "0",
    cashSales: day.cash.toFixed(2),
    cardSales: day.nonCash.toFixed(2),
    totalSales: day.total.toFixed(2),
    rawData: JSON.stringify(day.transactions),
  }));
}

export async function fetchCloudbedsTransactions(apiKey: string, propertyId: string, dateFrom: string, dateTo: string) {
  const all: CloudbedsTransaction[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < 50; page += 1) {
    const response = await fetch("https://api.cloudbeds.com/accounting/v1.0/transactions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "X-Property-ID": propertyId, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        filters: { and: [
          { field: "service_date", operator: "greater_than_or_equal", value: dateFrom },
          { field: "service_date", operator: "less_than_or_equal", value: dateTo },
        ] },
        pageToken,
        limit: 1100,
        sort: [{ field: "service_date", direction: "asc" }],
      }),
    });
    const body = await response.text();
    let payload: CloudbedsResponse;
    try { payload = JSON.parse(body) as CloudbedsResponse; }
    catch { throw new Error(`Cloudbeds devolvió una respuesta no JSON (HTTP ${response.status}). Revisa la API key y los permisos read:payment.`); }
    if (!response.ok) throw new Error(payload.message || `Cloudbeds respondió HTTP ${response.status}. Verifica la API key, el Property ID y el permiso read:payment.`);
    // Accounting API devuelve `transactions`; `content` se acepta solo como compatibilidad defensiva.
    all.push(...(payload.transactions || payload.content || []));
    if (!payload.nextPageToken) break;
    pageToken = payload.nextPageToken;
  }
  return all;
}

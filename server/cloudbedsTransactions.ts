export type CloudbedsTransaction = {
  id?: string | number;
  amount?: string | number;
  sourceId?: string | number;
  source_id?: string | number;
  parentId?: string | number;
  parent_id?: string | number;
  internalCode?: string;
  internalTransactionCode?: string;
  internal_code?: string;
  transactionDatetime?: string;
  transaction_datetime?: string;
  serviceDate?: string;
  service_date?: string;
  currency?: string;
  sourceIdentifier?: string;
  sourceKind?: string;
  source_identifier?: string;
  source_kind?: string;
  transactionCategory?: string;
  transaction_category?: string;
  category?: string;
  description?: string;
  notes?: string;
  paymentTypeName?: string;
  paymentMethodName?: string;
  createdAt?: string;
  created_at?: string;
};

type CloudbedsResponse = {
  transactions?: CloudbedsTransaction[];
  content?: CloudbedsTransaction[];
  nextPageToken?: string | null;
  next_page_token?: string | null;
  pagination?: { nextPageToken?: string | null; next_page_token?: string | null };
  message?: string;
  errors?: unknown;
};

export type CloudbedsReservationMovement = {
  id: string | null;
  amount: number;
  currency: string;
  occurredAt: string | null;
  serviceDate: string | null;
  kind: "payment" | "charge";
  label: string;
};

export type CloudbedsReservationPayments = {
  movements: CloudbedsReservationMovement[];
  pendingMovements: CloudbedsReservationMovement[];
  paidTotal: number;
  refundedTotal: number;
  chargeTotal: number;
  pendingChargeTotal: number;
  pendingWarning: string | null;
};

type CloudbedsPostedReservationPayments = Omit<
  CloudbedsReservationPayments,
  "pendingMovements" | "pendingChargeTotal" | "pendingWarning"
>;

type InternalReservationMovement = CloudbedsReservationMovement & {
  isTaxCharge: boolean;
  parentId: string | null;
};

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

function textField(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return null;
}

function numericAmount(value: unknown) {
  const amount = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(amount) ? amount : 0;
}

function getNextPageToken(payload: CloudbedsResponse) {
  return payload.nextPageToken ?? payload.next_page_token ?? payload.pagination?.nextPageToken ?? payload.pagination?.next_page_token ?? null;
}

function isReservationPayment(transaction: CloudbedsTransaction) {
  const combined = [
    transactionCode(transaction),
    paymentDescription(transaction),
    textField(transaction.transactionCategory, transaction.transaction_category, transaction.category) || "",
  ].join(" ").toUpperCase();
  return /^9\d{3}(?:A|V)?\b/.test(transactionCode(transaction)) || /\bPAYMENT\b|\bPAGO\b|\bDEPOSIT\b|\bDEPÓSITO\b/.test(combined);
}

function isTaxCharge(transaction: CloudbedsTransaction) {
  const combined = [
    transaction.description,
    transaction.notes,
    transaction.transactionCategory,
    transaction.transaction_category,
    transaction.category,
  ].filter((value): value is string => typeof value === "string").join(" ").toUpperCase();
  return /\bIVA\b|\bVAT\b|\bTAX\b|IMPUESTO/.test(combined);
}

function isAccommodationCharge(movement: CloudbedsReservationMovement) {
  return /HABITACI[ÓO]N|ALOJAMIENTO|ACCOMMODATION|ROOM|LODGING|STAY/i.test(movement.label);
}

export function summarizeCloudbedsReservationTransactions(transactions: CloudbedsTransaction[]): CloudbedsPostedReservationPayments {
  const movementsWithTaxFlag: InternalReservationMovement[] = transactions.map(transaction => {
    const kind = isReservationPayment(transaction) ? "payment" as const : "charge" as const;
    const label = textField(
      transaction.paymentMethodName,
      transaction.paymentTypeName,
      transaction.description,
      transaction.notes,
      transaction.transactionCategory,
      transaction.transaction_category,
      transaction.category,
      transaction.internalCode,
      transaction.internalTransactionCode,
      transaction.internal_code,
    ) || (kind === "payment" ? "Pago" : "Cargo");
    return {
      id: textField(transaction.id),
      amount: numericAmount(transaction.amount),
      currency: textField(transaction.currency) || "EUR",
      occurredAt: textField(transaction.transactionDatetime, transaction.transaction_datetime, transaction.createdAt, transaction.created_at),
      serviceDate: textField(transaction.serviceDate, transaction.service_date),
      kind,
      label,
      isTaxCharge: kind === "charge" && isTaxCharge(transaction),
      parentId: textField(transaction.parentId, transaction.parent_id),
    };
  });
  const movements: InternalReservationMovement[] = [];
  const deferredTaxes: InternalReservationMovement[] = [];
  for (const movement of movementsWithTaxFlag) {
    if (movement.isTaxCharge) {
      deferredTaxes.push(movement);
      continue;
    }
    movements.push(movement);
  }
  for (const tax of deferredTaxes) {
    const target = [...movements].reverse().find(movement =>
      movement.kind === "charge" &&
      (movement.id === tax.parentId || (!tax.parentId && isAccommodationCharge(movement) && movement.serviceDate === tax.serviceDate))
    );
    if (target) {
      target.amount += tax.amount;
      target.label = "Alojamiento (IVA incluido)";
    } else {
      movements.push({ ...tax, label: `${tax.label} (sin cargo de habitación asociado)` });
    }
  }
  return movements.reduce<CloudbedsPostedReservationPayments>((summary, movement) => {
    if (movement.kind === "payment") {
      if (movement.amount < 0) summary.paidTotal += -movement.amount;
      else if (movement.amount > 0) summary.refundedTotal += movement.amount;
    } else if (movement.amount > 0) {
      summary.chargeTotal += movement.amount;
    }
    const { parentId: _parentId, ...publicMovement } = movement;
    summary.movements.push(publicMovement);
    return summary;
  }, { movements: [], paidTotal: 0, refundedTotal: 0, chargeTotal: 0 });
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
    const token = getNextPageToken(payload);
    if (!token) break;
    pageToken = token;
  }
  return all;
}

export async function fetchCloudbedsReservationPayments(apiKey: string, propertyId: string, reservationId: string) {
  const fetchPages = async (endpoint: "transactions" | "pending-transactions", filters: Array<Record<string, string>>) => {
    const records: CloudbedsTransaction[] = [];
    let pageToken: string | undefined;
    for (let page = 0; page < 50; page += 1) {
    const response = await fetch(`https://api.cloudbeds.com/accounting/v1.0/${endpoint}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "X-Property-ID": propertyId, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        filters: { and: filters },
        pageToken,
        // Cloudbeds documenta `limit` y `sort`; los campos pageSize/orderBy se
        // ignoraban en algunas cuentas y podían dejar fuera noches posteriores.
        limit: 1100,
        sort: [{ field: "service_date", direction: "asc" }],
      }),
    });
    const body = await response.text();
    let payload: CloudbedsResponse;
    try { payload = JSON.parse(body) as CloudbedsResponse; }
    catch { throw new Error(`Cloudbeds devolvió una respuesta no JSON (HTTP ${response.status}). Revisa el permiso read:payment.`); }
    if (!response.ok) throw new Error(payload.message || `Cloudbeds respondió HTTP ${response.status}. Verifica el permiso read:payment.`);
    records.push(...(payload.transactions || payload.content || []));
    const token = getNextPageToken(payload);
    if (!token) break;
    pageToken = token;
    }
    return records;
  };

  // Para reservas, Cloudbeds documenta `source_identifier` como el filtro que
  // devuelve el folio completo. `sourceId` identifica internamente la fuente,
  // pero no debe sustituir el resultado anterior: podía reducir el folio a un
  // subconjunto de movimientos y dejar fuera cargos o ajustes legítimos.
  const posted = await fetchPages("transactions", [
    { field: "source_identifier", operator: "equals", value: reservationId },
    { field: "source_kind", operator: "equals", value: "RESERVATION" },
  ]);
  const uniquePosted = Array.from(new Map(posted.map(transaction => [textField(transaction.id) ?? `${transaction.sourceId ?? transaction.source_id ?? ""}-${transaction.internalCode ?? transaction.internalTransactionCode ?? ""}-${transaction.amount ?? ""}-${transaction.serviceDate ?? transaction.service_date ?? ""}`, transaction])).values());
  const postedSummary = summarizeCloudbedsReservationTransactions(uniquePosted);
  try {
    const pending = await fetchPages("pending-transactions", [
      { field: "source_identifier", operator: "equals", value: reservationId },
      { field: "source_kind", operator: "equals", value: "RESERVATION" },
    ]);
    const uniquePending = Array.from(new Map(pending.map(transaction => [textField(transaction.id) ?? `${transaction.sourceId ?? transaction.source_id ?? ""}-${transaction.internalCode ?? transaction.internalTransactionCode ?? ""}-${transaction.amount ?? ""}-${transaction.serviceDate ?? transaction.service_date ?? ""}`, transaction])).values());
    const pendingSummary = summarizeCloudbedsReservationTransactions(uniquePending);
    return {
      ...postedSummary,
      pendingMovements: pendingSummary.movements.filter(movement => movement.kind === "charge"),
      pendingChargeTotal: pendingSummary.chargeTotal,
      pendingWarning: null,
    };
  } catch (error) {
    return {
      ...postedSummary,
      pendingMovements: [],
      pendingChargeTotal: 0,
      pendingWarning: error instanceof Error ? error.message : "No se han podido consultar los cargos futuros de Cloudbeds.",
    };
  }
}

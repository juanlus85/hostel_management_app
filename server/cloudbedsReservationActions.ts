export type CloudbedsPaymentMethod = {
  value: string;
  label: string;
};

export type CloudbedsReservationSnapshot = {
  reservationStatus: string | null;
  amountPending: string | null;
};

type ApiRecord = Record<string, unknown>;

function asRecord(value: unknown): ApiRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as ApiRecord : {};
}

function text(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return String(value);
  return null;
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    const result = text(value);
    if (result) return result;
  }
  return null;
}

function asList(value: unknown): ApiRecord[] {
  if (Array.isArray(value)) return value.map(asRecord);
  const record = asRecord(value);
  for (const key of ["data", "paymentMethods", "methods", "results"]) {
    if (Array.isArray(record[key])) return record[key].map(asRecord);
  }
  return [];
}

function unwrapReservation(value: unknown): ApiRecord {
  const record = asRecord(value);
  for (const key of ["reservation", "data", "result", "reservationDetails", "reservation_details"]) {
    const candidate = record[key];
    if (Array.isArray(candidate) && candidate.length) return asRecord(candidate[0]);
    const nested = asRecord(candidate);
    if (Object.keys(nested).length) return nested;
  }
  return record;
}

function money(value: unknown) {
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed.toFixed(2) : null;
}

async function cloudbedsJson(url: URL, apiKey: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      "x-api-key": apiKey,
      Accept: "application/json",
      ...init?.headers,
    },
  });
  const body = await response.text();
  let payload: unknown;
  try { payload = JSON.parse(body); }
  catch { throw new Error(`Cloudbeds devolvió una respuesta no JSON (HTTP ${response.status}). Revisa la API key y sus permisos.`); }
  if (!response.ok) {
    const message = firstText(asRecord(payload).message, asRecord(payload).error, asRecord(payload).errorMessage);
    throw new Error(message || `Cloudbeds respondió HTTP ${response.status}. Revisa los permisos de la API key.`);
  }
  if (asRecord(payload).success === false) {
    const message = firstText(asRecord(payload).message, asRecord(payload).error, asRecord(payload).errorMessage);
    throw new Error(message || "Cloudbeds no aceptó la operación solicitada.");
  }
  return payload;
}

export function normalizeCloudbedsPaymentMethods(payload: unknown): CloudbedsPaymentMethod[] {
  const methods = asList(payload)
    .map(method => {
      const value = firstText(method.type, method.paymentType, method.payment_type, method.code, method.value, method.id, method.paymentMethodID, method.payment_method_id);
      const label = firstText(method.name, method.displayName, method.display_name, method.paymentMethodName, method.payment_method_name, method.label, value);
      return value && label ? { value, label } : null;
    })
    .filter((method): method is CloudbedsPaymentMethod => Boolean(method));
  return Array.from(new Map(methods.map(method => [method.value, method])).values());
}

export function extractCloudbedsReservationSnapshot(payload: unknown): CloudbedsReservationSnapshot {
  const reservation = unwrapReservation(payload);
  return {
    reservationStatus: firstText(reservation.status, reservation.reservationStatus, reservation.reservation_status),
    amountPending: money(reservation.balance ?? reservation.amountPending ?? reservation.amount_pending ?? reservation.balanceDue ?? reservation.balance_due),
  };
}

export async function fetchCloudbedsPaymentMethods(apiKey: string, propertyId: string) {
  const url = new URL("https://api.cloudbeds.com/api/v1.3/getPaymentMethods");
  url.searchParams.set("propertyID", propertyId);
  url.searchParams.set("lang", "es");
  return normalizeCloudbedsPaymentMethods(await cloudbedsJson(url, apiKey));
}

export async function fetchCloudbedsReservationSnapshot(apiKey: string, propertyId: string, reservationId: string) {
  const url = new URL("https://api.cloudbeds.com/api/v1.3/getReservation");
  url.searchParams.set("propertyID", propertyId);
  url.searchParams.set("reservationID", reservationId);
  return extractCloudbedsReservationSnapshot(await cloudbedsJson(url, apiKey));
}

export async function recordCloudbedsReservationPayment(input: {
  apiKey: string;
  propertyId: string;
  reservationId: string;
  type: string;
  amount: number;
  description?: string | null;
  isDeposit?: boolean;
}) {
  const body = new URLSearchParams({
    propertyID: input.propertyId,
    reservationID: input.reservationId,
    type: input.type,
    amount: input.amount.toFixed(2),
    isDeposit: input.isDeposit ? "true" : "false",
  });
  if (input.description?.trim()) body.set("description", input.description.trim());
  const payload = await cloudbedsJson(new URL("https://api.cloudbeds.com/api/v1.3/postPayment"), input.apiKey, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  return payload;
}

export async function updateCloudbedsReservationStatus(input: {
  apiKey: string;
  propertyId: string;
  reservationId: string;
  status: "confirmed" | "not_confirmed" | "canceled" | "checked_in" | "checked_out" | "no_show";
}) {
  const body = new URLSearchParams({
    propertyID: input.propertyId,
    reservationID: input.reservationId,
    status: input.status,
    sendStatusChangeEmail: "false",
  });
  return cloudbedsJson(new URL("https://api.cloudbeds.com/api/v1.3/putReservation"), input.apiKey, {
    method: "PUT",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
}

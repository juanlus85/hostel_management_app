export type CloudbedsFiscalDocument = {
  id: string;
  number: string | null;
  kind: string | null;
  status: string | null;
  amount: number | null;
  currency: string | null;
  fileName: string | null;
  createdAt: string | null;
  files: Array<{ id: string | null; name: string | null }>;
};

export type CloudbedsFiscalTransaction = {
  id: number;
  label: string;
  amount: number | null;
  currency: string | null;
};

type ApiRecord = Record<string, unknown>;

function asRecord(value: unknown): ApiRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as ApiRecord)
    : {};
}

function text(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return String(value);
  return null;
}

function decimal(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function fiscalHeaders(token: string, propertyId: string) {
  const cleanToken = token.replace(/^Bearer\s+/i, "").trim();
  return {
    Authorization: `Bearer ${cleanToken}`,
    // La API fiscal requiere Bearer. Conservamos también la cabecera heredada
    // para instalaciones cuyo token de integración aún sea aceptado por ambos servicios.
    "x-api-key": cleanToken,
    "X-Property-ID": propertyId,
    Accept: "application/json",
  };
}

async function fiscalResponse(response: Response) {
  if (response.ok) return response;
  const raw = await response.text();
  let message: string | null = null;
  try {
    const parsed = asRecord(JSON.parse(raw));
    message = text(parsed.message) ?? text(parsed.error) ?? text(parsed.errorMessage);
  } catch {
    // La respuesta no contiene JSON utilizable.
  }
  if (response.status === 401 || response.status === 403) {
    throw new Error(
      "Cloudbeds no autorizó los documentos fiscales. Configura un token Bearer con permiso read:reservation en CLOUDBEDS_FISCAL_ACCESS_TOKEN."
    );
  }
  throw new Error(message || `Cloudbeds respondió HTTP ${response.status} al consultar documentos fiscales.`);
}

export function normalizeCloudbedsFiscalDocuments(payload: unknown): CloudbedsFiscalDocument[] {
  const root = asRecord(payload);
  const source = Array.isArray(root.fiscalDocuments)
    ? root.fiscalDocuments
    : Array.isArray(root.data)
      ? root.data
      : [];

  return source.map(item => {
    const document = asRecord(item);
    const files = Array.isArray(document.files)
      ? document.files.map(file => {
          const record = asRecord(file);
          return {
            id: text(record.id),
            name: text(record.name) ?? text(record.fileName) ?? text(record.filename),
          };
        })
      : [];
    return {
      id: text(document.id) || "",
      number: text(document.number),
      kind: text(document.kind),
      status: text(document.status),
      amount: decimal(document.amount),
      currency: text(document.currency),
      fileName: text(document.fileName) ?? files[0]?.name ?? null,
      createdAt: text(document.createdAt),
      files,
    };
  }).filter(document => Boolean(document.id));
}

export async function fetchCloudbedsFiscalDocuments(input: {
  token: string;
  propertyId: string;
  reservationId: string;
}) {
  const url = new URL("https://api.cloudbeds.com/fiscal-document/v1/fiscal-documents");
  url.searchParams.set("limit", "100");
  url.searchParams.append("sourceIds", input.reservationId);
  url.searchParams.append("sourceKinds", "RESERVATION");
  url.searchParams.set("sort", "createdAt:desc");
  const response = await fetch(url, { headers: fiscalHeaders(input.token, input.propertyId) });
  await fiscalResponse(response);
  return normalizeCloudbedsFiscalDocuments(await response.json());
}

export async function downloadCloudbedsFiscalDocument(input: {
  token: string;
  propertyId: string;
  documentId: string;
  fileId?: string | null;
}) {
  const url = new URL(`https://api.cloudbeds.com/fiscal-document/v1/fiscal-documents/${encodeURIComponent(input.documentId)}/download`);
  if (input.fileId) url.searchParams.set("fileId", input.fileId);
  const response = await fetch(url, { headers: fiscalHeaders(input.token, input.propertyId) });
  await fiscalResponse(response);
  const contentType = response.headers.get("content-type") || "application/pdf";
  const disposition = response.headers.get("content-disposition") || "";
  const match = disposition.match(/filename\*?=(?:UTF-8''|\")?([^;\"]+)/i);
  const fileName = match?.[1] ? decodeURIComponent(match[1].trim()) : null;
  return {
    dataBase64: Buffer.from(await response.arrayBuffer()).toString("base64"),
    contentType,
    fileName,
  };
}

export async function fetchCloudbedsFiscalTransactions(input: {
  token: string;
  propertyId: string;
  reservationId: string;
  documentKind: "INVOICE" | "RECEIPT";
}) {
  const sourceId = Number(input.reservationId);
  if (!Number.isInteger(sourceId) || sourceId <= 0) throw new Error("Cloudbeds no ha devuelto un identificador numérico válido para esta reserva.");
  const url = new URL("https://api.cloudbeds.com/fiscal-document/v1/fiscal-documents/transactions");
  url.searchParams.set("sourceId", String(sourceId));
  url.searchParams.set("sourceKind", "RESERVATION");
  url.searchParams.set("documentKind", input.documentKind);
  url.searchParams.set("limit", "100");
  url.searchParams.set("nestTaxes", "true");
  const response = await fetch(url, { headers: fiscalHeaders(input.token, input.propertyId) });
  await fiscalResponse(response);
  const root = asRecord(await response.json());
  const source = Array.isArray(root.transactions) ? root.transactions : Array.isArray(root.data) ? root.data : Array.isArray(root.items) ? root.items : [];
  return source.map(item => {
    const transaction = asRecord(item);
    return {
      id: Number(transaction.id ?? transaction.transactionId),
      label: text(transaction.description) ?? text(transaction.name) ?? text(transaction.internalCode) ?? "Movimiento Cloudbeds",
      amount: decimal(transaction.displayAmount ?? transaction.amount),
      currency: text(transaction.currency),
    };
  }).filter((item): item is CloudbedsFiscalTransaction => Number.isInteger(item.id) && item.id > 0);
}

async function createFiscalDocument(input: {
  token: string;
  propertyId: string;
  reservationId: string;
  guestId: number;
  userId?: number;
  kind: "invoice" | "receipt";
  transactionIds: number[];
}) {
  const sourceId = Number(input.reservationId);
  if (!Number.isInteger(sourceId) || sourceId <= 0 || !Number.isInteger(input.guestId) || input.guestId <= 0) {
    throw new Error("Cloudbeds no ha devuelto los identificadores necesarios para emitir este documento.");
  }
  const recipient = { type: "GUEST", id: input.guestId };
  const payload = input.kind === "invoice"
    ? { transactionIds: input.transactionIds, sourceId, sourceKind: "RESERVATION", guestId: input.guestId, recipient }
    : { transactionIds: input.transactionIds, sourceId, sourceKind: "RESERVATION", userId: input.userId, recipient };
  if (input.kind === "receipt" && (!input.userId || input.userId < 0)) {
    throw new Error("Configura CLOUDBEDS_FISCAL_USER_ID con el identificador de usuario de Cloudbeds para emitir recibos.");
  }
  const endpoint = input.kind === "invoice" ? "invoice" : "simple-receipt";
  const response = await fetch(`https://api.cloudbeds.com/fiscal-document/v1/fiscal-documents/${endpoint}`, {
    method: "POST",
    headers: { ...fiscalHeaders(input.token, input.propertyId), "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  await fiscalResponse(response);
  return await response.json() as unknown;
}

export async function createCloudbedsFiscalDocument(input: {
  token: string;
  propertyId: string;
  reservationId: string;
  guestId: number;
  userId?: number;
  kind: "invoice" | "receipt";
  transactionIds: number[];
}) {
  return createFiscalDocument(input);
}

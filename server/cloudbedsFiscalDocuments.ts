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

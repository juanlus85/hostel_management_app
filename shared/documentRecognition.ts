export type RecognizedDocumentFields = Record<string, unknown>;

function isUseful(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  return Boolean(normalized && !["unknown", "n/a", "null", "undefined", "-"].includes(normalized));
}

function isMasked(value: unknown) {
  return typeof value === "string" && /[•*x]/i.test(value);
}

function quality(value: unknown) {
  if (!isUseful(value)) return 0;
  return value.replace(/\s/g, "").length + (/\d/.test(value) ? 2 : 0);
}

/**
 * Protects data entered by a guest while enriching blank or masked fields
 * from a second side of an identity document.
 */
export function mergeRecognizedDocumentFields<T extends object>(current: T, recognized: RecognizedDocumentFields): T {
  const existing = current as Record<string, unknown>;
  const merged: Record<string, unknown> = { ...existing };
  for (const [key, rawValue] of Object.entries(recognized)) {
    if (!isUseful(rawValue)) continue;
    const currentValue = existing[key];
    if (!isUseful(currentValue) || isMasked(currentValue) || quality(rawValue) > quality(currentValue) + 2) {
      merged[key] = rawValue;
    }
  }
  return merged as T;
}

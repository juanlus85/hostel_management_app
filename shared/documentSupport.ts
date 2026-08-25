import { COUNTRIES } from "./countries";

export function isEuropeanNationality(nationality: string | null | undefined): boolean {
  return COUNTRIES.find((country) => country.code === nationality)?.isEU === true;
}

export function requiresDocumentSupport(documentType: string | null | undefined, nationality?: string | null): boolean {
  const type = documentType?.trim().toUpperCase();
  if (type === "NIF" || type === "DNI") return true;
  return type === "NIE" && isEuropeanNationality(nationality);
}

export function normalizedDocumentSupport(documentType: string | null | undefined, nationality: string | null | undefined, support: string | null | undefined): string | undefined {
  if (!requiresDocumentSupport(documentType, nationality)) return undefined;
  return support?.trim() || undefined;
}

export function requiresDocumentSupport(documentType: string | null | undefined): boolean {
  const type = documentType?.trim().toUpperCase();
  return type === "NIF" || type === "DNI" || type === "NIE";
}

export function normalizedDocumentSupport(documentType: string | null | undefined, support: string | null | undefined): string | undefined {
  if (!requiresDocumentSupport(documentType)) return undefined;
  return support?.trim() || undefined;
}

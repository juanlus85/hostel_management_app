export type SupportedInvoiceContentType = "application/pdf" | "image/jpeg" | "image/png" | "image/webp";

export function getSupportedInvoiceContentType(file: { name: string; type: string }): SupportedInvoiceContentType | null {
  const name = file.name.toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf")) return "application/pdf";
  if (file.type === "image/jpeg" || file.type === "image/jpg" || name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (file.type === "image/png" || name.endsWith(".png")) return "image/png";
  if (file.type === "image/webp" || name.endsWith(".webp")) return "image/webp";
  return null;
}

export const ISSUER_BUSINESSES = ["The Spot Central Hostel", "Sweet & Salty", "Organizus"] as const;
export type IssuerBusiness = typeof ISSUER_BUSINESSES[number];

export function issuedInvoiceFileName(issuerBusiness: IssuerBusiness, invoiceDate: string, extension: string): string {
  const date = new Date(`${invoiceDate}T12:00:00`);
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  const shortDate = `${String(date.getDate()).padStart(2, "0")}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getFullYear()).slice(-2)}`;
  return `EMITIDA - ${issuerBusiness} - ${quarter}T ${date.getFullYear()} - ${shortDate}.${extension.replace(/^\./, "").toLowerCase()}`;
}

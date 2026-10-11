import { amountMatchesSearch } from "./amountSearch";

export type InvoiceBusinessScope = "all" | "hostel" | "tienda" | "organizus";

export type SearchableIssuedInvoice = {
  issuerBusiness: string;
  recipient?: string | null;
  invoiceNumber?: string | null;
  totalAmount?: string | number | null;
};

const ISSUER_BY_SCOPE: Record<Exclude<InvoiceBusinessScope, "all">, string> = {
  hostel: "The Spot Central Hostel",
  tienda: "Sweet & Salty",
  organizus: "Organizus",
};

export function filterIssuedInvoices<T extends SearchableIssuedInvoice>(invoices: T[] = [], scope: InvoiceBusinessScope, searchTerm: string) {
  const term = searchTerm.trim().toLocaleLowerCase("es");
  return invoices.filter(invoice => {
    if (scope !== "all" && invoice.issuerBusiness !== ISSUER_BY_SCOPE[scope]) return false;
    if (!term) return true;
    return [invoice.issuerBusiness, invoice.recipient, invoice.invoiceNumber]
      .some(value => value?.toLocaleLowerCase("es").includes(term)) || amountMatchesSearch(invoice.totalAmount, searchTerm);
  });
}

import { describe, expect, it } from "vitest";
import { filterIssuedInvoices } from "../shared/issuedInvoiceFilters";

const invoices = [
  { id: 1, issuerBusiness: "The Spot Central Hostel", recipient: "Empresa Sevilla", invoiceNumber: "H-1", totalAmount: "125.50" },
  { id: 2, issuerBusiness: "Sweet & Salty", recipient: "Café Centro", invoiceNumber: "T-2", totalAmount: "50.00" },
  { id: 3, issuerBusiness: "Organizus", recipient: "Organizus Cliente", invoiceNumber: "O-3", totalAmount: "875.00" },
];

describe("filterIssuedInvoices", () => {
  it("aplica el negocio seleccionado a las facturas emitidas", () => {
    expect(filterIssuedInvoices(invoices, "hostel", "").map(invoice => invoice.id)).toEqual([1]);
    expect(filterIssuedInvoices(invoices, "organizus", "").map(invoice => invoice.id)).toEqual([3]);
  });

  it("busca por empresa, número e importe", () => {
    expect(filterIssuedInvoices(invoices, "all", "café").map(invoice => invoice.id)).toEqual([2]);
    expect(filterIssuedInvoices(invoices, "all", "H-1").map(invoice => invoice.id)).toEqual([1]);
    expect(filterIssuedInvoices(invoices, "all", "875").map(invoice => invoice.id)).toEqual([3]);
  });
});

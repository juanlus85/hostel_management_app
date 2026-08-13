import { describe, expect, it } from "vitest";
import { getSupportedInvoiceContentType } from "../shared/invoiceUpload";

describe("getSupportedInvoiceContentType", () => {
  it("allows the PDF and image formats available in manual upload", () => {
    expect(getSupportedInvoiceContentType({ name: "factura.PDF", type: "" })).toBe("application/pdf");
    expect(getSupportedInvoiceContentType({ name: "ticket.jpg", type: "image/jpeg" })).toBe("image/jpeg");
    expect(getSupportedInvoiceContentType({ name: "factura.png", type: "image/png" })).toBe("image/png");
    expect(getSupportedInvoiceContentType({ name: "ticket.webp", type: "image/webp" })).toBe("image/webp");
  });

  it("rejects unsupported manual uploads", () => {
    expect(getSupportedInvoiceContentType({ name: "documento.docx", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" })).toBeNull();
  });
});

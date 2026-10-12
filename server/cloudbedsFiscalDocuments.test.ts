import { describe, expect, it } from "vitest";
import { normalizeCloudbedsFiscalDocuments } from "./cloudbedsFiscalDocuments";

describe("documentos fiscales de Cloudbeds", () => {
  it("normaliza documentos oficiales y sus archivos descargables", () => {
    expect(normalizeCloudbedsFiscalDocuments({
      fiscalDocuments: [{
        id: 42,
        number: "F-2026-001",
        kind: "INVOICE",
        status: "COMPLETED",
        amount: 123.45,
        currency: "EUR",
        fileName: "factura.pdf",
        createdAt: "2026-10-12T10:00:00Z",
        files: [{ id: null, name: "factura.pdf" }, { id: "copy", filename: "factura-copia.pdf" }],
      }],
    })).toEqual([{
      id: "42",
      number: "F-2026-001",
      kind: "INVOICE",
      status: "COMPLETED",
      amount: 123.45,
      currency: "EUR",
      fileName: "factura.pdf",
      createdAt: "2026-10-12T10:00:00Z",
      files: [{ id: null, name: "factura.pdf" }, { id: "copy", name: "factura-copia.pdf" }],
    }]);
  });

  it("tolera respuestas vacías del servicio fiscal", () => {
    expect(normalizeCloudbedsFiscalDocuments({ fiscalDocuments: [] })).toEqual([]);
    expect(normalizeCloudbedsFiscalDocuments({})).toEqual([]);
  });
});

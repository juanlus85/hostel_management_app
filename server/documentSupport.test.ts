import { describe, expect, it } from "vitest";
import { normalizedDocumentSupport, requiresDocumentSupport } from "../shared/documentSupport";
import { getAllowedDocumentTypes, isAllowedDocumentType } from "../shared/countries";

describe("número de soporte documental", () => {
  it("es obligatorio para DNI/NIF y solo para NIE europeo", () => {
    expect(requiresDocumentSupport("NIF", "ESP")).toBe(true);
    expect(requiresDocumentSupport("DNI", "ESP")).toBe(true);
    expect(requiresDocumentSupport("NIE", "FRA")).toBe(true);
    expect(requiresDocumentSupport("NIE", "GBR")).toBe(false);
    expect(requiresDocumentSupport("NIE", "USA")).toBe(false);
    expect(requiresDocumentSupport("CAR", "ESP")).toBe(false);
    expect(requiresDocumentSupport("PAS", "FRA")).toBe(false);
  });

  it("incluye DNI/NIF, NIE, carnet de conducir y pasaporte para españoles", () => {
    expect(getAllowedDocumentTypes("ESP").map((document) => document.code)).toEqual(["NIF", "NIE", "CAR", "PAS"]);
    expect(getAllowedDocumentTypes("FRA").map((document) => document.code)).toEqual(["NIE", "ID", "PAS"]);
    expect(getAllowedDocumentTypes("USA").map((document) => document.code)).toEqual(["PAS"]);
    expect(isAllowedDocumentType("ESP", "CAR")).toBe(true);
    expect(isAllowedDocumentType("FRA", "ID")).toBe(true);
    expect(isAllowedDocumentType("USA", "NIE")).toBe(false);
  });
  it("elimina el soporte de pasaportes y otros documentos", () => {
    expect(normalizedDocumentSupport("PAS", "FRA", "ABC123")).toBeUndefined();
    expect(normalizedDocumentSupport("OTRO", "ESP", "ABC123")).toBeUndefined();
    expect(normalizedDocumentSupport("NIE", "FRA", "  ABC123  ")).toBe("ABC123");
    expect(normalizedDocumentSupport("NIE", "USA", "ABC123")).toBeUndefined();
    expect(normalizedDocumentSupport("NIF", "USA", "  DNI-123  ")).toBe("DNI-123");
  });
});

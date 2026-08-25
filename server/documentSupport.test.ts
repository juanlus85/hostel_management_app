import { describe, expect, it } from "vitest";
import { normalizedDocumentSupport, requiresDocumentSupport } from "../shared/documentSupport";

describe("número de soporte documental", () => {
  it("es obligatorio para DNI/NIF y solo para NIE europeo", () => {
    expect(requiresDocumentSupport("NIF", "ESP")).toBe(true);
    expect(requiresDocumentSupport("DNI", "ESP")).toBe(true);
    expect(requiresDocumentSupport("NIE", "FRA")).toBe(true);
    expect(requiresDocumentSupport("NIE", "USA")).toBe(false);
    expect(requiresDocumentSupport("PAS", "FRA")).toBe(false);
  });
  it("elimina el soporte de pasaportes y otros documentos", () => {
    expect(normalizedDocumentSupport("PAS", "FRA", "ABC123")).toBeUndefined();
    expect(normalizedDocumentSupport("OTRO", "ESP", "ABC123")).toBeUndefined();
    expect(normalizedDocumentSupport("NIE", "FRA", "  ABC123  ")).toBe("ABC123");
    expect(normalizedDocumentSupport("NIE", "USA", "ABC123")).toBeUndefined();
    expect(normalizedDocumentSupport("NIF", "USA", "  DNI-123  ")).toBe("DNI-123");
  });
});

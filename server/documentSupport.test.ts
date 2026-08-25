import { describe, expect, it } from "vitest";
import { normalizedDocumentSupport, requiresDocumentSupport } from "../shared/documentSupport";

describe("número de soporte documental", () => {
  it("es obligatorio solamente para DNI/NIF y NIE", () => {
    expect(requiresDocumentSupport("NIF")).toBe(true);
    expect(requiresDocumentSupport("DNI")).toBe(true);
    expect(requiresDocumentSupport("NIE")).toBe(true);
    expect(requiresDocumentSupport("PAS")).toBe(false);
    expect(requiresDocumentSupport("OTRO")).toBe(false);
  });
  it("elimina el soporte de pasaportes y otros documentos", () => {
    expect(normalizedDocumentSupport("PAS", "ABC123")).toBeUndefined();
    expect(normalizedDocumentSupport("NIE", "  ABC123  ")).toBe("ABC123");
  });
});

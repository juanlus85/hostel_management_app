import { describe, expect, it } from "vitest";
import { mergeRecognizedDocumentFields } from "../shared/documentRecognition";

describe("mergeRecognizedDocumentFields", () => {
  it("keeps valid existing data and fills missing fields from the reverse side", () => {
    const merged = mergeRecognizedDocumentFields(
      { firstName: "Lucía", documentNumber: "12345678Z", birthDate: "", documentSupport: "" },
      { firstName: "Lucia", documentNumber: "12345678Z", birthDate: "1992-04-18", documentSupport: "ABC123" },
    );
    expect(merged).toEqual({ firstName: "Lucía", documentNumber: "12345678Z", birthDate: "1992-04-18", documentSupport: "ABC123" });
  });

  it("replaces a masked recognition with a complete value and ignores placeholders", () => {
    const merged = mergeRecognizedDocumentFields(
      { documentNumber: "1234****", city: "Sevilla" },
      { documentNumber: "12345678Z", city: "", province: "unknown" },
    );
    expect(merged).toEqual({ documentNumber: "12345678Z", city: "Sevilla" });
  });

  it("keeps equal values but upgrades a clearly more complete recognition", () => {
    const merged = mergeRecognizedDocumentFields(
      { firstName: "Ana", documentNumber: "12345678Z" },
      { firstName: "Ana María", documentNumber: "12345678Z" },
    );
    expect(merged).toEqual({ firstName: "Ana María", documentNumber: "12345678Z" });
  });
});

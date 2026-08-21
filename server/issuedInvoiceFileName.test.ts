import { describe, expect, it } from "vitest";
import { issuedInvoiceFileName } from "../shared/issuedInvoiceFileName";

describe("issuedInvoiceFileName", () => {
  it("genera el nombre solicitado para facturas emitidas", () => {
    expect(issuedInvoiceFileName("The Spot Central Hostel", "2026-08-20", "PDF")).toBe("EMITIDA - The Spot Central Hostel - 3T 2026 - 200826.pdf");
  });
});

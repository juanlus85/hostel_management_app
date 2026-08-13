import { describe, expect, it } from "vitest";
import { findCommercialSupplier } from "../shared/supplierMatching";

describe("findCommercialSupplier", () => {
  const suppliers = [
    { id: 1, name: "O2", legalName: "Telefónica de España, S.A.U." },
    { id: 2, name: "Coca-Cola", legalName: "Coca-Cola Europacific Partners Iberia, S.L.U." },
  ];

  it("maps a recognized legal name to its commercial supplier", () => {
    expect(findCommercialSupplier(suppliers, "Telefonica de Espana S.A.U.")).toMatchObject({
      id: 1,
      name: "O2",
    });
  });

  it("matches a supplier commercial name regardless of accents and punctuation", () => {
    expect(findCommercialSupplier(suppliers, "coca cola")).toMatchObject({
      id: 2,
      name: "Coca-Cola",
    });
  });
});

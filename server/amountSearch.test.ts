import { describe, expect, it } from "vitest";
import { amountMatchesSearch } from "../shared/amountSearch";

describe("amountMatchesSearch", () => {
  it("encuentra importes con punto, coma o símbolo euro", () => {
    expect(amountMatchesSearch("1234.56", "1.234,56 €")).toBe(true);
    expect(amountMatchesSearch("1234.56", "1234.56")).toBe(true);
    expect(amountMatchesSearch("1234.56", "1234")).toBe(true);
  });

  it("no confunde importes diferentes", () => {
    expect(amountMatchesSearch("1234.56", "987")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { formatInventoryQuantity } from "../shared/inventoryQuantityDisplay";

describe("formatInventoryQuantity", () => {
  it("formats valid quantities with es-ES and zero decimals", () => {
    expect(formatInventoryQuantity("12.4")).toBe("12");
    expect(formatInventoryQuantity("12.5")).toBe("13");
    expect(formatInventoryQuantity(1234.5)).toBe("1235");
  });

  it("shows an em dash for missing or unknown quantities", () => {
    expect(formatInventoryQuantity(null)).toBe("—");
    expect(formatInventoryQuantity(undefined)).toBe("—");
    expect(formatInventoryQuantity("")).toBe("—");
    expect(formatInventoryQuantity("   ")).toBe("—");
    expect(formatInventoryQuantity("no disponible")).toBe("—");
    expect(formatInventoryQuantity(Number.NaN)).toBe("—");
  });

  it("does not alter the source value", () => {
    const source = "1.75";
    formatInventoryQuantity(source);
    expect(source).toBe("1.75");
  });
});

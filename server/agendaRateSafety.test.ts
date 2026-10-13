import { describe, expect, it } from "vitest";
import { hasAgendaRateChanged, isLargeAgendaRateChange, parseAgendaRate } from "../client/src/lib/agendaRateSafety";

describe("agendaRateSafety", () => {
  it("acepta importes decimales españoles", () => {
    expect(parseAgendaRate("99,99")).toBe(99.99);
  });

  it("identifica únicamente las modificaciones reales", () => {
    expect(hasAgendaRateChanged({ previousRate: 99.99, rateText: "99.99" })).toBe(false);
    expect(hasAgendaRateChanged({ previousRate: 99.99, rateText: "89.99" })).toBe(true);
  });

  it("advierte bajadas y subidas inusualmente grandes", () => {
    expect(isLargeAgendaRateChange({ previousRate: 99.99, rateText: "9.99" })).toBe(true);
    expect(isLargeAgendaRateChange({ previousRate: 40, rateText: "90" })).toBe(true);
    expect(isLargeAgendaRateChange({ previousRate: 99.99, rateText: "89.99" })).toBe(false);
  });
});

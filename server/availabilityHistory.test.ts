import { describe, expect, it } from "vitest";
import { buildAvailabilityHistory } from "../client/src/lib/availabilityHistory";

describe("buildAvailabilityHistory", () => {
  it("sums all availability sources only within the same exact weekly date", () => {
    const { allWeeks } = buildAvailabilityHistory([
      { weekStart: "2026-02-16", amount: "100" },
      { weekStart: "2026-02-16", amount: "25.50" },
      { weekStart: "2026-02-23", amount: "200" },
    ]);

    expect(allWeeks).toHaveLength(2);
    expect(allWeeks[0]).toMatchObject({ key: "2026-02-16", label: "16/02/26", totals: { 2026: 125.5 } });
    expect(allWeeks[1]).toMatchObject({ key: "2026-02-23", label: "23/02/26", totals: { 2026: 200 } });
  });

  it("keeps annual data independent and orders weeks by their actual date", () => {
    const { allWeeks, yearsWithData } = buildAvailabilityHistory([
      { weekStart: "2026-01-05", amount: "50" },
      { weekStart: "2025-12-29", amount: "40" },
      { weekStart: "2026-01-12", amount: "60" },
    ]);

    expect(yearsWithData).toEqual([2025, 2026]);
    expect(allWeeks.map((week) => week.key)).toEqual(["2025-12-29", "2026-01-05", "2026-01-12"]);
  });
});

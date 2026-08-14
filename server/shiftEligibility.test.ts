import { canBeScheduled } from "../shared/shiftEligibility";
import { describe, expect, it } from "vitest";

describe("shift eligibility", () => {
  it("excludes Tablet profiles from staff scheduling", () => {
    expect(canBeScheduled("tablet")).toBe(false);
  });

  it("keeps operational staff eligible for schedules", () => {
    expect(canBeScheduled("admin")).toBe(true);
    expect(canBeScheduled("user")).toBe(true);
    expect(canBeScheduled("housekeeping")).toBe(true);
  });
});

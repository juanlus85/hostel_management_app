import { describe, expect, it } from "vitest";
import { canAccessOnlineGuide, dayAfter, effectiveGuideExpiry } from "@shared/onlineGuideAccess";

describe("online arrival-guide access", () => {
  it("keeps a completed guide accessible throughout the following day", () => {
    const link = { status: "completed" as const, checkInDate: "2026-08-13", expiresAt: "2026-08-13" };
    expect(effectiveGuideExpiry(link)).toBe("2026-08-14");
    expect(canAccessOnlineGuide(link, "2026-08-14")).toBe(true);
    expect(canAccessOnlineGuide(link, "2026-08-15")).toBe(false);
  });

  it("keeps pending links accessible but never reopens cancelled links", () => {
    expect(dayAfter("2026-12-31")).toBe("2027-01-01");
    expect(canAccessOnlineGuide({ status: "pending", checkInDate: "2026-08-13", expiresAt: "2026-08-14" }, "2026-08-14")).toBe(true);
    expect(canAccessOnlineGuide({ status: "cancelled", checkInDate: "2026-08-13", expiresAt: "2026-08-20" }, "2026-08-13")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { hasInvitationEmail, onlineGuestToken } from "../shared/onlineCheckinGuests";

describe("online group guest persistence", () => {
  it("reserves the public-link token for the principal guest only", () => {
    expect(onlineGuestToken("secure-token", 0)).toBe("secure-token");
    expect(onlineGuestToken("secure-token", 1)).toBeNull();
  });

  it("only validates invitation emails when reception provided one", () => {
    expect(hasInvitationEmail("")).toBe(false);
    expect(hasInvitationEmail("   ")).toBe(false);
    expect(hasInvitationEmail("guest@example.com")).toBe(true);
  });
});

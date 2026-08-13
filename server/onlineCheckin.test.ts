import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";

describe("Check-in Online router", () => {
  it("registers the protected management procedures", () => {
    expect(appRouter._def.procedures["checkin.online.list"]).toBeDefined();
    expect(appRouter._def.procedures["checkin.online.createLink"]).toBeDefined();
    expect(appRouter._def.procedures["checkin.online.cancel"]).toBeDefined();
  });

  it("registers public access and completion procedures", () => {
    expect(appRouter._def.procedures["checkin.online.getPublic"]).toBeDefined();
    expect(appRouter._def.procedures["checkin.online.completePublic"]).toBeDefined();
  });
});

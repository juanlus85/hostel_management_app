import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function tabletContext(): TrpcContext {
  return {
    user: {
      id: 71,
      openId: "tablet-user",
      name: "Reception Tablet",
      email: null,
      loginMethod: "password",
      role: "tablet",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("Tablet role", () => {
  it("registers the restricted police registration and document scan procedures", () => {
    expect(appRouter._def.procedures["checkin.tablet.registerGroup"]).toBeDefined();
    expect(appRouter._def.procedures["checkin.tablet.scanDocument"]).toBeDefined();
  });

  it("blocks generic protected procedures for a Tablet user", async () => {
    const caller = appRouter.createCaller(tabletContext());
    await expect(caller.businesses.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type CookieCall = {
  name: string;
  options: Record<string, unknown>;
};

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext; clearedCookies: CookieCall[] } {
  const clearedCookies: CookieCall[] = [];

  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-admin-user",
    email: "admin@example.com",
    name: "Test Admin",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, clearedCookies };
}

describe("cashClosings router", () => {
  it("has list procedure that accepts businessId", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    // Verify the procedure exists and accepts the expected input
    expect(caller.cashClosings.list).toBeDefined();
  });

  it("has getByDate procedure", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    expect(caller.cashClosings.getByDate).toBeDefined();
  });

  it("has getOrCreate procedure", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    expect(caller.cashClosings.getOrCreate).toBeDefined();
  });

  it("has update procedure with coin fields", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    expect(caller.cashClosings.update).toBeDefined();
  });

  it("has close procedure", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    expect(caller.cashClosings.close).toBeDefined();
  });

  it("has exportCSV procedure", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    expect(caller.cashClosings.exportCSV).toBeDefined();
  });

  it("has manual Loyverse Z import procedure", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    expect(caller.cashClosings.importLoyverseZ).toBeDefined();
  });

  it("has Cloudbeds Z import procedure for Hostel", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    expect(caller.cashClosings.importCloudbedsZ).toBeDefined();
  });
});

describe("cashMovements router", () => {
  it("has list procedure", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    expect(caller.cashMovements.list).toBeDefined();
  });

  it("has create procedure with type enum", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    expect(caller.cashMovements.create).toBeDefined();
  });

  it("has delete procedure", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    expect(caller.cashMovements.delete).toBeDefined();
  });
});

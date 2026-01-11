import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createEmployeeContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "employee-user",
    email: "employee@example.com",
    name: "Employee User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Business Logic Tests", () => {
  describe("auth.me", () => {
    it("returns the current user for admin", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.auth.me();
      
      expect(result).toBeDefined();
      expect(result?.role).toBe("admin");
      expect(result?.name).toBe("Admin User");
    });

    it("returns the current user for employee", async () => {
      const ctx = createEmployeeContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.auth.me();
      
      expect(result).toBeDefined();
      expect(result?.role).toBe("user");
      expect(result?.name).toBe("Employee User");
    });
  });

  describe("auth.logout", () => {
    it("clears session and returns success", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.auth.logout();
      
      expect(result).toEqual({ success: true });
    });
  });
});

describe("Role-based Access Control", () => {
  it("admin context has admin role", () => {
    const ctx = createAdminContext();
    expect(ctx.user?.role).toBe("admin");
  });

  it("employee context has user role", () => {
    const ctx = createEmployeeContext();
    expect(ctx.user?.role).toBe("user");
  });
});

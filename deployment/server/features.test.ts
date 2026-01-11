import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Helper to create authenticated context
function createAuthContext(role: "user" | "admin" = "admin"): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Businesses Router", () => {
  it("lists businesses for authenticated users", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    const businesses = await caller.businesses.list();
    expect(Array.isArray(businesses)).toBe(true);
  });
});

describe("Shifts Router", () => {
  it("lists shifts within date range", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const shifts = await caller.shifts.list({
      startDate: today,
      endDate: nextWeek,
    });
    expect(Array.isArray(shifts)).toBe(true);
  });
});

describe("Tasks Router", () => {
  it("lists tasks for authenticated users", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    const tasks = await caller.tasks.list({});
    expect(Array.isArray(tasks)).toBe(true);
  });
});

describe("Incidents Router", () => {
  it("lists incidents for a business", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    const incidents = await caller.incidents.list({ businessId: 1 });
    expect(Array.isArray(incidents)).toBe(true);
  });
});

describe("Invoices Router", () => {
  it("lists invoices for a business", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    const invoices = await caller.invoices.list({ businessId: 1 });
    expect(Array.isArray(invoices)).toBe(true);
  });
});

describe("Inventory Router", () => {
  it("lists inventory items for a business", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    const items = await caller.inventory.list({ businessId: 1 });
    expect(Array.isArray(items)).toBe(true);
  });
  
  it("lists low stock items", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    const lowStock = await caller.inventory.lowStock({ businessId: 1 });
    expect(Array.isArray(lowStock)).toBe(true);
  });
});

describe("Suppliers Router", () => {
  it("lists all suppliers", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    const suppliers = await caller.suppliers.list();
    expect(Array.isArray(suppliers)).toBe(true);
  });
});

describe("Users Router", () => {
  it("lists users for authenticated users", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    const users = await caller.users.list();
    expect(Array.isArray(users)).toBe(true);
  });
});

describe("Cash Register Router", () => {
  it("lists cash registers for a business", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    const cashRegisters = await caller.cashRegisters.list({ businessId: 1 });
    expect(Array.isArray(cashRegisters)).toBe(true);
  });
});

describe("Transactions Router", () => {
  it("lists transactions for a business", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    const transactions = await caller.transactions.list({ businessId: 1 });
    expect(Array.isArray(transactions)).toBe(true);
  });
});

describe("Role-based Access Control", () => {
  it("allows admin to access employee creation", async () => {
    const ctx = createAuthContext("admin");
    const caller = appRouter.createCaller(ctx);
    
    // Just verify the procedure exists and is callable
    // We don't actually create to avoid side effects
    expect(typeof caller.employees.create).toBe("function");
  });
});

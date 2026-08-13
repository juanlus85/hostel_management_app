import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createAuthenticatedContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "invoice-test-user",
      email: "invoice-test@example.com",
      name: "Invoice Test",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("invoices.create validation", () => {
  it("rejects an invoice with an empty supplier before writing to the database", async () => {
    const caller = appRouter.createCaller(createAuthenticatedContext());

    await expect(caller.invoices.create({
      businessId: 1,
      supplier: "   ",
      totalAmount: "12.50",
      hasVAT: true,
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("ocr.processInvoiceFile availability", () => {
  it("is registered in the application router", () => {
    expect(appRouter._def.procedures["ocr.processInvoiceFile"]).toBeDefined();
  });
});

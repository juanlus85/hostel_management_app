import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import {
  addCostcoOrderItem,
  getCostcoOrder,
  listCostco,
  removeCostcoOrderItem,
  resetCostcoOrder,
  setCostcoBinding,
  setCostcoOrderItem,
  validateCostcoId,
} from "./costcoStore";

// Exactamente la política de inventoryProducts.list, incluido bloqueo de tablet.
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Solo administradores pueden realizar esta acción",
    });
  }
  return next({ ctx });
});
const catalogId = z
  .string()
  .min(1)
  .max(100)
  .refine(id => {
    try {
      validateCostcoId(id);
      return true;
    } catch {
      return false;
    }
  }, "Artículo Costco desconocido");
const idInput = z.object({ id: catalogId });
const success = () => ({ success: true }) as const;

export const costcoRouter = router({
  list: adminProcedure.query(() => listCostco()),
  setBinding: adminProcedure
    .input(
      z.object({
        id: catalogId,
        inventoryProductId: z
          .number()
          .int()
          .positive()
          .max(2147483647)
          .nullable(),
      })
    )
    .mutation(async ({ input }) => {
      await setCostcoBinding(input.id, input.inventoryProductId);
      return success();
    }),
  order: adminProcedure.query(() => getCostcoOrder()),
  setOrderItem: adminProcedure
    .input(
      z.object({
        id: catalogId,
        quantity: z.number().int().min(0).max(100000).optional(),
        unitsPerPackage: z.number().int().min(1).max(100000).optional(),
      })
    )
    .mutation(async ({ input }) => {
      await setCostcoOrderItem(input);
      return success();
    }),
  addOrderItem: adminProcedure.input(idInput).mutation(async ({ input }) => {
    await addCostcoOrderItem(input.id);
    return success();
  }),
  removeOrderItem: adminProcedure.input(idInput).mutation(async ({ input }) => {
    await removeCostcoOrderItem(input.id);
    return success();
  }),
  resetOrder: adminProcedure.mutation(async () => {
    await resetCostcoOrder();
    return success();
  }),
});

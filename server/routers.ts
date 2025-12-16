import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "./db";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Solo administradores pueden realizar esta acción' });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ==================== USERS ====================
  users: router({
    list: protectedProcedure.query(async () => {
      return db.getAllUsers();
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return db.getUserById(input.id);
    }),
    update: adminProcedure.input(z.object({
      id: z.number(),
      name: z.string().optional(),
      email: z.string().optional(),
      role: z.enum(["user", "admin"]).optional(),
      pin: z.string().max(6).optional(),
      isActive: z.boolean().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateUser(id, data);
      return { success: true };
    }),
  }),

  // ==================== BUSINESSES ====================
  businesses: router({
    list: protectedProcedure.query(async () => {
      return db.getAllBusinesses();
    }),
    getByCode: protectedProcedure.input(z.object({ code: z.string() })).query(async ({ input }) => {
      return db.getBusinessByCode(input.code);
    }),
    initialize: adminProcedure.mutation(async () => {
      await db.initializeBusinesses();
      return { success: true };
    }),
  }),

  // ==================== SHIFTS ====================
  shifts: router({
    list: protectedProcedure.input(z.object({
      startDate: z.string(),
      endDate: z.string(),
    })).query(async ({ input }) => {
      return db.getShiftsByDateRange(input.startDate, input.endDate);
    }),
    listByUser: protectedProcedure.input(z.object({
      userId: z.number(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    })).query(async ({ input }) => {
      return db.getShiftsByUser(input.userId, input.startDate, input.endDate);
    }),
    create: adminProcedure.input(z.object({
      userId: z.number(),
      scheduledDate: z.string(),
      scheduledStart: z.string(),
      scheduledEnd: z.string(),
      notes: z.string().optional(),
    })).mutation(async ({ input }) => {
      const id = await db.createShift(input);
      return { success: true, id };
    }),
    update: adminProcedure.input(z.object({
      id: z.number(),
      scheduledDate: z.string().optional(),
      scheduledStart: z.string().optional(),
      scheduledEnd: z.string().optional(),
      notes: z.string().optional(),
      status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]).optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateShift(id, data);
      return { success: true };
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteShift(input.id);
      return { success: true };
    }),
    clockIn: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.clockIn(input.id);
      return { success: true };
    }),
    clockOut: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.clockOut(input.id);
      return { success: true };
    }),
  }),

  // ==================== CASH REGISTERS ====================
  cashRegisters: router({
    list: protectedProcedure.input(z.object({
      businessId: z.number(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    })).query(async ({ input }) => {
      return db.getCashRegistersByBusiness(input.businessId, input.startDate, input.endDate);
    }),
    getOpen: protectedProcedure.input(z.object({
      businessId: z.number(),
    })).query(async ({ input, ctx }) => {
      return db.getOpenCashRegister(input.businessId, ctx.user.id);
    }),
    open: protectedProcedure.input(z.object({
      businessId: z.number(),
      openingAmount: z.string(),
      shiftId: z.number().optional(),
    })).mutation(async ({ input, ctx }) => {
      const today = new Date().toISOString().split('T')[0];
      const id = await db.createCashRegister({
        businessId: input.businessId,
        userId: ctx.user.id,
        date: today,
        openingAmount: input.openingAmount,
        shiftId: input.shiftId,
      });
      return { success: true, id };
    }),
    close: protectedProcedure.input(z.object({
      id: z.number(),
      closingAmount: z.string(),
      notes: z.string().optional(),
    })).mutation(async ({ input }) => {
      await db.closeCashRegister(input.id, input.closingAmount, input.notes);
      return { success: true };
    }),
    updateWithdrawals: protectedProcedure.input(z.object({
      id: z.number(),
      cashWithdrawn: z.string().optional(),
      cardWithdrawn: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateCashRegister(id, data);
      return { success: true };
    }),
  }),

  // ==================== TRANSACTIONS ====================
  transactions: router({
    list: protectedProcedure.input(z.object({
      businessId: z.number(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    })).query(async ({ input }) => {
      return db.getTransactionsByBusiness(input.businessId, input.startDate, input.endDate);
    }),
    create: protectedProcedure.input(z.object({
      businessId: z.number(),
      cashRegisterId: z.number().optional(),
      type: z.enum(["income", "expense"]),
      category: z.string().optional(),
      concept: z.string(),
      amount: z.string(),
      paymentMethod: z.enum(["cash", "card", "transfer", "cuenta_bancaria", "ana", "juanlu", "caja_hostel", "caja_tienda", "caja_fuerte", "caja_fuerte_cambio", "other"]).default("cash"),
      date: z.string(),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const id = await db.createTransaction({ ...input, userId: ctx.user.id });
      return { success: true, id };
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      type: z.enum(["income", "expense"]).optional(),
      category: z.string().optional(),
      concept: z.string().optional(),
      amount: z.string().optional(),
      paymentMethod: z.enum(["cash", "card", "transfer", "cuenta_bancaria", "ana", "juanlu", "caja_hostel", "caja_tienda", "caja_fuerte", "caja_fuerte_cambio", "other"]).optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateTransaction(id, data);
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteTransaction(input.id);
      return { success: true };
    }),
  }),

  // ==================== INVOICES ====================
  invoices: router({
    list: protectedProcedure.input(z.object({
      businessId: z.number(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    })).query(async ({ input }) => {
      return db.getInvoicesByBusiness(input.businessId, input.startDate, input.endDate);
    }),
    create: protectedProcedure.input(z.object({
      businessId: z.number(),
      supplier: z.string().optional(),
      invoiceNumber: z.string().optional(),
      invoiceDate: z.string().optional(),
      baseAmount: z.string().optional(),
      vatRate: z.string().optional(),
      vatAmount: z.string().optional(),
      totalAmount: z.string().optional(),
      paymentMethod: z.enum(["cuenta_bancaria", "tarjeta", "ana", "juanlu", "caja_hostel", "caja_tienda", "caja_fuerte", "caja_fuerte_cambio", "otros"]).optional(),
      imageUrl: z.string().optional(),
      imageKey: z.string().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const id = await db.createInvoice({ ...input, userId: ctx.user.id });
      return { success: true, id };
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      supplier: z.string().optional(),
      invoiceNumber: z.string().optional(),
      invoiceDate: z.string().optional(),
      baseAmount: z.string().optional(),
      vatRate: z.string().optional(),
      vatAmount: z.string().optional(),
      totalAmount: z.string().optional(),
      paymentMethod: z.enum(["cuenta_bancaria", "tarjeta", "ana", "juanlu", "caja_hostel", "caja_tienda", "caja_fuerte", "caja_fuerte_cambio", "otros"]).optional(),
      ocrData: z.string().optional(),
      ocrStatus: z.enum(["pending", "processing", "completed", "failed"]).optional(),
      isVerified: z.boolean().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateInvoice(id, data);
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteInvoice(input.id);
      return { success: true };
    }),
  }),

  // ==================== INVENTORY ====================
  inventory: router({
    list: protectedProcedure.input(z.object({
      businessId: z.number(),
    })).query(async ({ input }) => {
      return db.getInventoryByBusiness(input.businessId);
    }),
    lowStock: protectedProcedure.input(z.object({
      businessId: z.number(),
    })).query(async ({ input }) => {
      return db.getLowStockItems(input.businessId);
    }),
    create: protectedProcedure.input(z.object({
      businessId: z.number(),
      name: z.string(),
      category: z.string().optional(),
      supplier: z.string().optional(),
      currentStock: z.string().default("0"),
      minimumStock: z.string().default("0"),
      unit: z.string().default("unidad"),
      costPrice: z.string().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input }) => {
      const id = await db.createInventoryItem(input);
      return { success: true, id };
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      name: z.string().optional(),
      category: z.string().optional(),
      supplier: z.string().optional(),
      currentStock: z.string().optional(),
      minimumStock: z.string().optional(),
      unit: z.string().optional(),
      costPrice: z.string().optional(),
      notes: z.string().optional(),
      isActive: z.boolean().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateInventoryItem(id, data);
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({
      id: z.number(),
    })).mutation(async ({ input }) => {
      await db.deleteInventoryItem(input.id);
      return { success: true };
    }),
    adjustStock: protectedProcedure.input(z.object({
      itemId: z.number(),
      quantity: z.number(),
      type: z.enum(["in", "out", "adjustment"]),
      reason: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      await db.adjustStock(input.itemId, ctx.user.id, input.quantity, input.type, input.reason);
      return { success: true };
    }),
  }),

  // ==================== ORDERS ====================
  orders: router({
    list: protectedProcedure.input(z.object({
      businessId: z.number(),
      status: z.string().optional(),
    })).query(async ({ input }) => {
      return db.getOrdersByBusiness(input.businessId, input.status);
    }),
    getItems: protectedProcedure.input(z.object({
      orderId: z.number(),
    })).query(async ({ input }) => {
      return db.getOrderItems(input.orderId);
    }),
    create: protectedProcedure.input(z.object({
      businessId: z.number(),
      supplier: z.string().optional(),
      orderDate: z.string(),
      expectedDelivery: z.string().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const id = await db.createOrder({ ...input, userId: ctx.user.id });
      return { success: true, id };
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      supplier: z.string().optional(),
      expectedDelivery: z.string().optional(),
      actualDelivery: z.string().optional(),
      status: z.enum(["pending", "ordered", "delivered", "cancelled"]).optional(),
      totalAmount: z.string().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateOrder(id, data);
      return { success: true };
    }),
    addItem: protectedProcedure.input(z.object({
      orderId: z.number(),
      inventoryItemId: z.number().optional(),
      itemName: z.string(),
      quantity: z.string(),
      unitPrice: z.string().optional(),
      totalPrice: z.string().optional(),
    })).mutation(async ({ input }) => {
      await db.addOrderItem(input);
      return { success: true };
    }),
  }),

  // ==================== INCIDENTS ====================
  incidents: router({
    list: protectedProcedure.input(z.object({
      businessId: z.number(),
      status: z.string().optional(),
    })).query(async ({ input }) => {
      return db.getIncidentsByBusiness(input.businessId, input.status);
    }),
    create: protectedProcedure.input(z.object({
      businessId: z.number(),
      title: z.string(),
      description: z.string().optional(),
      priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
    })).mutation(async ({ input, ctx }) => {
      const id = await db.createIncident({ ...input, userId: ctx.user.id });
      return { success: true, id };
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      title: z.string().optional(),
      description: z.string().optional(),
      priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
      status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      if (data.status === "resolved" || data.status === "closed") {
        await db.updateIncident(id, { ...data, resolvedAt: new Date(), resolvedBy: ctx.user.id });
      } else {
        await db.updateIncident(id, data);
      }
      return { success: true };
    }),
  }),

  // ==================== TASKS ====================
  tasks: router({
    list: protectedProcedure.input(z.object({
      businessId: z.number().optional(),
      assignedTo: z.number().optional(),
      status: z.string().optional(),
    })).query(async ({ input }) => {
      return db.getTasks(input.businessId, input.assignedTo, input.status);
    }),
    create: protectedProcedure.input(z.object({
      businessId: z.number().optional(),
      assignedTo: z.number().optional(),
      title: z.string(),
      description: z.string().optional(),
      priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
      dueDate: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const id = await db.createTask({ ...input, createdBy: ctx.user.id });
      return { success: true, id };
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      title: z.string().optional(),
      description: z.string().optional(),
      assignedTo: z.number().optional(),
      priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
      status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional(),
      dueDate: z.string().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      if (data.status === "completed") {
        await db.updateTask(id, { ...data, completedAt: new Date() });
      } else {
        await db.updateTask(id, data);
      }
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteTask(input.id);
      return { success: true };
    }),
  }),

  // ==================== OCR ====================
  ocr: router({
    processInvoice: protectedProcedure.input(z.object({
      imageUrl: z.string(),
    })).mutation(async ({ input }) => {
      const { invokeLLM } = await import("./_core/llm");
      
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `Eres un asistente especializado en extraer datos de facturas y tickets. 
            Extrae la siguiente información de la imagen:
            - supplier: nombre del proveedor/empresa
            - invoiceNumber: número de factura (si existe)
            - invoiceDate: fecha de la factura (formato YYYY-MM-DD)
            - baseAmount: importe base sin IVA
            - vatRate: porcentaje de IVA
            - vatAmount: importe del IVA
            - totalAmount: importe total
            
            Responde SOLO con un JSON válido con estos campos. Si no puedes extraer algún campo, usa null.`
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Extrae los datos de esta factura:" },
              { type: "image_url", image_url: { url: input.imageUrl } }
            ]
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "invoice_data",
            strict: true,
            schema: {
              type: "object",
              properties: {
                supplier: { type: ["string", "null"], description: "Nombre del proveedor" },
                invoiceNumber: { type: ["string", "null"], description: "Número de factura" },
                invoiceDate: { type: ["string", "null"], description: "Fecha en formato YYYY-MM-DD" },
                baseAmount: { type: ["string", "null"], description: "Importe base sin IVA" },
                vatRate: { type: ["string", "null"], description: "Porcentaje de IVA" },
                vatAmount: { type: ["string", "null"], description: "Importe del IVA" },
                totalAmount: { type: ["string", "null"], description: "Importe total" },
              },
              required: ["supplier", "invoiceNumber", "invoiceDate", "baseAmount", "vatRate", "vatAmount", "totalAmount"],
              additionalProperties: false,
            },
          },
        },
      });
      
      try {
        const content = response.choices[0]?.message?.content;
        if (content && typeof content === 'string') {
          return JSON.parse(content);
        }
        return null;
      } catch (e) {
        console.error("Error parsing OCR response:", e);
        return null;
      }
    }),
  }),

  // ==================== SUPPLIERS ====================
  suppliers: router({
    list: protectedProcedure.query(async () => {
      return db.getAllSuppliers();
    }),
    create: adminProcedure.input(z.object({
      name: z.string(),
      contactName: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      address: z.string().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input }) => {
      const id = await db.createSupplier(input);
      return { success: true, id };
    }),
    update: adminProcedure.input(z.object({
      id: z.number(),
      name: z.string().optional(),
      contactName: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      address: z.string().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateSupplier(id, data);
      return { success: true };
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteSupplier(input.id);
      return { success: true };
    }),
  }),

  // ==================== SHIFT TEMPLATES ====================
  shiftTemplates: router({
    list: protectedProcedure.query(async () => {
      return db.getAllShiftTemplates();
    }),
    create: adminProcedure.input(z.object({
      name: z.string(),
      dayOfWeek: z.number().min(0).max(6),
      userId: z.number(),
      scheduledStart: z.string(),
      scheduledEnd: z.string(),
    })).mutation(async ({ input }) => {
      const id = await db.createShiftTemplate(input);
      return { success: true, id };
    }),
    update: adminProcedure.input(z.object({
      id: z.number(),
      name: z.string().optional(),
      dayOfWeek: z.number().min(0).max(6).optional(),
      userId: z.number().optional(),
      scheduledStart: z.string().optional(),
      scheduledEnd: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateShiftTemplate(id, data);
      return { success: true };
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteShiftTemplate(input.id);
      return { success: true };
    }),
    generate: adminProcedure.input(z.object({
      startDate: z.string(),
      endDate: z.string(),
    })).mutation(async ({ input }) => {
      await db.generateShiftsFromTemplates(input.startDate, input.endDate);
      return { success: true };
    }),
  }),

  // ==================== EMPLOYEE MANAGEMENT ====================
  employees: router({
    create: adminProcedure.input(z.object({
      name: z.string(),
      email: z.string(),
      role: z.enum(["user", "admin"]).default("user"),
    })).mutation(async ({ input }) => {
      const id = await db.createEmployee(input.name, input.email, input.role);
      return { success: true, id };
    }),
  }),

  // ==================== CASH REGISTER AUTO ====================
  cashAuto: router({
    getOrCreate: protectedProcedure.input(z.object({
      businessId: z.number(),
      date: z.string(),
    })).mutation(async ({ input, ctx }) => {
      return db.getOrCreateDailyCashRegister(input.businessId, ctx.user.id, input.date);
    }),
  }),

  // ==================== DASHBOARD ====================
  dashboard: router({
    stats: protectedProcedure.input(z.object({
      businessId: z.number(),
      startDate: z.string(),
      endDate: z.string(),
    })).query(async ({ input }) => {
      return db.getDashboardStats(input.businessId, input.startDate, input.endDate);
    }),
    hoursWorked: protectedProcedure.input(z.object({
      userId: z.number(),
      startDate: z.string(),
      endDate: z.string(),
    })).query(async ({ input }) => {
      return db.getHoursWorkedByUser(input.userId, input.startDate, input.endDate);
    }),
  }),
});

export type AppRouter = typeof appRouter;

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

// Housekeeping procedure (housekeeping role or admin)
const housekeepingProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'housekeeping' && ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Solo housekeeping puede realizar esta acción' });
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
    // Login with username and password
    login: publicProcedure.input(z.object({
      username: z.string(),
      password: z.string(),
    })).mutation(async ({ input, ctx }) => {
      const user = await db.verifyUserPassword(input.username, input.password);
      if (!user) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Usuario o contraseña incorrectos' });
      }
      if (!user.isActive) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Usuario desactivado' });
      }
      // Update last signed in
      await db.updateUser(user.id, { lastSignedIn: new Date() });
      // Create session token using SDK
      const { sdk } = await import("./_core/sdk");
      const { ONE_YEAR_MS } = await import("@shared/const");
      const token = await sdk.createSessionToken(user.openId, { name: user.name || "", expiresInMs: ONE_YEAR_MS });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      return { success: true, user: { id: user.id, name: user.name, role: user.role } };
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
      role: z.enum(["user", "admin", "housekeeping"]).optional(),
      pin: z.string().max(6).optional(),
      isActive: z.boolean().optional(),
      scheduleTemplate: z.string().optional(), // JSON string with weekly schedule template
      color: z.string().optional(), // Color for calendar display
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateUser(id, data);
      return { success: true };
    }),
    delete: adminProcedure.input(z.object({ userId: z.number() })).mutation(async ({ input, ctx }) => {
      // Prevent deleting yourself
      if (ctx.user.id === input.userId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No puedes eliminarte a ti mismo" });
      }
      await db.deleteUser(input.userId);
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
      
      // Send notification and email
      const user = await db.getUserById(input.userId);
      if (user) {
        // Create in-app notification
        await db.createNotification({
          userId: input.userId,
          type: "shift_assigned",
          title: "Nuevo turno asignado",
          message: `Se te ha asignado un turno el ${input.scheduledDate} de ${input.scheduledStart} a ${input.scheduledEnd}`,
          relatedShiftId: id,
        });
        
        // Send email if user has email
        if (user.email) {
          const { sendShiftNotificationEmail } = await import("./email");
          await sendShiftNotificationEmail(
            user.email,
            user.name || "Empleado",
            "assigned",
            input.scheduledDate,
            input.scheduledStart,
            input.scheduledEnd
          );
        }
      }
      
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
      
      // Get shift before update to get userId and send notification
      const shift = await db.getShiftById(id);
      await db.updateShift(id, data);
      
      // Send notification if shift date/time changed
      if (shift && (data.scheduledDate || data.scheduledStart || data.scheduledEnd)) {
        const user = await db.getUserById(shift.userId);
        if (user) {
          const newDate = data.scheduledDate || shift.scheduledDate;
          const newStart = data.scheduledStart || shift.scheduledStart;
          const newEnd = data.scheduledEnd || shift.scheduledEnd;
          
          await db.createNotification({
            userId: shift.userId,
            type: "shift_modified",
            title: "Turno modificado",
            message: `Tu turno del ${newDate} ha sido modificado: ${newStart} - ${newEnd}`,
            relatedShiftId: id,
          });
          
          if (user.email) {
            const { sendShiftNotificationEmail } = await import("./email");
            await sendShiftNotificationEmail(
              user.email,
              user.name || "Empleado",
              "modified",
              newDate,
              newStart,
              newEnd
            );
          }
        }
      }
      
      return { success: true };
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      // Get shift before delete to send notification
      const shift = await db.getShiftById(input.id);
      
      if (shift) {
        const user = await db.getUserById(shift.userId);
        if (user) {
          await db.createNotification({
            userId: shift.userId,
            type: "shift_deleted",
            title: "Turno eliminado",
            message: `Tu turno del ${shift.scheduledDate} (${shift.scheduledStart} - ${shift.scheduledEnd}) ha sido eliminado`,
          });
          
          if (user.email) {
            const { sendShiftNotificationEmail } = await import("./email");
            await sendShiftNotificationEmail(
              user.email,
              user.name || "Empleado",
              "deleted",
              shift.scheduledDate,
              shift.scheduledStart,
              shift.scheduledEnd
            );
          }
        }
      }
      
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
    // Generate shifts for a month based on employee schedule templates
    generateFromTemplates: adminProcedure.input(z.object({
      year: z.number(),
      month: z.number(), // 1-12
    })).mutation(async ({ input }) => {
      const { year, month } = input;
      const users = await db.getAllUsers();
      let created = 0;
      let skipped = 0;
      
      // Get existing shifts for the month to avoid duplicates
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
      const existingShifts = await db.getShiftsByDateRange(startDate, endDate);
      const existingSet = new Set(existingShifts.map(s => `${s.userId}-${s.scheduledDate}`));
      
      // Day of week mapping (0 = Sunday, 1 = Monday, etc.)
      const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      
      for (const user of users) {
        if (!user.scheduleTemplate) continue;
        
        try {
          const template = JSON.parse(user.scheduleTemplate);
          
          // Iterate through each day of the month
          for (let day = 1; day <= lastDay; day++) {
            const date = new Date(year, month - 1, day);
            const dayOfWeek = date.getDay();
            const dayKey = dayKeys[dayOfWeek];
            const schedule = template[dayKey];
            
            if (schedule && schedule.start && schedule.end) {
              const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              
              // Check if shift already exists
              if (existingSet.has(`${user.id}-${dateStr}`)) {
                skipped++;
                continue;
              }
              
              await db.createShift({
                userId: user.id,
                scheduledDate: dateStr,
                scheduledStart: schedule.start,
                scheduledEnd: schedule.end,
              });
              created++;
            }
          }
        } catch (e) {
          console.error(`Error parsing schedule template for user ${user.id}:`, e);
        }
      }
      
      return { success: true, created, skipped };
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
      hasVAT: z.boolean().default(true),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const id = await db.createInvoice({ ...input, userId: ctx.user.id, updatedBy: ctx.user.id });
      
      // Send email notification with invoice
      try {
        console.log("[Invoices] Sending email notification for invoice:", input.invoiceNumber, "with file:", input.imageUrl);
        const { sendInvoiceNotificationEmail } = await import("./email");
        const emailResult = await sendInvoiceNotificationEmail(
          input.invoiceNumber || "Sin número",
          input.supplier || "Sin proveedor",
          parseFloat(input.totalAmount || "0"),
          input.invoiceDate || new Date().toISOString().split('T')[0],
          input.paymentMethod || "otros",
          input.notes || null,
          input.imageUrl || null
        );
        console.log("[Invoices] Email notification result:", emailResult);
      } catch (error) {
        console.error("[Invoices] Failed to send email notification:", error);
      }
      
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
      isScanned: z.boolean().optional(),
      hasVAT: z.boolean().optional(),
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
    uploadFile: protectedProcedure.input(z.object({
      fileData: z.string(), // base64 encoded file
      fileName: z.string(),
      contentType: z.string(),
    })).mutation(async ({ input }) => {
      const fs = await import('fs');
      const path = await import('path');
      
      // Decode base64 to buffer
      const base64Data = input.fileData.split(',')[1] || input.fileData;
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Generate unique file name
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const extension = input.fileName.split('.').pop() || 'pdf';
      const fileName = `${timestamp}-${randomSuffix}.${extension}`;
      
      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(process.cwd(), 'uploads', 'invoices');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      // Save file to disk
      const filePath = path.join(uploadsDir, fileName);
      fs.writeFileSync(filePath, buffer);
      
      // Generate URL (relative to server root)
      const url = `/uploads/invoices/${fileName}`;
      const key = `invoices/${fileName}`;
      
      console.log(`[Upload] File saved locally: ${filePath}`);
      console.log(`[Upload] File URL: ${url}`);
      return { url, key };
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
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteIncident(input.id);
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
      email: z.string().optional(),
      username: z.string(),
      password: z.string().min(4),
      role: z.enum(["user", "admin", "housekeeping"]).default("user"),
    })).mutation(async ({ input }) => {
      const id = await db.createEmployeeWithCredentials(input.name, input.email, input.username, input.password, input.role);
      return { success: true, id };
    }),
    updatePassword: adminProcedure.input(z.object({
      userId: z.number(),
      newPassword: z.string().min(4),
    })).mutation(async ({ input }) => {
      await db.updateUserPassword(input.userId, input.newPassword);
      return { success: true };
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

  // ==================== CASH CLOSINGS (Cierres de Caja Detallados) ====================
  cashClosings: router({
    list: protectedProcedure.input(z.object({
      businessId: z.number(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    })).query(async ({ input }) => {
      return db.getCashClosingsByBusiness(input.businessId, input.startDate, input.endDate);
    }),
    getByDate: protectedProcedure.input(z.object({
      businessId: z.number(),
      date: z.string(),
    })).query(async ({ input }) => {
      return db.getCashClosingByDate(input.businessId, input.date);
    }),
    getOrCreate: protectedProcedure.input(z.object({
      businessId: z.number(),
      date: z.string(),
    })).mutation(async ({ input, ctx }) => {
      return db.getOrCreateCashClosing(input.businessId, ctx.user.id, input.date);
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      coins010: z.number().optional(),
      coins020: z.number().optional(),
      coins050: z.number().optional(),
      coins100: z.number().optional(),
      coins200: z.number().optional(),
      bills5: z.number().optional(),
      bills10: z.number().optional(),
      bills20: z.number().optional(),
      bills50: z.number().optional(),
      totalCash: z.string().optional(),
      totalCards: z.string().optional(),
      zReading: z.string().optional(),
      prepaidBooking: z.string().optional(),
      withdrawnCash: z.string().optional(),
      withdrawnCards: z.string().optional(),
      expectedTotal: z.string().optional(),
      actualTotal: z.string().optional(),
      difference: z.string().optional(),
      changeForNextDay: z.string().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateCashClosing(id, data);
      return { success: true };
    }),
    close: protectedProcedure.input(z.object({
      id: z.number(),
    })).mutation(async ({ input }) => {
      await db.closeCashClosing(input.id);
      return { success: true };
    }),
    reopen: protectedProcedure.input(z.object({
      id: z.number(),
    })).mutation(async ({ input }) => {
      await db.reopenCashClosing(input.id);
      return { success: true };
    }),
    exportCSV: protectedProcedure.input(z.object({
      businessId: z.number(),
      startDate: z.string(),
      endDate: z.string(),
    })).query(async ({ input }) => {
      return db.exportCashClosingsToCSV(input.businessId, input.startDate, input.endDate);
    }),
  }),

  // ==================== CASH MOVEMENTS ====================
  cashMovements: router({
    list: protectedProcedure.input(z.object({
      cashClosingId: z.number(),
    })).query(async ({ input }) => {
      return db.getCashMovementsByClosing(input.cashClosingId);
    }),
    create: protectedProcedure.input(z.object({
      cashClosingId: z.number(),
      type: z.enum(["in", "out"]),
      description: z.string(),
      amount: z.string(),
    })).mutation(async ({ input }) => {
      const id = await db.createCashMovement(input);
      return { success: true, id };
    }),
    delete: protectedProcedure.input(z.object({
      id: z.number(),
    })).mutation(async ({ input }) => {
      await db.deleteCashMovement(input.id);
      return { success: true };
    }),
  }),

  // ==================== NOTIFICATIONS ====================
  notifications: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getNotificationsByUser(ctx.user.id);
    }),
    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      return db.getUnreadNotificationsCount(ctx.user.id);
    }),
    markAsRead: protectedProcedure.input(z.object({
      id: z.number(),
    })).mutation(async ({ input }) => {
      await db.markNotificationAsRead(input.id);
      return { success: true };
    }),
    markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
      await db.markAllNotificationsAsRead(ctx.user.id);
      return { success: true };
    }),
  }),

  // ==================== SETTINGS (Configuración) ====================
  settings: router({
    getSMTP: adminProcedure.query(async () => {
      const { getSMTPConfig } = await import("./email");
      const config = await getSMTPConfig();
      // Don't return password for security
      if (config) {
        return { ...config, password: config.password ? "********" : "" };
      }
      return null;
    }),
    saveSMTP: adminProcedure.input(z.object({
      host: z.string(),
      port: z.number(),
      secure: z.boolean(),
      user: z.string(),
      password: z.string(),
      fromEmail: z.string(),
      fromName: z.string(),
    })).mutation(async ({ input }) => {
      const { saveSMTPConfig, getSMTPConfig } = await import("./email");
      // If password is masked, keep the old one
      if (input.password === "********") {
        const oldConfig = await getSMTPConfig();
        if (oldConfig) {
          input.password = oldConfig.password;
        }
      }
      await saveSMTPConfig(input);
      return { success: true };
    }),
    testSMTP: adminProcedure.input(z.object({
      host: z.string(),
      port: z.number(),
      secure: z.boolean(),
      user: z.string(),
      password: z.string(),
      fromEmail: z.string(),
      fromName: z.string(),
    })).mutation(async ({ input }) => {
      const { testSMTPConnection, getSMTPConfig } = await import("./email");
      // If password is masked, use the old one
      if (input.password === "********") {
        const oldConfig = await getSMTPConfig();
        if (oldConfig) {
          input.password = oldConfig.password;
        }
      }
      return testSMTPConnection(input);
    }),
  }),

  // ==================== ROOM STATUS ====================
  roomStatus: router({
    getByDate: housekeepingProcedure.input(z.object({
      date: z.string(),
    })).query(async ({ input }) => {
      return db.getRoomStatusByDate(input.date);
    }),
    update: housekeepingProcedure.input(z.object({
      roomNumber: z.string(),
      date: z.string(),
      status: z.enum(["checkout", "continues", "empty", "ready"]),
      beds: z.number().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      return db.updateRoomStatus({
        ...input,
        updatedBy: ctx.user.id,
      });
    }),
  }),

  // ==================== OTROS GASTOS ====================
  otrosGastos: router({
    list: adminProcedure.input(z.object({
      businessId: z.number(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    })).query(async ({ input }) => {
      return db.listOtrosGastos(input.businessId, input.startDate, input.endDate);
    }),
    create: adminProcedure.input(z.object({
      businessId: z.number(),
      concepto: z.string(),
      categoria: z.enum(["sueldos", "seguridad_social", "impuestos", "seguros", "otros"]),
      categoriaOtros: z.string().optional(),
      importe: z.string(),
      fecha: z.string(),
      notas: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const id = await db.createOtroGasto({ ...input, createdBy: ctx.user.id });
      return { success: true, id };
    }),
    update: adminProcedure.input(z.object({
      id: z.number(),
      concepto: z.string().optional(),
      categoria: z.enum(["sueldos", "seguridad_social", "impuestos", "seguros", "otros"]).optional(),
      categoriaOtros: z.string().optional(),
      importe: z.string().optional(),
      fecha: z.string().optional(),
      notas: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateOtroGasto(id, data);
      return { success: true };
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteOtroGasto(input.id);
      return { success: true };
    }),
    getTotal: adminProcedure.input(z.object({
      businessId: z.number(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    })).query(async ({ input }) => {
      return db.getTotalOtrosGastos(input.businessId, input.startDate, input.endDate);
    }),
  }),
});

export type AppRouter = typeof appRouter;

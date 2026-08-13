import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { randomBytes } from "node:crypto";
import * as db from "./db";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Solo administradores pueden realizar esta acción' });
  }
  return next({ ctx });
});

// Housekeeping procedure (admin, user, or housekeeping role)
const housekeepingProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'housekeeping' && ctx.user.role !== 'admin' && ctx.user.role !== 'user') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'No tienes permisos para acceder a esta sección' });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  
  // Global utility procedures
  utils: router({
    // Get available years from database (for all modules)
    getAvailableYears: protectedProcedure.query(async () => {
      return db.getAvailableYears();
    }),
  }),
  
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
      supplier: z.string().trim().min(1, "El proveedor es obligatorio"),
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
      supplier: z.string().trim().min(1, "El proveedor es obligatorio").optional(),
      invoiceNumber: z.string().optional(),
      invoiceDate: z.string().optional(),
      baseAmount: z.string().optional(),
      vatRate: z.string().optional(),
      vatAmount: z.string().optional(),
      totalAmount: z.string().optional(),
      paymentMethod: z.enum(["cuenta_bancaria", "tarjeta", "ana", "juanlu", "caja_hostel", "caja_tienda", "caja_fuerte", "caja_fuerte_cambio", "otros"]).optional(),
      imageUrl: z.string().optional(),
      imageKey: z.string().optional(),
      ocrData: z.string().optional(),
      ocrStatus: z.enum(["pending", "processing", "completed", "failed"]).optional(),
      isVerified: z.boolean().optional(),
      isScanned: z.boolean().optional(),
      hasVAT: z.boolean().optional(),
      notes: z.string().optional(),
      resendEmail: z.boolean().optional(), // Flag para reenviar email
    })).mutation(async ({ input, ctx }) => {
      const { id, resendEmail, ...data } = input;
      await db.updateInvoice(id, data);
      
      // Si se solicita reenviar email y hay imagen
      if (resendEmail && data.imageUrl) {
        try {
          const invoice = await db.getInvoiceById(id);
          if (invoice) {
            const { sendInvoiceNotificationEmail } = await import("./email");
            await sendInvoiceNotificationEmail(
              invoice.invoiceNumber || "Sin número",
              invoice.supplier || "Sin proveedor",
              parseFloat(invoice.totalAmount || "0"),
              invoice.invoiceDate || new Date().toISOString().split('T')[0],
              invoice.paymentMethod || "otros",
              invoice.notes || null,
              data.imageUrl
            );
          }
        } catch (error) {
          console.error("[Invoices] Failed to resend email:", error);
        }
      }
      
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
      
      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(process.cwd(), 'uploads', 'invoices');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      // Use provided fileName and add numbering if file exists
      const extension = input.fileName.split('.').pop() || 'pdf';
      const baseNameWithoutExt = input.fileName.substring(0, input.fileName.lastIndexOf('.'));
      
      let fileName = input.fileName;
      let counter = 2;
      
      // Check if file exists and increment counter
      while (fs.existsSync(path.join(uploadsDir, fileName))) {
        fileName = `${baseNameWithoutExt} (${counter}).${extension}`;
        counter++;
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
      // Get OpenAI API key from database
      const apiKeySetting = await db.getSetting("openai_api_key");
      if (!apiKeySetting?.settingValue) {
        throw new Error("OpenAI API key not configured. Please add it in Settings.");
      }
      
      const apiKey = apiKeySetting.settingValue;
      
      // Call OpenAI API directly
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
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
        }),
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${error}`);
      }
      
      const data = await response.json();
      
      try {
        const content = data.choices[0]?.message?.content;
        if (content && typeof content === 'string') {
          return JSON.parse(content);
        }
        return null;
      } catch (e) {
        console.error("Error parsing OCR response:", e);
        return null;
      }
    }),

    processInvoiceFile: protectedProcedure.input(z.object({
      fileData: z.string(),
      fileName: z.string(),
      contentType: z.enum(["application/pdf", "image/jpeg", "image/png", "image/webp"]),
    })).mutation(async ({ input }) => {
      const apiKeySetting = await db.getSetting("openai_api_key");
      if (!apiKeySetting?.settingValue) {
        throw new Error("API Key de OpenAI no configurada. Añádela en Configuración antes de analizar facturas.");
      }

      const apiKey = apiKeySetting.settingValue;
      const base64Data = input.fileData.split(",")[1] || input.fileData;
      const fileBuffer = Buffer.from(base64Data, "base64");
      const safeFileName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_") || "factura";

      const fileForm = new FormData();
      fileForm.append("purpose", "user_data");
      fileForm.append("file", new Blob([fileBuffer], { type: input.contentType }), safeFileName);

      const uploadResponse = await fetch("https://api.openai.com/v1/files", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: fileForm,
      });

      if (!uploadResponse.ok) {
        const error = await uploadResponse.text();
        throw new Error(`No se pudo enviar el documento a OpenAI: ${error}`);
      }

      const uploadedFile: any = await uploadResponse.json();

      try {
        const analysisResponse = await fetch("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o",
            input: [{
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: "Extrae los datos de esta factura. Devuelve proveedor, número de factura, fecha YYYY-MM-DD, base imponible, porcentaje de IVA, importe de IVA y total. El campo totalAmount debe ser el IMPORTE TOTAL FINAL A PAGAR, normalmente etiquetado como TOTAL, TOTAL FACTURA, IMPORTE TOTAL o TOTAL A PAGAR, e incluir IVA cuando exista. Nunca uses la base imponible, el importe pendiente ni una cuota parcial como total. Devuelve los importes como texto decimal con punto y sin símbolo de moneda (ejemplo: 1234.56). Si un valor no aparece o no es legible, usa null; nunca uses 0 o 0.00 como relleno.",
                },
                { type: "input_file", file_id: uploadedFile.id },
              ],
            }],
            text: {
              format: {
                type: "json_schema",
                name: "invoice_data",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    supplier: { type: ["string", "null"] },
                    invoiceNumber: { type: ["string", "null"] },
                    invoiceDate: { type: ["string", "null"] },
                    baseAmount: { type: ["string", "null"] },
                    vatRate: { type: ["string", "null"] },
                    vatAmount: { type: ["string", "null"] },
                    totalAmount: { type: ["string", "null"] },
                  },
                  required: ["supplier", "invoiceNumber", "invoiceDate", "baseAmount", "vatRate", "vatAmount", "totalAmount"],
                  additionalProperties: false,
                },
              },
            },
          }),
        });

        if (!analysisResponse.ok) {
          const error = await analysisResponse.text();
          throw new Error(`No se pudo analizar la factura: ${error}`);
        }

        const analysis: any = await analysisResponse.json();
        const outputText = analysis.output_text || analysis.output
          ?.flatMap((item: any) => item.content || [])
          ?.find((item: any) => item.type === "output_text")?.text;

        if (!outputText || typeof outputText !== "string") return null;

        const extracted = JSON.parse(outputText) as Record<string, string | null>;
        const parseMoney = (value: string | null | undefined) => {
          if (!value) return null;
          const compact = value.replace(/[^0-9,.-]/g, "");
          const normalized = compact.includes(",") && compact.includes(".")
            ? (compact.lastIndexOf(",") > compact.lastIndexOf(".")
              ? compact.replace(/\./g, "").replace(",", ".")
              : compact.replace(/,/g, ""))
            : compact.replace(",", ".");
          const amount = Number.parseFloat(normalized);
          return Number.isFinite(amount) ? amount : null;
        };

        const total = parseMoney(extracted.totalAmount);
        const base = parseMoney(extracted.baseAmount);
        const vat = parseMoney(extracted.vatAmount);

        if ((total === null || (total === 0 && (base || vat))) && base !== null && vat !== null) {
          extracted.totalAmount = (base + vat).toFixed(2);
        } else if (total !== null) {
          extracted.totalAmount = total.toFixed(2);
        }

        return extracted;
      } finally {
        fetch(`https://api.openai.com/v1/files/${uploadedFile.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${apiKey}` },
        }).catch(() => undefined);
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
      legalName: z.string().optional(),
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
      legalName: z.string().optional(),
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
    dailyWithdrawals: protectedProcedure.input(z.object({
      businessId: z.number(),
      startDate: z.string(),
      endDate: z.string(),
    })).query(async ({ input }) => {
      return db.getDailyWithdrawals(input.businessId, input.startDate, input.endDate);
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

    // App Settings (OpenAI, etc.)
    get: protectedProcedure.input(z.object({ key: z.string() })).query(async ({ input }) => {
      return db.getSetting(input.key);
    }),
    getAll: adminProcedure.query(async () => {
      return db.getAllSettings();
    }),
    upsert: adminProcedure.input(z.object({
      key: z.string(),
      value: z.string(),
      description: z.string().optional(),
    })).mutation(async ({ input }) => {
      await db.upsertSetting(input.key, input.value, input.description);
      return { success: true };
    }),
    delete: adminProcedure.input(z.object({ key: z.string() })).mutation(async ({ input }) => {
      await db.deleteSetting(input.key);
      return { success: true };
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
      type: z.enum(["gasto", "ingreso"]),
      concepto: z.string(),
      categoria: z.enum(["sueldos", "seguridad_social", "impuestos", "seguros", "otros"]),
      categoriaOtros: z.string().optional(),
      importe: z.string(),
      paymentMethod: z.enum(["cuenta_bancaria", "tarjeta", "ana", "juanlu", "caja_hostel", "caja_tienda", "caja_fuerte", "caja_fuerte_cambio", "otros"]).optional(),
      fecha: z.string(),
      notas: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const id = await db.createOtroGasto({ ...input, createdBy: ctx.user.id });
      return { success: true, id };
    }),
    update: adminProcedure.input(z.object({
      id: z.number(),
      businessId: z.number().optional(),
      type: z.enum(["gasto", "ingreso"]).optional(),
      concepto: z.string().optional(),
      categoria: z.enum(["sueldos", "seguridad_social", "impuestos", "seguros", "otros"]).optional(),
      categoriaOtros: z.string().optional(),
      importe: z.string().optional(),
      paymentMethod: z.enum(["cuenta_bancaria", "tarjeta", "ana", "juanlu", "caja_hostel", "caja_tienda", "caja_fuerte", "caja_fuerte_cambio", "otros"]).optional(),
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

  // ==================== SAFE BOXES (Cajas Fuertes) ====================
  safeBoxes: router({
    list: adminProcedure.input(z.object({
      businessId: z.number(),
      limit: z.number().optional(),
    })).query(async ({ input }) => {
      return db.getSafeBoxMovements(input.businessId, input.limit);
    }),
    create: adminProcedure.input(z.object({
      businessId: z.number(),
      date: z.string(),
      type: z.enum([
        "entrada_efectivo_caja",
        "salida_efectivo_cambio",
        "entrada_salida_bbva",
        "descuadres",
        "sueldos",
        "pago_proveedor",
        "ajuste",
        "caja_semana",
        "es_efectivo_cf_hostel",
        "es_efectivo_cf_tienda"
      ]),
      concept: z.string().optional(),
      amount: z.string(),
    })).mutation(async ({ input, ctx }) => {
      await db.createSafeBoxMovement({ ...input, createdBy: ctx.user.id });
      return { success: true };
    }),
    update: adminProcedure.input(z.object({
      id: z.number(),
      date: z.string().optional(),
      type: z.enum([
        "entrada_efectivo_caja",
        "salida_efectivo_cambio",
        "entrada_salida_bbva",
        "descuadres",
        "sueldos",
        "pago_proveedor",
        "ajuste",
        "caja_semana",
        "es_efectivo_cf_hostel",
        "es_efectivo_cf_tienda"
      ]).optional(),
      concept: z.string().optional(),
      amount: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateSafeBoxMovement(id, data);
      return { success: true };
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteSafeBoxMovement(input.id);
      return { success: true };
    }),
    updateCheckStatus: adminProcedure.input(z.object({
      id: z.number(),
      checkStatus: z.enum(["unchecked", "correct", "incorrect"]),
    })).mutation(async ({ input }) => {
      await db.updateSafeBoxCheckStatus(input.id, input.checkStatus);
      return { success: true };
    }),
  }),

  // ==================== ACCESS CODES (Códigos de Acceso) ====================
  accessCodes: router({
    list: protectedProcedure.query(async () => {
      return db.getAllAccessCodes();
    }),
    create: adminProcedure.input(z.object({
      roomNumber: z.string(),
      roomCode: z.string(),
      roomType: z.string(),
      floor: z.string(),
      floorLevel: z.string(),
      entranceCode: z.string().optional(),
    })).mutation(async ({ input }) => {
      const id = await db.createAccessCode(input);
      return { success: true, id };
    }),
    update: adminProcedure.input(z.object({
      id: z.number(),
      roomNumber: z.string().optional(),
      roomCode: z.string().optional(),
      roomType: z.string().optional(),
      floor: z.string().optional(),
      floorLevel: z.string().optional(),
      entranceCode: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateAccessCode(id, data);
      return { success: true };
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteAccessCode(input.id);
      return { success: true };
    }),
    updateEntrance: adminProcedure.input(z.object({
      entranceCode: z.string(),
    })).mutation(async ({ input }) => {
      await db.updateEntranceCode(input.entranceCode);
      return { success: true };
    }),
  }),

  // ==================== WEEKLY SUMMARY (Resumen Semanal) ====================
  weeklySummary: router({
    // Cash Envelopes
    getCashEnvelopes: protectedProcedure.input(z.object({
      weekStart: z.string(), // YYYY-MM-DD
    })).query(async ({ input }) => {
      return db.getWeeklyCashEnvelopes(input.weekStart);
    }),
    upsertCashEnvelope: adminProcedure.input(z.object({
      weekStart: z.string(),
      dayOfWeek: z.number().min(1).max(7),
      expectedCash: z.string(),
      actualCash: z.string(),
      difference: z.string(),
    })).mutation(async ({ input }) => {
      const id = await db.upsertWeeklyCashEnvelope(input);
      return { success: true, id };
    }),

    // Availability Sources
    listSources: protectedProcedure.query(async () => {
      return db.getAllAvailabilitySources();
    }),
    createSource: adminProcedure.input(z.object({
      name: z.string(),
      type: z.enum(["bank", "cash_register", "safe"]),
      displayOrder: z.number().optional(),
    })).mutation(async ({ input }) => {
      const id = await db.createAvailabilitySource(input);
      return { success: true, id };
    }),
    updateSource: adminProcedure.input(z.object({
      id: z.number(),
      name: z.string().optional(),
      type: z.enum(["bank", "cash_register", "safe"]).optional(),
      displayOrder: z.number().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateAvailabilitySource(id, data);
      return { success: true };
    }),
    deleteSource: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteAvailabilitySource(input.id);
      return { success: true };
    }),

    // Availability Records
    getAvailabilityRecords: protectedProcedure.input(z.object({
      weekStart: z.string(), // YYYY-MM-DD
    })).query(async ({ input }) => {
      return db.getWeeklyAvailabilityRecords(input.weekStart);
    }),
    upsertAvailabilityRecord: adminProcedure.input(z.object({
      weekStart: z.string(),
      sourceId: z.number(),
      amount: z.string(),
    })).mutation(async ({ input }) => {
      const id = await db.upsertWeeklyAvailabilityRecord(input);
      return { success: true, id };
    }),
    getAllAvailabilityRecords: protectedProcedure.query(async () => {
      return db.getAllWeeklyAvailabilityRecords();
    }),
  }),

  // ==================== HISTORICAL CASH DATA ====================
  historicalCash: router({
    // Get all historical data (2014-2025)
    getHistoricalData: adminProcedure.query(async () => {
      return db.getAllHistoricalCashData();
    }),
    // Get historical data by year
    getByYear: adminProcedure.input(z.object({ year: z.number() })).query(async ({ input }) => {
      return db.getHistoricalCashDataByYear(input.year);
    }),
    // Get aggregated data for graphics view
    getAggregatedData: adminProcedure.query(async () => {
      return db.getAggregatedHistoricalData();
    }),
    // Import historical data (for initial setup)
    importData: adminProcedure.input(z.object({
      year: z.number(),
      month: z.number(),
      businessType: z.enum(["hostel", "tienda"]),
      totalZ: z.string(),
      totalCash: z.string(),
      totalCards: z.string(),
    })).mutation(async ({ input }) => {
      await db.insertHistoricalCashData(input);
      return { success: true };
    }),
    // Get current year data from cash_closings (2026+)
    getCurrentYearData: adminProcedure.input(z.object({ year: z.number() })).query(async ({ input }) => {
      return db.getCurrentYearCashData(input.year);
    }),
    getCurrentYearDailyData: adminProcedure.input(z.object({ year: z.number() })).query(async ({ input }) => {
      return db.getCurrentYearDailyCashSales(input.year);
    }),
  }),

  // ==================== INVENTORY PRODUCTS ====================
  inventoryProducts: router({
    list: adminProcedure.query(async () => {
      return db.getAllInventoryProducts();
    }),
    create: adminProcedure.input(z.object({
      handle: z.string().optional(),
      ref: z.string().optional(),
      name: z.string(),
      category: z.string().optional(),
      cost: z.string(),
      price: z.string(),
      inStock: z.string(),
    })).mutation(async ({ input }) => {
      const id = await db.createInventoryProduct(input);
      return { success: true, id };
    }),
    update: adminProcedure.input(z.object({
      id: z.number(),
      handle: z.string().optional(),
      ref: z.string().optional(),
      name: z.string().optional(),
      category: z.string().optional(),
      cost: z.string().optional(),
      price: z.string().optional(),
      inStock: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateInventoryProduct(id, data);
      return { success: true };
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteInventoryProduct(input.id);
      return { success: true };
    }),
    importCSV: adminProcedure.input(z.object({
      products: z.array(z.object({
        handle: z.string().optional(),
        ref: z.string().optional(),
        name: z.string(),
        category: z.string().optional(),
        cost: z.string(),
        price: z.string(),
        inStock: z.string(),
      })),
    })).mutation(async ({ input }) => {
      await db.replaceAllInventoryProducts(input.products);
      return { success: true };
    }),
  }),

  // ==================== ORDERS (Pedidos) ====================
  ordersPedidos: router({
    list: adminProcedure.query(async () => {
      return db.getAllOrdersWithItems();
    }),
    getById: adminProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return db.getOrderWithItemsById(input.id);
    }),
    create: adminProcedure.input(z.object({
      supplierName: z.string(),
      estimatedDate: z.string().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const id = await db.createOrderWithSupplier({ ...input, userId: ctx.user.id });
      return { success: true, id };
    }),
    update: adminProcedure.input(z.object({
      id: z.number(),
      supplierName: z.string().optional(),
      estimatedDate: z.string().optional(),
      isOrdered: z.boolean().optional(),
      isReceived: z.boolean().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateOrderStatus(id, data);
      return { success: true };
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteOrderWithItems(input.id);
      return { success: true };
    }),
    addItem: adminProcedure.input(z.object({
      orderId: z.number(),
      productName: z.string(),
      quantity: z.string(),
      unit: z.string().optional(),
    })).mutation(async ({ input }) => {
      const id = await db.createOrderItemForProduct(input);
      return { success: true, id };
    }),
    updateItem: adminProcedure.input(z.object({
      id: z.number(),
      productName: z.string().optional(),
      quantity: z.string().optional(),
      unit: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateOrderItemDetails(id, data);
      return { success: true };
    }),
    deleteItem: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteOrderItemById(input.id);
      return { success: true };
    }),
  }),

  // ==================== CHEF SANDWICH ORDERS ====================
  chefOrders: router({
    list: adminProcedure.query(async () => {
      return db.getAllChefOrders();
    }),
    getLatest: adminProcedure.query(async () => {
      return db.getLatestChefOrder();
    }),
    create: adminProcedure.input(z.object({
      orderDate: z.string(),
      burguerBoxes: z.number().optional(),
      burguerUnits: z.number().optional(),
      mojoBoxes: z.number().optional(),
      mojoUnits: z.number().optional(),
      serranitoBoxes: z.number().optional(),
      serranitoUnits: z.number().optional(),
      lomoWBoxes: z.number().optional(),
      lomoWUnits: z.number().optional(),
      frankfurtBoxes: z.number().optional(),
      frankfurtUnits: z.number().optional(),
      tortillaBoxes: z.number().optional(),
      tortillaUnits: z.number().optional(),
      empanadoBoxes: z.number().optional(),
      empanadoUnits: z.number().optional(),
      bbqBoxes: z.number().optional(),
      bbqUnits: z.number().optional(),
      polloBaconBoxes: z.number().optional(),
      polloBaconUnits: z.number().optional(),
      carbonaraBoxes: z.number().optional(),
      carbonaraUnits: z.number().optional(),
      yorkBoxes: z.number().optional(),
      yorkUnits: z.number().optional(),
      serranoBoxes: z.number().optional(),
      serranoUnits: z.number().optional(),
      piripiBoxes: z.number().optional(),
      piripiUnits: z.number().optional(),
      tostaBarbacoa: z.number().optional(),
      tostaCarbonara: z.number().optional(),
      tostaPolloBoxes: z.number().optional(),
      tostaPolloUnits: z.number().optional(),
      tostaRuloCabra: z.number().optional(),
      tosta3Quesos: z.number().optional(),
      tostaYork: z.number().optional(),
      bocapizzaYork: z.number().optional(),
      bocapizzaBacon: z.number().optional(),
      bocapizzaBBQ: z.number().optional(),
      bocapizza4Q: z.number().optional(),
      bocapizzaAtun: z.number().optional(),
    })).mutation(async ({ input }) => {
      const id = await db.createChefOrder(input);
      return { success: true, id };
    }),
  }),

  // ==================== CHECK-IN ====================
  checkin: router({
    // Guests
    guests: router({
      list: protectedProcedure.query(async () => {
        return db.getAllGuests();
      }),
      search: protectedProcedure.input(z.object({
        search: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        status: z.string().optional(),
      })).query(async ({ input }) => {
        return db.searchGuests(input);
      }),
      getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
        return db.getGuestById(input.id);
      }),
      create: publicProcedure.input(z.object({
        firstName: z.string(),
        lastName: z.string(),
        documentNumber: z.string(),
        documentSupport: z.string().optional(),
        documentType: z.string().optional(),
        gender: z.enum(["Hombre", "Mujer", "Otro"]).optional(),
        nationality: z.string().optional(),
        birthDate: z.string().optional(),
        documentExpiry: z.string().optional(),
        street: z.string().optional(),
        addressExtra: z.string().optional(),
        postalCode: z.string().optional(),
        city: z.string().optional(),
        province: z.string().optional(),
        country: z.string().optional(),
        phone: z.string().optional(),
        phoneExtra: z.string().optional(),
        email: z.string().optional(),
        reservationNumber: z.string().optional(),
        checkInDate: z.string().optional(),
        checkOutDate: z.string().optional(),
        roomNumber: z.string().optional(),
        roomType: z.string().optional(),
        roomCode: z.string().optional(),
        entranceCode: z.string().optional(),
        numberOfRooms: z.number().optional(),
        hasInternet: z.boolean().optional(),
        accommodationType: z.enum(["S.A. (Solo Aloj.)", "A.D. (Aloj. y Desayuno)", "M.P. (Media Pensión)", "P.C. (Pensión Completa)"]).optional(),
        reservationOrigin: z.enum(["Walk In", "Booking.com", "Airbnb", "Expedia", "Website", "Phone", "Email", "Other"]).optional(),
        paymentType: z.enum(["EFECT", "TARJT", "TRANS", "PLATF", "MOVIL", "TREG", "DESTI", "OTRO"]).optional(),
        paymentDate: z.string().optional(),
        amountPaid: z.string().optional(),
        amountPending: z.string().optional(),
        paymentHolder: z.string().optional(),
        paymentMethod: z.string().optional(),
        numberOfGuests: z.number().optional(),
        signature: z.string().optional(),
        acceptedTerms: z.boolean().optional(),
        acceptedPrivacy: z.boolean().optional(),
        isMainGuest: z.boolean().optional(),
        groupId: z.string().optional(),
        status: z.enum(["pending", "completed", "online", "cancelled"]).optional(),
        checkinType: z.enum(["presencial", "anticipado", "online"]).optional(),
        language: z.enum(["es", "en"]).optional(),
      })).mutation(async ({ input, ctx }) => {
        // Para check-ins públicos (anticipado), createdBy será null
        const id = await db.createGuest({ ...input, createdBy: ctx.user?.id || null });
        
        // Generar PDF automáticamente si el check-in está completado
        if (input.status === 'completed') {
          const { generateGuestPDF } = await import('./generateGuestPDF');
          await generateGuestPDF(id);
        }
        
        // Si es check-in anticipado y tiene email, enviar confirmación
        if (input.checkinType === 'anticipado' && input.email) {
          const { sendCheckinAnticipadoConfirmation, sendCheckinAnticipadoNotificationToReception } = await import('./email');
          
          // Enviar confirmación al huésped
          await sendCheckinAnticipadoConfirmation({
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email,
            documentNumber: input.documentNumber,
            checkInDate: input.checkInDate,
            language: input.language || 'es',
          });
          
          // Enviar notificación a recepción
          await sendCheckinAnticipadoNotificationToReception({
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email,
            phone: input.phone,
            documentNumber: input.documentNumber,
            nationality: input.nationality,
            checkInDate: input.checkInDate,
            reservationNumber: input.reservationNumber,
          });
        }
        
        return { success: true, id };
      }),
      update: protectedProcedure.input(z.object({
        id: z.number(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        documentNumber: z.string().optional(),
        documentType: z.string().optional(),
        gender: z.enum(["Hombre", "Mujer", "Otro"]).optional(),
        nationality: z.string().optional(),
        birthDate: z.string().optional(),
        documentExpiry: z.string().optional(),
        street: z.string().optional(),
        addressExtra: z.string().optional(),
        postalCode: z.string().optional(),
        city: z.string().optional(),
        province: z.string().optional(),
        country: z.string().optional(),
        phone: z.string().optional(),
        phoneExtra: z.string().optional(),
        email: z.string().optional(),
        reservationNumber: z.string().optional(),
        checkInDate: z.string().optional(),
        checkOutDate: z.string().optional(),
        roomNumber: z.string().optional(),
        roomType: z.string().optional(),
        roomCode: z.string().optional(),
        entranceCode: z.string().optional(),
        numberOfRooms: z.number().optional(),
        hasInternet: z.boolean().optional(),
        accommodationType: z.enum(["S.A. (Solo Aloj.)", "A.D. (Aloj. y Desayuno)", "M.P. (Media Pensión)", "P.C. (Pensión Completa)"]).optional(),
        reservationOrigin: z.enum(["Walk In", "Booking.com", "Airbnb", "Expedia", "Website", "Phone", "Email", "Other"]).optional(),
        paymentType: z.enum(["EFECT", "TARJT", "TRANS", "PLATF", "MOVIL", "TREG", "DESTI", "OTRO"]).optional(),
        paymentDate: z.string().optional(),
        amountPaid: z.string().optional(),
        amountPending: z.string().optional(),
        paymentHolder: z.string().optional(),
        paymentMethod: z.string().optional(),
        numberOfGuests: z.number().optional(),
        signature: z.string().optional(),
        acceptedTerms: z.boolean().optional(),
        acceptedPrivacy: z.boolean().optional(),
        status: z.enum(["pending", "completed", "online", "cancelled"]).optional(),
      })).mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateGuest(id, data);
        
        // Generar PDF automáticamente si se cambia el status a completed
        if (data.status === 'completed') {
          const { generateGuestPDF } = await import('./generateGuestPDF');
          await generateGuestPDF(id);
        }
        
        return { success: true };
      }),
      delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
        await db.deleteGuest(input.id);
        return { success: true };
      }),
    }),

    // Enlaces públicos de un solo uso para check-in completamente online.
    online: router({
      list: protectedProcedure.query(async () => {
        return db.getOnlineCheckinLinks();
      }),
      createLink: protectedProcedure.input(z.object({
        email: z.string().email(),
        language: z.enum(["es", "en"]).default("es"),
        reservationNumber: z.string().optional(),
        reservationOrigin: z.enum(["Walk In", "Booking.com", "Airbnb", "Expedia", "Website", "Phone", "Email", "Other"]).default("Website"),
        checkInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        checkOutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        roomNumber: z.string().min(1),
        numberOfRooms: z.number().int().min(1).default(1),
        numberOfGuests: z.number().int().min(1).default(1),
        paymentType: z.enum(["EFECT", "TARJT", "TRANS", "PLATF", "MOVIL", "TREG", "DESTI", "OTRO"]).default("TRANS"),
        amountPaid: z.string().default("0"),
        amountPending: z.string().default("0"),
      })).mutation(async ({ input, ctx }) => {
        if (input.checkOutDate <= input.checkInDate) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "La fecha de salida debe ser posterior a la fecha de llegada" });
        }

        const accessCodeList = await db.getAllAccessCodes();
        const room = accessCodeList.find((code) => code.roomNumber === input.roomNumber);
        if (!room || room.roomNumber === "ENTRADA") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Selecciona una habitación con códigos de acceso configurados" });
        }

        const entrance = accessCodeList.find((code) => code.roomNumber === "ENTRADA");
        const token = randomBytes(32).toString("hex");
        const linkId = await db.createOnlineCheckinLink({
          token,
          email: input.email.trim().toLowerCase(),
          language: input.language,
          reservationNumber: input.reservationNumber?.trim() || null,
          reservationOrigin: input.reservationOrigin,
          checkInDate: input.checkInDate,
          checkOutDate: input.checkOutDate,
          roomNumber: room.roomNumber,
          roomType: room.roomType,
          roomCode: room.roomCode,
          entranceCode: room.entranceCode || entrance?.roomCode || null,
          numberOfRooms: input.numberOfRooms,
          numberOfGuests: input.numberOfGuests,
          paymentType: input.paymentType,
          amountPaid: input.amountPaid || "0",
          amountPending: input.amountPending || "0",
          createdBy: ctx.user.id,
          // El enlace se invalida después del día de llegada.
          expiresAt: input.checkInDate,
        });

        return { id: linkId, token };
      }),
      cancel: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
        await db.updateOnlineCheckinLink(input.id, { status: "cancelled" });
        return { success: true };
      }),
      getPublic: publicProcedure.input(z.object({ token: z.string().length(64) })).query(async ({ input }) => {
        const link = await db.getOnlineCheckinLinkByToken(input.token);
        if (!link) throw new TRPCError({ code: "NOT_FOUND", message: "El enlace de check-in no existe" });

        const today = new Date().toISOString().slice(0, 10);
        if (link.status === "pending" && link.expiresAt < today) {
          await db.updateOnlineCheckinLink(link.id, { status: "expired" });
          link.status = "expired";
        }

        if (link.status !== "pending") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Este enlace ya no está disponible" });
        }

        return {
          email: link.email,
          language: link.language,
          reservationNumber: link.reservationNumber,
          checkInDate: link.checkInDate,
          checkOutDate: link.checkOutDate,
          roomType: link.roomType,
          numberOfGuests: link.numberOfGuests,
        };
      }),
      completePublic: publicProcedure.input(z.object({
        token: z.string().length(64),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        documentNumber: z.string().min(1),
        documentSupport: z.string().optional(),
        documentType: z.enum(["NIF", "NIE", "PAS", "OTRO"]),
        gender: z.enum(["Hombre", "Mujer", "Otro"]),
        nationality: z.string().min(1),
        birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        documentExpiry: z.string().optional(),
        street: z.string().min(1),
        addressExtra: z.string().optional(),
        postalCode: z.string().min(1),
        city: z.string().min(1),
        province: z.string().optional(),
        country: z.string().min(1),
        phone: z.string().min(1),
        email: z.string().email(),
        signature: z.string().min(10),
        acceptedTerms: z.literal(true),
        acceptedPrivacy: z.literal(true),
      })).mutation(async ({ input }) => {
        const link = await db.getOnlineCheckinLinkByToken(input.token);
        if (!link) throw new TRPCError({ code: "NOT_FOUND", message: "El enlace de check-in no existe" });

        const today = new Date().toISOString().slice(0, 10);
        if (link.status === "pending" && link.expiresAt < today) {
          await db.updateOnlineCheckinLink(link.id, { status: "expired" });
          throw new TRPCError({ code: "BAD_REQUEST", message: "El enlace de check-in ha caducado" });
        }
        if (link.status !== "pending") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Este enlace ya se utilizó o fue cancelado" });
        }
        if (input.email.trim().toLowerCase() !== link.email.trim().toLowerCase()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "El email no coincide con el enlace de check-in" });
        }

        const guestId = await db.createGuest({
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          documentNumber: input.documentNumber.trim(),
          documentSupport: input.documentSupport?.trim() || null,
          documentType: input.documentType,
          gender: input.gender,
          nationality: input.nationality,
          birthDate: input.birthDate,
          documentExpiry: input.documentExpiry || null,
          street: input.street.trim(),
          addressExtra: input.addressExtra?.trim() || null,
          postalCode: input.postalCode.trim(),
          city: input.city.trim(),
          province: input.province?.trim() || null,
          country: input.country,
          phone: input.phone.trim(),
          email: input.email.trim().toLowerCase(),
          reservationNumber: link.reservationNumber,
          checkInDate: link.checkInDate,
          checkOutDate: link.checkOutDate,
          roomNumber: link.roomNumber,
          roomType: link.roomType,
          roomCode: link.roomCode,
          entranceCode: link.entranceCode,
          numberOfRooms: link.numberOfRooms,
          reservationOrigin: link.reservationOrigin,
          paymentType: link.paymentType,
          amountPaid: link.amountPaid,
          amountPending: link.amountPending,
          numberOfGuests: link.numberOfGuests,
          signature: input.signature,
          acceptedTerms: true,
          acceptedPrivacy: true,
          status: "completed",
          checkinType: "online",
          language: link.language,
          token: link.token,
          sendCodes: true,
          createdBy: null,
        });

        await db.updateOnlineCheckinLink(link.id, { status: "completed", guestId, completedAt: new Date() });

        const { generateGuestPDF } = await import("./generateGuestPDF");
        await generateGuestPDF(guestId);

        const { sendOnlineCheckinConfirmation } = await import("./email");
        await sendOnlineCheckinConfirmation({
          firstName: input.firstName,
          email: input.email,
          language: link.language,
          checkInDate: link.checkInDate,
          roomNumber: link.roomNumber,
          roomCode: link.roomCode,
          entranceCode: link.entranceCode,
        });

        return {
          success: true,
          roomNumber: link.roomNumber,
          roomCode: link.roomCode,
          entranceCode: link.entranceCode,
          checkInDate: link.checkInDate,
        };
      }),
    }),
    
    // Settings
    settings: router({
      get: protectedProcedure.query(async () => {
        return db.getHostelSettings();
      }),
      update: adminProcedure.input(z.object({
        hostelName: z.string().optional(),
        hostelAddress: z.string().optional(),
        hostelPhone: z.string().optional(),
        hostelEmail: z.string().optional(),
        hostelWebsite: z.string().optional(),
        hostelRta: z.string().optional(),
        policeCode: z.string().optional(),
        wifiPassword: z.string().optional(),
        checkoutTime: z.string().optional(),
        defaultEntranceCode: z.string().optional(),
        termsConditionsEs: z.string().optional(),
        termsConditionsEn: z.string().optional(),
        privacyPolicyEs: z.string().optional(),
        privacyPolicyEn: z.string().optional(),
        welcomeMessageEs: z.string().optional(),
        welcomeMessageEn: z.string().optional(),
        roomTypes: z.string().optional(),
        smtpHost: z.string().optional(),
        smtpPort: z.number().optional(),
        smtpUser: z.string().optional(),
        smtpPassword: z.string().optional(),
        smtpFromEmail: z.string().optional(),
        smtpFromName: z.string().optional(),
      })).mutation(async ({ input }) => {
        await db.upsertHostelSettings(input);
        return { success: true };
      }),
    }),
    
    // Manual cleanup of old guests
    cleanupOldGuests: protectedProcedure.mutation(async () => {
      const { cleanupOldGuests } = await import('./cleanupOldGuests');
      const result = await cleanupOldGuests();
      return { success: true, deletedCount: result.deletedCount };
    }),
  }),
});
export type AppRouter = typeof appRouter;

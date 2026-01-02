import { eq, and, gte, lte, desc, asc, sql, or, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, 
  businesses, InsertBusiness, Business,
  shifts, InsertShift, Shift,
  cashRegisters, InsertCashRegister, CashRegister,
  transactions, InsertTransaction, Transaction,
  invoices, InsertInvoice, Invoice,
  inventoryItems, InsertInventoryItem, InventoryItem,
  orders, InsertOrder, Order,
  orderItems, InsertOrderItem, OrderItem,
  incidents, InsertIncident, Incident,
  tasks, InsertTask, Task,
  stockMovements, InsertStockMovement, StockMovement,
  weeklySummaries, InsertWeeklySummary, WeeklySummary,
  suppliers, InsertSupplier, Supplier,
  shiftTemplates, InsertShiftTemplate, ShiftTemplate,
  cashClosings, InsertCashClosing, CashClosing,
  cashMovements, InsertCashMovement, CashMovement,
  notifications, InsertNotification, Notification,
  systemSettings, InsertSystemSetting, SystemSetting,
  roomStatus, InsertRoomStatus, RoomStatus,
  otrosGastos, InsertOtroGasto, OtroGasto,
  safeBoxes, InsertSafeBox, SafeBox,
  accessCodes, InsertAccessCode, AccessCode,
  weeklyCashEnvelopes, InsertWeeklyCashEnvelope, WeeklyCashEnvelope,
  weeklyAvailabilitySources, InsertWeeklyAvailabilitySource, WeeklyAvailabilitySource,
  weeklyAvailabilityRecords, InsertWeeklyAvailabilityRecord, WeeklyAvailabilityRecord,
  appSettings, InsertAppSetting, AppSetting,
  historicalCashData, InsertHistoricalCashData, HistoricalCashData
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ==================== USERS ====================
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).where(eq(users.isActive, true)).orderBy(asc(users.name));
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUser(id: number, data: Partial<InsertUser>) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(data).where(eq(users.id, id));
}

export async function deleteUser(id: number) {
  const db = await getDb();
  if (!db) return;
  // Delete all shifts assigned to this user first
  await db.delete(shifts).where(eq(shifts.userId, id));
  // Soft delete by setting isActive to false
  await db.update(users).set({ isActive: false }).where(eq(users.id, id));
}

// ==================== BUSINESSES ====================
export async function getAllBusinesses() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(businesses).where(eq(businesses.isActive, true));
}

export async function getBusinessByCode(code: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(businesses).where(eq(businesses.code, code)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createBusiness(data: InsertBusiness) {
  const db = await getDb();
  if (!db) return;
  await db.insert(businesses).values(data);
}

export async function initializeBusinesses() {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(businesses);
  if (existing.length === 0) {
    await db.insert(businesses).values([
      { name: "The Spot Central Hostel", code: "hostel", description: "Hostel" },
      { name: "Sweet & Salty", code: "tienda", description: "Tienda/Café" }
    ]);
  }
}

// ==================== SHIFTS ====================
export async function getShiftsByDateRange(startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(shifts)
    .where(and(gte(shifts.scheduledDate, startDate), lte(shifts.scheduledDate, endDate)))
    .orderBy(asc(shifts.scheduledDate), asc(shifts.scheduledStart));
}

export async function getShiftsByUser(userId: number, startDate?: string, endDate?: string) {
  const db = await getDb();
  if (!db) return [];
  let conditions = [eq(shifts.userId, userId)];
  if (startDate) conditions.push(gte(shifts.scheduledDate, startDate));
  if (endDate) conditions.push(lte(shifts.scheduledDate, endDate));
  return db.select().from(shifts).where(and(...conditions)).orderBy(desc(shifts.scheduledDate));
}

export async function createShift(data: InsertShift) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(shifts).values(data);
  return result[0].insertId;
}

export async function updateShift(id: number, data: Partial<InsertShift>) {
  const db = await getDb();
  if (!db) return;
  await db.update(shifts).set(data).where(eq(shifts.id, id));
}

export async function getShiftById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(shifts).where(eq(shifts.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function deleteShift(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(shifts).where(eq(shifts.id, id));
}

export async function clockIn(shiftId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(shifts).set({ actualStart: new Date(), status: "in_progress" }).where(eq(shifts.id, shiftId));
}

export async function clockOut(shiftId: number) {
  const db = await getDb();
  if (!db) return;
  const shift = await db.select().from(shifts).where(eq(shifts.id, shiftId)).limit(1);
  if (shift.length > 0 && shift[0].actualStart) {
    const start = new Date(shift[0].actualStart);
    const end = new Date();
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    await db.update(shifts).set({ 
      actualEnd: end, 
      status: "completed",
      hoursWorked: hours.toFixed(2)
    }).where(eq(shifts.id, shiftId));
  }
}

// ==================== CASH REGISTERS ====================
export async function getCashRegistersByBusiness(businessId: number, startDate?: string, endDate?: string) {
  const db = await getDb();
  if (!db) return [];
  let conditions = [eq(cashRegisters.businessId, businessId)];
  if (startDate) conditions.push(gte(cashRegisters.date, startDate));
  if (endDate) conditions.push(lte(cashRegisters.date, endDate));
  return db.select().from(cashRegisters).where(and(...conditions)).orderBy(desc(cashRegisters.date));
}

export async function getOpenCashRegister(businessId: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(cashRegisters)
    .where(and(
      eq(cashRegisters.businessId, businessId),
      eq(cashRegisters.userId, userId),
      eq(cashRegisters.status, "open")
    )).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createCashRegister(data: InsertCashRegister) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(cashRegisters).values(data);
  return result[0].insertId;
}

export async function updateCashRegister(id: number, data: Partial<InsertCashRegister>) {
  const db = await getDb();
  if (!db) return;
  await db.update(cashRegisters).set(data).where(eq(cashRegisters.id, id));
}

export async function closeCashRegister(id: number, closingAmount: string, notes?: string) {
  const db = await getDb();
  if (!db) return;
  // Get all transactions for this cash register
  const txns = await db.select().from(transactions).where(eq(transactions.cashRegisterId, id));
  const register = await db.select().from(cashRegisters).where(eq(cashRegisters.id, id)).limit(1);
  if (register.length === 0) return;
  
  const opening = parseFloat(register[0].openingAmount || "0");
  const cashWithdrawn = parseFloat(register[0].cashWithdrawn || "0");
  let totalIncome = 0;
  let totalExpense = 0;
  
  txns.forEach(t => {
    if (t.type === "income" && t.paymentMethod === "cash") totalIncome += parseFloat(t.amount || "0");
    if (t.type === "expense" && t.paymentMethod === "cash") totalExpense += parseFloat(t.amount || "0");
  });
  
  const expectedAmount = opening + totalIncome - totalExpense - cashWithdrawn;
  const difference = parseFloat(closingAmount) - expectedAmount;
  
  await db.update(cashRegisters).set({
    closingAmount,
    expectedAmount: expectedAmount.toFixed(2),
    difference: difference.toFixed(2),
    status: "closed",
    notes
  }).where(eq(cashRegisters.id, id));
}

// ==================== TRANSACTIONS ====================
export async function getTransactionsByBusiness(businessId: number, startDate?: string, endDate?: string) {
  const db = await getDb();
  if (!db) return [];
  let conditions = [eq(transactions.businessId, businessId)];
  if (startDate) conditions.push(gte(transactions.date, startDate));
  if (endDate) conditions.push(lte(transactions.date, endDate));
  return db.select().from(transactions).where(and(...conditions)).orderBy(desc(transactions.date), desc(transactions.createdAt));
}

export async function createTransaction(data: InsertTransaction) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(transactions).values(data);
  return result[0].insertId;
}

export async function updateTransaction(id: number, data: Partial<InsertTransaction>) {
  const db = await getDb();
  if (!db) return;
  await db.update(transactions).set(data).where(eq(transactions.id, id));
}

export async function deleteTransaction(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(transactions).where(eq(transactions.id, id));
}

// ==================== INVOICES ====================
export async function getInvoicesByBusiness(businessId: number, startDate?: string, endDate?: string) {
  const db = await getDb();
  if (!db) return [];
  let conditions = [eq(invoices.businessId, businessId)];
  if (startDate) conditions.push(gte(invoices.invoiceDate, startDate));
  if (endDate) conditions.push(lte(invoices.invoiceDate, endDate));
  return db.select().from(invoices).where(and(...conditions)).orderBy(desc(invoices.invoiceDate));
}

export async function getInvoiceById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
  return result[0] || null;
}

export async function createInvoice(data: InsertInvoice) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(invoices).values(data);
  return result[0].insertId;
}

export async function updateInvoice(id: number, data: Partial<InsertInvoice>) {
  const db = await getDb();
  if (!db) return;
  await db.update(invoices).set(data).where(eq(invoices.id, id));
}

export async function deleteInvoice(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(invoices).where(eq(invoices.id, id));
}

// ==================== INVENTORY ====================
export async function getInventoryByBusiness(businessId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(inventoryItems)
    .where(and(eq(inventoryItems.businessId, businessId), eq(inventoryItems.isActive, true)))
    .orderBy(asc(inventoryItems.category), asc(inventoryItems.name));
}

export async function getLowStockItems(businessId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(inventoryItems)
    .where(and(
      eq(inventoryItems.businessId, businessId),
      eq(inventoryItems.isActive, true),
      sql`${inventoryItems.currentStock} <= ${inventoryItems.minimumStock}`
    ));
}

export async function createInventoryItem(data: InsertInventoryItem) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(inventoryItems).values(data);
  return result[0].insertId;
}

export async function updateInventoryItem(id: number, data: Partial<InsertInventoryItem>) {
  const db = await getDb();
  if (!db) return;
  await db.update(inventoryItems).set(data).where(eq(inventoryItems.id, id));
}

export async function deleteInventoryItem(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(inventoryItems).where(eq(inventoryItems.id, id));
}

export async function adjustStock(itemId: number, userId: number, quantity: number, type: "in" | "out" | "adjustment", reason?: string) {
  const db = await getDb();
  if (!db) return;
  const item = await db.select().from(inventoryItems).where(eq(inventoryItems.id, itemId)).limit(1);
  if (item.length === 0) return;
  
  const previousStock = parseFloat(item[0].currentStock || "0");
  let newStock = previousStock;
  if (type === "in") newStock += quantity;
  else if (type === "out") newStock -= quantity;
  else newStock = quantity;
  
  await db.insert(stockMovements).values({
    inventoryItemId: itemId,
    userId,
    type,
    quantity: quantity.toString(),
    previousStock: previousStock.toString(),
    newStock: newStock.toString(),
    reason
  });
  
  await db.update(inventoryItems).set({ currentStock: newStock.toString() }).where(eq(inventoryItems.id, itemId));
}

// ==================== ORDERS ====================
export async function getOrdersByBusiness(businessId: number, status?: string) {
  const db = await getDb();
  if (!db) return [];
  let conditions = [eq(orders.businessId, businessId)];
  if (status) conditions.push(eq(orders.status, status as any));
  return db.select().from(orders).where(and(...conditions)).orderBy(desc(orders.orderDate));
}

export async function createOrder(data: InsertOrder) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(orders).values(data);
  return result[0].insertId;
}

export async function updateOrder(id: number, data: Partial<InsertOrder>) {
  const db = await getDb();
  if (!db) return;
  await db.update(orders).set(data).where(eq(orders.id, id));
}

export async function getOrderItems(orderId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
}

export async function addOrderItem(data: InsertOrderItem) {
  const db = await getDb();
  if (!db) return;
  await db.insert(orderItems).values(data);
}

// ==================== INCIDENTS ====================
export async function getIncidentsByBusiness(businessId: number, status?: string) {
  const db = await getDb();
  if (!db) return [];
  let conditions = [eq(incidents.businessId, businessId)];
  if (status) conditions.push(eq(incidents.status, status as any));
  return db.select().from(incidents).where(and(...conditions)).orderBy(desc(incidents.createdAt));
}

export async function createIncident(data: InsertIncident) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(incidents).values(data);
  return result[0].insertId;
}

export async function updateIncident(id: number, data: Partial<InsertIncident>) {
  const db = await getDb();
  if (!db) return;
  await db.update(incidents).set(data).where(eq(incidents.id, id));
}

export async function deleteIncident(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(incidents).where(eq(incidents.id, id));
}

// ==================== TASKS ====================
export async function getTasks(businessId?: number, assignedTo?: number, status?: string) {
  const db = await getDb();
  if (!db) return [];
  let conditions: any[] = [];
  if (businessId) conditions.push(eq(tasks.businessId, businessId));
  if (assignedTo) conditions.push(eq(tasks.assignedTo, assignedTo));
  if (status) conditions.push(eq(tasks.status, status as any));
  return db.select().from(tasks)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(tasks.createdAt));
}

export async function createTask(data: InsertTask) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(tasks).values(data);
  return result[0].insertId;
}

export async function updateTask(id: number, data: Partial<InsertTask>) {
  const db = await getDb();
  if (!db) return;
  await db.update(tasks).set(data).where(eq(tasks.id, id));
}

export async function deleteTask(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(tasks).where(eq(tasks.id, id));
}

// ==================== DASHBOARD STATS ====================
export async function getDashboardStats(businessId: number, startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return null;
  
  console.log('[getDashboardStats] businessId:', businessId, 'startDate:', startDate, 'endDate:', endDate);
  
  // Usar cashClosings para obtener los totales reales
  const closings = await db.select().from(cashClosings)
    .where(and(
      eq(cashClosings.businessId, businessId),
      gte(cashClosings.date, startDate),
      lte(cashClosings.date, endDate)
    ));
  
  console.log('[getDashboardStats] Found', closings.length, 'closings');
  if (closings.length > 0) {
    console.log('[getDashboardStats] First closing:', closings[0].date, 'zReading:', closings[0].zReading);
    console.log('[getDashboardStats] Last closing:', closings[closings.length-1].date);
  }
  
  // También obtener transacciones antiguas por compatibilidad
  const txns = await db.select().from(transactions)
    .where(and(
      eq(transactions.businessId, businessId),
      gte(transactions.date, startDate),
      lte(transactions.date, endDate)
    ));
  
  let totalIncomeZ = 0; // Ingresos de caja (zReading)
  let otherIncome = 0; // Otros ingresos (type='ingreso')
  let totalExpenses = 0;
  let totalDifference = 0;
  let withdrawnCash = 0;
  let withdrawnCards = 0;
  let prepaidBooking = 0;
  
  // Sumar ingresos de cashClosings usando zReading (la Z de caja = ingresos reales)
  // Solo contar cierres con status='closed' para consistencia con Cierre Trimestral
  closings.forEach(c => {
    if (c.status === 'closed') {
      totalIncomeZ += parseFloat(c.zReading || "0");
      totalDifference += parseFloat(c.difference || "0");
      withdrawnCash += parseFloat(c.withdrawnCash || "0");
      withdrawnCards += parseFloat(c.withdrawnCards || "0");
      prepaidBooking += parseFloat(c.prepaidBooking || "0");
    }
  });
  
  // Sumar gastos de facturas
  const invs = await db.select().from(invoices)
    .where(and(
      eq(invoices.businessId, businessId),
      gte(invoices.invoiceDate, startDate),
      lte(invoices.invoiceDate, endDate)
    ));
  invs.forEach(inv => {
    totalExpenses += parseFloat(inv.totalAmount || "0");
  });
  
  // Sumar otros gastos (sueldos, seguros, impuestos, etc.)
  const otrosGastosTotal = await getTotalOtrosGastos(businessId, startDate, endDate);
  totalExpenses += otrosGastosTotal;
  
  // Sumar otros ingresos (separado de ingresos Z)
  otherIncome = await getTotalOtrosIngresos(businessId, startDate, endDate);
  
  // También sumar transacciones antiguas si existen
  let oldTxnsIncome = 0;
  txns.forEach(t => {
    if (t.type === "income") oldTxnsIncome += parseFloat(t.amount || "0");
    else totalExpenses += parseFloat(t.amount || "0");
  });
  
  const lowStock = await getLowStockItems(businessId);
  const openIncidents = await getIncidentsByBusiness(businessId, "open");
  const pendingOrders = await getOrdersByBusiness(businessId, "pending");
  
  return {
    totalIncomeZ, // Ingresos de caja (zReading)
    otherIncome, // Otros ingresos (type='ingreso')
    totalIncome: totalIncomeZ + otherIncome + oldTxnsIncome, // Total para balance
    totalExpenses,
    netResult: (totalIncomeZ + otherIncome + oldTxnsIncome) - totalExpenses,
    totalDifference,
    withdrawnCash,
    withdrawnCards,
    prepaidBooking,
    lowStockCount: lowStock.length,
    openIncidentsCount: openIncidents.length,
    pendingOrdersCount: pendingOrders.length
  };
}

export async function getHoursWorkedByUser(userId: number, startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return 0;
  const userShifts = await db.select().from(shifts)
    .where(and(
      eq(shifts.userId, userId),
      eq(shifts.status, "completed"),
      gte(shifts.scheduledDate, startDate),
      lte(shifts.scheduledDate, endDate)
    ));
  
  return userShifts.reduce((sum, s) => sum + parseFloat(s.hoursWorked || "0"), 0);
}

// ==================== SUPPLIERS ====================
export async function getAllSuppliers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(suppliers).where(eq(suppliers.isActive, true)).orderBy(asc(suppliers.name));
}

export async function createSupplier(data: InsertSupplier) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(suppliers).values(data);
  return result[0].insertId;
}

export async function updateSupplier(id: number, data: Partial<InsertSupplier>) {
  const db = await getDb();
  if (!db) return;
  await db.update(suppliers).set(data).where(eq(suppliers.id, id));
}

export async function deleteSupplier(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(suppliers).set({ isActive: false }).where(eq(suppliers.id, id));
}

// ==================== SHIFT TEMPLATES ====================
export async function getAllShiftTemplates() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(shiftTemplates).where(eq(shiftTemplates.isActive, true)).orderBy(asc(shiftTemplates.dayOfWeek));
}

export async function createShiftTemplate(data: InsertShiftTemplate) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(shiftTemplates).values(data);
  return result[0].insertId;
}

export async function updateShiftTemplate(id: number, data: Partial<InsertShiftTemplate>) {
  const db = await getDb();
  if (!db) return;
  await db.update(shiftTemplates).set(data).where(eq(shiftTemplates.id, id));
}

export async function deleteShiftTemplate(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(shiftTemplates).set({ isActive: false }).where(eq(shiftTemplates.id, id));
}

export async function generateShiftsFromTemplates(startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return;
  
  const templates = await getAllShiftTemplates();
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    const dateStr = d.toISOString().split('T')[0];
    
    // Check if shifts already exist for this date
    const existingShifts = await db.select().from(shifts).where(eq(shifts.scheduledDate, dateStr));
    if (existingShifts.length > 0) continue;
    
    // Create shifts from templates for this day
    const dayTemplates = templates.filter(t => t.dayOfWeek === dayOfWeek);
    for (const template of dayTemplates) {
      await db.insert(shifts).values({
        userId: template.userId,
        scheduledDate: dateStr,
        scheduledStart: template.scheduledStart,
        scheduledEnd: template.scheduledEnd,
        status: "scheduled"
      });
    }
  }
}

// ==================== EMPLOYEE MANAGEMENT ====================
import bcrypt from "bcryptjs";

export async function createEmployeeWithCredentials(
  name: string, 
  email: string | undefined, 
  username: string, 
  password: string, 
  role: "user" | "admin" | "housekeeping" = "user"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if username already exists
  const existing = await db.select().from(users).where(eq(users.username, username));
  if (existing.length > 0) {
    throw new Error("El nombre de usuario ya existe");
  }
  
  // Generate a unique openId for manual employees
  const openId = `manual_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
  // Hash the password
  const passwordHash = await bcrypt.hash(password, 10);
  
  const result = await db.insert(users).values({
    openId,
    name,
    email,
    username,
    passwordHash,
    loginMethod: "password",
    role,
    isActive: true,
    lastSignedIn: new Date()
  });
  return result[0].insertId;
}

export async function updateUserPassword(userId: number, newPassword: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
}

export async function getUserByUsername(username: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(users).where(eq(users.username, username));
  return result[0] || null;
}

export async function verifyUserPassword(username: string, password: string) {
  const user = await getUserByUsername(username);
  if (!user || !user.passwordHash) return null;
  
  const isValid = await bcrypt.compare(password, user.passwordHash);
  return isValid ? user : null;
}

// ==================== CASH REGISTER AUTO ====================
export async function getOrCreateDailyCashRegister(businessId: number, userId: number, date: string) {
  const db = await getDb();
  if (!db) return null;
  
  // Check if cash register exists for this date and business
  const existing = await db.select().from(cashRegisters)
    .where(and(eq(cashRegisters.businessId, businessId), eq(cashRegisters.date, date)))
    .limit(1);
  
  if (existing.length > 0) {
    return existing[0];
  }
  
  // Get previous day's closing amount
  const previousDate = new Date(date);
  previousDate.setDate(previousDate.getDate() - 1);
  const prevDateStr = previousDate.toISOString().split('T')[0];
  
  const previousCash = await db.select().from(cashRegisters)
    .where(and(eq(cashRegisters.businessId, businessId), eq(cashRegisters.date, prevDateStr), eq(cashRegisters.status, "closed")))
    .limit(1);
  
  const openingAmount = previousCash.length > 0 ? (previousCash[0].closingAmount || "0") : "0";
  
  // Create new cash register
  const result = await db.insert(cashRegisters).values({
    businessId,
    userId,
    date,
    openingAmount,
    status: "open"
  });
  
  const newCash = await db.select().from(cashRegisters).where(eq(cashRegisters.id, result[0].insertId)).limit(1);
  return newCash[0];
}


// ==================== CASH CLOSINGS (Cierres de Caja Detallados) ====================
export async function getCashClosingsByBusiness(businessId: number, startDate?: string, endDate?: string) {
  const db = await getDb();
  if (!db) return [];
  let conditions = [eq(cashClosings.businessId, businessId)];
  if (startDate) conditions.push(gte(cashClosings.date, startDate));
  if (endDate) conditions.push(lte(cashClosings.date, endDate));
  return db.select().from(cashClosings).where(and(...conditions)).orderBy(desc(cashClosings.date));
}

export async function getCashClosingByDate(businessId: number, date: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(cashClosings)
    .where(and(eq(cashClosings.businessId, businessId), eq(cashClosings.date, date)))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getPreviousCashClosing(businessId: number, date: string) {
  const db = await getDb();
  if (!db) return null;
  // Buscar el cierre del día anterior (cerrado o no)
  const result = await db.select().from(cashClosings)
    .where(and(
      eq(cashClosings.businessId, businessId), 
      sql`${cashClosings.date} < ${date}`
    ))
    .orderBy(desc(cashClosings.date))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getOrCreateCashClosing(businessId: number, userId: number, date: string) {
  const db = await getDb();
  if (!db) return null;
  
  // Check if closing exists for this date
  const existing = await getCashClosingByDate(businessId, date);
  
  // Get previous day's closing to get the change
  const previous = await getPreviousCashClosing(businessId, date);
  // Usar changeForNextDay si existe y no es 0, sino usar totalCash del día anterior
  const previousChangeValue = previous 
    ? (parseFloat(previous.changeForNextDay || "0") > 0 
        ? previous.changeForNextDay 
        : (parseFloat(previous.totalCash || "0") > 0 ? previous.totalCash : "0"))
    : "0";
  
  // Si ya existe pero el previousChange es 0 y tenemos un valor del día anterior, actualizarlo
  if (existing) {
    if (parseFloat(existing.previousChange || "0") === 0 && parseFloat(previousChangeValue) > 0) {
      await db.update(cashClosings)
        .set({ previousChange: previousChangeValue })
        .where(eq(cashClosings.id, existing.id));
      return { ...existing, previousChange: previousChangeValue };
    }
    return existing;
  }
  
  const previousChange = previousChangeValue;
  
  // Create new closing
  const result = await db.insert(cashClosings).values({
    businessId,
    userId,
    date,
    previousChange,
    status: "draft"
  });
  
  const newClosing = await db.select().from(cashClosings).where(eq(cashClosings.id, result[0].insertId)).limit(1);
  return newClosing[0];
}

export async function updateCashClosing(id: number, data: Partial<InsertCashClosing>) {
  const db = await getDb();
  if (!db) return;
  await db.update(cashClosings).set(data).where(eq(cashClosings.id, id));
  
  // Si se actualiza changeForNextDay o totalCash, actualizar el previousChange del día siguiente
  if (data.changeForNextDay || data.totalCash) {
    // Obtener el cierre actual para saber la fecha y negocio
    const current = await db.select().from(cashClosings).where(eq(cashClosings.id, id)).limit(1);
    if (current.length > 0) {
      const currentClosing = current[0];
      const currentDate = new Date(currentClosing.date);
      const nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() + 1);
      const nextDateStr = nextDate.toISOString().split('T')[0];
      
      // Buscar si existe cierre del día siguiente
      const nextClosing = await db.select().from(cashClosings)
        .where(and(
          eq(cashClosings.businessId, currentClosing.businessId),
          eq(cashClosings.date, nextDateStr)
        ))
        .limit(1);
      
      if (nextClosing.length > 0) {
        // Actualizar el previousChange del día siguiente
        const newPreviousChange = data.changeForNextDay || data.totalCash || currentClosing.changeForNextDay || currentClosing.totalCash || "0";
        await db.update(cashClosings)
          .set({ previousChange: newPreviousChange })
          .where(eq(cashClosings.id, nextClosing[0].id));
      }
    }
  }
}

export async function closeCashClosing(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(cashClosings).set({ status: "closed" }).where(eq(cashClosings.id, id));
}

export async function reopenCashClosing(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(cashClosings).set({ status: "draft" }).where(eq(cashClosings.id, id));
}

// ==================== CASH MOVEMENTS (Entradas/Salidas) ====================
export async function getCashMovementsByClosing(cashClosingId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cashMovements).where(eq(cashMovements.cashClosingId, cashClosingId)).orderBy(asc(cashMovements.createdAt));
}

export async function createCashMovement(data: InsertCashMovement) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(cashMovements).values(data);
  return result[0].insertId;
}

export async function deleteCashMovement(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(cashMovements).where(eq(cashMovements.id, id));
}

// ==================== CSV EXPORT ====================
export async function exportCashClosingsToCSV(businessId: number, startDate: string, endDate: string) {
  const closings = await getCashClosingsByBusiness(businessId, startDate, endDate);
  
  const headers = [
    "Fecha", "Monedas 0.10", "Monedas 0.20", "Monedas 0.50", "Monedas 1€", "Monedas 2€",
    "Billetes 5€", "Billetes 10€", "Billetes 20€", "Billetes 50€",
    "Total Efectivo", "Total Tarjetas", "Z", "Cambio Anterior",
    "Prepago Booking", "Retirado Efectivo", "Retirado Tarjetas",
    "Total Esperado", "Total Real", "Descuadre", "Cambio Siguiente", "Estado"
  ];
  
  const rows = closings.map(c => [
    c.date, c.coins010, c.coins020, c.coins050, c.coins100, c.coins200,
    c.bills5, c.bills10, c.bills20, c.bills50,
    c.totalCash, c.totalCards, c.zReading, c.previousChange,
    c.prepaidBooking, c.withdrawnCash, c.withdrawnCards,
    c.expectedTotal, c.actualTotal, c.difference, c.changeForNextDay, c.status
  ]);
  
  const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  return csv;
}


// ==================== NOTIFICATIONS ====================
export async function createNotification(data: InsertNotification) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(notifications).values(data);
  return result[0].insertId;
}

export async function getNotificationsByUser(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function getUnreadNotificationsCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return result[0]?.count || 0;
}

export async function markNotificationAsRead(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
}

export async function markAllNotificationsAsRead(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
}

export async function deleteOldNotifications(daysOld = 30) {
  const db = await getDb();
  if (!db) return;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  await db.delete(notifications).where(sql`${notifications.createdAt} < ${cutoffDate}`);
}


// ==================== ROOM STATUS ====================
export async function getRoomStatusByDate(date: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(roomStatus).where(eq(roomStatus.date, date));
}

export async function updateRoomStatus(data: {
  roomNumber: string;
  date: string;
  status: "checkout" | "continues" | "empty" | "ready";
  beds?: number;
  notes?: string;
  updatedBy: number;
}) {
  const db = await getDb();
  if (!db) return null;
  
  const existing = await db.select()
    .from(roomStatus)
    .where(and(
      eq(roomStatus.roomNumber, data.roomNumber),
      eq(roomStatus.date, data.date)
    ))
    .limit(1);
  
  if (existing.length > 0) {
    await db.update(roomStatus)
      .set({
        status: data.status,
        beds: data.beds,
        notes: data.notes,
        updatedBy: data.updatedBy,
      })
      .where(eq(roomStatus.id, existing[0].id));
    return { ...existing[0], ...data };
  } else {
    await db.insert(roomStatus).values(data);
    const inserted = await db.select()
      .from(roomStatus)
      .where(and(
        eq(roomStatus.roomNumber, data.roomNumber),
        eq(roomStatus.date, data.date)
      ))
      .limit(1);
    return inserted[0] || null;
  }
}


// ==================== OTROS GASTOS ====================
export async function createOtroGasto(data: {
  businessId: number;
  type: "gasto" | "ingreso";
  concepto: string;
  categoria: "sueldos" | "seguridad_social" | "impuestos" | "seguros" | "otros";
  categoriaOtros?: string;
  importe: string;
  paymentMethod?: "cuenta_bancaria" | "tarjeta" | "ana" | "juanlu" | "caja_hostel" | "caja_tienda" | "caja_fuerte" | "caja_fuerte_cambio" | "otros";
  fecha: string;
  notas?: string;
  createdBy: number;
}) {
  const db = await getDb();
  if (!db) return null;
  
  // Construir objeto de inserción manualmente para evitar problemas con campos auto-generados
  const insertData = {
    businessId: data.businessId,
    type: data.type,
    concepto: data.concepto,
    categoria: data.categoria,
    categoriaOtros: data.categoriaOtros || null,
    importe: data.importe,
    paymentMethod: data.paymentMethod || null,
    fecha: data.fecha,
    notas: data.notas || null,
    createdBy: data.createdBy,
  };
  
  const result = await db.insert(otrosGastos).values(insertData);
  return result[0].insertId;
}

export async function listOtrosGastos(businessId: number, startDate?: string, endDate?: string) {
  const db = await getDb();
  if (!db) return [];
  
  if (startDate && endDate) {
    return db.select().from(otrosGastos)
      .where(
        and(
          eq(otrosGastos.businessId, businessId),
          gte(otrosGastos.fecha, startDate),
          lte(otrosGastos.fecha, endDate)
        )
      )
      .orderBy(desc(otrosGastos.fecha));
  }
  
  return db.select().from(otrosGastos)
    .where(eq(otrosGastos.businessId, businessId))
    .orderBy(desc(otrosGastos.fecha));
}

export async function updateOtroGasto(id: number, data: Partial<InsertOtroGasto>) {
  const db = await getDb();
  if (!db) return;
  await db.update(otrosGastos).set(data).where(eq(otrosGastos.id, id));
}

export async function deleteOtroGasto(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(otrosGastos).where(eq(otrosGastos.id, id));
}

export async function getTotalOtrosGastos(businessId: number, startDate?: string, endDate?: string) {
  const db = await getDb();
  if (!db) return 0;
  
  let conditions = and(
    eq(otrosGastos.businessId, businessId),
    eq(otrosGastos.type, "gasto")
  ) as any;
  
  if (startDate && endDate) {
    conditions = and(
      eq(otrosGastos.businessId, businessId),
      eq(otrosGastos.type, "gasto"),
      gte(otrosGastos.fecha, startDate),
      lte(otrosGastos.fecha, endDate)
    ) as any;
  }
  
  const result = await db
    .select({ total: sql<string>`COALESCE(SUM(CAST(${otrosGastos.importe} AS DECIMAL(10,2))), 0)` })
    .from(otrosGastos)
    .where(conditions);
  
  return parseFloat(result[0]?.total || "0");
}

export async function getTotalOtrosIngresos(businessId: number, startDate?: string, endDate?: string) {
  const db = await getDb();
  if (!db) return 0;
  
  let conditions = and(
    eq(otrosGastos.businessId, businessId),
    eq(otrosGastos.type, "ingreso")
  ) as any;
  
  if (startDate && endDate) {
    conditions = and(
      eq(otrosGastos.businessId, businessId),
      eq(otrosGastos.type, "ingreso"),
      gte(otrosGastos.fecha, startDate),
      lte(otrosGastos.fecha, endDate)
    ) as any;
  }
  
  const result = await db
    .select({ total: sql<string>`COALESCE(SUM(CAST(${otrosGastos.importe} AS DECIMAL(10,2))), 0)` })
    .from(otrosGastos)
    .where(conditions);
  
  return parseFloat(result[0]?.total || "0");
}


export async function getDailyWithdrawals(businessId: number, startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      date: cashClosings.date,
      cashWithdrawn: cashClosings.withdrawnCash,
      cardWithdrawn: cashClosings.withdrawnCards,
    })
    .from(cashClosings)
    .where(
      and(
        eq(cashClosings.businessId, businessId),
        eq(cashClosings.status, 'closed'),
        gte(cashClosings.date, startDate),
        lte(cashClosings.date, endDate)
      )
    )
    .orderBy(cashClosings.date);
  
  return result;
}


// ==================== SAFE BOXES (Cajas Fuertes) ====================
export async function getSafeBoxMovements(businessId: number, limit: number = 30) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(safeBoxes)
    .where(eq(safeBoxes.businessId, businessId))
    .orderBy(desc(safeBoxes.date), desc(safeBoxes.id))
    .limit(limit);
}

export async function createSafeBoxMovement(data: InsertSafeBox) {
  const db = await getDb();
  if (!db) return;
  
  // Calculate accumulated based on previous movements
  const previousMovements = await db.select().from(safeBoxes)
    .where(eq(safeBoxes.businessId, data.businessId))
    .orderBy(desc(safeBoxes.date), desc(safeBoxes.id))
    .limit(1);
  
  const previousAccumulated = previousMovements.length > 0 
    ? parseFloat(previousMovements[0].accumulated) 
    : 0;
  
  const newAccumulated = previousAccumulated + parseFloat(data.amount);
  
  const result = await db.insert(safeBoxes).values({
    ...data,
    accumulated: newAccumulated.toFixed(2)
  });
  
  return result;
}

export async function updateSafeBoxMovement(id: number, data: Partial<InsertSafeBox>) {
  const db = await getDb();
  if (!db) return;
  
  await db.update(safeBoxes).set(data).where(eq(safeBoxes.id, id));
  
  // Recalculate accumulated for all subsequent movements
  await recalculateSafeBoxAccumulated(id);
}

export async function deleteSafeBoxMovement(id: number) {
  const db = await getDb();
  if (!db) return;
  
  const movement = await db.select().from(safeBoxes).where(eq(safeBoxes.id, id)).limit(1);
  if (movement.length === 0) return;
  
  await db.delete(safeBoxes).where(eq(safeBoxes.id, id));
  
  // Recalculate accumulated for all subsequent movements
  await recalculateSafeBoxAccumulated(id, movement[0].businessId);
}

async function recalculateSafeBoxAccumulated(fromId: number, businessId?: number) {
  const db = await getDb();
  if (!db) return;
  
  // Get the movement to find its businessId if not provided
  if (!businessId) {
    const movement = await db.select().from(safeBoxes).where(eq(safeBoxes.id, fromId)).limit(1);
    if (movement.length === 0) return;
    businessId = movement[0].businessId;
  }
  
  // Get all movements for this business ordered by date and id
  const allMovements = await db.select().from(safeBoxes)
    .where(eq(safeBoxes.businessId, businessId))
    .orderBy(safeBoxes.date, safeBoxes.id);
  
  // Recalculate accumulated for each movement
  let accumulated = 0;
  for (const movement of allMovements) {
    accumulated += parseFloat(movement.amount);
    await db.update(safeBoxes)
      .set({ accumulated: accumulated.toFixed(2) })
      .where(eq(safeBoxes.id, movement.id));
  }
}

export async function updateSafeBoxCheckStatus(id: number, checkStatus: "unchecked" | "correct" | "incorrect") {
  const db = await getDb();
  if (!db) return;
  
  await db.update(safeBoxes).set({ checkStatus }).where(eq(safeBoxes.id, id));
}


// ==================== ACCESS CODES (Códigos de Acceso) ====================

export async function getAllAccessCodes() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(accessCodes).orderBy(asc(accessCodes.roomNumber));
}

export async function getAccessCodeById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [code] = await db.select().from(accessCodes).where(eq(accessCodes.id, id));
  return code;
}

export async function createAccessCode(data: InsertAccessCode) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [code] = await db.insert(accessCodes).values(data).$returningId();
  return code.id;
}

export async function updateAccessCode(id: number, data: Partial<InsertAccessCode>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(accessCodes).set(data).where(eq(accessCodes.id, id));
}

export async function deleteAccessCode(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(accessCodes).where(eq(accessCodes.id, id));
}

export async function updateEntranceCode(entranceCode: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Buscar el registro ENTRADA
  const [entrance] = await db.select().from(accessCodes).where(eq(accessCodes.roomNumber, 'ENTRADA'));
  if (entrance) {
    // Actualizar si existe
    await db.update(accessCodes).set({ roomCode: entranceCode }).where(eq(accessCodes.roomNumber, 'ENTRADA'));
  } else {
    // Crear si no existe
    await db.insert(accessCodes).values({
      roomNumber: 'ENTRADA',
      roomCode: entranceCode,
      roomType: 'Código de Entrada al Hostel',
      floor: 'N/A',
      floorLevel: 'N/A',
    });
  }
}


// ==================== WEEKLY CASH ENVELOPES ====================

export async function getWeeklyCashEnvelopes(weekStart: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(weeklyCashEnvelopes).where(eq(weeklyCashEnvelopes.weekStart, weekStart)).orderBy(asc(weeklyCashEnvelopes.dayOfWeek));
}

export async function upsertWeeklyCashEnvelope(data: InsertWeeklyCashEnvelope) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Buscar si ya existe
  const [existing] = await db.select().from(weeklyCashEnvelopes)
    .where(and(
      eq(weeklyCashEnvelopes.weekStart, data.weekStart),
      eq(weeklyCashEnvelopes.dayOfWeek, data.dayOfWeek)
    ));
  
  if (existing) {
    // Actualizar
    await db.update(weeklyCashEnvelopes)
      .set(data)
      .where(eq(weeklyCashEnvelopes.id, existing.id));
    return existing.id;
  } else {
    // Crear
    const [result] = await db.insert(weeklyCashEnvelopes).values(data).$returningId();
    return result.id;
  }
}

// ==================== WEEKLY AVAILABILITY SOURCES ====================

export async function getAllAvailabilitySources() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(weeklyAvailabilitySources).where(eq(weeklyAvailabilitySources.isActive, true)).orderBy(asc(weeklyAvailabilitySources.displayOrder));
}

export async function createAvailabilitySource(data: InsertWeeklyAvailabilitySource) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [source] = await db.insert(weeklyAvailabilitySources).values(data).$returningId();
  return source.id;
}

export async function updateAvailabilitySource(id: number, data: Partial<InsertWeeklyAvailabilitySource>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(weeklyAvailabilitySources).set(data).where(eq(weeklyAvailabilitySources.id, id));
}

export async function deleteAvailabilitySource(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Soft delete
  await db.update(weeklyAvailabilitySources).set({ isActive: false }).where(eq(weeklyAvailabilitySources.id, id));
}

// ==================== WEEKLY AVAILABILITY RECORDS ====================

export async function getWeeklyAvailabilityRecords(weekStart: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(weeklyAvailabilityRecords).where(eq(weeklyAvailabilityRecords.weekStart, weekStart));
}

export async function upsertWeeklyAvailabilityRecord(data: InsertWeeklyAvailabilityRecord) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Buscar si ya existe
  const [existing] = await db.select().from(weeklyAvailabilityRecords)
    .where(and(
      eq(weeklyAvailabilityRecords.weekStart, data.weekStart),
      eq(weeklyAvailabilityRecords.sourceId, data.sourceId)
    ));
  
  if (existing) {
    // Actualizar
    await db.update(weeklyAvailabilityRecords)
      .set({ amount: data.amount })
      .where(eq(weeklyAvailabilityRecords.id, existing.id));
    return existing.id;
  } else {
    // Crear
    const [result] = await db.insert(weeklyAvailabilityRecords).values(data).$returningId();
    return result.id;
  }
}

export async function getAllWeeklyAvailabilityRecords() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(weeklyAvailabilityRecords).orderBy(desc(weeklyAvailabilityRecords.weekStart));
}


// ==================== APP SETTINGS ====================
export async function getSetting(key: string): Promise<AppSetting | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(appSettings).where(eq(appSettings.settingKey, key)).limit(1);
  return result[0];
}

export async function upsertSetting(key: string, value: string, description?: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getSetting(key);
  
  if (existing) {
    await db.update(appSettings)
      .set({ settingValue: value, updatedAt: new Date() })
      .where(eq(appSettings.settingKey, key));
  } else {
    await db.insert(appSettings).values({
      settingKey: key,
      settingValue: value,
      description: description || null,
      isEncrypted: false
    });
  }
}

export async function deleteSetting(key: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(appSettings).where(eq(appSettings.settingKey, key));
}

export async function getAllSettings(): Promise<AppSetting[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(appSettings);
}

// ==================== HISTORICAL CASH DATA ====================
export async function getAllHistoricalCashData(): Promise<HistoricalCashData[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(historicalCashData).orderBy(historicalCashData.year, historicalCashData.month);
}

export async function getHistoricalCashDataByYear(year: number): Promise<HistoricalCashData[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(historicalCashData).where(eq(historicalCashData.year, year)).orderBy(historicalCashData.month);
}

export async function insertHistoricalCashData(data: InsertHistoricalCashData): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(historicalCashData).values(data);
}

export async function getAggregatedHistoricalData(): Promise<{
  hostelByYear: { year: number; total: string }[];
  tiendaByYear: { year: number; total: string }[];
  hostelByMonth: { year: number; month: number; total: string }[];
  tiendaByMonth: { year: number; month: number; total: string }[];
}> {
  const db = await getDb();
  if (!db) return { hostelByYear: [], tiendaByYear: [], hostelByMonth: [], tiendaByMonth: [] };
  
  // Get historical data (2014-2025)
  const historicalData = await db.select().from(historicalCashData).orderBy(historicalCashData.year, historicalCashData.month);
  
  // Get current year data from cashClosings (2026+)
  const currentYearClosings = await db.select({
    year: sql<number>`YEAR(${cashClosings.date})`,
    month: sql<number>`MONTH(${cashClosings.date})`,
    businessType: businesses.code,
    totalZ: cashClosings.zReading
  }).from(cashClosings)
    .innerJoin(businesses, eq(cashClosings.businessId, businesses.id))
    .where(sql`YEAR(${cashClosings.date}) >= 2026`);
  
  // Combine both data sources
  const allData = [
    ...historicalData,
    ...currentYearClosings.map(d => ({
      id: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      year: d.year,
      month: d.month,
      businessType: d.businessType as 'hostel' | 'tienda',
      totalZ: d.totalZ,
      totalCash: '0',
      totalCards: '0'
    }))
  ];
  
  // Aggregate by year for each business type
  const hostelByYear: { year: number; total: string }[] = [];
  const tiendaByYear: { year: number; total: string }[] = [];
  
  const yearTotals: { [key: string]: { hostel: number; tienda: number } } = {};
  
  allData.forEach(row => {
    const key = row.year.toString();
    if (!yearTotals[key]) {
      yearTotals[key] = { hostel: 0, tienda: 0 };
    }
    const z = parseFloat(row.totalZ);
    if (row.businessType === 'hostel') {
      yearTotals[key].hostel += z;
    } else {
      yearTotals[key].tienda += z;
    }
  });
  
  Object.keys(yearTotals).sort().forEach(year => {
    hostelByYear.push({ year: parseInt(year), total: yearTotals[year].hostel.toFixed(2) });
    tiendaByYear.push({ year: parseInt(year), total: yearTotals[year].tienda.toFixed(2) });
  });
  
  // Get monthly data
  const hostelByMonth = allData.filter(d => d.businessType === 'hostel').map(d => ({
    year: d.year,
    month: d.month,
    total: d.totalZ
  }));
  
  const tiendaByMonth = allData.filter(d => d.businessType === 'tienda').map(d => ({
    year: d.year,
    month: d.month,
    total: d.totalZ
  }));
  
  return { hostelByYear, tiendaByYear, hostelByMonth, tiendaByMonth };
}

export async function getCurrentYearCashData(year: number): Promise<{
  hostel: { month: number; totalZ: string; totalCash: string; totalCards: string }[];
  tienda: { month: number; totalZ: string; totalCash: string; totalCards: string }[];
}> {
  const db = await getDb();
  if (!db) return { hostel: [], tienda: [] };
  
  // Get all cash closings for the year
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;
  
  const closings = await db.select().from(cashClosings)
    .where(and(
      gte(cashClosings.date, startDate),
      lte(cashClosings.date, endDate),
      eq(cashClosings.status, 'closed')
    ));
  
  // Get business IDs
  const businessList = await db.select().from(businesses);
  const hostelBusiness = businessList.find(b => b.code === 'hostel');
  const tiendaBusiness = businessList.find(b => b.code === 'tienda');
  
  // Aggregate by month and business
  const monthlyData: {
    [key: string]: { totalZ: number; totalCash: number; totalCards: number };
  } = {};
  
  closings.forEach(closing => {
    const month = parseInt(closing.date.split('-')[1]);
    const businessType = closing.businessId === hostelBusiness?.id ? 'hostel' : 'tienda';
    const key = `${businessType}-${month}`;
    
    if (!monthlyData[key]) {
      monthlyData[key] = { totalZ: 0, totalCash: 0, totalCards: 0 };
    }
    
    monthlyData[key].totalZ += parseFloat(closing.zReading);
    monthlyData[key].totalCash += parseFloat(closing.totalCash);
    monthlyData[key].totalCards += parseFloat(closing.totalCards);
  });
  
  // Format results
  const hostel: { month: number; totalZ: string; totalCash: string; totalCards: string }[] = [];
  const tienda: { month: number; totalZ: string; totalCash: string; totalCards: string }[] = [];
  
  for (let month = 1; month <= 12; month++) {
    const hostelKey = `hostel-${month}`;
    const tiendaKey = `tienda-${month}`;
    
    if (monthlyData[hostelKey]) {
      hostel.push({
        month,
        totalZ: monthlyData[hostelKey].totalZ.toFixed(2),
        totalCash: monthlyData[hostelKey].totalCash.toFixed(2),
        totalCards: monthlyData[hostelKey].totalCards.toFixed(2),
      });
    }
    
    if (monthlyData[tiendaKey]) {
      tienda.push({
        month,
        totalZ: monthlyData[tiendaKey].totalZ.toFixed(2),
        totalCash: monthlyData[tiendaKey].totalCash.toFixed(2),
        totalCards: monthlyData[tiendaKey].totalCards.toFixed(2),
      });
    }
  }
  
  return { hostel, tienda };
}


// ==================== GLOBAL UTILITIES ====================
/**
 * Get available years from all tables in the database
 * Returns an array of years sorted from oldest to newest + next year
 * Used by all modules to populate year selectors dynamically
 */
export async function getAvailableYears(): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  
  const { sql } = await import('drizzle-orm');

  try {
    // Use raw SQL to get distinct years from all tables
    const result: any = await db.execute(sql`
      SELECT DISTINCT year FROM (
        SELECT YEAR(date) as year FROM cash_closings WHERE date IS NOT NULL
        UNION
        SELECT YEAR(STR_TO_DATE(invoiceDate, '%d/%m/%Y')) as year FROM invoices WHERE invoiceDate IS NOT NULL
        UNION
        SELECT YEAR(fecha) as year FROM otros_gastos WHERE fecha IS NOT NULL
        UNION
        SELECT year FROM historical_cash_data WHERE year IS NOT NULL
      ) AS all_years
      WHERE year IS NOT NULL
      ORDER BY year ASC
    `);
    
    const resultArray = Array.isArray(result[0]) ? result[0] : (Array.isArray(result) ? result : []);
    const years = resultArray.map((row: any) => row.year);

    // If no years found, return current year
    if (years.length === 0) {
      return [new Date().getFullYear()];
    }

    // Always include current year if not already present
    const currentYear = new Date().getFullYear();
    if (!years.includes(currentYear)) {
      years.push(currentYear);
    }
    
    // Add next year if not already present
    const nextYear = currentYear + 1;
    if (!years.includes(nextYear)) {
      years.push(nextYear);
    }

    // Sort years again after adding current/next year
    years.sort((a, b) => a - b);

    return years;
  } catch (error) {
    console.error('[getAvailableYears] Error:', error);
    // Fallback: return current year
    return [new Date().getFullYear()];
  }
}

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
  weeklySummaries, InsertWeeklySummary, WeeklySummary
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
  
  const txns = await db.select().from(transactions)
    .where(and(
      eq(transactions.businessId, businessId),
      gte(transactions.date, startDate),
      lte(transactions.date, endDate)
    ));
  
  const cashRegs = await db.select().from(cashRegisters)
    .where(and(
      eq(cashRegisters.businessId, businessId),
      gte(cashRegisters.date, startDate),
      lte(cashRegisters.date, endDate)
    ));
  
  let totalIncome = 0;
  let totalExpenses = 0;
  txns.forEach(t => {
    if (t.type === "income") totalIncome += parseFloat(t.amount || "0");
    else totalExpenses += parseFloat(t.amount || "0");
  });
  
  let totalDifference = 0;
  cashRegs.forEach(c => {
    totalDifference += parseFloat(c.difference || "0");
  });
  
  const lowStock = await getLowStockItems(businessId);
  const openIncidents = await getIncidentsByBusiness(businessId, "open");
  const pendingOrders = await getOrdersByBusiness(businessId, "pending");
  
  return {
    totalIncome,
    totalExpenses,
    netResult: totalIncome - totalExpenses,
    totalDifference,
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

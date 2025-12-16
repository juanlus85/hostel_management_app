import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean } from "drizzle-orm/mysql-core";

// ==================== USERS ====================
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  pin: varchar("pin", { length: 6 }), // PIN for quick clock-in/out
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ==================== BUSINESSES ====================
export const businesses = mysqlTable("businesses", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  code: varchar("code", { length: 20 }).notNull().unique(), // 'hostel' or 'tienda'
  description: text("description"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Business = typeof businesses.$inferSelect;
export type InsertBusiness = typeof businesses.$inferInsert;

// ==================== SHIFTS (Turnos) ====================
export const shifts = mysqlTable("shifts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  scheduledDate: varchar("scheduledDate", { length: 10 }).notNull(), // YYYY-MM-DD format
  scheduledStart: varchar("scheduledStart", { length: 5 }).notNull(), // HH:MM format
  scheduledEnd: varchar("scheduledEnd", { length: 5 }).notNull(), // HH:MM format
  actualStart: timestamp("actualStart"),
  actualEnd: timestamp("actualEnd"),
  hoursWorked: decimal("hoursWorked", { precision: 5, scale: 2 }),
  notes: text("notes"),
  status: mysqlEnum("status", ["scheduled", "in_progress", "completed", "cancelled"]).default("scheduled").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Shift = typeof shifts.$inferSelect;
export type InsertShift = typeof shifts.$inferInsert;

// ==================== CASH REGISTERS (Cajas) ====================
export const cashRegisters = mysqlTable("cash_registers", {
  id: int("id").autoincrement().primaryKey(),
  businessId: int("businessId").notNull(),
  userId: int("userId").notNull(),
  shiftId: int("shiftId"),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD format
  openingAmount: decimal("openingAmount", { precision: 10, scale: 2 }).default("0").notNull(),
  closingAmount: decimal("closingAmount", { precision: 10, scale: 2 }),
  expectedAmount: decimal("expectedAmount", { precision: 10, scale: 2 }),
  difference: decimal("difference", { precision: 10, scale: 2 }),
  cashWithdrawn: decimal("cashWithdrawn", { precision: 10, scale: 2 }).default("0").notNull(),
  cardWithdrawn: decimal("cardWithdrawn", { precision: 10, scale: 2 }).default("0").notNull(),
  notes: text("notes"),
  status: mysqlEnum("status", ["open", "closed"]).default("open").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CashRegister = typeof cashRegisters.$inferSelect;
export type InsertCashRegister = typeof cashRegisters.$inferInsert;

// ==================== TRANSACTIONS (Movimientos) ====================
export const transactions = mysqlTable("transactions", {
  id: int("id").autoincrement().primaryKey(),
  businessId: int("businessId").notNull(),
  cashRegisterId: int("cashRegisterId"),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["income", "expense"]).notNull(),
  category: varchar("category", { length: 100 }),
  concept: varchar("concept", { length: 255 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["cash", "card", "transfer", "other"]).default("cash").notNull(),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD format
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

// ==================== INVOICES (Facturas) ====================
export const invoices = mysqlTable("invoices", {
  id: int("id").autoincrement().primaryKey(),
  businessId: int("businessId").notNull(),
  userId: int("userId").notNull(),
  transactionId: int("transactionId"),
  supplier: varchar("supplier", { length: 255 }),
  invoiceNumber: varchar("invoiceNumber", { length: 100 }),
  invoiceDate: varchar("invoiceDate", { length: 10 }),
  baseAmount: decimal("baseAmount", { precision: 10, scale: 2 }),
  vatRate: decimal("vatRate", { precision: 5, scale: 2 }),
  vatAmount: decimal("vatAmount", { precision: 10, scale: 2 }),
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }),
  imageUrl: text("imageUrl"),
  imageKey: varchar("imageKey", { length: 255 }),
  ocrData: text("ocrData"), // JSON string with OCR extracted data
  ocrStatus: mysqlEnum("ocrStatus", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
  isVerified: boolean("isVerified").default(false).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = typeof invoices.$inferInsert;

// ==================== INVENTORY ITEMS (Productos) ====================
export const inventoryItems = mysqlTable("inventory_items", {
  id: int("id").autoincrement().primaryKey(),
  businessId: int("businessId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }),
  supplier: varchar("supplier", { length: 255 }),
  currentStock: decimal("currentStock", { precision: 10, scale: 2 }).default("0").notNull(),
  minimumStock: decimal("minimumStock", { precision: 10, scale: 2 }).default("0").notNull(),
  unit: varchar("unit", { length: 50 }).default("unidad").notNull(),
  costPrice: decimal("costPrice", { precision: 10, scale: 2 }),
  isActive: boolean("isActive").default(true).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type InventoryItem = typeof inventoryItems.$inferSelect;
export type InsertInventoryItem = typeof inventoryItems.$inferInsert;

// ==================== ORDERS (Pedidos) ====================
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  businessId: int("businessId").notNull(),
  userId: int("userId").notNull(),
  supplier: varchar("supplier", { length: 255 }),
  orderDate: varchar("orderDate", { length: 10 }).notNull(),
  expectedDelivery: varchar("expectedDelivery", { length: 10 }),
  actualDelivery: varchar("actualDelivery", { length: 10 }),
  status: mysqlEnum("status", ["pending", "ordered", "delivered", "cancelled"]).default("pending").notNull(),
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

// ==================== ORDER ITEMS (Items de Pedido) ====================
export const orderItems = mysqlTable("order_items", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  inventoryItemId: int("inventoryItemId"),
  itemName: varchar("itemName", { length: 255 }).notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }),
  totalPrice: decimal("totalPrice", { precision: 10, scale: 2 }),
  received: boolean("received").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

// ==================== INCIDENTS (Incidencias) ====================
export const incidents = mysqlTable("incidents", {
  id: int("id").autoincrement().primaryKey(),
  businessId: int("businessId").notNull(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium").notNull(),
  status: mysqlEnum("status", ["open", "in_progress", "resolved", "closed"]).default("open").notNull(),
  resolvedAt: timestamp("resolvedAt"),
  resolvedBy: int("resolvedBy"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Incident = typeof incidents.$inferSelect;
export type InsertIncident = typeof incidents.$inferInsert;

// ==================== TASKS (Tareas) ====================
export const tasks = mysqlTable("tasks", {
  id: int("id").autoincrement().primaryKey(),
  businessId: int("businessId"),
  createdBy: int("createdBy").notNull(),
  assignedTo: int("assignedTo"),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium").notNull(),
  status: mysqlEnum("status", ["pending", "in_progress", "completed", "cancelled"]).default("pending").notNull(),
  dueDate: varchar("dueDate", { length: 10 }),
  completedAt: timestamp("completedAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

// ==================== STOCK MOVEMENTS (Movimientos de Stock) ====================
export const stockMovements = mysqlTable("stock_movements", {
  id: int("id").autoincrement().primaryKey(),
  inventoryItemId: int("inventoryItemId").notNull(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["in", "out", "adjustment"]).notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  previousStock: decimal("previousStock", { precision: 10, scale: 2 }).notNull(),
  newStock: decimal("newStock", { precision: 10, scale: 2 }).notNull(),
  reason: varchar("reason", { length: 255 }),
  orderId: int("orderId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type StockMovement = typeof stockMovements.$inferSelect;
export type InsertStockMovement = typeof stockMovements.$inferInsert;

// ==================== WEEKLY SUMMARIES (Resúmenes Semanales) ====================
export const weeklySummaries = mysqlTable("weekly_summaries", {
  id: int("id").autoincrement().primaryKey(),
  businessId: int("businessId").notNull(),
  weekStart: varchar("weekStart", { length: 10 }).notNull(),
  weekEnd: varchar("weekEnd", { length: 10 }).notNull(),
  totalIncome: decimal("totalIncome", { precision: 12, scale: 2 }).default("0").notNull(),
  totalExpenses: decimal("totalExpenses", { precision: 12, scale: 2 }).default("0").notNull(),
  totalCashWithdrawn: decimal("totalCashWithdrawn", { precision: 12, scale: 2 }).default("0").notNull(),
  totalCardWithdrawn: decimal("totalCardWithdrawn", { precision: 12, scale: 2 }).default("0").notNull(),
  totalDifference: decimal("totalDifference", { precision: 12, scale: 2 }).default("0").notNull(),
  totalHoursWorked: decimal("totalHoursWorked", { precision: 10, scale: 2 }).default("0").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WeeklySummary = typeof weeklySummaries.$inferSelect;
export type InsertWeeklySummary = typeof weeklySummaries.$inferInsert;

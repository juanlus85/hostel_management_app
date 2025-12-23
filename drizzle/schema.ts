import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean } from "drizzle-orm/mysql-core";

// ==================== USERS ====================
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  username: varchar("username", { length: 100 }), // Username for login
  passwordHash: varchar("passwordHash", { length: 255 }), // Hashed password
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "housekeeping"]).default("user").notNull(),
  pin: varchar("pin", { length: 6 }), // PIN for quick clock-in/out
  color: varchar("color", { length: 7 }).default("#3b82f6"), // Color for calendar display
  isActive: boolean("isActive").default(true).notNull(),
  // Schedule template: JSON with default shifts per day of week
  // Format: {"monday": {"start": "10:00", "end": "18:00"}, "tuesday": null, ...}
  scheduleTemplate: text("scheduleTemplate"),
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
  paymentMethod: mysqlEnum("paymentMethod", ["cash", "card", "transfer", "cuenta_bancaria", "ana", "juanlu", "caja_hostel", "caja_tienda", "caja_fuerte", "caja_fuerte_cambio", "other"]).default("cash").notNull(),
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
  paymentMethod: mysqlEnum("paymentMethodInvoice", ["cuenta_bancaria", "tarjeta", "ana", "juanlu", "caja_hostel", "caja_tienda", "caja_fuerte", "caja_fuerte_cambio", "otros"]).default("cuenta_bancaria"),
  imageUrl: text("imageUrl"),
  imageKey: varchar("imageKey", { length: 255 }),
  ocrData: text("ocrData"), // JSON string with OCR extracted data
  ocrStatus: mysqlEnum("ocrStatus", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
  isVerified: boolean("isVerified").default(false).notNull(),
  isScanned: boolean("isScanned").default(false).notNull(), // Escaneado/Contabilizado
  hasVAT: boolean("hasVAT").default(true).notNull(), // Factura con IVA / A contabilizar
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  updatedBy: int("updatedBy"),
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
  createdBy: int("createdBy"),
  updatedBy: int("updatedBy"),
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
  updatedBy: int("updatedBy"),
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
  updatedBy: int("updatedBy"),
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

// ==================== SUPPLIERS (Proveedores) ====================
export const suppliers = mysqlTable("suppliers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  contactName: varchar("contactName", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 320 }),
  address: text("address"),
  notes: text("notes"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = typeof suppliers.$inferInsert;

// ==================== SHIFT TEMPLATES (Plantillas de Turnos) ====================
export const shiftTemplates = mysqlTable("shift_templates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  dayOfWeek: int("dayOfWeek").notNull(), // 0=Sunday, 1=Monday, etc.
  userId: int("userId").notNull(),
  scheduledStart: varchar("scheduledStart", { length: 5 }).notNull(),
  scheduledEnd: varchar("scheduledEnd", { length: 5 }).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ShiftTemplate = typeof shiftTemplates.$inferSelect;
export type InsertShiftTemplate = typeof shiftTemplates.$inferInsert;

// ==================== CASH CLOSINGS (Cierres de Caja Detallados) ====================
export const cashClosings = mysqlTable("cash_closings", {
  id: int("id").autoincrement().primaryKey(),
  businessId: int("businessId").notNull(),
  userId: int("userId").notNull(),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD format
  // Desglose de monedas y billetes
  coins010: int("coins010").default(0).notNull(), // Cantidad de monedas de 0.10€
  coins020: int("coins020").default(0).notNull(), // Cantidad de monedas de 0.20€
  coins050: int("coins050").default(0).notNull(), // Cantidad de monedas de 0.50€
  coins100: int("coins100").default(0).notNull(), // Cantidad de monedas de 1€
  coins200: int("coins200").default(0).notNull(), // Cantidad de monedas de 2€
  bills5: int("bills5").default(0).notNull(), // Cantidad de billetes de 5€
  bills10: int("bills10").default(0).notNull(), // Cantidad de billetes de 10€
  bills20: int("bills20").default(0).notNull(), // Cantidad de billetes de 20€
  bills50: int("bills50").default(0).notNull(), // Cantidad de billetes de 50€
  // Totales calculados
  totalCash: decimal("totalCash", { precision: 10, scale: 2 }).default("0").notNull(),
  totalCards: decimal("totalCards", { precision: 10, scale: 2 }).default("0").notNull(),
  zReading: decimal("zReading", { precision: 10, scale: 2 }).default("0").notNull(), // Z de la caja
  // Cambio del día anterior (automático)
  previousChange: decimal("previousChange", { precision: 10, scale: 2 }).default("0").notNull(),
  // Retiros
  prepaidBooking: decimal("prepaidBooking", { precision: 10, scale: 2 }).default("0").notNull(),
  withdrawnCash: decimal("withdrawnCash", { precision: 10, scale: 2 }).default("0").notNull(),
  withdrawnCards: decimal("withdrawnCards", { precision: 10, scale: 2 }).default("0").notNull(),
  // Descuadre
  expectedTotal: decimal("expectedTotal", { precision: 10, scale: 2 }).default("0").notNull(),
  actualTotal: decimal("actualTotal", { precision: 10, scale: 2 }).default("0").notNull(),
  difference: decimal("difference", { precision: 10, scale: 2 }).default("0").notNull(),
  // Cambio que queda para el día siguiente
  changeForNextDay: decimal("changeForNextDay", { precision: 10, scale: 2 }).default("0").notNull(),
  notes: text("notes"),
  status: mysqlEnum("status", ["draft", "closed"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CashClosing = typeof cashClosings.$inferSelect;
export type InsertCashClosing = typeof cashClosings.$inferInsert;

// ==================== CASH MOVEMENTS (Entradas/Salidas de Efectivo) ====================
export const cashMovements = mysqlTable("cash_movements", {
  id: int("id").autoincrement().primaryKey(),
  cashClosingId: int("cashClosingId").notNull(),
  type: mysqlEnum("type", ["in", "out"]).notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CashMovement = typeof cashMovements.$inferSelect;
export type InsertCashMovement = typeof cashMovements.$inferInsert;

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


// ==================== NOTIFICATIONS (Notificaciones) ====================
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // Usuario que recibe la notificación
  type: mysqlEnum("type", ["shift_assigned", "shift_modified", "shift_deleted", "general"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  relatedShiftId: int("relatedShiftId"), // ID del turno relacionado (opcional)
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;


// ==================== SYSTEM SETTINGS (Configuración del Sistema) ====================
export const systemSettings = mysqlTable("system_settings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value"),
  description: varchar("description", { length: 255 }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = typeof systemSettings.$inferInsert;


// ==================== ROOM STATUS (Estado de Habitaciones) ====================
export const roomStatus = mysqlTable("room_status", {
  id: int("id").autoincrement().primaryKey(),
  roomNumber: varchar("roomNumber", { length: 10 }).notNull(),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  status: mysqlEnum("status", ["checkout", "continues", "empty", "ready"]).notNull(),
  beds: int("beds"), // Solo para habitación 42
  notes: text("notes"),
  updatedBy: int("updatedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RoomStatus = typeof roomStatus.$inferSelect;
export type InsertRoomStatus = typeof roomStatus.$inferInsert;


// ==================== OTROS GASTOS (Gastos No Facturados) ====================
export const otrosGastos = mysqlTable("otros_gastos", {
  id: int("id").autoincrement().primaryKey(),
  businessId: int("businessId").notNull(),
  type: mysqlEnum("type", ["gasto", "ingreso"]).notNull().default("gasto"),
  concepto: varchar("concepto", { length: 255 }).notNull(),
  categoria: mysqlEnum("categoria", ["sueldos", "seguridad_social", "impuestos", "seguros", "otros"]).notNull().default("otros"),
  categoriaOtros: varchar("categoriaOtros", { length: 255 }), // Solo si categoria = "otros"
  importe: decimal("importe", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["cuenta_bancaria", "tarjeta", "ana", "juanlu", "caja_hostel", "caja_tienda", "caja_fuerte", "caja_fuerte_cambio", "otros"]),
  fecha: varchar("fecha", { length: 10 }).notNull(), // YYYY-MM-DD format
  notas: text("notas"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OtroGasto = typeof otrosGastos.$inferSelect;
export type InsertOtroGasto = typeof otrosGastos.$inferInsert;

export type OrderHistoryStatus = "all" | "delivered" | "cancelled";
export type OrderHistoryPeriod = "30" | "90" | "all";

export type OrderHistoryEntry = {
  status: string;
  orderDate: string;
  actualDelivery?: string | null;
};

export function orderReferenceDate(order: OrderHistoryEntry): string {
  return order.actualDelivery || order.orderDate;
}

export function filterOrderHistory<T extends OrderHistoryEntry>(orders: T[], status: OrderHistoryStatus, period: OrderHistoryPeriod, today: string): T[] {
  const earliest = period === "all" ? null : new Date(`${today}T00:00:00`);
  if (earliest) earliest.setDate(earliest.getDate() - Number(period));
  return orders.filter((order) => {
    const matchesStatus = status === "all" || order.status === status;
    return matchesStatus && (!earliest || new Date(`${orderReferenceDate(order)}T00:00:00`) >= earliest);
  });
}

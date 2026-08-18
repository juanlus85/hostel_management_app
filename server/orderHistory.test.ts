import { describe, expect, it } from "vitest";
import { filterOrderHistory, orderReferenceDate } from "../shared/orderHistory";

const orders = [
  { status: "delivered", orderDate: "2026-07-01", actualDelivery: "2026-07-03" },
  { status: "cancelled", orderDate: "2026-08-05", actualDelivery: null },
  { status: "delivered", orderDate: "2026-08-15", actualDelivery: "2026-08-16" },
  { status: "ordered", orderDate: "2026-08-17", actualDelivery: null },
];

describe("historial de pedidos", () => {
  it("usa la fecha de recepción cuando existe", () => {
    expect(orderReferenceDate(orders[0])).toBe("2026-07-03");
    expect(orderReferenceDate(orders[1])).toBe("2026-08-05");
  });

  it("filtra pedidos históricos por estado y periodo", () => {
    expect(filterOrderHistory(orders, "delivered", "30", "2026-08-18")).toEqual([orders[2]]);
    expect(filterOrderHistory(orders, "all", "30", "2026-08-18")).toEqual([orders[1], orders[2], orders[3]]);
  });
});

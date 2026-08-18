import { describe, expect, it } from "vitest";
import { aggregateSupplierExpenses } from "../shared/supplierExpenses";

describe("gastos por proveedor", () => {
  it("agrupa importes y facturas por proveedor, ordenados de mayor a menor", () => {
    expect(aggregateSupplierExpenses([
      { supplier: "O2", totalAmount: "12.50" },
      { supplier: "Limpieza SA", totalAmount: "50" },
      { supplier: "O2", totalAmount: "7.50" },
      { supplier: null, totalAmount: "3" },
    ])).toEqual([
      { supplier: "Limpieza SA", total: 50, invoiceCount: 1 },
      { supplier: "O2", total: 20, invoiceCount: 2 },
      { supplier: "Sin proveedor", total: 3, invoiceCount: 1 },
    ]);
  });
});

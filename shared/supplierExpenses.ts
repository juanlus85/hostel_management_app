export type SupplierExpenseInput = { supplier?: string | null; totalAmount?: string | number | null };
export type SupplierExpense = { supplier: string; total: number; invoiceCount: number };

export function aggregateSupplierExpenses(invoices: SupplierExpenseInput[]): SupplierExpense[] {
  const totals = new Map<string, SupplierExpense>();
  invoices.forEach((invoice) => {
    const supplier = invoice.supplier?.trim() || "Sin proveedor";
    const current = totals.get(supplier) || { supplier, total: 0, invoiceCount: 0 };
    current.total += Number(invoice.totalAmount || 0);
    current.invoiceCount += 1;
    totals.set(supplier, current);
  });
  return Array.from(totals.values()).sort((a, b) => b.total - a.total || a.supplier.localeCompare(b.supplier));
}

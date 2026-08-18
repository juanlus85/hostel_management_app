import { describe, expect, it } from "vitest";
import { buildWeeklyShoppingList } from "../shared/weeklyShoppingList";

describe("lista de compra semanal", () => {
  it("agrupa los faltantes por proveedor y ordena los productos", () => {
    const result = buildWeeklyShoppingList([
      { name: "Agua", supplier: "Distribuciones Sur", category: "Bebidas", currentStock: "2", unit: "packs" },
      { name: "Bayeta", supplier: "Limpieza SA", category: "Limpieza", currentStock: "0", unit: "unidad" },
      { name: "Café", supplier: "Distribuciones Sur", currentStock: "1", unit: "kg" },
    ], "Hostel");

    expect(result).toContain("LISTA DE COMPRA SEMANAL · HOSTEL");
    expect(result).toContain("PEDIDO A DISTRIBUCIONES SUR\n- Agua (Bebidas): quedan 2 packs\n- Café: quedan 1 kg");
    expect(result).toContain("PEDIDO A LIMPIEZA SA\n- Bayeta (Limpieza): quedan 0 unidad");
  });
});

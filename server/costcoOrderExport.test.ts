import { describe, expect, it } from "vitest";
import { COSTCO_CATALOG } from "../shared/costcoCatalog";
import { calculateCostcoOrderItem } from "../shared/costcoOrders";
import { costcoOrderCopy, costcoOrderCsv } from "../shared/costcoOrderExport";

const example = [
  ["costco-08", 15],
  ["costco-09", 20],
  ["costco-12", 4],
  ["costco-31", 1],
  ["costco-14", 3],
  ["costco-23", 1],
  ["costco-25", 1],
  ["costco-18", 1],
  ["costco-21", 1],
  ["costco-04", 1],
  ["costco-03", 1],
  ["costco-01", 1],
  ["costco-02", 1],
] as const;
const rows = example.map(([id, quantity]) => {
  const catalog = COSTCO_CATALOG.find(item => item.id === id)!;
  return {
    ...catalog,
    quantity,
    ...calculateCostcoOrderItem({
      cost: catalog.cost,
      quantity,
      inventoryStock: "111",
      unitsPerPackage: 40,
    }),
    inventoryProductName: "Dato interno secreto",
  };
});

describe("Costco: copia del pedido", () => {
  it("copia solo item, descripción y cantidad en el orden del pedido", () => {
    const text = costcoOrderCopy(rows);
    expect(text.split("\n")).toEqual([
      "Item\tDescripción\tCantidad",
      ...rows.map(row => `${row.costcoCode}\t${row.name}\t${row.quantity}`),
    ]);
    expect(text).not.toContain("PVP");
    expect(text).not.toContain("TOTAL PEDIDO");
    expect(text).not.toContain("€");
    expect(text.split("\n").every(line => line.split("\t").length === 3)).toBe(
      true
    );
  });
  it("excluye cantidades cero y campos internos del inventario", () => {
    const text = costcoOrderCopy([
      ...rows,
      { ...rows[0], name: "No pedir", quantity: 0, totalCost: "0.00" },
    ]);
    expect(text).not.toContain("No pedir");
    expect(text).not.toContain("Dato interno secreto");
    expect(text).not.toContain("Total previsto");
    expect(text).not.toContain("Unidad/Paquete");
    expect(text).not.toContain("Hay");
  });
  it("limpia tabuladores y saltos de línea sin añadir columnas ni filas", () => {
    const text = costcoOrderCopy([{ ...rows[0], name: "Agua\tCostco\nextra" }]);
    expect(text).toBe(
      "Item\tDescripción\tCantidad\n1138180\tAgua Costco extra\t15"
    );
    expect(costcoOrderCopy([])).toBe("Item\tDescripción\tCantidad");
  });
  it("mantiene el CSV detallado con precios y total de 296,89 euros", () => {
    const csv = costcoOrderCsv(rows);
    expect(csv.split("\r\n")[0]).toBe(
      '"Item";"Descripción";"Cantidad";"PVP unidad";"PVP total"'
    );
    expect(csv).toContain("TOTAL PEDIDO");
    expect(csv).toMatch(/296,89\s?€/);
  });
  it("exporta CSV escapando comillas y evitando columnas rotas", () => {
    const csv = costcoOrderCsv([
      { ...rows[0], name: 'Agua "Costco"; prueba\nextra' },
    ]);
    expect(csv).toContain('"Agua ""Costco""; prueba extra"');
    expect(csv.split("\r\n")).toHaveLength(3);
  });
  it("conserva las dos filas con código Costco repetido como artículos distintos", () => {
    expect(COSTCO_CATALOG).toHaveLength(31);
    expect(new Set(COSTCO_CATALOG.map(row => row.id)).size).toBe(31);
    expect(
      COSTCO_CATALOG.filter(row => row.costcoCode === "1008215").map(
        row => row.cost
      )
    ).toEqual(["5.99", "4.49"]);
  });
});

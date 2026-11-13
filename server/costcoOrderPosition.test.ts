import { describe, expect, it } from "vitest";
import { moveCostcoOrderRows } from "../shared/costcoOrderPosition";
import {
  costcoOrderCopy,
  costcoOrderCsv,
  costcoOrderEmailHtml,
} from "../shared/costcoOrderExport";

const rows = [
  {
    id: "a",
    costcoCode: "100",
    name: "Agua",
    quantity: 10,
    cost: "4.99",
    totalCost: "49.90",
    inventoryProductId: 15,
    unitsPerPackage: 40,
  },
  {
    id: "b",
    costcoCode: "200",
    name: "Zumos",
    quantity: 2,
    cost: "5.99",
    totalCost: "11.98",
    inventoryProductId: 21,
    unitsPerPackage: 18,
  },
  {
    id: "c",
    costcoCode: "300",
    name: "Cerveza",
    quantity: 4,
    cost: "7.99",
    totalCost: "31.96",
    inventoryProductId: null,
    unitsPerPackage: 24,
  },
];

describe("Orden del pedido Costco en pantalla y exportación", () => {
  it("sube un artículo una posición en el pedido global", () => {
    expect(moveCostcoOrderRows(rows, "b", "up").map(row => row.id)).toEqual([
      "b",
      "a",
      "c",
    ]);
  });
  it("baja un artículo una posición", () => {
    expect(moveCostcoOrderRows(rows, "b", "down").map(row => row.id)).toEqual([
      "a",
      "c",
      "b",
    ]);
  });
  it("no altera extremos ni artículos que no existen", () => {
    expect(moveCostcoOrderRows(rows, "a", "up")).toEqual(rows);
    expect(moveCostcoOrderRows(rows, "c", "down")).toEqual(rows);
    expect(moveCostcoOrderRows(rows, "missing", "up")).toEqual(rows);
    expect(moveCostcoOrderRows([], "missing", "down")).toEqual([]);
  });
  it("no modifica el array original ni cantidades, paquetes o vínculos", () => {
    const before = JSON.stringify(rows);
    const moved = moveCostcoOrderRows(rows, "c", "up");
    expect(JSON.stringify(rows)).toBe(before);
    expect(moved).not.toBe(rows);
    expect(moved.find(row => row.id === "c")).toBe(rows[2]);
    expect(moved.find(row => row.id === "a")).toBe(rows[0]);
  });
  it("copia, tabla para correo y CSV siguen el nuevo orden", () => {
    const moved = moveCostcoOrderRows(rows, "b", "up");
    for (const text of [
      costcoOrderCopy(moved),
      costcoOrderCsv(moved),
      costcoOrderEmailHtml(moved),
    ]) {
      expect(text.indexOf("Zumos")).toBeLessThan(text.indexOf("Agua"));
      expect(text.indexOf("Agua")).toBeLessThan(text.indexOf("Cerveza"));
    }
  });
});

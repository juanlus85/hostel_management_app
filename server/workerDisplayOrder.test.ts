import { describe, expect, it } from "vitest";
import { displayOrderUpdates, moveIdInOrder } from "../shared/workerDisplayOrder";

describe("orden de trabajadores", () => {
  it("genera posiciones consecutivas para persistir el orden", () => {
    expect(displayOrderUpdates([4, 9, 2])).toEqual([{ id: 4, displayOrder: 1 }, { id: 9, displayOrder: 2 }, { id: 2, displayOrder: 3 }]);
  });
  it("mueve un trabajador sin salir de los límites", () => {
    expect(moveIdInOrder([4, 9, 2], 9, -1)).toEqual([9, 4, 2]);
    expect(moveIdInOrder([4, 9, 2], 4, -1)).toEqual([4, 9, 2]);
  });
});

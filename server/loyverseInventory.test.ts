import { describe, expect, it } from "vitest";
import { normalizeLoyverseInventory } from "./loyverseInventory";

describe("catálogo de Loyverse", () => {
  it("normaliza producto, familia, coste, precio y stock de sus variantes", () => {
    const products = normalizeLoyverseInventory(
      [
        {
          id: "I-1",
          item_name: "Bocata",
          category_id: "C-1",
          variants: [
            {
              id: "V-1",
              variant_name: "Pollo",
              sku: "B-01",
              cost: "1.2",
              price: "3.5",
            },
          ],
        },
      ],
      [{ id: "C-1", name: "Bocatas" }],
      [{ item_id: "I-1", variant_id: "V-1", in_stock: "12" }]
    );
    expect(products).toEqual([
      {
        handle: "loyverse:I-1:V-1",
        ref: "B-01",
        name: "Bocata · Pollo",
        category: "Bocatas",
        cost: "1.200",
        price: "3.500",
        inStock: "12.000",
      },
    ]);
  });
});

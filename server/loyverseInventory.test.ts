import { describe, expect, it } from "vitest";
import {
  compactLoyverseHandle,
  normalizeLoyverseInventory,
} from "./loyverseInventory";

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
              default_price: "3.5",
            },
          ],
        },
      ],
      [{ id: "C-1", name: "Bocatas" }],
      [{ variant_id: "V-1", in_stock: "12" }]
    );
    expect(products).toEqual([
      {
        handle: compactLoyverseHandle("I-1", "V-1"),
        legacyHandle: "loyverse:I-1:V-1",
        ref: "B-01",
        name: "Bocata · Pollo",
        category: "Bocatas",
        cost: "1.200",
        price: "3.500",
        inStock: "12.000",
      },
    ]);
    expect(compactLoyverseHandle("a".repeat(200), "b".repeat(200)).length).toBeLessThan(40);
  });

  it("acota los textos externos y evita devolver un producto duplicado", () => {
    const products = normalizeLoyverseInventory(
      [{ id: "I-2", item_name: "x".repeat(300), category_name: "y".repeat(120), variants: [{ id: "V-2", sku: "z".repeat(70) }] }, { id: "I-2", item_name: "repetido", variants: [{ id: "V-2" }] }],
      [],
      []
    );
    expect(products).toHaveLength(1);
    expect(products[0].name.length).toBeLessThanOrEqual(255);
    expect(products[0].ref.length).toBeLessThanOrEqual(50);
    expect(products[0].category.length).toBeLessThanOrEqual(100);
  });
});

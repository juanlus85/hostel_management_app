import type { CostcoCatalogItem } from "./costcoCatalog";

export type CostcoCatalogRow = CostcoCatalogItem & {
  inventoryProductId: number | null;
  inventoryProductName: string | null;
  inventoryStock: string | null;
  bindingMissing: boolean;
};

export type CostcoOrderValues = {
  id: string;
  quantity: number;
  unitsPerPackage: number;
};

export type CostcoOrderRow = CostcoCatalogRow &
  Omit<CostcoOrderValues, "id"> & {
    totalExpected: string | null;
    totalCost: string;
  };

// Las unidades son explícitas: nunca se deducen del nombre del catálogo.
export const DEFAULT_COSTCO_ORDER: readonly CostcoOrderValues[] = [
  { id: "costco-08", quantity: 15, unitsPerPackage: 40 },
  { id: "costco-09", quantity: 20, unitsPerPackage: 12 },
  { id: "costco-12", quantity: 4, unitsPerPackage: 6 },
  { id: "costco-31", quantity: 1, unitsPerPackage: 1 },
  { id: "costco-14", quantity: 3, unitsPerPackage: 24 },
  { id: "costco-23", quantity: 1, unitsPerPackage: 1 },
  { id: "costco-25", quantity: 1, unitsPerPackage: 1 },
  { id: "costco-18", quantity: 1, unitsPerPackage: 1 },
  { id: "costco-21", quantity: 1, unitsPerPackage: 1 },
  { id: "costco-04", quantity: 1, unitsPerPackage: 20 },
  { id: "costco-03", quantity: 1, unitsPerPackage: 20 },
  { id: "costco-01", quantity: 1, unitsPerPackage: 10 },
  { id: "costco-02", quantity: 1, unitsPerPackage: 10 },
];

export function validateCostcoOrderValues(
  quantity: number,
  unitsPerPackage: number
): void {
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > 100000) {
    throw new RangeError("La cantidad debe ser un entero entre 0 y 100000");
  }
  if (
    !Number.isInteger(unitsPerPackage) ||
    unitsPerPackage < 1 ||
    unitsPerPackage > 100000
  ) {
    throw new RangeError(
      "Las unidades por paquete deben ser un entero entre 1 y 100000"
    );
  }
}

function decimalToScaled(value: string, scale: number): bigint {
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(value);
  if (!match || (match[3]?.length ?? 0) > scale) {
    throw new RangeError("Valor decimal inválido");
  }
  const result =
    BigInt(match[2]) * BigInt(`1${"0".repeat(scale)}`) +
    BigInt((match[3] ?? "").padEnd(scale, "0"));
  return match[1] === "-" ? -result : result;
}

function scaledToDecimal(value: bigint, scale: number): string {
  const negative = value < BigInt(0);
  const digits = (negative ? -value : value)
    .toString()
    .padStart(scale + 1, "0");
  return `${negative ? "-" : ""}${digits.slice(0, -scale)}.${digits.slice(-scale)}`;
}

export function calculateCostcoTotalCost(
  cost: string,
  quantity: number
): string {
  validateCostcoOrderValues(quantity, 1);
  const cents = decimalToScaled(cost, 2);
  if (cents < BigInt(0))
    throw new RangeError("El precio no puede ser negativo");
  return scaledToDecimal(cents * BigInt(quantity), 2);
}

export function calculateCostcoTotalExpected(
  inventoryStock: string | null,
  quantity: number,
  unitsPerPackage: number
): string | null {
  validateCostcoOrderValues(quantity, unitsPerPackage);
  if (inventoryStock === null) return null;
  // inventory_products.inStock es DECIMAL(10,3); no usamos aritmética float.
  return scaledToDecimal(
    decimalToScaled(inventoryStock, 3) +
      BigInt(quantity) * BigInt(unitsPerPackage) * BigInt(1000),
    3
  );
}

export function calculateCostcoOrderItem(
  item: Pick<
    CostcoOrderRow,
    "cost" | "inventoryStock" | "quantity" | "unitsPerPackage"
  >
): Pick<CostcoOrderRow, "totalExpected" | "totalCost"> {
  return {
    totalExpected: calculateCostcoTotalExpected(
      item.inventoryStock,
      item.quantity,
      item.unitsPerPackage
    ),
    totalCost: calculateCostcoTotalCost(item.cost, item.quantity),
  };
}

export function calculateCostcoOrderTotal(
  items: readonly Pick<CostcoOrderRow, "cost" | "quantity">[]
): string {
  return scaledToDecimal(
    items.reduce(
      (total, item) =>
        total +
        decimalToScaled(calculateCostcoTotalCost(item.cost, item.quantity), 2),
      BigInt(0)
    ),
    2
  );
}

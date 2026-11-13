export type CostcoOrderDirection = "up" | "down";

/** Mueve en el pedido completo, nunca en el resultado filtrado de una búsqueda. */
export function moveCostcoOrderRows<T extends { id: string }>(
  rows: readonly T[],
  id: string,
  direction: CostcoOrderDirection
): T[] {
  const moved = [...rows];
  const index = moved.findIndex(row => row.id === id);
  const nextIndex = index + (direction === "up" ? -1 : 1);
  if (index < 0 || nextIndex < 0 || nextIndex >= moved.length) return moved;
  [moved[index], moved[nextIndex]] = [moved[nextIndex], moved[index]];
  return moved;
}

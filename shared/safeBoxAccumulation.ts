export type SafeBoxAccumulationInput = {
  id: number;
  date: string;
  amount: string | number;
};

/**
 * Recalcula el saldo tras cada apunte en orden cronológico. El id estabiliza
 * el orden de movimientos registrados en el mismo día.
 */
export function calculateSafeBoxAccumulations<T extends SafeBoxAccumulationInput>(
  movements: readonly T[]
): Map<number, string> {
  const sorted = [...movements].sort(
    (left, right) => left.date.localeCompare(right.date) || left.id - right.id
  );
  const accumulatedById = new Map<number, string>();
  let accumulated = 0;

  for (const movement of sorted) {
    const amount = Number(movement.amount);
    if (!Number.isFinite(amount)) {
      throw new Error(`Importe inválido en el movimiento ${movement.id}`);
    }
    accumulated = Math.round((accumulated + amount) * 100) / 100;
    accumulatedById.set(movement.id, accumulated.toFixed(2));
  }

  return accumulatedById;
}

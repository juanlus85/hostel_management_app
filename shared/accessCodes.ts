export type AccessCodeRoom = { roomNumber: string };

/**
 * Una subhabitación como 42-1 usa el código configurado para la habitación
 * base 42, salvo que tenga un código específico configurado.
 */
export function findAccessCodeForRoom<T extends AccessCodeRoom>(
  codes: readonly T[],
  requestedRoomNumber: string | null | undefined
): T | undefined {
  const requested = requestedRoomNumber?.trim();
  if (!requested) return undefined;
  const exact = codes.find(code => code.roomNumber.trim() === requested);
  if (exact) return exact;
  const baseRoom = requested.replace(/-\d+$/, "");
  return baseRoom === requested
    ? undefined
    : codes.find(code => code.roomNumber.trim() === baseRoom);
}

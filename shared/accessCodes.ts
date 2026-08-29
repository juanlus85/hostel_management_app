export type AccessCodeRoom = { roomNumber: string };

export function normalizedAccessCodeRoom(value: string | null | undefined) {
  const normalized = String(value || "")
    .trim()
    .replace(/^(?:hab(?:itaci[oó]n)?|room)\s*\.?\s*#?\s*/i, "")
    .replace(/\s+/g, "")
    .replace(/\.0+$/, "");
  return normalized.match(/^\d+(?:-\d+)?/)?.[0] || normalized;
}

/**
 * Una subhabitación como 42-1 usa el código configurado para la habitación
 * base 42, salvo que tenga un código específico configurado.
 */
export function findAccessCodeForRoom<T extends AccessCodeRoom>(
  codes: readonly T[],
  requestedRoomNumber: string | null | undefined
): T | undefined {
  const requested = normalizedAccessCodeRoom(requestedRoomNumber);
  if (!requested) return undefined;
  const exact = codes.find(
    code => normalizedAccessCodeRoom(code.roomNumber) === requested
  );
  if (exact) return exact;
  const baseRoom = requested.replace(/-\d+$/, "");
  return baseRoom === requested
    ? undefined
    : codes.find(
        code => normalizedAccessCodeRoom(code.roomNumber) === baseRoom
      );
}

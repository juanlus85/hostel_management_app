export type ExternalReservationAssignmentIdentity = {
  sourceReservationId: string;
  roomNumber: string | null | undefined;
  checkInDate: string;
};

/**
 * Identifica una asignación física sin depender de cómo Cloudbeds escriba el
 * nombre de la habitación (por ejemplo, "51" o "Habitación 51").
 */
export function externalReservationAssignmentKey(
  reservation: ExternalReservationAssignmentIdentity
) {
  const room = (reservation.roomNumber || "")
    .replace(/^habitaci[oó]n\s*/i, "")
    .toLocaleLowerCase("es")
    .replace(/[^a-z0-9]+/g, "")
    .trim() || "unassigned";
  return `${reservation.sourceReservationId}\u0000${room}\u0000${reservation.checkInDate}`;
}

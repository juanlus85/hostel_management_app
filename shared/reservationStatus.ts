export function normalizeReservationStatus(value: string | null | undefined) {
  return value?.toLocaleLowerCase("es").replace(/[\s-]+/g, "_") || "";
}

/** Los estados que dejan de bloquear una habitación física. */
export function reservationReleasesAssignedRoom(
  value: string | null | undefined
) {
  return ["cancelled", "canceled", "no_show"].includes(
    normalizeReservationStatus(value)
  );
}

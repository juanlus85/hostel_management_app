/** Los perfiles Tablet son dispositivos de autoservicio, no personal de turnos. */
export function canBeScheduled(role: string | null | undefined): boolean {
  return role !== "tablet";
}

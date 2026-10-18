export type ReservationAgendaRoomLayout = {
  roomNumber: string;
  roomType: string;
  groupOrder: number;
  roomOrder: number;
};

/**
 * Distribución operativa del hostel. Se usa para que una variación puntual en
 * el nombre de tipo que devuelve Cloudbeds no cambie de sitio una habitación.
 */
export const DEFAULT_RESERVATION_AGENDA_LAYOUT: ReservationAgendaRoomLayout[] = [
  { roomNumber: "35", roomType: "Twin Room with Private Bathroom", groupOrder: 10, roomOrder: 10 },
  { roomNumber: "18", roomType: "Double Room with Private Bathroom", groupOrder: 20, roomOrder: 20 },
  { roomNumber: "51", roomType: "Double Room with Private Bathroom", groupOrder: 20, roomOrder: 30 },
  { roomNumber: "4", roomType: "Twin Room with Shared Bathroom", groupOrder: 30, roomOrder: 40 },
  { roomNumber: "15", roomType: "Twin Room with Shared Bathroom", groupOrder: 30, roomOrder: 50 },
  { roomNumber: "7", roomType: "Double Room with Shared Bathroom", groupOrder: 40, roomOrder: 60 },
  { roomNumber: "8", roomType: "Double Room with Shared Bathroom", groupOrder: 40, roomOrder: 70 },
  { roomNumber: "23", roomType: "Double Room with Shared Bathroom", groupOrder: 40, roomOrder: 80 },
  { roomNumber: "16", roomType: "Triple Room with Private Bathroom", groupOrder: 50, roomOrder: 90 },
  { roomNumber: "42-1", roomType: "Bed in 3-Bed Mixed Dormitory", groupOrder: 60, roomOrder: 100 },
  { roomNumber: "42-2", roomType: "Bed in 3-Bed Mixed Dormitory", groupOrder: 60, roomOrder: 110 },
  { roomNumber: "42-3", roomType: "Bed in 3-Bed Mixed Dormitory", groupOrder: 60, roomOrder: 120 },
];

export function normalizeAgendaRoomNumber(value: string | null | undefined) {
  const normalized = String(value || "")
    .trim()
    .replace(/^\s*(habitaci[oó]n|hab\.?|room)\s*/i, "")
    .replace(/\.0+$/, "");
  return normalized.toLocaleLowerCase("es-ES");
}

export function parseReservationAgendaLayout(value: string | null | undefined) {
  if (!value?.trim()) return DEFAULT_RESERVATION_AGENDA_LAYOUT;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return DEFAULT_RESERVATION_AGENDA_LAYOUT;
    const normalized = parsed
      .map(entry => {
        if (!entry || typeof entry !== "object") return null;
        const candidate = entry as Partial<ReservationAgendaRoomLayout>;
        const roomNumber = String(candidate.roomNumber || "").trim();
        const roomType = String(candidate.roomType || "").trim();
        const groupOrder = Number(candidate.groupOrder);
        const roomOrder = Number(candidate.roomOrder);
        if (!roomNumber || !roomType || !Number.isFinite(groupOrder) || !Number.isFinite(roomOrder)) return null;
        return { roomNumber, roomType, groupOrder, roomOrder };
      })
      .filter((entry): entry is ReservationAgendaRoomLayout => Boolean(entry));
    return normalized.length ? normalized : DEFAULT_RESERVATION_AGENDA_LAYOUT;
  } catch {
    return DEFAULT_RESERVATION_AGENDA_LAYOUT;
  }
}

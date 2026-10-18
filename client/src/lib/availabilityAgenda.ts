export type AgendaAvailabilityDay = {
  date: string;
  roomsAvailable: number | null;
  roomRate: number | null;
  totalRate: number | null;
  rateId: string | null;
};

export type AgendaAvailabilityRoomType = {
  roomTypeName: string;
  days: AgendaAvailabilityDay[];
};

export function availabilityRoomTypeKey(value: string) {
  const normalized = value
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  // Cloudbeds no mantiene necesariamente el mismo literal entre reservas y
  // tarifas: por ejemplo, "Private Bath", "baño privado" o "en suite". La
  // agenda necesita una clave semántica estable para no perder sus precios.
  const isDorm = /\bdorm(?:itory)?\b|\bdormitorio\b|\bbunk\b|\bbed\s+in\b|\bcama\s+en\s+.*compartid|\bmixed\s+(?:bed|room)\b|\bmixta?\s+(?:cama|habitacion)\b/.test(normalized);
  const bedKind = isDorm
    ? "dorm"
    : /\btwin\b|\b2\s*camas?\b|\btwo\s*beds?\b/.test(normalized)
      ? "twin"
      : /\btriple\b|\b3\s*camas?\b|\bthree\s*beds?\b/.test(normalized)
        ? "triple"
        : /\bdouble\b|\bdoble\b|\bmatrimonio\b|\bqueen\b|\bking\b/.test(normalized)
          ? "double"
          : "";
  const bathroom = isDorm
    ? ""
    : /\bprivate\b|\bprivad[oa]\b|\ben\s*suite\b|\bensuite\b/.test(normalized)
      ? "private"
      : /\bshared\b|\bcompartid[oa]\b|\bcommunal\b/.test(normalized)
        ? "shared"
        : "";

  return [bedKind, bathroom].filter(Boolean).join(" ") || normalized;
}

export function buildAgendaAvailabilityByType<T extends AgendaAvailabilityRoomType>(roomTypes: T[]) {
  const result = new Map<string, T>();
  for (const roomType of roomTypes) {
    const key = availabilityRoomTypeKey(roomType.roomTypeName);
    if (!key) continue;
    const previous = result.get(key);
    if (!previous || roomType.days.length > previous.days.length) result.set(key, roomType);
  }
  return result;
}

export function findAgendaAvailabilityDay<T extends AgendaAvailabilityRoomType>(roomType: T | undefined, date: string) {
  return roomType?.days.find(day => day.date === date) || null;
}

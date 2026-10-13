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
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(twin)(?:\s+beds?)?\b|\b(?:2|dos)\s+camas?\b/g, " twin ")
    .replace(/\bdouble\b|\bdoble\b|\bcama\s+doble\b/g, " double ")
    .replace(/\btriple\b|\b(?:3|tres)\s+camas?\b/g, " triple ")
    .replace(/\bprivate\b|\bprivado\b/g, " privado ")
    .replace(/\bshared\b|\bcompartido\b/g, " compartido ")
    .replace(/\bbathroom\b|\bbano\b/g, " bano ")
    .replace(/\bhabitacion\b|\broom\b|\bwith\b|\bcon\b|\bbed(?:s)?\b|\bcama(?:s)?\b/g, " ");
  return normalized
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .sort()
    .join(" ");
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

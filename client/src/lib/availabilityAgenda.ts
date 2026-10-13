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
  return value
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
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

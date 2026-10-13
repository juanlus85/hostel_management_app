export type AgendaAvailabilityDay = {
  date: string;
  roomsAvailable: number | null;
  roomRate: number | null;
  totalRate: number | null;
  rateId: string | null;
  restrictions: {
    closedToArrival: boolean | null;
    closedToDeparture: boolean | null;
    minimumStay: number | null;
    maximumStay: number | null;
  };
};

export type AgendaAvailabilityRoomType = {
  roomTypeId: string;
  roomTypeName: string;
  ratePlanName: string | null;
  days: AgendaAvailabilityDay[];
};

export type AgendaAvailabilityResult = {
  startDate: string;
  endDate: string;
  fetchedAt?: string;
  roomTypes: AgendaAvailabilityRoomType[];
};

export function addCalendarDays(date: string, days: number) {
  const result = new Date(`${date}T12:00:00`);
  result.setDate(result.getDate() + days);
  return `${result.getFullYear()}-${String(result.getMonth() + 1).padStart(2, "0")}-${String(result.getDate()).padStart(2, "0")}`;
}

export function mergeAgendaAvailability(first: AgendaAvailabilityResult, next: AgendaAvailabilityResult): AgendaAvailabilityResult {
  const roomTypes = new Map(first.roomTypes.map(room => [room.roomTypeId, { ...room, days: [...room.days] }]));
  for (const nextRoom of next.roomTypes) {
    const current = roomTypes.get(nextRoom.roomTypeId);
    if (!current) {
      roomTypes.set(nextRoom.roomTypeId, { ...nextRoom, days: [...nextRoom.days] });
      continue;
    }
    const byDate = new Map(current.days.map(day => [day.date, day]));
    nextRoom.days.forEach(day => byDate.set(day.date, day));
    roomTypes.set(nextRoom.roomTypeId, {
      ...current,
      ratePlanName: current.ratePlanName || nextRoom.ratePlanName,
      days: Array.from(byDate.values()).sort((left, right) => left.date.localeCompare(right.date)),
    });
  }
  return {
    startDate: first.startDate,
    endDate: next.endDate,
    fetchedAt: next.fetchedAt || first.fetchedAt,
    roomTypes: Array.from(roomTypes.values()),
  };
}

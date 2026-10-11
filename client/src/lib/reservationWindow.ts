export const RESERVATION_AGENDA_DAYS = 15;

export function getReservationWindowDates(today: string) {
  const base = new Date(`${today}T12:00:00`);
  return Array.from({ length: RESERVATION_AGENDA_DAYS }, (_, index) => {
    const date = new Date(base);
    date.setDate(date.getDate() + index - 1);
    return date.toLocaleDateString("en-CA", { timeZone: "Europe/Madrid" });
  });
}

export function getReservationWindowRange(today: string) {
  const dates = getReservationWindowDates(today);
  return { dates, dateFrom: dates[0], dateTo: dates[dates.length - 1] };
}

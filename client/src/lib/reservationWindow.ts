export const RESERVATION_AGENDA_DAYS = 15;

export function getReservationWindowDates(startDate: string) {
  const base = new Date(`${startDate}T12:00:00`);
  return Array.from({ length: RESERVATION_AGENDA_DAYS }, (_, index) => {
    const date = new Date(base);
    date.setDate(date.getDate() + index);
    return date.toLocaleDateString("en-CA", { timeZone: "Europe/Madrid" });
  });
}

export function getReservationWindowRange(startDate: string) {
  const dates = getReservationWindowDates(startDate);
  return { dates, dateFrom: dates[0], dateTo: dates[dates.length - 1] };
}

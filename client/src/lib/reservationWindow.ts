export const RESERVATION_AGENDA_DAYS = 15;

export function getReservationWindowDates(selectedDate: string) {
  const base = new Date(`${selectedDate}T12:00:00`);
  return Array.from({ length: RESERVATION_AGENDA_DAYS }, (_, index) => {
    const date = new Date(base);
    // Mantener siempre una columna anterior a la fecha elegida permite ver los
    // check-outs y relevos de habitación antes del día operativo principal.
    date.setDate(date.getDate() + index - 1);
    return date.toLocaleDateString("en-CA", { timeZone: "Europe/Madrid" });
  });
}

export function getReservationWindowRange(selectedDate: string) {
  const dates = getReservationWindowDates(selectedDate);
  return { dates, dateFrom: dates[0], dateTo: dates[dates.length - 1] };
}

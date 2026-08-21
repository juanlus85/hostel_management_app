export type HoursReportShift = { userId: number; scheduledStart: string; scheduledEnd: string; scheduledDate: string; status: string };

export function scheduledShiftHours(start: string, end: string): number {
  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);
  let result = endHour + endMinute / 60 - startHour - startMinute / 60;
  if (result < 0) result += 24;
  return result;
}

export function totalReportHours(shifts: HoursReportShift[]): number {
  return shifts.filter((shift) => shift.status !== "cancelled").reduce((total, shift) => total + scheduledShiftHours(shift.scheduledStart, shift.scheduledEnd), 0);
}

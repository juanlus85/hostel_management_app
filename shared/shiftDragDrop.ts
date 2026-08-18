export function canRescheduleShift(status: string, sourceDate: string, targetDate: string): boolean {
  return status === "scheduled" && sourceDate !== targetDate;
}

export type GuestListPeriod = "week" | "month" | "all" | "custom";

type GuestListPeriodRange = {
  startDate?: string;
  endDate?: string;
  status?: "completed";
};

function toLocalDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Devuelve períodos inclusivos basados en el día local de recepción. */
export function getGuestListPeriodRange(
  period: GuestListPeriod,
  now: Date = new Date()
): GuestListPeriodRange {
  if (period === "all" || period === "custom") return {};

  const end = new Date(now);
  const start = new Date(now);
  start.setDate(start.getDate() - (period === "week" ? 6 : 29));

  return {
    startDate: toLocalDateValue(start),
    endDate: toLocalDateValue(end),
    status: "completed",
  };
}

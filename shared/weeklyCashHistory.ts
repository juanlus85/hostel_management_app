export type CashClosingHistoryEntry = {
  date: string;
  zReading: string | number | null;
  status?: string | null;
};

export type WeeklyCashTotal = {
  weekStart: string;
  weekEnd: string;
  label: string;
  tooltipLabel: string;
  total: number;
  isCurrent: boolean;
};

function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDate(value: string): Date | null {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function mondayOf(date: Date): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = result.getDay();
  result.setDate(result.getDate() + (day === 0 ? -6 : 1 - day));
  return result;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function buildWeekLabel(start: Date, end: Date): string {
  const formatter = new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short" });
  return `${formatter.format(start)}–${formatter.format(end)}`.replace(/\./g, "");
}

function buildTooltipLabel(start: Date, end: Date): string {
  const formatter = new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "long", year: "numeric" });
  return `Del ${formatter.format(start)} al ${formatter.format(end)}`;
}

/**
 * Agrupa los cierres cerrados por semanas naturales (lunes a domingo), incluida
 * la semana actual. Las fechas se procesan siempre en horario local para que
 * una caja no se desplace por conversiones UTC.
 */
export function buildWeeklyCashHistory(
  closings: CashClosingHistoryEntry[] = [],
  weeks: number = 52,
  referenceDate: Date = new Date()
): WeeklyCashTotal[] {
  const safeWeeks = Math.max(1, Math.min(weeks, 104));
  const currentMonday = mondayOf(referenceDate);
  const firstMonday = addDays(currentMonday, -7 * (safeWeeks - 1));
  const weekMap = new Map<string, WeeklyCashTotal>();

  for (let index = 0; index < safeWeeks; index += 1) {
    const weekStartDate = addDays(firstMonday, index * 7);
    const weekEndDate = addDays(weekStartDate, 6);
    const weekStart = formatDateLocal(weekStartDate);
    weekMap.set(weekStart, {
      weekStart,
      weekEnd: formatDateLocal(weekEndDate),
      label: buildWeekLabel(weekStartDate, weekEndDate),
      tooltipLabel: buildTooltipLabel(weekStartDate, weekEndDate),
      total: 0,
      isCurrent: weekStart === formatDateLocal(currentMonday),
    });
  }

  for (const closing of closings) {
    if (closing.status && closing.status !== "closed") continue;
    const date = parseLocalDate(closing.date);
    if (!date) continue;
    const week = weekMap.get(formatDateLocal(mondayOf(date)));
    if (!week) continue;
    week.total += Number.parseFloat(String(closing.zReading ?? 0)) || 0;
  }

  return Array.from(weekMap.values());
}

export function getRollingWeeklyCashRange(weeks: number = 52, referenceDate: Date = new Date()) {
  const history = buildWeeklyCashHistory([], weeks, referenceDate);
  const first = history[0];
  const last = history.at(-1);
  return {
    startDate: first?.weekStart,
    endDate: last?.weekEnd,
  };
}

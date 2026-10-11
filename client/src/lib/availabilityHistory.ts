export type AvailabilityRecord = {
  weekStart: string | Date;
  amount: string | number | null;
};

export type AvailabilityWeek = {
  key: string;
  label: string;
  timestamp: number;
  totals: Record<number, number>;
};

export function buildAvailabilityHistory(records: AvailabilityRecord[] = []) {
  const weeklyHistory = new Map<string, AvailabilityWeek>();
  const yearsWithData = new Set<number>();

  for (const record of records) {
    const rawWeekStart = String(record.weekStart).slice(0, 10);
    const dateParts = rawWeekStart.split("-").map(Number);
    if (dateParts.length !== 3 || dateParts.some(Number.isNaN)) continue;

    const [year, month, day] = dateParts;
    const key = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const weekDate = new Date(year, month - 1, day);

    if (!weeklyHistory.has(key)) {
      weeklyHistory.set(key, {
        key,
        label: `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${String(year).slice(-2)}`,
        timestamp: weekDate.getTime(),
        totals: {},
      });
    }

    const week = weeklyHistory.get(key)!;
    week.totals[year] = (week.totals[year] || 0) + (Number.parseFloat(String(record.amount)) || 0);
    yearsWithData.add(year);
  }

  return {
    allWeeks: Array.from(weeklyHistory.values()).sort((a, b) => a.timestamp - b.timestamp),
    yearsWithData: Array.from(yearsWithData).sort((a, b) => a - b),
  };
}

function mondayKey(date: Date) {
  const value = new Date(date);
  const weekday = value.getDay();
  value.setDate(value.getDate() + (weekday === 0 ? -6 : 1 - weekday));
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function localDateFromKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function latestAvailabilityWeekStart(records: AvailabilityRecord[] = []) {
  const keys = records
    .map(record => String(record.weekStart).slice(0, 10))
    .filter(key => /^\d{4}-\d{2}-\d{2}$/.test(key));
  return keys.sort((a, b) => b.localeCompare(a))[0] || null;
}

export function weekOffsetFromCurrent(latestWeekStart: string, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(latestWeekStart)) return 0;
  const currentMonday = localDateFromKey(mondayKey(now));
  const targetMonday = localDateFromKey(latestWeekStart);
  return Math.round((targetMonday.getTime() - currentMonday.getTime()) / (7 * 24 * 60 * 60 * 1000));
}

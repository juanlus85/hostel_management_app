import { normalizeDateOnly } from "./checkinDateInput";

const POLICE_TIMEZONE = "+01:00";
const MIDNIGHT = "00:00:00.000";

function twoDigits(value: number) {
  return String(value).padStart(2, "0");
}

/**
 * Las fechas de estancia son fechas de calendario, no instantes UTC. Por eso
 * nunca se deben pasar por toISOString(): en España puede devolver el día
 * anterior. Conservamos la parte YYYY-MM-DD exactamente como se registró.
 */
export function policeCalendarDate(value: unknown, fallback = new Date()): string {
  if (typeof value === "string") {
    const normalized = normalizeDateOnly(value.trim().slice(0, 10));
    if (normalized) return normalized;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${twoDigits(value.getMonth() + 1)}-${twoDigits(value.getDate())}`;
  }
  return `${fallback.getFullYear()}-${twoDigits(fallback.getMonth() + 1)}-${twoDigits(fallback.getDate())}`;
}

export function policeDate(value: unknown, fallback?: Date) {
  return `${policeCalendarDate(value, fallback)}${POLICE_TIMEZONE}`;
}

export function policeDateTime(value: unknown, fallback?: Date) {
  return `${policeCalendarDate(value, fallback)}T${MIDNIGHT}${POLICE_TIMEZONE}`;
}

export function nextPoliceCalendarDate(date: string) {
  const normalized = policeCalendarDate(date);
  const [year, month, day] = normalized.split("-").map(Number);
  const following = new Date(Date.UTC(year, month - 1, day + 1));
  return `${following.getUTCFullYear()}-${twoDigits(following.getUTCMonth() + 1)}-${twoDigits(following.getUTCDate())}`;
}

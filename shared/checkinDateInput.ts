function twoDigits(value: number) { return String(value).padStart(2, "0"); }

export function toDateTimeLocal(value: unknown): string {
  if (!value) return "";
  const raw = value instanceof Date ? value.toISOString() : String(value).trim();
  const normalized = raw.length === 10 ? `${raw}T11:00` : raw.replace(" ", "T");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${twoDigits(date.getMonth() + 1)}-${twoDigits(date.getDate())}T${twoDigits(date.getHours())}:${twoDigits(date.getMinutes())}`;
}

export function toDatabaseDate(value: string): string | undefined {
  const match = value.match(/^\d{4}-\d{2}-\d{2}/);
  if (!match) return undefined;
  const date = new Date(`${match[0]}T12:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : match[0];
}

export function parseCheckinDate(value: unknown): Date | null {
  const normalized = toDateTimeLocal(value);
  if (!normalized) return null;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

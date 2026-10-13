function twoDigits(value: number) { return String(value).padStart(2, "0"); }

/** Acepta tanto el valor ISO de inputs HTML como el formato visual DD/MM/AAAA de Safari. */
export function normalizeDateOnly(value: unknown): string | undefined {
  if (!value) return undefined;
  const raw = String(value).trim();
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const localizedMatch = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  const candidate = isoMatch
    ? raw
    : localizedMatch
      ? `${localizedMatch[3]}-${twoDigits(Number(localizedMatch[2]))}-${twoDigits(Number(localizedMatch[1]))}`
      : undefined;
  if (!candidate) return undefined;

  const [year, month, day] = candidate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return undefined;
  }
  return candidate;
}

export function toDateTimeLocal(value: unknown): string {
  if (!value) return "";
  const raw = value instanceof Date ? value.toISOString() : String(value).trim();
  const normalized = raw.length === 10 ? `${raw}T11:00` : raw.replace(" ", "T");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${twoDigits(date.getMonth() + 1)}-${twoDigits(date.getDate())}T${twoDigits(date.getHours())}:${twoDigits(date.getMinutes())}`;
}

export function toDatabaseDate(value: string): string | undefined {
  return normalizeDateOnly(value.slice(0, 10));
}

export function parseCheckinDate(value: unknown): Date | null {
  const normalized = toDateTimeLocal(value);
  if (!normalized) return null;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

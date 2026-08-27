const MADRID_TIME_ZONE = "Europe/Madrid";

function timeZoneOffsetMinutes(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date).reduce<Record<string, string>>((result, part) => ({ ...result, [part.type]: part.value }), {});
  const asUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
  return Math.round((asUtc - date.getTime()) / 60_000);
}

function madridDateTimeToUtc(date: string, hour: number) {
  const approximate = new Date(`${date}T${String(hour).padStart(2, "0")}:00:00.000Z`);
  const offset = timeZoneOffsetMinutes(approximate, MADRID_TIME_ZONE);
  return new Date(approximate.getTime() - offset * 60_000);
}

export function getLoyverseOperationalWindow(date: string) {
  const start = madridDateTimeToUtc(date, 7);
  const nextDay = new Date(`${date}T12:00:00.000Z`);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  const endDate = nextDay.toISOString().slice(0, 10);
  const end = new Date(madridDateTimeToUtc(endDate, 7).getTime() - 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

export async function fetchLoyverseReceipts(accessToken: string, createdAtMin: string, createdAtMax: string) {
  type LoyversePayload = { receipts?: Array<Record<string, unknown>>; cursor?: string; errors?: Array<{ details?: string }> };
  const allReceipts: Array<Record<string, unknown>> = [];
  let cursor: string | undefined;
  for (let page = 0; page < 20; page += 1) {
    const url = new URL("https://api.loyverse.com/v1.0/receipts");
    url.searchParams.set("limit", "250");
    url.searchParams.set("created_at_min", createdAtMin);
    url.searchParams.set("created_at_max", createdAtMax);
    if (cursor) url.searchParams.set("cursor", cursor);
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
      redirect: "manual",
    });
    const responseText = await response.text();
    let payload: LoyversePayload;
    try {
      payload = JSON.parse(responseText) as LoyversePayload;
    } catch {
      const contentType = response.headers.get("content-type") || "desconocido";
      throw new Error(`Loyverse devolvió una respuesta no JSON (HTTP ${response.status}, ${contentType}). Revisa la conectividad del servidor y el token.`);
    }
    if (!response.ok) {
      throw new Error(payload.errors?.map((error) => error.details).filter(Boolean).join(" · ") || `Loyverse respondió HTTP ${response.status}`);
    }
    allReceipts.push(...(payload.receipts || []));
    if (!payload.cursor) break;
    cursor = payload.cursor;
  }
  return allReceipts;
}

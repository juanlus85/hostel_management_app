export type CloudbedsAvailabilityDay = {
  date: string;
  roomsAvailable: number | null;
  roomRate: number | null;
  totalRate: number | null;
  rateId: string | null;
  restrictions: {
    closedToArrival: boolean | null;
    closedToDeparture: boolean | null;
    minimumStay: number | null;
    maximumStay: number | null;
  };
};

export type CloudbedsRoomTypeAvailability = {
  roomTypeId: string;
  roomTypeName: string;
  ratePlanName: string | null;
  days: CloudbedsAvailabilityDay[];
};

export type CloudbedsAvailabilityWeek = {
  startDate: string;
  endDate: string;
  roomTypes: CloudbedsRoomTypeAvailability[];
};

type JsonRecord = Record<string, unknown>;
type Candidate = {
  roomTypeId: string;
  roomTypeName: string;
  ratePlanName: string | null;
  rateId: string | null;
  score: number;
  days: CloudbedsAvailabilityDay[];
};

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function stringValue(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
}

function numericValue(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value.replace(",", "."));
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function booleanValue(...values: unknown[]): boolean | null {
  for (const value of values) {
    if (typeof value === "boolean") return value;
    if (value === 1 || value === "1" || value === "true") return true;
    if (value === 0 || value === "0" || value === "false") return false;
  }
  return null;
}

function dateValue(...values: unknown[]) {
  const text = stringValue(...values);
  return text && /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function readDailyRate(value: unknown, dateFallback?: string, inheritedRateId: string | null = null): CloudbedsAvailabilityDay | null {
  const record = asRecord(value);
  const rate = asRecord(record.rate);
  const availability = asRecord(record.availability);
  const date = dateValue(
    record.date,
    record.rateDate,
    record.rate_date,
    record.startDate,
    record.start_date,
    dateFallback
  );
  if (!date) return null;

  const roomsAvailable = numericValue(
    record.roomsAvailable,
    record.rooms_available,
    record.availableRooms,
    record.available_rooms,
    record.availability,
    availability.roomsAvailable,
    availability.rooms_available,
    record.available
  );
  const roomRate = numericValue(
    record.roomRate,
    record.room_rate,
    record.rateBase,
    record.rate_base,
    record.rate,
    record.baseRate,
    record.base_rate,
    rate.amount,
    rate.value,
    rate.price
  );
  const totalRate = numericValue(record.totalRate, record.total_rate, roomRate);

  if (roomsAvailable === null && roomRate === null && totalRate === null) return null;
  return {
    date,
    roomsAvailable,
    roomRate,
    totalRate,
    rateId: stringValue(record.rateID, record.rateId, record.rate_id, inheritedRateId),
    restrictions: {
      closedToArrival: booleanValue(record.closedToArrival, record.closed_to_arrival, record.cta),
      closedToDeparture: booleanValue(record.closedToDeparture, record.closed_to_departure, record.ctd),
      minimumStay: numericValue(record.minimumStay, record.minLOS, record.minLos, record.min_los, record.minimum_stay),
      maximumStay: numericValue(record.maximumStay, record.maxLOS, record.maxLos, record.max_los, record.maximum_stay),
    },
  };
}

function directDailyRates(record: JsonRecord, inheritedRateId: string | null = null) {
  const dailyKeys = ["detailedRates", "detailed_rates", "dailyRates", "daily_rates", "rateDetails", "rate_details", "roomRateDetailed", "room_rate_detailed", "rates"];
  const output: CloudbedsAvailabilityDay[] = [];
  const ownRate = readDailyRate(record, undefined, inheritedRateId);
  if (ownRate) output.push(ownRate);
  for (const key of dailyKeys) {
    const value = record[key];
    if (Array.isArray(value)) {
      for (const item of value) {
        const parsed = readDailyRate(item, undefined, inheritedRateId);
        if (parsed) output.push(parsed);
      }
      continue;
    }
    const map = asRecord(value);
    for (const [date, item] of Object.entries(map)) {
      const parsed = readDailyRate(item, date, inheritedRateId);
      if (parsed) output.push(parsed);
    }
  }
  return output;
}

function roomContext(record: JsonRecord, inherited: Pick<Candidate, "roomTypeId" | "roomTypeName"> | null) {
  const nestedRoomType = asRecord(record.roomType ?? record.room_type);
  const roomTypeId = stringValue(
    record.roomTypeID,
    record.roomTypeId,
    record.room_type_id,
    nestedRoomType.roomTypeID,
    nestedRoomType.roomTypeId,
    nestedRoomType.id,
    inherited?.roomTypeId
  );
  const roomTypeName = stringValue(
    record.roomTypeName,
    record.room_type_name,
    record.roomTypeNamePublic,
    record.room_type_name_public,
    record.name,
    nestedRoomType.name,
    nestedRoomType.roomTypeName,
    inherited?.roomTypeName
  );
  return roomTypeId && roomTypeName ? { roomTypeId, roomTypeName } : null;
}

function ratePlanScore(record: JsonRecord) {
  const name = stringValue(record.ratePlanName, record.rate_plan_name, record.ratePlanNamePublic, record.ratePlanNamePrivate, record.name)?.toLowerCase() || "";
  if (booleanValue(record.isDerived, record.is_derived) === false) return 0;
  if (booleanValue(record.isBaseRate, record.is_base_rate, record.baseRatePlan) === true) return 0;
  if (/\b(base|bar|standard)\b/.test(name)) return 1;
  if (!stringValue(record.ratePlanID, record.ratePlanId, record.rate_plan_id)) return 2;
  return 3;
}

function collectCandidates(value: unknown, candidates: Candidate[], inherited: Pick<Candidate, "roomTypeId" | "roomTypeName"> | null = null, depth = 0) {
  if (depth > 6) return;
  if (Array.isArray(value)) {
    value.forEach(item => collectCandidates(item, candidates, inherited, depth + 1));
    return;
  }
  const record = asRecord(value);
  if (!Object.keys(record).length) return;

  const context = roomContext(record, inherited);
  const rateId = stringValue(record.rateID, record.rateId, record.rate_id, record.id);
  const days = directDailyRates(record, rateId);
  if (context && days.length) {
    candidates.push({
      ...context,
      ratePlanName: stringValue(record.ratePlanName, record.rate_plan_name, record.ratePlanNamePublic, record.ratePlanNamePrivate),
      rateId,
      score: ratePlanScore(record),
      days,
    });
  }

  for (const [, child] of Object.entries(record)) {
    if (child && typeof child === "object") collectCandidates(child, candidates, context ?? inherited, depth + 1);
  }
}

export function normalizeCloudbedsAvailability(payload: unknown, startDate: string, endDate: string): CloudbedsAvailabilityWeek {
  const candidates: Candidate[] = [];
  collectCandidates(payload, candidates);

  const selected = new Map<string, { roomTypeId: string; roomTypeName: string; byDate: Map<string, { day: CloudbedsAvailabilityDay; score: number; ratePlanName: string | null }> }>();
  for (const candidate of candidates) {
    const room = selected.get(candidate.roomTypeId) ?? {
      roomTypeId: candidate.roomTypeId,
      roomTypeName: candidate.roomTypeName,
      byDate: new Map(),
    };
    for (const day of candidate.days) {
      if (day.date < startDate || day.date > endDate) continue;
      const existing = room.byDate.get(day.date);
      if (!existing || candidate.score < existing.score) {
        room.byDate.set(day.date, { day: { ...day, rateId: day.rateId || candidate.rateId }, score: candidate.score, ratePlanName: candidate.ratePlanName });
      }
    }
    selected.set(candidate.roomTypeId, room);
  }

  return {
    startDate,
    endDate,
    roomTypes: Array.from(selected.values())
      .map(room => ({
        roomTypeId: room.roomTypeId,
        roomTypeName: room.roomTypeName,
        ratePlanName: Array.from(room.byDate.values()).sort((a, b) => a.score - b.score)[0]?.ratePlanName ?? null,
        days: Array.from(room.byDate.values()).map(value => value.day).sort((a, b) => a.date.localeCompare(b.date)),
      }))
      .filter(room => room.days.length)
      .sort((a, b) => a.roomTypeName.localeCompare(b.roomTypeName, "es")),
  };
}

export async function fetchCloudbedsAvailability(apiKey: string, propertyId: string, startDate: string, endDate: string) {
  const url = new URL("https://api.cloudbeds.com/api/v1.3/getRatePlans");
  url.searchParams.set("propertyIDs", propertyId);
  url.searchParams.set("startDate", startDate);
  url.searchParams.set("endDate", endDate);
  url.searchParams.set("adults", "1");
  url.searchParams.set("children", "0");
  url.searchParams.set("detailedRates", "true");
  url.searchParams.set("includeSharedRooms", "true");

  const response = await fetch(url, {
    headers: { "x-api-key": apiKey, Accept: "application/json" },
  });
  const body = await response.text();
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    throw new Error(`Cloudbeds devolvió una respuesta no JSON (HTTP ${response.status}). Revisa la API key y el permiso de tarifas y disponibilidad.`);
  }
  if (!response.ok) {
    const message = stringValue(asRecord(payload).message, asRecord(payload).error, asRecord(payload).errors);
    throw new Error(message || `Cloudbeds respondió HTTP ${response.status}. Revisa la API key, el Property ID y el permiso de tarifas y disponibilidad.`);
  }

  const normalized = normalizeCloudbedsAvailability(payload, startDate, endDate);
  if (!normalized.roomTypes.length) {
    throw new Error("Cloudbeds respondió sin tipos de habitación para este período. Revisa que haya tarifas públicas y que la API key tenga permiso de tarifas y disponibilidad.");
  }
  return normalized;
}

export function cloudbedsRateUpdateForm(rateId: string, date: string, rate: number) {
  const form = new URLSearchParams();
  // Cloudbeds espera una colección en formulario, no un JSON serializado dentro
  // de un único campo. La notación con corchetes forma rates[0].interval[0]
  // en el cuerpo application/x-www-form-urlencoded.
  form.set("rates[0][rateID]", rateId);
  form.set("rates[0][interval][0][startDate]", date);
  form.set("rates[0][interval][0][endDate]", date);
  form.set("rates[0][interval][0][rate]", String(rate));
  return form;
}

export async function updateCloudbedsRate(apiKey: string, rateId: string, date: string, rate: number) {
  const response = await fetch("https://api.cloudbeds.com/api/v1.3/putRate", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: cloudbedsRateUpdateForm(rateId, date, rate).toString(),
  });
  const raw = await response.text();
  let payload: JsonRecord;
  try {
    payload = asRecord(JSON.parse(raw));
  } catch {
    throw new Error(`Cloudbeds devolvió una respuesta no JSON (HTTP ${response.status}).`);
  }
  if (!response.ok || payload.success !== true) {
    throw new Error(stringValue(payload.message, payload.error) || `Cloudbeds no aceptó la actualización de precio (HTTP ${response.status}).`);
  }
  return {
    jobReferenceId: stringValue(payload.jobReferenceID, payload.jobReferenceId),
  };
}

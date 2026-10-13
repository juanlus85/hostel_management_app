type JsonRecord = Record<string, unknown>;

export type CloudbedsBookableRoomType = {
  roomTypeId: string;
  roomTypeName: string;
  roomsAvailable: number;
  maxGuests: number | null;
  rate: number | null;
  rateId: string | null;
};

export type CloudbedsReservationSource = {
  sourceId: string;
  name: string;
  isDefault: boolean;
};

export type CloudbedsManualReservationInput = {
  apiKey: string;
  propertyId: string;
  sourceId?: string;
  startDate: string;
  endDate: string;
  roomTypeId: string;
  rooms: number;
  adults: number;
  children: number;
  guestFirstName: string;
  guestLastName: string;
  guestEmail: string;
  guestPhone?: string;
  guestCountry: string;
  guestZip: string;
  estimatedArrivalTime?: string;
  sendEmailConfirmation?: boolean;
};

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function asList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
}

function numberValue(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value.replace(",", "."));
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function booleanValue(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "boolean") return value;
    if (value === 1 || value === "1" || value === "true") return true;
    if (value === 0 || value === "0" || value === "false") return false;
  }
  return null;
}

function messageFromPayload(payload: unknown) {
  const record = asRecord(payload);
  const error = asRecord(record.error);
  const errors = Array.isArray(record.errors)
    ? record.errors.map(item => text(asRecord(item).message, item)).filter(Boolean).join(" · ")
    : text(record.errors);
  return text(record.message, record.error, error.message, errors);
}

async function parseResponse(response: Response) {
  const raw = await response.text();
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    throw new Error(`Cloudbeds devolvió una respuesta no JSON (HTTP ${response.status}).`);
  }
  if (!response.ok || asRecord(payload).success === false) {
    throw new Error(messageFromPayload(payload) || `Cloudbeds respondió HTTP ${response.status}.`);
  }
  return payload;
}

function propertyRoomTypes(payload: unknown): JsonRecord[] {
  const root = asRecord(payload);
  const containers = [
    ...asList(root.data),
    root.data,
    root,
  ];
  const seen = new Set<unknown>();
  const output: JsonRecord[] = [];
  for (const container of containers) {
    const record = asRecord(container);
    for (const room of asList(record.propertyRooms ?? record.roomTypes ?? record.rooms)) {
      if (seen.has(room)) continue;
      seen.add(room);
      output.push(asRecord(room));
    }
  }
  return output;
}

function totalDetailedRate(room: JsonRecord) {
  const detailed = asList(room.roomRateDetailed ?? room.detailedRates ?? room.dailyRates);
  if (!detailed.length) return numberValue(room.roomRate, room.totalRate, room.rate);
  const values = detailed
    .map(item => {
      const record = asRecord(item);
      return numberValue(record.totalRate, record.rate, record.roomRate, record.rateBase, record.amount);
    })
    .filter((value): value is number => value !== null);
  return values.length ? values.reduce((sum, value) => sum + value, 0) : numberValue(room.roomRate, room.totalRate);
}

export function normalizeCloudbedsBookableRoomTypes(payload: unknown): CloudbedsBookableRoomType[] {
  const roomTypes = new Map<string, CloudbedsBookableRoomType>();
  for (const room of propertyRoomTypes(payload)) {
    const roomTypeId = text(room.roomTypeID, room.roomTypeId, room.id);
    const roomTypeName = text(room.roomTypeName, room.roomTypeNameShort, room.name);
    if (!roomTypeId || !roomTypeName) continue;
    const roomsAvailable = numberValue(room.roomsAvailable, room.rooms_available, room.availableRooms) ?? 0;
    const candidate: CloudbedsBookableRoomType = {
      roomTypeId,
      roomTypeName,
      roomsAvailable: Math.max(0, Math.floor(roomsAvailable)),
      maxGuests: numberValue(room.maxGuests, room.max_guests),
      rate: totalDetailedRate(room),
      rateId: text(room.roomRateID, room.roomRateId, room.rateID, room.rateId),
    };
    const previous = roomTypes.get(roomTypeId);
    if (!previous || candidate.roomsAvailable > previous.roomsAvailable || (candidate.rate !== null && previous.rate === null)) {
      roomTypes.set(roomTypeId, candidate);
    }
  }
  return Array.from(roomTypes.values()).sort((left, right) => left.roomTypeName.localeCompare(right.roomTypeName, "es"));
}

export async function fetchCloudbedsBookableRoomTypes({
  apiKey,
  propertyId,
  startDate,
  endDate,
  rooms,
  adults,
  children,
}: Pick<CloudbedsManualReservationInput, "apiKey" | "propertyId" | "startDate" | "endDate" | "rooms" | "adults" | "children">) {
  const url = new URL("https://api.cloudbeds.com/api/v1.3/getAvailableRoomTypes");
  url.searchParams.set("propertyID", propertyId);
  url.searchParams.set("startDate", startDate);
  url.searchParams.set("endDate", endDate);
  url.searchParams.set("rooms", String(rooms));
  url.searchParams.set("adults", String(adults));
  url.searchParams.set("children", String(children));
  url.searchParams.set("detailedRates", "true");
  url.searchParams.set("includeSharedRooms", "true");

  const response = await fetch(url, {
    headers: { "x-api-key": apiKey, Accept: "application/json" },
    signal: AbortSignal.timeout(12_000),
  });
  const payload = await parseResponse(response);
  return normalizeCloudbedsBookableRoomTypes(payload);
}

export function cloudbedsManualReservationForm(input: CloudbedsManualReservationInput) {
  const form = new URLSearchParams();
  form.set("propertyID", input.propertyId);
  if (input.sourceId?.trim()) form.set("sourceID", input.sourceId.trim());
  form.set("startDate", input.startDate);
  form.set("endDate", input.endDate);
  form.set("guestFirstName", input.guestFirstName.trim());
  form.set("guestLastName", input.guestLastName.trim());
  form.set("guestEmail", input.guestEmail.trim());
  form.set("guestCountry", input.guestCountry.trim().toUpperCase());
  form.set("guestZip", input.guestZip.trim());
  if (input.guestPhone?.trim()) form.set("guestPhone", input.guestPhone.trim());
  if (input.estimatedArrivalTime?.trim()) form.set("estimatedArrivalTime", input.estimatedArrivalTime.trim());
  form.set("rooms[0][roomTypeID]", input.roomTypeId);
  form.set("rooms[0][quantity]", String(input.rooms));
  form.set("adults[0][roomTypeID]", input.roomTypeId);
  form.set("adults[0][quantity]", String(input.adults));
  form.set("children[0][roomTypeID]", input.roomTypeId);
  form.set("children[0][quantity]", String(input.children));
  form.set("sendEmailConfirmation", input.sendEmailConfirmation ? "true" : "false");
  return form;
}

export async function createCloudbedsManualReservation(input: CloudbedsManualReservationInput) {
  const response = await fetch("https://api.cloudbeds.com/api/v1.3/postReservation", {
    method: "POST",
    headers: {
      "x-api-key": input.apiKey,
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: cloudbedsManualReservationForm(input).toString(),
    signal: AbortSignal.timeout(15_000),
  });
  const payload = asRecord(await parseResponse(response));
  return {
    reservationId: text(payload.reservationID, payload.reservationId, payload.id),
    status: text(payload.status) || "confirmed",
    grandTotal: numberValue(payload.grandTotal, payload.total),
    unassignedRooms: asList(payload.unassigned).map(asRecord).map(room => ({
      roomTypeId: text(room.roomTypeID, room.roomTypeId),
      roomTypeName: text(room.roomTypeName, room.room_type_name),
    })),
  };
}

export async function fetchCloudbedsReservationSources(apiKey: string, propertyId: string): Promise<CloudbedsReservationSource[]> {
  const url = new URL("https://api.cloudbeds.com/api/v1.3/getSources");
  url.searchParams.set("propertyID", propertyId);
  const response = await fetch(url, {
    headers: { "x-api-key": apiKey, Accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  const payload = await parseResponse(response);
  const root = asRecord(payload);
  const sources = asList(root.data ?? root.sources);
  const output = sources.flatMap(source => {
    const record = asRecord(source);
    const sourceId = text(record.sourceID, record.sourceId, record.id);
    const name = text(record.sourceName, record.name);
    if (!sourceId || !name || booleanValue(record.status, record.active) === false || booleanValue(record.isThirdParty, record.is_third_party) === true) return [];
    return [{
      sourceId,
      name,
      isDefault: /walk\s*in|recepci[oó]n|direct|telefono|phone/i.test(name),
    }];
  });
  return output.sort((left, right) => Number(right.isDefault) - Number(left.isDefault) || left.name.localeCompare(right.name, "es"));
}

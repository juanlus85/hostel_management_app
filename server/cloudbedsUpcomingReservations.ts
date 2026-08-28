export type CloudbedsReservationAssignment = Record<string, unknown>;
export type CloudbedsReservationDetail = Record<string, unknown>;

export type ImportedUpcomingReservation = {
  sourceReservationId: string;
  reservationCode: string | null;
  guestName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  checkInDate: string;
  checkOutDate: string | null;
  roomType: string | null;
  roomNumber: string | null;
  reservationStatus: string | null;
  bookingSource: string | null;
  rawData: string;
};

function text(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return String(value);
  return null;
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    const normalized = text(value);
    if (normalized) return normalized;
  }
  return null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asList(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload.map(asRecord);
  const root = asRecord(payload);
  for (const key of ["data", "assignments", "reservations", "rooms"]) {
    if (Array.isArray(root[key])) return root[key].map(asRecord);
  }
  return [];
}

function firstGuest(detail: Record<string, unknown>) {
  const guests = detail.guests ?? detail.guestList ?? detail.guest_list ?? detail.guestDetails ?? detail.guest_details;
  if (Array.isArray(guests)) return asRecord(guests[0]);
  return asRecord(detail.guest ?? detail.primaryGuest ?? detail.primary_guest ?? detail.mainGuest ?? detail.main_guest);
}

function firstRoom(detail: Record<string, unknown>) {
  const rooms = detail.rooms ?? detail.accommodations ?? detail.reservationRooms ?? detail.reservation_rooms ?? detail.roomAssignments ?? detail.room_assignments;
  if (Array.isArray(rooms)) return asRecord(rooms[0]);
  return asRecord(detail.room ?? detail.accommodation);
}

function unwrapReservationDetail(payload: unknown) {
  const root = asRecord(payload);
  for (const key of ["reservation", "data", "result", "reservationDetails", "reservation_details"]) {
    const nested = asRecord(root[key]);
    if (Object.keys(nested).length > 0) return nested;
  }
  return root;
}

function reservationId(record: Record<string, unknown>) {
  return firstText(record.reservationID, record.reservationId, record.reservation_id, record.id);
}

export function getNextMadridCalendarDates(now = new Date(), count = 3) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  const start = new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day)));
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    return date.toISOString().slice(0, 10);
  });
}

export function normalizeUpcomingReservation(assignment: CloudbedsReservationAssignment, detail: CloudbedsReservationDetail, fallbackDate: string): ImportedUpcomingReservation | null {
  const assignmentRecord = asRecord(assignment);
  const detailRecord = asRecord(detail);
  const guest = firstGuest(detailRecord);
  const room = firstRoom(detailRecord);
  const sourceReservationId = reservationId(detailRecord) ?? reservationId(assignmentRecord);
  const checkInDate = firstText(detailRecord.checkInDate, detailRecord.check_in_date, detailRecord.arrivalDate, detailRecord.arrival_date, detailRecord.checkIn, detailRecord.check_in, assignmentRecord.checkInDate, assignmentRecord.check_in_date, assignmentRecord.date) ?? fallbackDate;
  if (!sourceReservationId || !/^\d{4}-\d{2}-\d{2}$/.test(checkInDate)) return null;
  return {
    sourceReservationId,
    reservationCode: firstText(detailRecord.reservationCode, detailRecord.reservation_code, detailRecord.confirmationCode, detailRecord.confirmation_code, detailRecord.confirmationNumber, detailRecord.confirmation_number, assignmentRecord.reservationCode),
    guestName: firstText(guest.name, guest.fullName, guest.full_name, guest.guestName, guest.guest_name, detailRecord.guestName, detailRecord.guest_name, `${text(guest.firstName) ?? text(guest.first_name) ?? ""} ${text(guest.lastName) ?? text(guest.last_name) ?? ""}`.trim()),
    guestEmail: firstText(guest.email, guest.emailAddress, guest.email_address, guest.email_address_1, detailRecord.guestEmail, detailRecord.guest_email),
    guestPhone: firstText(guest.phone, guest.phoneNumber, guest.phone_number, guest.mobile, guest.mobilePhone, guest.mobile_phone, detailRecord.guestPhone, detailRecord.guest_phone),
    checkInDate,
    checkOutDate: firstText(detailRecord.checkOutDate, detailRecord.check_out_date, detailRecord.departureDate, detailRecord.departure_date, detailRecord.checkOut, detailRecord.check_out, assignmentRecord.checkOutDate, assignmentRecord.check_out_date),
    roomType: firstText(room.roomTypeName, room.room_type_name, room.roomType, room.room_type, detailRecord.roomTypeName, detailRecord.room_type_name, assignmentRecord.roomTypeName, assignmentRecord.room_type_name),
    roomNumber: firstText(room.roomName, room.room_name, room.roomNumber, room.room_number, room.room_number_display, detailRecord.roomNumber, detailRecord.room_number, assignmentRecord.roomName, assignmentRecord.room_number),
    reservationStatus: firstText(detailRecord.status, detailRecord.reservationStatus, detailRecord.reservation_status, assignmentRecord.status),
    bookingSource: firstText(detailRecord.sourceName, detailRecord.source_name, detailRecord.source, assignmentRecord.sourceName, assignmentRecord.source_name),
    // Se conserva solo trazabilidad técnica; los datos personales usados están normalizados en columnas explícitas.
    rawData: JSON.stringify({ source: "Cloudbeds PMS API", sourceReservationId, importedFields: ["arrival", "departure", "room", "contact"] }),
  };
}

async function getJson(url: URL, apiKey: string) {
  const response = await fetch(url, { headers: { "x-api-key": apiKey, Accept: "application/json" } });
  const body = await response.text();
  let payload: unknown;
  try { payload = JSON.parse(body); }
  catch { throw new Error(`Cloudbeds devolvió una respuesta no JSON (HTTP ${response.status}). Revisa la API key y el permiso Reserva → Leer.`); }
  if (!response.ok) throw new Error(`Cloudbeds respondió HTTP ${response.status}. Revisa la API key, el Property ID y el permiso Reserva → Leer.`);
  return payload;
}

export async function fetchCloudbedsUpcomingReservations(apiKey: string, propertyId: string, dates: string[]) {
  const imported: ImportedUpcomingReservation[] = [];
  const seen = new Set<string>();
  for (const date of dates) {
    const assignmentsUrl = new URL("https://api.cloudbeds.com/api/v1.3/getReservationAssignments");
    assignmentsUrl.searchParams.set("propertyID", propertyId);
    assignmentsUrl.searchParams.set("date", date);
    const assignments = asList(await getJson(assignmentsUrl, apiKey));
    for (const assignment of assignments) {
      const id = reservationId(assignment);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const detailUrl = new URL("https://api.cloudbeds.com/api/v1.3/getReservation");
      detailUrl.searchParams.set("propertyID", propertyId);
      detailUrl.searchParams.set("reservationID", id);
      const detail = unwrapReservationDetail(await getJson(detailUrl, apiKey));
      const reservation = normalizeUpcomingReservation(assignment, detail, date);
      if (reservation) imported.push(reservation);
    }
  }
  return imported;
}

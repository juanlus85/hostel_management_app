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
  guestCount: number | null;
  reservationNotes: string | null;
  bookingSource: string | null;
  amountPending: string;
  rawData: string;
};

export type CloudbedsReservationFieldDiagnostics = {
  assignmentKeys: string[];
  responseKeys: string[];
  detailKeys: string[];
  guestKeys: string[];
  roomKeys: string[];
  fieldShapes: Record<string, string>;
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

function moneyText(value: unknown) {
  const normalized = text(value);
  if (!normalized) return "0";
  const amount = Number(normalized.replace(",", "."));
  return Number.isFinite(amount) ? amount.toFixed(2) : "0";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function guestCount(detail: Record<string, unknown>): number | null {
  for (const value of [detail.guestCount, detail.guest_count, detail.numberOfGuests, detail.number_of_guests, detail.totalGuests, detail.total_guests]) {
    const count = Number(value);
    if (Number.isInteger(count) && count > 0) return count;
  }
  const guests = detail.guests ?? detail.guestList ?? detail.guest_list ?? detail.guestDetails ?? detail.guest_details;
  if (Array.isArray(guests)) return guests.length || null;
  const container = asRecord(guests);
  if (Array.isArray(container.data)) return container.data.length || null;
  const indexedGuests = Object.values(container).filter((value) => Object.keys(asRecord(value)).length > 0);
  return indexedGuests.length || null;
}

function notesText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const direct = text(value);
  if (direct) return direct;
  if (typeof value !== "object") return null;
  if (Array.isArray(value)) {
    const combined = value.map(notesText).filter((note): note is string => Boolean(note)).join(" · ").trim();
    return combined ? combined.slice(0, 4000) : null;
  }
  const record = asRecord(value);
  for (const key of ["reservationNote", "reservation_note", "note", "notes", "text", "content", "message", "description", "data", "results"]) {
    const note = notesText(record[key]);
    if (note) return note;
  }
  return null;
}

function describeFieldShape(value: unknown): string {
  if (value === null || value === undefined) return "vacío";
  if (Array.isArray(value)) {
    const first = asRecord(value[0]);
    return Object.keys(first).length ? `lista con objeto: ${Object.keys(first).sort().join(", ")}` : `lista (${value.length})`;
  }
  const record = asRecord(value);
  if (Object.keys(record).length) return `objeto: ${Object.keys(record).sort().join(", ")}`;
  return typeof value;
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
  const guestContainer = asRecord(guests);
  if (Array.isArray(guestContainer.data)) return asRecord(guestContainer.data[0]);
  const indexedGuest = Object.values(guestContainer).map(asRecord).find((candidate) => Object.keys(candidate).length > 0);
  if (indexedGuest) return indexedGuest;
  return asRecord(detail.guest ?? detail.primaryGuest ?? detail.primary_guest ?? detail.mainGuest ?? detail.main_guest ?? guests);
}

function firstRoom(detail: Record<string, unknown>) {
  const rooms = detail.rooms ?? detail.accommodations ?? detail.reservationRooms ?? detail.reservation_rooms ?? detail.roomAssignments ?? detail.room_assignments ?? detail.roomList ?? detail.room_list ?? detail.assignedRooms ?? detail.assigned_rooms ?? detail.roomDetails ?? detail.room_details ?? detail.assigned;
  if (Array.isArray(rooms)) return asRecord(rooms[0]);
  return asRecord(detail.room ?? detail.accommodation ?? detail.assignedRoom ?? detail.assigned_room ?? detail.roomDetail ?? detail.room_detail ?? detail.assigned);
}

function unwrapReservationDetail(payload: unknown) {
  const root = asRecord(payload);
  for (const key of ["reservation", "data", "result", "reservationDetails", "reservation_details"]) {
    if (Array.isArray(root[key])) {
      const first = asRecord(root[key][0]);
      if (Object.keys(first).length > 0) return first;
    }
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
  const roomTypeRecord = asRecord(room.roomType ?? room.room_type ?? detailRecord.roomType ?? detailRecord.room_type);
  const sourceReservationId = reservationId(detailRecord) ?? reservationId(assignmentRecord);
  const checkInDate = firstText(detailRecord.checkInDate, detailRecord.check_in_date, detailRecord.arrivalDate, detailRecord.arrival_date, detailRecord.checkIn, detailRecord.check_in, assignmentRecord.checkInDate, assignmentRecord.check_in_date, assignmentRecord.date) ?? fallbackDate;
  if (!sourceReservationId || !/^\d{4}-\d{2}-\d{2}$/.test(checkInDate)) return null;
  return {
    sourceReservationId,
    reservationCode: firstText(detailRecord.reservationCode, detailRecord.reservation_code, detailRecord.confirmationCode, detailRecord.confirmation_code, detailRecord.confirmationNumber, detailRecord.confirmation_number, assignmentRecord.reservationCode),
    guestName: firstText(guest.name, guest.fullName, guest.full_name, guest.guestName, guest.guest_name, detailRecord.guestName, detailRecord.guest_name, `${text(guest.firstName) ?? text(guest.first_name) ?? ""} ${text(guest.lastName) ?? text(guest.last_name) ?? ""}`.trim()),
    guestEmail: firstText(guest.email, guest.emailAddress, guest.email_address, guest.email_address_1, detailRecord.guestEmail, detailRecord.guest_email),
    guestPhone: firstText(guest.guestPhone, guest.guest_phone, guest.guestCellPhone, guest.guest_cell_phone, guest.phone, guest.phoneNumber, guest.phone_number, guest.mobile, guest.mobilePhone, guest.mobile_phone, guest.phoneMobile, guest.phone_mobile, guest.mobilePhoneNumber, guest.mobile_phone_number, guest.cellPhone, guest.cell_phone, detailRecord.guestPhone, detailRecord.guest_phone, detailRecord.guestCellPhone, detailRecord.guest_cell_phone, detailRecord.phone, detailRecord.phoneNumber),
    checkInDate,
    checkOutDate: firstText(detailRecord.checkOutDate, detailRecord.check_out_date, detailRecord.departureDate, detailRecord.departure_date, detailRecord.dateDeparture, detailRecord.date_departure, detailRecord.endDate, detailRecord.end_date, detailRecord.departure, detailRecord.checkOut, detailRecord.check_out, assignmentRecord.checkOutDate, assignmentRecord.check_out_date, assignmentRecord.dateDeparture, assignmentRecord.date_departure, assignmentRecord.endDate, assignmentRecord.end_date),
    roomType: firstText(room.roomTypeName, room.room_type_name, room.roomTypeNameDisplay, room.room_type_name_display, room.roomType, room.room_type, roomTypeRecord.name, roomTypeRecord.roomTypeName, roomTypeRecord.room_type_name, detailRecord.roomTypeName, detailRecord.room_type_name, detailRecord.roomType, detailRecord.room_type, assignmentRecord.roomTypeName, assignmentRecord.room_type_name, assignmentRecord.roomType, assignmentRecord.room_type),
    roomNumber: firstText(room.roomName, room.room_name, room.roomNumber, room.room_number, room.room_number_display, room.name, room.number, detailRecord.roomNumber, detailRecord.room_number, detailRecord.roomName, detailRecord.room_name, detailRecord.assignedRoomNumber, detailRecord.assigned_room_number, assignmentRecord.roomName, assignmentRecord.room_number, assignmentRecord.roomNumber, assignmentRecord.room_name, assignmentRecord.assignedRoomNumber, assignmentRecord.assigned_room_number),
    reservationStatus: firstText(detailRecord.status, detailRecord.reservationStatus, detailRecord.reservation_status, assignmentRecord.status),
    guestCount: guestCount(detailRecord),
    reservationNotes: notesText(detailRecord.reservationNotes ?? detailRecord.reservation_notes ?? detailRecord.notes ?? detailRecord.note ?? detailRecord.importedReservationNotes),
    bookingSource: firstText(detailRecord.sourceName, detailRecord.source_name, detailRecord.source, assignmentRecord.sourceName, assignmentRecord.source_name),
    amountPending: moneyText(detailRecord.balance ?? detailRecord.amountPending ?? detailRecord.amount_pending ?? detailRecord.balanceDue ?? detailRecord.balance_due),
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

async function getReservationNotes(apiKey: string, propertyId: string, reservationId: string) {
  try {
    const notesUrl = new URL("https://api.cloudbeds.com/api/v1.3/getReservationNotes");
    notesUrl.searchParams.set("propertyID", propertyId);
    notesUrl.searchParams.set("reservationID", reservationId);
    return notesText(await getJson(notesUrl, apiKey));
  } catch {
    // La importación de llegadas sigue disponible si la API key no concede acceso a notas.
    return null;
  }
}

export async function fetchCloudbedsUpcomingReservations(
  apiKey: string,
  propertyId: string,
  dates: string[],
  onDiagnostics?: (diagnostics: CloudbedsReservationFieldDiagnostics) => void,
) {
  const imported: ImportedUpcomingReservation[] = [];
  const seen = new Set<string>();
  let diagnosticsReported = false;
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
      const detailPayload = await getJson(detailUrl, apiKey);
      const detail = unwrapReservationDetail(detailPayload);
      const importedReservationNotes = await getReservationNotes(apiKey, propertyId, id);
      if (!diagnosticsReported) {
        const guest = firstGuest(detail);
        const room = firstRoom(detail);
        onDiagnostics?.({
          assignmentKeys: Object.keys(assignment).sort(),
          responseKeys: Object.keys(asRecord(detailPayload)).sort(),
          detailKeys: Object.keys(detail).sort(),
          guestKeys: Object.keys(guest).sort(),
          roomKeys: Object.keys(room).sort(),
          fieldShapes: {
            guestList: describeFieldShape(detail.guestList),
            assigned: describeFieldShape(detail.assigned),
            startDate: describeFieldShape(detail.startDate),
            endDate: describeFieldShape(detail.endDate),
          },
        });
        diagnosticsReported = true;
      }
      const reservation = normalizeUpcomingReservation(assignment, { ...detail, importedReservationNotes }, date);
      if (reservation) imported.push(reservation);
    }
  }
  return imported;
}

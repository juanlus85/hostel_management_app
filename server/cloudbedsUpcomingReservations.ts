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
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function guestCount(detail: Record<string, unknown>): number | null {
  for (const value of [
    detail.guestCount,
    detail.guest_count,
    detail.numberOfGuests,
    detail.number_of_guests,
    detail.totalGuests,
    detail.total_guests,
  ]) {
    const count = Number(value);
    if (Number.isInteger(count) && count > 0) return count;
  }
  const guests =
    detail.guests ??
    detail.guestList ??
    detail.guest_list ??
    detail.guestDetails ??
    detail.guest_details;
  if (Array.isArray(guests)) return guests.length || null;
  const container = asRecord(guests);
  if (Array.isArray(container.data)) return container.data.length || null;
  const indexedGuests = Object.values(container).filter(
    value => Object.keys(asRecord(value)).length > 0
  );
  return indexedGuests.length || null;
}

function notesText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const direct = text(value);
  if (direct) return direct;
  if (typeof value !== "object") return null;
  if (Array.isArray(value)) {
    const combined = value
      .map(notesText)
      .filter((note): note is string => Boolean(note))
      .join(" · ")
      .trim();
    return combined ? combined.slice(0, 4000) : null;
  }
  const record = asRecord(value);
  for (const key of [
    "reservationNote",
    "reservation_note",
    "note",
    "notes",
    "text",
    "content",
    "message",
    "description",
    "data",
    "results",
  ]) {
    const note = notesText(record[key]);
    if (note) return note;
  }
  return null;
}

function describeFieldShape(value: unknown): string {
  if (value === null || value === undefined) return "vacío";
  if (Array.isArray(value)) {
    const first = asRecord(value[0]);
    return Object.keys(first).length
      ? `lista con objeto: ${Object.keys(first).sort().join(", ")}`
      : `lista (${value.length})`;
  }
  const record = asRecord(value);
  if (Object.keys(record).length)
    return `objeto: ${Object.keys(record).sort().join(", ")}`;
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
  const guests =
    detail.guests ??
    detail.guestList ??
    detail.guest_list ??
    detail.guestDetails ??
    detail.guest_details;
  if (Array.isArray(guests)) return asRecord(guests[0]);
  const guestContainer = asRecord(guests);
  if (Array.isArray(guestContainer.data))
    return asRecord(guestContainer.data[0]);
  const indexedGuest = Object.values(guestContainer)
    .map(asRecord)
    .find(candidate => Object.keys(candidate).length > 0);
  if (indexedGuest) return indexedGuest;
  return asRecord(
    detail.guest ??
      detail.primaryGuest ??
      detail.primary_guest ??
      detail.mainGuest ??
      detail.main_guest ??
      guests
  );
}

function firstRoom(detail: Record<string, unknown>) {
  const rooms =
    detail.rooms ??
    detail.accommodations ??
    detail.reservationRooms ??
    detail.reservation_rooms ??
    detail.roomAssignments ??
    detail.room_assignments ??
    detail.roomList ??
    detail.room_list ??
    detail.assignedRooms ??
    detail.assigned_rooms ??
    detail.roomDetails ??
    detail.room_details ??
    detail.assigned;
  if (Array.isArray(rooms)) return asRecord(rooms[0]);
  return asRecord(
    detail.room ??
      detail.accommodation ??
      detail.assignedRoom ??
      detail.assigned_room ??
      detail.roomDetail ??
      detail.room_detail ??
      detail.assigned
  );
}

function recordList(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.map(asRecord).filter(record => Object.keys(record).length > 0);
  const container = asRecord(value);
  if (Array.isArray(container.data)) return container.data.map(asRecord).filter(record => Object.keys(record).length > 0);
  return Object.values(container).map(asRecord).filter(record => Object.keys(record).length > 0);
}

function reservationRoomRecords(record: Record<string, unknown>) {
  const rooms: Record<string, unknown>[] = [];
  for (const key of [
    "rooms",
    "accommodations",
    "reservationRooms",
    "reservation_rooms",
    "roomAssignments",
    "room_assignments",
    "assignedRooms",
    "assigned_rooms",
    "roomList",
    "room_list",
  ]) {
    rooms.push(...recordList(record[key]));
  }
  return rooms;
}

function roomIdentity(room: Record<string, unknown>) {
  return roomIdentityTokens(room)[0] ?? null;
}

function roomIdentityTokens(room: Record<string, unknown>) {
  const nestedRoom = asRecord(room.room ?? room.assignedRoom ?? room.assigned_room);
  return Array.from(new Set([
    room.roomID,
    room.roomId,
    room.room_id,
    room.assignedRoomID,
    room.assignedRoomId,
    room.assigned_room_id,
    room.roomName,
    room.room_name,
    room.roomNumber,
    room.room_number,
    room.room_number_display,
    room.assignedRoomName,
    room.assigned_room_name,
    room.assignedRoomNumber,
    room.assigned_room_number,
    room.room,
    room.assignedRoom,
    room.assigned_room,
    nestedRoom.roomID,
    nestedRoom.roomId,
    nestedRoom.room_id,
    nestedRoom.roomName,
    nestedRoom.room_name,
    nestedRoom.roomNumber,
    nestedRoom.room_number,
    nestedRoom.room_number_display,
    nestedRoom.assignedRoomNumber,
    nestedRoom.assigned_room_number,
  ].map(text).filter((value): value is string => Boolean(value)).map(value => value.toLocaleLowerCase("es-ES"))));
}

function uniquePhysicalRooms(rooms: Record<string, unknown>[]) {
  const seenTokens = new Set<string>();
  return rooms.filter(room => {
    const tokens = roomIdentityTokens(room);
    if (!tokens.length || tokens.some(token => seenTokens.has(token))) return false;
    tokens.forEach(token => seenTokens.add(token));
    return true;
  });
}

function collectNestedPhysicalRooms(source: unknown) {
  const rooms: Record<string, unknown>[] = [];
  const pending: unknown[] = [source];
  const visited = new Set<object>();

  while (pending.length) {
    const value = pending.pop();
    if (!value || typeof value !== "object") continue;
    if (visited.has(value)) continue;
    visited.add(value);
    if (Array.isArray(value)) {
      pending.push(...value);
      continue;
    }
    const record = asRecord(value);
    if (roomIdentityTokens(record).length) rooms.push(record);
    pending.push(...Object.values(record));
  }

  return uniquePhysicalRooms(rooms);
}

function collectSubReservationIds(source: unknown) {
  const identifiers = new Set<string>();
  const pending: unknown[] = [source];
  const visited = new Set<object>();

  while (pending.length) {
    const value = pending.pop();
    if (!value || typeof value !== "object") continue;
    if (visited.has(value)) continue;
    visited.add(value);
    if (Array.isArray(value)) {
      pending.push(...value);
      continue;
    }
    const record = asRecord(value);
    for (const [key, fieldValue] of Object.entries(record)) {
      if (["subreservationid", "sub_reservation_id", "subreservation_id"].includes(key.toLocaleLowerCase("en-US"))) {
        const identifier = text(fieldValue);
        if (identifier) identifiers.add(identifier);
      }
      pending.push(fieldValue);
    }
  }

  return Array.from(identifiers);
}

function unwrapReservationDetail(payload: unknown) {
  const root = asRecord(payload);
  for (const key of [
    "reservation",
    "data",
    "result",
    "reservationDetails",
    "reservation_details",
  ]) {
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
  return firstText(
    record.reservationID,
    record.reservationId,
    record.reservation_id,
    record.id
  );
}

export function getNextMadridCalendarDates(
  now = new Date(),
  count = 3,
  startOffset = 0
) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(
    parts
      .filter(part => part.type !== "literal")
      .map(part => [part.type, part.value])
  );
  const start = new Date(
    Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day))
  );
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + startOffset + index);
    return date.toISOString().slice(0, 10);
  });
}

export function normalizeUpcomingReservation(
  assignment: CloudbedsReservationAssignment,
  detail: CloudbedsReservationDetail,
  fallbackDate: string
): ImportedUpcomingReservation | null {
  const assignmentRecord = asRecord(assignment);
  const detailRecord = asRecord(detail);
  const guest = firstGuest(detailRecord);
  const room = firstRoom(detailRecord);
  const roomTypeRecord = asRecord(
    room.roomType ??
      room.room_type ??
      detailRecord.roomType ??
      detailRecord.room_type
  );
  const sourceReservationId =
    reservationId(detailRecord) ?? reservationId(assignmentRecord);
  const checkInDate =
    firstText(
      detailRecord.checkInDate,
      detailRecord.check_in_date,
      detailRecord.arrivalDate,
      detailRecord.arrival_date,
      detailRecord.checkIn,
      detailRecord.check_in,
      assignmentRecord.checkInDate,
      assignmentRecord.check_in_date,
      assignmentRecord.date
    ) ?? fallbackDate;
  if (!sourceReservationId || !/^\d{4}-\d{2}-\d{2}$/.test(checkInDate))
    return null;
  return {
    sourceReservationId,
    reservationCode: firstText(
      detailRecord.reservationCode,
      detailRecord.reservation_code,
      detailRecord.confirmationCode,
      detailRecord.confirmation_code,
      detailRecord.confirmationNumber,
      detailRecord.confirmation_number,
      assignmentRecord.reservationCode
    ),
    guestName: firstText(
      guest.name,
      guest.fullName,
      guest.full_name,
      guest.guestName,
      guest.guest_name,
      detailRecord.guestName,
      detailRecord.guest_name,
      `${text(guest.firstName) ?? text(guest.first_name) ?? ""} ${text(guest.lastName) ?? text(guest.last_name) ?? ""}`.trim()
    ),
    guestEmail: firstText(
      guest.email,
      guest.emailAddress,
      guest.email_address,
      guest.email_address_1,
      detailRecord.guestEmail,
      detailRecord.guest_email
    ),
    guestPhone: firstText(
      guest.guestPhone,
      guest.guest_phone,
      guest.guestCellPhone,
      guest.guest_cell_phone,
      guest.phone,
      guest.phoneNumber,
      guest.phone_number,
      guest.mobile,
      guest.mobilePhone,
      guest.mobile_phone,
      guest.phoneMobile,
      guest.phone_mobile,
      guest.mobilePhoneNumber,
      guest.mobile_phone_number,
      guest.cellPhone,
      guest.cell_phone,
      detailRecord.guestPhone,
      detailRecord.guest_phone,
      detailRecord.guestCellPhone,
      detailRecord.guest_cell_phone,
      detailRecord.phone,
      detailRecord.phoneNumber
    ),
    checkInDate,
    checkOutDate: firstText(
      detailRecord.checkOutDate,
      detailRecord.check_out_date,
      detailRecord.departureDate,
      detailRecord.departure_date,
      detailRecord.dateDeparture,
      detailRecord.date_departure,
      detailRecord.endDate,
      detailRecord.end_date,
      detailRecord.departure,
      detailRecord.checkOut,
      detailRecord.check_out,
      assignmentRecord.checkOutDate,
      assignmentRecord.check_out_date,
      assignmentRecord.dateDeparture,
      assignmentRecord.date_departure,
      assignmentRecord.endDate,
      assignmentRecord.end_date
    ),
    roomType: firstText(
      assignmentRecord.roomTypeName,
      assignmentRecord.room_type_name,
      assignmentRecord.roomTypeNameDisplay,
      assignmentRecord.room_type_name_display,
      room.roomTypeName,
      room.room_type_name,
      room.roomTypeNameDisplay,
      room.room_type_name_display,
      room.roomType,
      room.room_type,
      roomTypeRecord.name,
      roomTypeRecord.roomTypeName,
      roomTypeRecord.room_type_name,
      detailRecord.roomTypeName,
      detailRecord.room_type_name,
      detailRecord.roomType,
      detailRecord.room_type,
      assignmentRecord.roomTypeName,
      assignmentRecord.room_type_name,
      assignmentRecord.roomType,
      assignmentRecord.room_type
    ),
    roomNumber: firstText(
      assignmentRecord.roomName,
      assignmentRecord.room_name,
      assignmentRecord.roomNumber,
      assignmentRecord.room_number,
      assignmentRecord.room_number_display,
      assignmentRecord.assignedRoomNumber,
      assignmentRecord.assigned_room_number,
      room.roomName,
      room.room_name,
      room.roomNumber,
      room.room_number,
      room.room_number_display,
      room.name,
      room.number,
      detailRecord.roomNumber,
      detailRecord.room_number,
      detailRecord.roomName,
      detailRecord.room_name,
      detailRecord.assignedRoomNumber,
      detailRecord.assigned_room_number,
      assignmentRecord.roomName,
      assignmentRecord.room_number,
      assignmentRecord.roomNumber,
      assignmentRecord.room_name,
      assignmentRecord.assignedRoomNumber,
      assignmentRecord.assigned_room_number
    ),
    reservationStatus: firstText(
      detailRecord.status,
      detailRecord.reservationStatus,
      detailRecord.reservation_status,
      assignmentRecord.status
    ),
    guestCount: guestCount(detailRecord),
    reservationNotes: notesText(
      detailRecord.reservationNotes ??
        detailRecord.reservation_notes ??
        detailRecord.notes ??
        detailRecord.note ??
        detailRecord.importedReservationNotes
    ),
    bookingSource: firstText(
      detailRecord.sourceName,
      detailRecord.source_name,
      detailRecord.source,
      assignmentRecord.sourceName,
      assignmentRecord.source_name
    ),
    amountPending: moneyText(
      detailRecord.balance ??
        detailRecord.amountPending ??
        detailRecord.amount_pending ??
        detailRecord.balanceDue ??
        detailRecord.balance_due
    ),
    // Se conserva solo trazabilidad técnica; los datos personales usados están normalizados en columnas explícitas.
    rawData: JSON.stringify({
      source: "Cloudbeds PMS API",
      sourceReservationId,
      importedFields: ["arrival", "departure", "room", "contact"],
    }),
  };
}

async function getJson(url: URL, apiKey: string) {
  const response = await fetch(url, {
    headers: { "x-api-key": apiKey, Accept: "application/json" },
  });
  const body = await response.text();
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    throw new Error(
      `Cloudbeds devolvió una respuesta no JSON (HTTP ${response.status}). Revisa la API key y el permiso Reserva → Leer.`
    );
  }
  if (!response.ok)
    throw new Error(
      `Cloudbeds respondió HTTP ${response.status}. Revisa la API key, el Property ID y el permiso Reserva → Leer.`
    );
  return payload;
}

async function getReservationNotes(
  apiKey: string,
  propertyId: string,
  reservationId: string
) {
  try {
    const notesUrl = new URL(
      "https://api.cloudbeds.com/api/v1.3/getReservationNotes"
    );
    notesUrl.searchParams.set("propertyID", propertyId);
    notesUrl.searchParams.set("reservationID", reservationId);
    return notesText(await getJson(notesUrl, apiKey));
  } catch {
    // La importación de llegadas sigue disponible si la API key no concede acceso a notas.
    return null;
  }
}

async function getReservationRoomDetails(
  apiKey: string,
  propertyId: string,
  subReservationId: string
) {
  try {
    const roomDetailsUrl = new URL(
      "https://api.cloudbeds.com/api/v1.3/getReservationRoomDetails"
    );
    roomDetailsUrl.searchParams.set("propertyID", propertyId);
    roomDetailsUrl.searchParams.set("subReservationID", subReservationId);
    return await getJson(roomDetailsUrl, apiKey);
  } catch {
    // Algunas credenciales antiguas no conceden este permiso. Conservamos la
    // importación de la asignación disponible en vez de bloquear la agenda.
    return null;
  }
}

async function mapWithConcurrency<T, Result>(
  values: T[],
  limit: number,
  mapper: (value: T, index: number) => Promise<Result>
) {
  const results = new Array<Result>(values.length);
  let nextIndex = 0;
  const workerCount = Math.min(Math.max(1, limit), values.length);

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < values.length) {
        const index = nextIndex;
        nextIndex += 1;
        results[index] = await mapper(values[index], index);
      }
    })
  );

  return results;
}

export async function fetchCloudbedsUpcomingReservations(
  apiKey: string,
  propertyId: string,
  dates: string[],
  onDiagnostics?: (diagnostics: CloudbedsReservationFieldDiagnostics) => void
) {
  const unresolvedAssignmentsByReservation = new Map<string, {
    assignment: Record<string, unknown>;
    id: string;
    date: string;
    subReservationIds: Set<string>;
  }>();
  const directAssignments: Array<{
    assignment: Record<string, unknown>;
    id: string;
    date: string;
    subReservationIds: Set<string>;
  }> = [];
  const seenDirectAssignments = new Set<string>();
  let diagnosticsReported = false;
  const assignmentsByDate = await mapWithConcurrency(dates, 3, async date => {
    const assignmentsUrl = new URL(
      "https://api.cloudbeds.com/api/v1.3/getReservationAssignments"
    );
    assignmentsUrl.searchParams.set("propertyID", propertyId);
    assignmentsUrl.searchParams.set("date", date);
    return { date, assignments: asList(await getJson(assignmentsUrl, apiKey)) };
  });

  assignmentsByDate.forEach(({ date, assignments }) => {
    assignments.forEach(assignment => {
      const id = reservationId(assignment);
      // Una misma reserva puede ocupar más de una habitación. Conservamos una
      // entrada por habitación física o subreserva, pero evitamos repetirla al
      // consultar cada día del calendario. Cloudbeds usa subReservationID para
      // las habitaciones adicionales de una misma reserva.
      if (!id) return;
      const roomKey = roomIdentity(assignment);
      const subReservationIds = collectSubReservationIds(assignment);
      if (roomKey || !subReservationIds.length) {
        const directKey = `${id}:${roomKey || "unassigned"}`;
        if (seenDirectAssignments.has(directKey)) return;
        seenDirectAssignments.add(directKey);
        directAssignments.push({
          assignment,
          id,
          date,
          subReservationIds: new Set(),
        });
        return;
      }
      const existing = unresolvedAssignmentsByReservation.get(id);
      if (existing) {
        subReservationIds.forEach(identifier => existing.subReservationIds.add(identifier));
        return;
      }
      unresolvedAssignmentsByReservation.set(id, {
        assignment,
        id,
        date,
        subReservationIds: new Set(subReservationIds),
      });
    });
  });
  const uniqueAssignments = [
    ...directAssignments,
    ...Array.from(unresolvedAssignmentsByReservation.values()),
  ];

  const importedBatches = await mapWithConcurrency(uniqueAssignments, 3, async ({ assignment, id, date, subReservationIds }) => {
      const detailUrl = new URL(
        "https://api.cloudbeds.com/api/v1.3/getReservation"
      );
      detailUrl.searchParams.set("propertyID", propertyId);
      detailUrl.searchParams.set("reservationID", id);
      const [detailPayload, importedReservationNotes] = await Promise.all([
        getJson(detailUrl, apiKey),
        getReservationNotes(apiKey, propertyId, id),
      ]);
      const detail = unwrapReservationDetail(detailPayload);
      const detailSubReservationIds = Array.from(new Set([
        ...Array.from(subReservationIds),
        ...collectSubReservationIds(detail),
      ]));
      const roomDetailsPayloads = await Promise.all(
        detailSubReservationIds.map(identifier =>
          getReservationRoomDetails(apiKey, propertyId, identifier)
        )
      );
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
      // Si getReservationAssignments ya identifica una habitación física, esa
      // asignación es la autoridad. El detalle de reserva contiene a menudo
      // *todas* las habitaciones de un grupo; expandirlo en cada fila creaba
      // copias cruzadas en las demás habitaciones de la agenda.
      // Solo expandimos el detalle cuando la asignación no revela habitación.
      const directRoom = roomIdentity(assignment)
        ? {
            ...assignment,
            ...asRecord(
              assignment.room ?? assignment.assignedRoom ?? assignment.assigned_room
            ),
          }
        : null;
      const rooms = directRoom
        ? [directRoom]
        : collectNestedPhysicalRooms({ assignment, detail, roomDetailsPayloads });
      const assignments = rooms.length ? rooms.map(room => ({
        ...assignment,
        ...room,
        ...asRecord(room.room ?? room.assignedRoom ?? room.assigned_room),
      })) : [assignment];
      return assignments.map(roomAssignment => normalizeUpcomingReservation(
        roomAssignment,
        { ...detail, importedReservationNotes },
        date
      ));
    });

  return importedBatches.flat().filter(
    (reservation): reservation is ImportedUpcomingReservation => reservation !== null
  );
}

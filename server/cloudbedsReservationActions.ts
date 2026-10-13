export type CloudbedsPaymentMethod = {
  value: string;
  label: string;
};

export type CloudbedsReservationSnapshot = {
  reservationStatus: string | null;
  amountPending: string | null;
  hotelCollect: boolean | null;
  paymentCollection: string | null;
  channelPaymentStatus: string | null;
  channelMembership: string | null;
  specialInstructions: string | null;
  guestId: number | null;
  roomNumber: string | null;
  roomType: string | null;
  guest: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    street: string | null;
    addressExtra: string | null;
    postalCode: string | null;
    city: string | null;
    province: string | null;
    country: string | null;
  };
  paymentType: string | null;
  paymentMethod: string | null;
};

type ApiRecord = Record<string, unknown>;

function asRecord(value: unknown): ApiRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as ApiRecord : {};
}

function text(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return String(value);
  return null;
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    const result = text(value);
    if (result) return result;
  }
  return null;
}

function asList(value: unknown): ApiRecord[] {
  if (Array.isArray(value)) return value.map(asRecord);
  const record = asRecord(value);
  for (const key of ["data", "paymentMethods", "payment_methods", "paymentMethodList", "payment_method_list", "methods", "results", "items"]) {
    if (Array.isArray(record[key])) return record[key].map(asRecord);
    const nested = asRecord(record[key]);
    if (Object.keys(nested).length) {
      const nestedList = asList(nested);
      if (nestedList.length) return nestedList;
    }
  }
  const objectEntries = Object.entries(record)
    .filter(([, candidate]) => candidate && typeof candidate === "object" && !Array.isArray(candidate))
    .map(([key, candidate]) => ({ key, method: asRecord(candidate) }))
    .filter(({ method }) => Boolean(firstText(method.type, method.paymentType, method.payment_type, method.name, method.displayName, method.display_name, method.paymentMethodName, method.payment_method_name, method.paymentTypeName, method.payment_type_name, method.methodName, method.method_name, method.description)));
  if (objectEntries.length) {
    return objectEntries.map(({ key, method }) => ({
      ...method,
      type: firstText(method.type, method.paymentType, method.payment_type, method.paymentMethod, method.payment_method, key),
    }));
  }
  const scalarEntries = Object.entries(record)
    .filter(([key, candidate]) => !["success", "status", "message", "error"].includes(key) && typeof candidate === "string" && candidate.trim());
  if (scalarEntries.length) {
    return scalarEntries.map(([type, name]) => ({ type, name }));
  }
  return [];
}

function unwrapReservation(value: unknown): ApiRecord {
  const record = asRecord(value);
  for (const key of ["reservation", "data", "result", "reservationDetails", "reservation_details"]) {
    const candidate = record[key];
    if (Array.isArray(candidate) && candidate.length) return asRecord(candidate[0]);
    const nested = asRecord(candidate);
    if (Object.keys(nested).length) return nested;
  }
  return record;
}

function firstRecord(...values: unknown[]) {
  for (const value of values) {
    const record = asRecord(value);
    if (Object.keys(record).length) return record;
  }
  return {} as ApiRecord;
}

function firstGuestRecord(value: unknown) {
  if (Array.isArray(value)) return asRecord(value[0]);
  const container = asRecord(value);
  if (Array.isArray(container.data)) return asRecord(container.data[0]);
  const indexed = Object.values(container)
    .map(asRecord)
    .find(candidate => Object.keys(candidate).length > 0);
  return indexed || container;
}

function money(value: unknown) {
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed.toFixed(2) : null;
}

function booleanValue(value: unknown) {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1" || value === "true") return true;
  if (value === 0 || value === "0" || value === "false") return false;
  return null;
}

function includesHotelCollect(value: unknown, depth = 0): boolean {
  if (depth > 5 || value === null || value === undefined) return false;
  if (typeof value === "string") return /hotel\s*collect/i.test(value);
  if (Array.isArray(value)) return value.some(item => includesHotelCollect(item, depth + 1));
  const record = asRecord(value);
  return Object.entries(record).some(([key, nested]) =>
    (/hotel.?collect/i.test(key) && booleanValue(nested) !== false) || includesHotelCollect(nested, depth + 1)
  );
}

function hotelCollectValue(reservation: ApiRecord) {
  for (const key of ["hotelCollect", "hotel_collect", "isHotelCollect", "is_hotel_collect"]) {
    const explicit = booleanValue(reservation[key]);
    if (explicit !== null) return explicit;
  }
  return includesHotelCollect(reservation) ? true : null;
}

function nestedTextByKey(value: unknown, keyPattern: RegExp, depth = 0): string | null {
  if (depth > 5 || value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = nestedTextByKey(item, keyPattern, depth + 1);
      if (found) return found;
    }
    return null;
  }
  const record = asRecord(value);
  for (const [key, nested] of Object.entries(record)) {
    if (keyPattern.test(key)) {
      const found = text(nested);
      if (found) return found;
    }
    const found = nestedTextByKey(nested, keyPattern, depth + 1);
    if (found) return found;
  }
  return null;
}

function nestedTrueByKey(value: unknown, keyPattern: RegExp, depth = 0): boolean {
  if (depth > 5 || value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.some(item => nestedTrueByKey(item, keyPattern, depth + 1));
  const record = asRecord(value);
  return Object.entries(record).some(([key, nested]) =>
    (keyPattern.test(key) && booleanValue(nested) === true) || nestedTrueByKey(nested, keyPattern, depth + 1)
  );
}

function paymentCollectionValue(reservation: ApiRecord, hotelCollect: boolean | null) {
  const explicit = firstText(
    reservation.paymentCollection,
    reservation.payment_collection,
    reservation.collectionType,
    reservation.collection_type,
    reservation.paymentModel,
    reservation.payment_model
  ) || nestedTextByKey(reservation, /^(payment.?collection|collection.?type|payment.?model)$/i);
  if (explicit) return explicit;
  if (hotelCollect === true) return "Hotel Collect · cobrar en el hotel";
  if (nestedTrueByKey(reservation, /(paid.?by.?channel|channel.?paid|channel.?collect)/i)) return "Pagada al canal";
  return null;
}

function channelPaymentStatusValue(reservation: ApiRecord) {
  const explicit = firstText(
    reservation.channelPaymentStatus,
    reservation.channel_payment_status,
    reservation.paidByChannelStatus,
    reservation.paid_by_channel_status
  ) || nestedTextByKey(reservation, /(paid.?by.?channel.*status|channel.?payment.*status)/i);
  if (explicit) return explicit;
  return nestedTrueByKey(reservation, /(paid.?by.?channel|channel.?paid|channel.?collect)/i)
    ? "Reserva pagada al canal"
    : null;
}

async function cloudbedsJson(url: URL, apiKey: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      "x-api-key": apiKey,
      Accept: "application/json",
      ...init?.headers,
    },
  });
  const body = await response.text();
  let payload: unknown;
  try { payload = JSON.parse(body); }
  catch { throw new Error(`Cloudbeds devolvió una respuesta no JSON (HTTP ${response.status}). Revisa la API key y sus permisos.`); }
  if (!response.ok) {
    const message = firstText(asRecord(payload).message, asRecord(payload).error, asRecord(payload).errorMessage);
    throw new Error(message || `Cloudbeds respondió HTTP ${response.status}. Revisa los permisos de la API key.`);
  }
  if (asRecord(payload).success === false) {
    const message = firstText(asRecord(payload).message, asRecord(payload).error, asRecord(payload).errorMessage);
    throw new Error(message || "Cloudbeds no aceptó la operación solicitada.");
  }
  return payload;
}

export function normalizeCloudbedsPaymentMethods(payload: unknown): CloudbedsPaymentMethod[] {
  const methods = asList(payload)
    .map(method => {
      const value = firstText(method.type, method.paymentType, method.payment_type, method.paymentMethod, method.payment_method, method.methodType, method.method_type, method.code, method.value, method.id, method.paymentMethodID, method.payment_method_id);
      const label = firstText(method.name, method.displayName, method.display_name, method.paymentMethodName, method.payment_method_name, method.paymentTypeName, method.payment_type_name, method.methodName, method.method_name, method.description, method.label, value);
      return value && label ? { value, label } : null;
    })
    .filter((method): method is CloudbedsPaymentMethod => Boolean(method));
  return Array.from(new Map(methods.map(method => [method.value, method])).values());
}

export function extractCloudbedsReservationSnapshot(payload: unknown): CloudbedsReservationSnapshot {
  const reservation = unwrapReservation(payload);
  const guestList = reservation.guestList ?? reservation.guests ?? reservation.guest_list;
  const firstGuest = firstGuestRecord(guestList ?? reservation.guest ?? reservation.primaryGuest);
  const firstRoom = firstGuestRecord(
    reservation.rooms ?? reservation.accommodations ?? reservation.reservationRooms ?? reservation.reservation_rooms ?? reservation.roomAssignments ?? reservation.room_assignments ?? reservation.assignedRooms ?? reservation.assigned_rooms ?? reservation.room
  );
  const roomType = firstRecord(firstRoom.roomType, firstRoom.room_type, reservation.roomType, reservation.room_type);
  const address = firstRecord(
    firstGuest.address,
    firstGuest.guestAddress,
    firstGuest.guest_address,
    reservation.guestAddress,
    reservation.guest_address,
    reservation.address
  );
  const guestId = Number(
    reservation.guestID ?? reservation.guestId ?? reservation.guest_id ??
    firstGuest.guestID ?? firstGuest.guestId ?? firstGuest.guest_id ?? firstGuest.id
  );
  const hotelCollect = hotelCollectValue(reservation);
  return {
    reservationStatus: firstText(reservation.status, reservation.reservationStatus, reservation.reservation_status),
    amountPending: money(reservation.balance ?? reservation.amountPending ?? reservation.amount_pending ?? reservation.balanceDue ?? reservation.balance_due),
    hotelCollect,
    paymentCollection: paymentCollectionValue(reservation, hotelCollect),
    channelPaymentStatus: channelPaymentStatusValue(reservation),
    channelMembership: firstText(
      reservation.channelMembership,
      reservation.channel_membership,
      reservation.membership,
      reservation.loyaltyProgram,
      reservation.loyalty_program
    ) || nestedTextByKey(reservation, /(membership|loyalty|genius)/i),
    specialInstructions: firstText(
      reservation.specialInstructions,
      reservation.special_instructions,
      reservation.bookingInstructions,
      reservation.booking_instructions
    ) || nestedTextByKey(reservation, /(special.?instruction|booking.?instruction|channel.?instruction)/i),
    guestId: Number.isInteger(guestId) && guestId > 0 ? guestId : null,
    roomNumber: firstText(firstRoom.roomName, firstRoom.room_name, firstRoom.roomNumber, firstRoom.room_number, firstRoom.room_number_display, firstRoom.name, firstRoom.number, reservation.roomNumber, reservation.room_number, reservation.roomName, reservation.room_name, reservation.assignedRoomNumber, reservation.assigned_room_number),
    roomType: firstText(firstRoom.roomTypeName, firstRoom.room_type_name, firstRoom.roomTypeNameDisplay, firstRoom.room_type_name_display, firstRoom.roomType, firstRoom.room_type, roomType.name, roomType.roomTypeName, roomType.room_type_name, reservation.roomTypeName, reservation.room_type_name, reservation.roomType, reservation.room_type),
    guest: {
      firstName: firstText(firstGuest.firstName, firstGuest.first_name, firstGuest.guestFirstName, reservation.guestFirstName, reservation.guest_first_name),
      lastName: firstText(firstGuest.lastName, firstGuest.last_name, firstGuest.guestLastName, reservation.guestLastName, reservation.guest_last_name),
      email: firstText(firstGuest.email, firstGuest.emailAddress, firstGuest.email_address, reservation.guestEmail, reservation.guest_email),
      phone: firstText(firstGuest.phone, firstGuest.phoneNumber, firstGuest.phone_number, firstGuest.mobile, reservation.guestPhone, reservation.guest_phone),
      street: firstText(address.street, address.address1, address.address_1, address.line1, firstGuest.street, firstGuest.address1, reservation.guestAddress),
      addressExtra: firstText(address.address2, address.address_2, address.line2, address.extra, firstGuest.address2),
      postalCode: firstText(address.postalCode, address.postal_code, address.zipCode, address.zip_code, address.zip, firstGuest.postalCode, firstGuest.zipCode),
      city: firstText(address.city, address.town, firstGuest.city, reservation.guestCity, reservation.guest_city),
      province: firstText(address.province, address.state, address.region, firstGuest.province, firstGuest.state, reservation.guestProvince, reservation.guest_province),
      country: firstText(address.countryCode, address.country_code, address.country, firstGuest.countryCode, firstGuest.country, reservation.guestCountry, reservation.guest_country),
    },
    paymentType: firstText(reservation.paymentType, reservation.payment_type, reservation.paymentMethodType, reservation.payment_method_type),
    paymentMethod: firstText(reservation.paymentMethod, reservation.payment_method, reservation.paymentMethodName, reservation.payment_method_name),
  };
}

export async function fetchCloudbedsPaymentMethods(apiKey: string, propertyId: string) {
  const url = new URL("https://api.cloudbeds.com/api/v1.3/getPaymentMethods");
  url.searchParams.set("propertyID", propertyId);
  url.searchParams.set("lang", "es");
  return normalizeCloudbedsPaymentMethods(await cloudbedsJson(url, apiKey));
}

export async function fetchCloudbedsReservationSnapshot(apiKey: string, propertyId: string, reservationId: string) {
  const url = new URL("https://api.cloudbeds.com/api/v1.3/getReservation");
  url.searchParams.set("propertyID", propertyId);
  url.searchParams.set("reservationID", reservationId);
  return extractCloudbedsReservationSnapshot(await cloudbedsJson(url, apiKey));
}

export async function recordCloudbedsReservationPayment(input: {
  apiKey: string;
  propertyId: string;
  reservationId: string;
  type: string;
  amount: number;
  description?: string | null;
  isDeposit?: boolean;
}) {
  const body = new URLSearchParams({
    propertyID: input.propertyId,
    reservationID: input.reservationId,
    type: input.type,
    amount: input.amount.toFixed(2),
    isDeposit: input.isDeposit ? "true" : "false",
  });
  if (input.description?.trim()) body.set("description", input.description.trim());
  const payload = await cloudbedsJson(new URL("https://api.cloudbeds.com/api/v1.3/postPayment"), input.apiKey, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  return payload;
}

export async function updateCloudbedsReservationStatus(input: {
  apiKey: string;
  propertyId: string;
  reservationId: string;
  status: "confirmed" | "not_confirmed" | "canceled" | "checked_in" | "checked_out" | "no_show";
}) {
  const body = new URLSearchParams({
    propertyID: input.propertyId,
    reservationID: input.reservationId,
    status: input.status,
    sendStatusChangeEmail: "false",
  });
  return cloudbedsJson(new URL("https://api.cloudbeds.com/api/v1.3/putReservation"), input.apiKey, {
    method: "PUT",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
}

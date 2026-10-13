import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cloudbedsManualReservationForm,
  createCloudbedsManualReservation,
  fetchCloudbedsBookableRoomTypes,
  fetchCloudbedsReservationSources,
  normalizeCloudbedsBookableRoomTypes,
} from "./cloudbedsManualReservations";

afterEach(() => vi.unstubAllGlobals());

const baseInput = {
  apiKey: "cbat_test",
  propertyId: "204754",
  startDate: "2026-10-20",
  endDate: "2026-10-23",
  roomTypeId: "double-1",
  rooms: 1,
  adults: 2,
  children: 0,
  guestFirstName: "Ana",
  guestLastName: "Pérez",
  guestEmail: "ana@example.com",
  guestPhone: "+34600000000",
  guestCountry: "es",
  guestZip: "41001",
  sourceId: "s-1",
  paymentMethod: "cash" as const,
  sendEmailConfirmation: false,
};

describe("reservas manuales de Cloudbeds", () => {
  it("normaliza los tipos realmente reservables y su precio total", () => {
    expect(normalizeCloudbedsBookableRoomTypes({
      success: true,
      data: [{
        propertyRooms: [{
          roomTypeID: "double-1",
          roomTypeName: "Habitación Doble",
          roomsAvailable: "2",
          maxGuests: 2,
          roomRateID: "rate-1",
          roomRateDetailed: [{ date: "2026-10-20", rate: 89 }, { date: "2026-10-21", rate: 99 }],
        }],
      }],
    })).toEqual([{
      roomTypeId: "double-1",
      roomTypeName: "Habitación Doble",
      roomsAvailable: 2,
      maxGuests: 2,
      rate: 188,
      rateId: "rate-1",
      individualRooms: [],
    }]);
  });

  it("consulta disponibilidad con estancia y ocupación exactas", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [{
        propertyRooms: [{ roomTypeID: "double-1", roomTypeName: "Doble", roomsAvailable: 1, roomRate: 120 }],
      }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [{
        rooms: [{ roomID: "room-15", roomName: "Habitación 15", roomTypeID: "double-1" }],
      }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchCloudbedsBookableRoomTypes(baseInput);
    const url = fetchMock.mock.calls[0][0] as URL;
    expect(url.pathname).toBe("/api/v1.3/getAvailableRoomTypes");
    expect(url.searchParams.get("startDate")).toBe("2026-10-20");
    expect(url.searchParams.get("endDate")).toBe("2026-10-23");
    expect(url.searchParams.get("adults")).toBe("2");
    expect(url.searchParams.get("rooms")).toBe("1");
    const roomsUrl = fetchMock.mock.calls[1][0] as URL;
    expect(roomsUrl.pathname).toBe("/api/v1.3/getRooms");
    expect(roomsUrl.searchParams.get("startDate")).toBe("2026-10-20");
    expect(result[0]?.individualRooms).toEqual([{ roomId: "room-15", roomName: "Habitación 15", dormRoomName: null, roomTypeName: null }]);
  });

  it("mantiene una habitación física aunque el tipo no llegue en la disponibilidad agregada", () => {
    const individualRooms = new Map([[
      "double-1",
      [{ roomId: "room-18", roomName: "Habitación 18", dormRoomName: null, roomTypeName: "Doble" }],
    ]]);

    expect(normalizeCloudbedsBookableRoomTypes({ data: [] }, individualRooms)).toEqual([{
      roomTypeId: "double-1",
      roomTypeName: "Doble",
      roomsAvailable: 0,
      maxGuests: null,
      rate: null,
      rateId: null,
      individualRooms: [{ roomId: "room-18", roomName: "Habitación 18", dormRoomName: null, roomTypeName: "Doble" }],
    }]);
  });

  it("incluye las fuentes de terceros con el sourceID exacto de Cloudbeds", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [
      { sourceID: "s-1", sourceName: "Walk In", active: true },
      { sourceID: "ss-22-0", sourceName: "Booking.com · Prepago", isThirdParty: true, active: true },
      { sourceID: "ss-22-1", sourceName: "Booking.com · Hotel collect", isThirdParty: true, active: true },
    ] }), { status: 200 })));

    await expect(fetchCloudbedsReservationSources("cbat_test", "204754")).resolves.toEqual(expect.arrayContaining([
      expect.objectContaining({ sourceId: "ss-22-0", name: "Booking.com · Prepago" }),
      expect.objectContaining({ sourceId: "ss-22-1", name: "Booking.com · Hotel collect" }),
    ]));
  });

  it("prepara los campos de huésped, estancia y ocupación en el formato Cloudbeds", () => {
    const form = cloudbedsManualReservationForm({ ...baseInput, roomId: "room-15" });
    expect(Object.fromEntries(form.entries())).toMatchObject({
      propertyID: "204754",
      sourceID: "s-1",
      startDate: "2026-10-20",
      endDate: "2026-10-23",
      guestFirstName: "Ana",
      guestLastName: "Pérez",
      guestCountry: "ES",
      paymentMethod: "cash",
      "rooms[0][roomTypeID]": "double-1",
      "rooms[0][quantity]": "1",
      "rooms[0][roomID]": "room-15",
      "adults[0][quantity]": "2",
      "children[0][quantity]": "0",
      sendEmailConfirmation: "false",
    });
  });

  it("crea varias habitaciones bajo una única reserva sin forzar una habitación física", () => {
    const form = cloudbedsManualReservationForm({ ...baseInput, rooms: 3 });
    const values = Object.fromEntries(form.entries());
    expect(values).toMatchObject({
      "rooms[0][roomTypeID]": "double-1",
      "rooms[0][quantity]": "3",
      "adults[0][quantity]": "2",
    });
    expect(values["rooms[0][roomID]"]).toBeUndefined();
  });

  it("crea la reserva solo mediante la petición confirmada", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: true,
      reservationID: "CB-100",
      status: "confirmed",
      grandTotal: 188,
      unassigned: [{ roomTypeID: "double-1", roomTypeName: "Doble" }],
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(createCloudbedsManualReservation(baseInput)).resolves.toMatchObject({
      reservationId: "CB-100",
      grandTotal: 188,
    });
    expect(String(fetchMock.mock.calls[0][0])).toBe("https://api.cloudbeds.com/api/v1.3/postReservation");
    expect(fetchMock.mock.calls[0][1].method).toBe("POST");
  });
});

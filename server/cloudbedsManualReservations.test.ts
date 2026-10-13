import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cloudbedsManualReservationForm,
  createCloudbedsManualReservation,
  fetchCloudbedsBookableRoomTypes,
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
    expect(result[0]?.individualRooms).toEqual([{ roomId: "room-15", roomName: "Habitación 15", dormRoomName: null }]);
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
      "rooms[0][roomTypeID]": "double-1",
      "rooms[0][quantity]": "1",
      "rooms[0][roomID]": "room-15",
      "adults[0][quantity]": "2",
      "children[0][quantity]": "0",
      sendEmailConfirmation: "false",
    });
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

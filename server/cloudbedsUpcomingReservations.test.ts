import { describe, expect, it, vi } from "vitest";
import { fetchCloudbedsUpcomingReservations, getNextMadridCalendarDates, normalizeUpcomingReservation } from "./cloudbedsUpcomingReservations";

describe("normalizeUpcomingReservation", () => {
  it("extrae solo los datos operativos necesarios de una reserva futura", () => {
    const result = normalizeUpcomingReservation(
      { reservationID: "R-71", date: "2026-08-28", roomName: "15" },
      { reservationID: "R-71", status: "confirmed", checkInDate: "2026-08-28", checkOutDate: "2026-08-30", sourceName: "Booking.com", guests: [{ firstName: "Ana", lastName: "García", email: "ana@example.com", phone: "+34955000000" }], rooms: [{ roomTypeName: "Twin", roomName: "15" }] },
      "2026-08-28",
    );
    expect(result).toMatchObject({ sourceReservationId: "R-71", guestName: "Ana García", checkInDate: "2026-08-28", checkOutDate: "2026-08-30", roomType: "Twin", roomNumber: "15", reservationStatus: "confirmed" });
    expect(result?.rawData).not.toContain("undefined");
  });

  it("calcula tres fechas de llegada de Madrid sin depender del formato regional", () => {
    expect(getNextMadridCalendarDates(new Date("2026-08-27T12:00:00.000Z"))).toEqual(["2026-08-27", "2026-08-28", "2026-08-29"]);
  });

  it("desanida el detalle real de una reserva antes de extraer huésped y habitación", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([{ reservationID: "R-72", date: "2026-08-28" }]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ reservation: {
        reservationID: "R-72", confirmationNumber: "CB-772", check_in: "2026-08-28", check_out: "2026-08-30",
        guestList: [{ first_name: "Lucía", last_name: "Martín", email_address: "lucia@example.com", mobile: "+34955000111" }],
        reservationRooms: [{ room_type: "Twin", room_number: "15" }],
      } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await fetchCloudbedsUpcomingReservations("cbat_test", "204754", ["2026-08-28"]);
    expect(result[0]).toMatchObject({ guestName: "Lucía Martín", guestEmail: "lucia@example.com", guestPhone: "+34955000111", checkOutDate: "2026-08-30", roomType: "Twin", roomNumber: "15" });
    vi.unstubAllGlobals();
  });

  it("reconoce las variantes de salida, habitación y teléfono del detalle de Cloudbeds", () => {
    const result = normalizeUpcomingReservation(
      { reservationID: "R-73", date: "2026-08-28", room_type: "Dormitorio" },
      { reservationID: "R-73", check_in: "2026-08-28", dateDeparture: "2026-08-31", primary_guest: { first_name: "Marta", last_name: "López", mobile_phone_number: "+34600000123" }, assigned_room: { name: "12", room_type: { name: "Cama en dormitorio" } } },
      "2026-08-28",
    );
    expect(result).toMatchObject({ guestPhone: "+34600000123", checkOutDate: "2026-08-31", roomType: "Cama en dormitorio", roomNumber: "12" });
  });
});

import { describe, expect, it } from "vitest";
import { getNextMadridCalendarDates, normalizeUpcomingReservation } from "./cloudbedsUpcomingReservations";

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
});

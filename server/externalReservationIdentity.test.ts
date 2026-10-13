import { describe, expect, it } from "vitest";
import { externalReservationAssignmentKey } from "./externalReservationIdentity";

describe("externalReservationAssignmentKey", () => {
  it("considera iguales el número y el nombre de una habitación física", () => {
    const numberOnly = externalReservationAssignmentKey({
      sourceReservationId: "R-51",
      roomNumber: "51",
      checkInDate: "2026-10-13",
    });
    const prefixedName = externalReservationAssignmentKey({
      sourceReservationId: "R-51",
      roomNumber: "Habitación 51",
      checkInDate: "2026-10-13",
    });

    expect(prefixedName).toBe(numberOnly);
  });

  it("mantiene separadas dos asignaciones físicas de una misma reserva", () => {
    expect(externalReservationAssignmentKey({ sourceReservationId: "R-52", roomNumber: "7", checkInDate: "2026-10-13" }))
      .not.toBe(externalReservationAssignmentKey({ sourceReservationId: "R-52", roomNumber: "8", checkInDate: "2026-10-13" }));
  });
});

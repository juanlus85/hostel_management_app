import { describe, expect, it } from "vitest";
import { buildReservationAgenda, reservationAgendaTone } from "../shared/reservationAgenda";

const dates = ["2026-10-10", "2026-10-11", "2026-10-12", "2026-10-13", "2026-10-14"];

describe("buildReservationAgenda", () => {
  it("agrupa por tipo y habitación y extiende cada reserva por sus noches", () => {
    const agenda = buildReservationAgenda([
      {
        id: 1,
        guestName: "Ana",
        checkInDate: "2026-10-10",
        checkOutDate: "2026-10-13",
        roomType: "Twin Room with Private Bathroom",
        roomNumber: "15",
        reservationStatus: "confirmed",
        amountPending: "25.00",
        reservationNotes: "Llegada tarde",
      },
      {
        id: 2,
        guestName: "Luis",
        checkInDate: "2026-10-11",
        checkOutDate: "2026-10-12",
        roomType: "Twin Room with Private Bathroom",
        roomNumber: "15",
        reservationStatus: "confirmed",
        amountPending: "0",
        reservationNotes: null,
      },
    ], dates);

    expect(agenda).toHaveLength(1);
    expect(agenda[0]).toMatchObject({ label: "Twin Room with Private Bathroom", reservationsCount: 2 });
    expect(agenda[0].rooms[0].cards).toEqual(expect.arrayContaining([
      expect.objectContaining({ startColumn: 0, span: 3, hasPendingAmount: true, hasNotes: true }),
      expect.objectContaining({ startColumn: 1, span: 1, hasPendingAmount: false, hasNotes: false }),
    ]));
  });

  it("muestra estancias iniciadas antes del período y no muestra salidas previas", () => {
    const agenda = buildReservationAgenda([
      {
        id: 3,
        guestName: "En estancia",
        checkInDate: "2026-10-08",
        checkOutDate: "2026-10-12",
        roomType: "Double Room",
        roomNumber: "4",
        reservationStatus: "checked_in",
        amountPending: "0",
        reservationNotes: null,
      },
      {
        id: 4,
        guestName: "Ya salió",
        checkInDate: "2026-10-08",
        checkOutDate: "2026-10-10",
        roomType: "Double Room",
        roomNumber: "4",
        reservationStatus: "checked_out",
        amountPending: "0",
        reservationNotes: null,
      },
    ], dates);

    expect(agenda[0].rooms[0].cards).toHaveLength(1);
    expect(agenda[0].rooms[0].cards[0]).toMatchObject({ startColumn: 0, span: 2 });
  });

  it("asigna tonos visibles por estado", () => {
    expect(reservationAgendaTone("confirmed")).toBe("emerald");
    expect(reservationAgendaTone("checked_in")).toBe("sky");
    expect(reservationAgendaTone("cancelled")).toBe("slate");
  });
});

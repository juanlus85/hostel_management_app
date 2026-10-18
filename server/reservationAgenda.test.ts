import { describe, expect, it } from "vitest";
import { buildReservationAgenda, reservationAgendaTone } from "../shared/reservationAgenda";
import { DEFAULT_RESERVATION_AGENDA_LAYOUT } from "../shared/reservationAgendaLayout";

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

  it("muestra una habitación física una sola vez aunque Cloudbeds cambie su tipo", () => {
    const agenda = buildReservationAgenda([
      { id: 30, guestName: "Ana", checkInDate: "2026-10-10", checkOutDate: "2026-10-12", roomType: "Twin Room with Shared Bathroom", roomNumber: "15", reservationStatus: "confirmed", amountPending: "0", reservationNotes: null },
      { id: 31, guestName: "Luis", checkInDate: "2026-10-12", checkOutDate: "2026-10-14", roomType: "Double Room with Shared Bathroom", roomNumber: "Habitación 15", reservationStatus: "confirmed", amountPending: "0", reservationNotes: null },
      { id: 32, guestName: "Marta", checkInDate: "2026-10-10", checkOutDate: "2026-10-11", roomType: "Twin Room with Shared Bathroom", roomNumber: "15", reservationStatus: "confirmed", amountPending: "0", reservationNotes: null },
    ], dates);
    const roomRows = agenda.flatMap(group => group.rooms).filter(room => room.label === "Habitación 15");
    expect(roomRows).toHaveLength(1);
    expect(roomRows[0]?.cards.map(card => card.reservation.id).sort()).toEqual([30, 31, 32]);
  });

  it("conserva las filas físicas y el orden operativo aunque Cloudbeds cambie el tipo", () => {
    const agenda = buildReservationAgenda([
      { id: 71, guestName: "Reserva 51", checkInDate: "2026-10-10", checkOutDate: "2026-10-12", roomType: "Tipo inesperado", roomNumber: "Habitación 51", reservationStatus: "confirmed", amountPending: "0", reservationNotes: null },
      { id: 72, guestName: "Reserva 4", checkInDate: "2026-10-10", checkOutDate: "2026-10-12", roomType: "Otro tipo", roomNumber: "4", reservationStatus: "confirmed", amountPending: "0", reservationNotes: null },
    ], dates, DEFAULT_RESERVATION_AGENDA_LAYOUT);

    expect(agenda.map(group => group.label)).toEqual([
      "Twin Room with Private Bathroom",
      "Double Room with Private Bathroom",
      "Twin Room with Shared Bathroom",
      "Double Room with Shared Bathroom",
      "Triple Room with Private Bathroom",
      "Bed in 3-Bed Mixed Dormitory",
    ]);
    expect(agenda.flatMap(group => group.rooms.map(room => room.label))).toEqual([
      "Habitación 35",
      "Habitación 18",
      "Habitación 51",
      "Habitación 4",
      "Habitación 15",
      "Habitación 7",
      "Habitación 8",
      "Habitación 23",
      "Habitación 16",
      "Habitación 42-1",
      "Habitación 42-2",
      "Habitación 42-3",
    ]);
    const room51 = agenda.flatMap(group => group.rooms).find(room => room.label === "Habitación 51");
    expect(room51?.cards.map(card => card.reservation.id)).toEqual([71]);
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
    expect(reservationAgendaTone("confirmed")).toBe("sky");
    expect(reservationAgendaTone("checked_in")).toBe("emerald");
    expect(reservationAgendaTone("checked_in", true)).toBe("rose");
    expect(reservationAgendaTone("checked_out", true)).toBe("slate");
    expect(reservationAgendaTone("cancelled")).toBe("slate");
  });

  it("libera la habitación cuando una reserva se cancela o no se presenta", () => {
    const agenda = buildReservationAgenda([
      { id: 60, guestName: "Cancelada", checkInDate: "2026-10-10", checkOutDate: "2026-10-13", roomType: "Twin", roomNumber: "15", reservationStatus: "canceled", amountPending: "0", reservationNotes: null },
      { id: 61, guestName: "No presentado", checkInDate: "2026-10-10", checkOutDate: "2026-10-13", roomType: "Twin", roomNumber: "15", reservationStatus: "no_show", amountPending: "0", reservationNotes: null },
      { id: 62, guestName: "Activa", checkInDate: "2026-10-10", checkOutDate: "2026-10-13", roomType: "Twin", roomNumber: "15", reservationStatus: "confirmed", amountPending: "0", reservationNotes: null },
    ], dates);

    expect(agenda).toHaveLength(1);
    expect(agenda[0]).toMatchObject({ reservationsCount: 1 });
    expect(agenda[0]?.rooms[0]?.cards.map(card => card.reservation.id)).toEqual([62]);
  });

  it("distingue invitaciones enviadas de Check-ins completados", () => {
    const agenda = buildReservationAgenda([
      { id: 51, guestName: "Invitada", checkInDate: "2026-10-10", checkOutDate: "2026-10-11", roomType: "Twin", roomNumber: "4", reservationStatus: "confirmed", amountPending: "0", reservationNotes: null, checkinInvitationSent: true, checkinCompleted: false },
      { id: 52, guestName: "Completada", checkInDate: "2026-10-11", checkOutDate: "2026-10-12", roomType: "Twin", roomNumber: "4", reservationStatus: "confirmed", amountPending: "0", reservationNotes: null, checkinInvitationSent: true, checkinCompleted: true },
    ], dates);

    expect(agenda[0].rooms[0].cards).toEqual(expect.arrayContaining([
      expect.objectContaining({ reservation: expect.objectContaining({ id: 51 }), hasCheckinInvitation: true, hasCheckinCompleted: false }),
      expect.objectContaining({ reservation: expect.objectContaining({ id: 52 }), hasCheckinInvitation: false, hasCheckinCompleted: true }),
    ]));
  });

  it("coloca estancias que coinciden en carriles separados y reutiliza un carril libre", () => {
    const agenda = buildReservationAgenda([
      { id: 10, guestName: "Ana", checkInDate: "2026-10-10", checkOutDate: "2026-10-13", roomType: "Twin", roomNumber: "15", reservationStatus: "confirmed", amountPending: "0", reservationNotes: null },
      { id: 11, guestName: "Luis", checkInDate: "2026-10-11", checkOutDate: "2026-10-12", roomType: "Twin", roomNumber: "15", reservationStatus: "confirmed", amountPending: "0", reservationNotes: null },
      { id: 12, guestName: "Marta", checkInDate: "2026-10-13", checkOutDate: "2026-10-14", roomType: "Twin", roomNumber: "15", reservationStatus: "confirmed", amountPending: "0", reservationNotes: null },
    ], dates);

    const room = agenda[0].rooms[0];
    expect(room.laneCount).toBe(2);
    expect(room.cards.map(card => ({ id: card.reservation.id, lane: card.lane }))).toEqual([
      { id: 10, lane: 0 },
      { id: 11, lane: 1 },
      { id: 12, lane: 0 },
    ]);
  });

  it("prioriza la estancia ya en check-in ante una asignación confirmada solapada", () => {
    const agenda = buildReservationAgenda([
      { id: 40, guestName: "Ya alojada", checkInDate: "2026-10-10", checkOutDate: "2026-10-14", roomType: "Twin", roomNumber: "4", reservationStatus: "checked_in", amountPending: "0", reservationNotes: null },
      { id: 41, guestName: "Asignación pendiente", checkInDate: "2026-10-10", checkOutDate: "2026-10-12", roomType: "Twin", roomNumber: "4", reservationStatus: "confirmed", amountPending: "0", reservationNotes: null },
    ], dates);

    const room = agenda[0].rooms[0];
    expect(room.laneCount).toBe(1);
    expect(room.cards.map(card => card.reservation.id)).toEqual([40]);
  });

  it("mantiene en el mismo carril el relevo de salida y entrada del mismo día", () => {
    const agenda = buildReservationAgenda([
      { id: 20, guestName: "Sale", checkInDate: "2026-10-10", checkOutDate: "2026-10-12", roomType: "Twin", roomNumber: "7", reservationStatus: "checked_out", amountPending: "0", reservationNotes: null },
      { id: 21, guestName: "Entra", checkInDate: "2026-10-12", checkOutDate: "2026-10-14", roomType: "Twin", roomNumber: "7", reservationStatus: "confirmed", amountPending: "0", reservationNotes: null },
    ], dates);

    const room = agenda[0].rooms[0];
    expect(room.laneCount).toBe(1);
    expect(room.cards.map(card => ({ id: card.reservation.id, lane: card.lane, startSlot: card.startSlot, endSlot: card.endSlot }))).toEqual([
      { id: 20, lane: 0, startSlot: 0.2, endSlot: 2.2 },
      { id: 21, lane: 0, startSlot: 2.2, endSlot: 4.2 },
    ]);
  });
});

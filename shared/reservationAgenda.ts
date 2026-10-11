export type ReservationAgendaItem = {
  id: number;
  guestName: string | null;
  checkInDate: string;
  checkOutDate: string | null;
  roomType: string | null;
  roomNumber: string | null;
  reservationStatus: string | null;
  amountPending: string | number | null;
  reservationNotes: string | null;
};

export type ReservationAgendaTone = "emerald" | "sky" | "amber" | "slate" | "rose";

export type ReservationAgendaCard<T extends ReservationAgendaItem> = {
  reservation: T;
  startColumn: number;
  span: number;
  lane: number;
  tone: ReservationAgendaTone;
  hasPendingAmount: boolean;
  hasNotes: boolean;
};

export type ReservationAgendaRoom<T extends ReservationAgendaItem> = {
  key: string;
  label: string;
  cards: Array<ReservationAgendaCard<T>>;
  laneCount: number;
};

export type ReservationAgendaGroup<T extends ReservationAgendaItem> = {
  key: string;
  label: string;
  rooms: Array<ReservationAgendaRoom<T>>;
  reservationsCount: number;
};

function normalize(value: string) {
  return value
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function roomTypeRank(name: string) {
  const value = normalize(name);
  const twoBeds = /\b(2|dos) camas?\b|\btwin\b/.test(value);
  const doubleBed = /cama doble|\bdouble\b/.test(value);
  const triple = /\btriple\b|\b3 camas?\b/.test(value);
  const privateBathroom = /bano privado|private bathroom/.test(value);
  const sharedBathroom = /bano compartido|shared bathroom/.test(value);
  const sharedBed = /cama en .*compartida|bed in .*dorm|dormitorio compartido/.test(value);

  if (twoBeds && privateBathroom) return 10;
  if (doubleBed && privateBathroom) return 20;
  if (twoBeds && sharedBathroom) return 30;
  if (doubleBed && sharedBathroom) return 40;
  if (triple && privateBathroom && !sharedBed) return 50;
  if (sharedBed && triple) return 60;
  return 100;
}

function normalizedStatus(value: string | null | undefined) {
  return value?.toLocaleLowerCase("es").replace(/[\s-]+/g, "_") || "";
}

export function reservationAgendaTone(status: string | null | undefined, hasPendingAmount = false): ReservationAgendaTone {
  const value = normalizedStatus(status);
  if (["cancelled", "canceled", "no_show"].includes(value)) return "slate";
  if (["checked_out", "completed"].includes(value)) return "slate";
  if (["checked_in", "in_progress"].includes(value)) return hasPendingAmount ? "rose" : "emerald";
  return "sky";
}

export function reservationHasPendingAmount(value: string | number | null | undefined) {
  const amount = Number(String(value ?? "0").replace(",", "."));
  return Number.isFinite(amount) && amount > 0.004;
}

export function reservationHasNotes(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function roomLabel(reservation: ReservationAgendaItem) {
  return reservation.roomNumber?.trim() ? `Habitación ${reservation.roomNumber.trim()}` : "Sin habitación asignada";
}

function visibleSpan(reservation: ReservationAgendaItem, dates: string[]) {
  if (!dates.length || reservation.checkInDate > dates[dates.length - 1]) return null;
  const hasSeparateCheckout = Boolean(reservation.checkOutDate && reservation.checkOutDate > reservation.checkInDate);
  const checkoutDate = hasSeparateCheckout
    ? reservation.checkOutDate!
    : reservation.checkInDate;
  if (hasSeparateCheckout && checkoutDate <= dates[0]) return null;

  const firstVisibleDate = reservation.checkInDate > dates[0] ? reservation.checkInDate : dates[0];
  const startColumn = dates.indexOf(firstVisibleDate);
  if (startColumn < 0) return null;

  const checkoutIndex = dates.indexOf(checkoutDate);
  const exclusiveEnd = checkoutIndex >= 0 ? checkoutIndex : checkoutDate > dates[dates.length - 1] ? dates.length : startColumn + 1;
  return { startColumn, span: Math.max(1, exclusiveEnd - startColumn) };
}

export function buildReservationAgenda<T extends ReservationAgendaItem>(reservations: T[], dates: string[]): Array<ReservationAgendaGroup<T>> {
  const groups = new Map<string, { label: string; rooms: Map<string, ReservationAgendaRoom<T>>; count: number }>();

  for (const reservation of reservations) {
    const span = visibleSpan(reservation, dates);
    if (!span) continue;
    const groupLabel = reservation.roomType?.trim() || "Tipo de habitación pendiente";
    const groupKey = normalize(groupLabel) || "pending-room-type";
    const roomKey = reservation.roomNumber?.trim() || "unassigned";
    const group = groups.get(groupKey) || { label: groupLabel, rooms: new Map(), count: 0 };
    const room = group.rooms.get(roomKey) || { key: roomKey, label: roomLabel(reservation), cards: [], laneCount: 1 };
    const hasPendingAmount = reservationHasPendingAmount(reservation.amountPending);
    room.cards.push({
      reservation,
      ...span,
      lane: 0,
      tone: reservationAgendaTone(reservation.reservationStatus, hasPendingAmount),
      hasPendingAmount,
      hasNotes: reservationHasNotes(reservation.reservationNotes),
    });
    group.rooms.set(roomKey, room);
    group.count += 1;
    groups.set(groupKey, group);
  }

  return Array.from(groups.entries())
    .sort(([, left], [, right]) => roomTypeRank(left.label) - roomTypeRank(right.label) || left.label.localeCompare(right.label, "es"))
    .map(([key, group]) => ({
      key,
      label: group.label,
      reservationsCount: group.count,
      rooms: Array.from(group.rooms.values())
        .sort((left, right) => left.label.localeCompare(right.label, "es", { numeric: true }))
        .map(room => {
          const laneEnds: number[] = [];
          const cards = [...room.cards]
            .sort((left, right) => left.startColumn - right.startColumn || left.reservation.guestName?.localeCompare(right.reservation.guestName || "", "es") || 0)
            .map(card => {
              let lane = laneEnds.findIndex(endColumn => endColumn <= card.startColumn);
              if (lane < 0) {
                lane = laneEnds.length;
                laneEnds.push(card.startColumn + card.span);
              } else {
                laneEnds[lane] = card.startColumn + card.span;
              }
              return { ...card, lane };
            });
          return { ...room, cards, laneCount: Math.max(1, laneEnds.length) };
        }),
    }));
}

import { reservationReleasesAssignedRoom } from "./reservationStatus";
import {
  normalizeAgendaRoomNumber,
  type ReservationAgendaRoomLayout,
} from "./reservationAgendaLayout";

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
  checkinInvitationSent?: boolean;
  checkinCompleted?: boolean;
};

export type ReservationAgendaTone = "emerald" | "sky" | "amber" | "slate" | "rose";

export type ReservationAgendaCard<T extends ReservationAgendaItem> = {
  reservation: T;
  startColumn: number;
  span: number;
  startSlot: number;
  endSlot: number;
  lane: number;
  tone: ReservationAgendaTone;
  hasPendingAmount: boolean;
  hasNotes: boolean;
  hasCheckinInvitation: boolean;
  hasCheckinCompleted: boolean;
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

function isActiveStay(status: string | null | undefined) {
  return ["checked_in", "in_progress"].includes(normalizedStatus(status));
}

function overlaps(left: Pick<ReservationAgendaCard<ReservationAgendaItem>, "startSlot" | "endSlot">, right: Pick<ReservationAgendaCard<ReservationAgendaItem>, "startSlot" | "endSlot">) {
  return left.startSlot < right.endSlot && right.startSlot < left.endSlot;
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
  const number = reservation.roomNumber?.trim();
  if (!number) return "Sin habitación asignada";
  return `Habitación ${number.replace(/^habitaci[oó]n\s*/i, "")}`;
}

function physicalRoomKey(reservation: ReservationAgendaItem) {
  const number = reservation.roomNumber?.trim();
  if (!number) return "unassigned";
  return normalize(number.replace(/^habitaci[oó]n\s*/i, "")) || "unassigned";
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
  const continuesFromEarlierDate = reservation.checkInDate < dates[0];
  const checkedOut = ["checked_out", "completed"].includes(normalizedStatus(reservation.reservationStatus));
  const startSlot = hasSeparateCheckout
    ? (continuesFromEarlierDate ? 0 : startColumn + 0.2)
    : (checkedOut ? startColumn : startColumn + 0.2);
  const endSlot = hasSeparateCheckout
    ? (checkoutIndex >= 0 ? checkoutIndex + 0.2 : dates.length)
    : Math.min(dates.length, checkedOut ? startColumn + 0.2 : startColumn + 1);
  if (endSlot <= startSlot) return null;
  return { startColumn, span: Math.max(1, exclusiveEnd - startColumn), startSlot, endSlot };
}

export function buildReservationAgenda<T extends ReservationAgendaItem>(
  reservations: T[],
  dates: string[],
  roomLayout: readonly ReservationAgendaRoomLayout[] = []
): Array<ReservationAgendaGroup<T>> {
  const groups = new Map<string, {
    label: string;
    order: number;
    rooms: Map<string, ReservationAgendaRoom<T>>;
    count: number;
  }>();
  const layoutByRoom = new Map(
    roomLayout.map(room => [normalizeAgendaRoomNumber(room.roomNumber), room])
  );
  const visibleReservations = reservations.flatMap(reservation => {
    if (reservationReleasesAssignedRoom(reservation.reservationStatus)) return [];
    const span = visibleSpan(reservation, dates);
    return span ? [{ reservation, span }] : [];
  });
  const typeCandidatesByRoom = new Map<string, Map<string, { label: string; count: number }>>();

  for (const { reservation } of visibleReservations) {
    const roomKey = physicalRoomKey(reservation);
    if (roomKey === "unassigned") continue;
    const label = reservation.roomType?.trim() || "Tipo de habitación pendiente";
    const key = normalize(label) || "pending-room-type";
    const candidates = typeCandidatesByRoom.get(roomKey) || new Map();
    const candidate = candidates.get(key) || { label, count: 0 };
    candidate.count += 1;
    candidates.set(key, candidate);
    typeCandidatesByRoom.set(roomKey, candidates);
  }

  const canonicalTypeByRoom = new Map<string, { key: string; label: string }>();
  typeCandidatesByRoom.forEach((candidates, roomKey) => {
    const sortedCandidates: Array<[string, { label: string; count: number }]> = Array.from(candidates.entries());
    const [key, candidate] = sortedCandidates.sort(([, left], [, right]) =>
      right.count - left.count || roomTypeRank(left.label) - roomTypeRank(right.label) || left.label.localeCompare(right.label, "es")
    )[0]!;
    canonicalTypeByRoom.set(roomKey, { key, label: candidate.label });
  });
  roomLayout.forEach(room => {
    const roomKey = normalizeAgendaRoomNumber(room.roomNumber);
    if (!roomKey) return;
    canonicalTypeByRoom.set(roomKey, {
      key: `configured-${room.groupOrder}-${normalize(room.roomType)}`,
      label: room.roomType,
    });
  });

  for (const { reservation, span } of visibleReservations) {
    const roomKey = physicalRoomKey(reservation);
    const ownGroupLabel = reservation.roomType?.trim() || "Tipo de habitación pendiente";
    const canonicalType = canonicalTypeByRoom.get(roomKey);
    const groupLabel = canonicalType?.label || ownGroupLabel;
    const groupKey = canonicalType?.key || normalize(ownGroupLabel) || "pending-room-type";
    const configuredRoom = layoutByRoom.get(roomKey);
    const group = groups.get(groupKey) || {
      label: groupLabel,
      order: configuredRoom?.groupOrder ?? 1_000 + roomTypeRank(groupLabel),
      rooms: new Map(),
      count: 0,
    };
    const room = group.rooms.get(roomKey) || { key: roomKey, label: roomLabel(reservation), cards: [], laneCount: 1 };
    const hasPendingAmount = reservationHasPendingAmount(reservation.amountPending);
    room.cards.push({
      reservation,
      ...span,
      lane: 0,
      tone: reservationAgendaTone(reservation.reservationStatus, hasPendingAmount),
      hasPendingAmount,
      hasNotes: reservationHasNotes(reservation.reservationNotes),
      hasCheckinInvitation: Boolean(reservation.checkinInvitationSent) && !Boolean(reservation.checkinCompleted),
      hasCheckinCompleted: Boolean(reservation.checkinCompleted),
    });
    group.rooms.set(roomKey, room);
    group.count += 1;
    groups.set(groupKey, group);
  }

  // El catálogo configurado define también las filas vacías: la agenda no
  // altera su orden cuando una habitación no tenga reservas en la quincena.
  roomLayout.forEach(configuredRoom => {
    const roomKey = normalizeAgendaRoomNumber(configuredRoom.roomNumber);
    if (!roomKey) return;
    const groupKey = `configured-${configuredRoom.groupOrder}-${normalize(configuredRoom.roomType)}`;
    const group = groups.get(groupKey) || {
      label: configuredRoom.roomType,
      order: configuredRoom.groupOrder,
      rooms: new Map(),
      count: 0,
    };
    if (!group.rooms.has(roomKey)) {
      group.rooms.set(roomKey, {
        key: roomKey,
        label: `Habitación ${configuredRoom.roomNumber}`,
        cards: [],
        laneCount: 1,
      });
    }
    groups.set(groupKey, group);
  });

  return Array.from(groups.entries())
    .sort(([, left], [, right]) => left.order - right.order || roomTypeRank(left.label) - roomTypeRank(right.label) || left.label.localeCompare(right.label, "es"))
    .map(([key, group]) => ({
      key,
      label: group.label,
      reservationsCount: group.count,
      rooms: Array.from(group.rooms.values())
        .sort((left, right) => {
          const leftOrder = layoutByRoom.get(left.key)?.roomOrder;
          const rightOrder = layoutByRoom.get(right.key)?.roomOrder;
          if (leftOrder !== undefined || rightOrder !== undefined)
            return (leftOrder ?? Number.MAX_SAFE_INTEGER) - (rightOrder ?? Number.MAX_SAFE_INTEGER);
          return left.label.localeCompare(right.label, "es", { numeric: true });
        })
        .map(room => {
          const laneEnds: number[] = [];
          const sortedCards = [...room.cards]
            .sort((left, right) => left.startSlot - right.startSlot || left.reservation.guestName?.localeCompare(right.reservation.guestName || "", "es") || 0)
          // Una habitación que ya está en check-in no puede tener otra reserva
          // confirmada ocupando simultáneamente el mismo espacio. Cloudbeds puede
          // devolver ambas asignaciones durante una reasignación pendiente; se
          // conserva la estancia activa y se evita una segunda barra engañosa.
          const visibleCards = sortedCards.filter(card => !sortedCards.some(other =>
            other !== card &&
            isActiveStay(other.reservation.reservationStatus) &&
            !isActiveStay(card.reservation.reservationStatus) &&
            overlaps(card, other)
          ));
          const cards = visibleCards
            .map(card => {
              let lane = laneEnds.findIndex(endSlot => endSlot <= card.startSlot);
              if (lane < 0) {
                lane = laneEnds.length;
                laneEnds.push(card.endSlot);
              } else {
                laneEnds[lane] = card.endSlot;
              }
              return { ...card, lane };
            });
          return { ...room, cards, laneCount: Math.max(1, laneEnds.length) };
        }),
    }));
}

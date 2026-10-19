import { findAccessCodeForRoom } from "./accessCodes";

export type GuestRoomRecord = {
  roomNumber?: string | null;
  roomCode?: string | null;
  roomType?: string | null;
};

export type ConfiguredRoom = {
  roomNumber: string;
  roomCode: string;
  roomType?: string | null;
};

export function hasPhysicalRoomNumber(roomNumber: string | null | undefined) {
  return /\d/.test(roomNumber || "");
}

/**
 * Las invitaciones antiguas pueden llegar con «Habitación» como número, pero
 * sí contienen el código de la llave. El código configurado es entonces una
 * fuente fiable para recuperar la habitación que debe persistirse en la ficha.
 */
export function resolveGuestRoomAssignment<T extends ConfiguredRoom>(
  record: GuestRoomRecord,
  rooms: readonly T[]
) {
  const byNumber = findAccessCodeForRoom(rooms, record.roomNumber);
  const byCode = record.roomCode?.trim()
    ? rooms.find(room => room.roomCode.trim() === record.roomCode?.trim())
    : undefined;
  const configuredRoom = byNumber || byCode;
  const useOriginalRoomNumber = hasPhysicalRoomNumber(record.roomNumber);

  return {
    roomNumber: useOriginalRoomNumber
      ? record.roomNumber!.trim()
      : configuredRoom?.roomNumber || null,
    roomType: configuredRoom?.roomType || record.roomType || null,
    configuredRoom,
  };
}

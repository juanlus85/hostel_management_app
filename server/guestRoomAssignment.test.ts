import { describe, expect, it } from "vitest";
import { resolveGuestRoomAssignment } from "../shared/guestRoomAssignment";

describe("asignación de habitación para fichas de huéspedes", () => {
  const rooms = [
    { roomNumber: "15", roomCode: "1215", roomType: "Habitación doble con 2 camas y baño compartido" },
    { roomNumber: "18", roomCode: "2262", roomType: "Habitación doble con baño privado" },
  ];

  it("recupera la habitación configurada cuando el enlace guardó el texto genérico", () => {
    expect(
      resolveGuestRoomAssignment(
        { roomNumber: "Habitación", roomCode: "1215", roomType: "Twin Room" },
        rooms
      )
    ).toMatchObject({
      roomNumber: "15",
      roomType: "Habitación doble con 2 camas y baño compartido",
    });
  });

  it("mantiene el número físico recibido cuando ya era válido", () => {
    expect(
      resolveGuestRoomAssignment(
        { roomNumber: "42-2", roomCode: "1215", roomType: "Cama" },
        rooms
      )
    ).toMatchObject({ roomNumber: "42-2" });
  });
});

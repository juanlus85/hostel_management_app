import { describe, expect, it } from "vitest";
import { sortAvailabilityRoomTypes } from "../client/src/lib/availabilityRoomOrder";

describe("sortAvailabilityRoomTypes", () => {
  it("aplica el orden operativo configurado a los tipos de habitación", () => {
    const rooms = sortAvailabilityRoomTypes([
      { roomTypeName: "Cama en habitación compartida de 3 camas" },
      { roomTypeName: "Habitación triple baño privado" },
      { roomTypeName: "Habitación cama doble baño compartido" },
      { roomTypeName: "Habitación 2 camas baño compartido" },
      { roomTypeName: "Habitación cama doble baño privado" },
      { roomTypeName: "Habitación 2 camas baño privado" },
    ]);

    expect(rooms.map(room => room.roomTypeName)).toEqual([
      "Habitación 2 camas baño privado",
      "Habitación cama doble baño privado",
      "Habitación 2 camas baño compartido",
      "Habitación cama doble baño compartido",
      "Habitación triple baño privado",
      "Cama en habitación compartida de 3 camas",
    ]);
  });
});

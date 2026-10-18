import { describe, expect, it } from "vitest";
import { availabilityRoomTypeKey, buildAgendaAvailabilityByType, findAgendaAvailabilityDay } from "../client/src/lib/availabilityAgenda";

describe("tarifas en separadores de agenda", () => {
  it("vincula tipos con diferencias de mayúsculas y acentos", () => {
    const byType = buildAgendaAvailabilityByType([
      {
        roomTypeName: "Habitación Doble con baño compartido",
        days: [{ date: "2026-10-13", roomsAvailable: 2, roomRate: 56, totalRate: 56, rateId: "rate-1" }],
      },
    ]);

    const roomType = byType.get(availabilityRoomTypeKey("Double Room with Shared Bathroom"));
    expect(roomType?.roomTypeName).toBe("Habitación Doble con baño compartido");
    expect(findAgendaAvailabilityDay(roomType, "2026-10-13")).toMatchObject({ roomsAvailable: 2, rateId: "rate-1" });
  });

  it("prioriza la versión del tipo que contiene más días", () => {
    const byType = buildAgendaAvailabilityByType([
      { roomTypeName: "Twin", days: [{ date: "2026-10-13", roomsAvailable: 1, roomRate: 50, totalRate: 50, rateId: "one" }] },
      { roomTypeName: "twin", days: [
        { date: "2026-10-13", roomsAvailable: 1, roomRate: 50, totalRate: 50, rateId: "one" },
        { date: "2026-10-14", roomsAvailable: 2, roomRate: 60, totalRate: 60, rateId: "two" },
      ] },
    ]);

    expect(findAgendaAvailabilityDay(byType.get(availabilityRoomTypeKey("twin")), "2026-10-14")?.rateId).toBe("two");
  });

  it("vincula precios cuando Cloudbeds cambia el literal de baño o dormitorio", () => {
    expect(availabilityRoomTypeKey("Twin Room with Private Bath")).toBe(
      availabilityRoomTypeKey("Habitación doble con 2 camas y baño privado")
    );
    expect(availabilityRoomTypeKey("Double ensuite room")).toBe(
      availabilityRoomTypeKey("Habitación doble con cama de matrimonio y baño privado")
    );
    expect(availabilityRoomTypeKey("Bed in 3-bed mixed dormitory")).toBe(
      availabilityRoomTypeKey("Cama en habitación compartida de 3 camas")
    );
    expect(availabilityRoomTypeKey("Bed in 3-Bed Mixed Room")).toBe(
      availabilityRoomTypeKey("Bed in 3-bed mixed dormitory")
    );

    const byType = buildAgendaAvailabilityByType([
      {
        roomTypeName: "Twin Room with Private Bath",
        days: [{ date: "2026-10-13", roomsAvailable: 1, roomRate: 115, totalRate: 115, rateId: "private-twin" }],
      },
    ]);
    expect(findAgendaAvailabilityDay(
      byType.get(availabilityRoomTypeKey("Twin Room with Private Bathroom")),
      "2026-10-13"
    )).toMatchObject({ roomRate: 115, rateId: "private-twin" });
  });
});

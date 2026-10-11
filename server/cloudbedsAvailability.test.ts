import { describe, expect, it } from "vitest";
import { normalizeCloudbedsAvailability } from "./cloudbedsAvailability";

describe("normalizeCloudbedsAvailability", () => {
  it("normaliza precios y habitaciones disponibles por tipo y día", () => {
    const result = normalizeCloudbedsAvailability({
      data: [
        {
          roomTypeID: "double",
          roomTypeName: "Habitación Doble",
          detailedRates: [
            { date: "2026-10-12", roomsAvailable: "3", roomRate: "89.50" },
            { date: "2026-10-13", roomsAvailable: "2", roomRate: "99" },
          ],
        },
      ],
    }, "2026-10-12", "2026-10-18");

    expect(result.roomTypes).toEqual([
      expect.objectContaining({
        roomTypeId: "double",
        roomTypeName: "Habitación Doble",
        days: [
          expect.objectContaining({ date: "2026-10-12", roomsAvailable: 3, roomRate: 89.5 }),
          expect.objectContaining({ date: "2026-10-13", roomsAvailable: 2, roomRate: 99 }),
        ],
      }),
    ]);
  });

  it("prioriza la tarifa base sobre planes derivados del mismo tipo", () => {
    const result = normalizeCloudbedsAvailability({
      data: {
        suite: {
          roomTypeID: "suite",
          roomTypeName: "Suite",
          ratePlans: [
            {
              ratePlanID: "derived",
              ratePlanName: "Oferta anticipada",
              detailedRates: [{ date: "2026-10-12", roomsAvailable: 1, roomRate: 120 }],
            },
            {
              ratePlanID: "base",
              ratePlanName: "BAR",
              isBaseRate: true,
              detailedRates: [{ date: "2026-10-12", roomsAvailable: 1, roomRate: 150 }],
            },
          ],
        },
      }}, "2026-10-12", "2026-10-18");

    expect(result.roomTypes[0]).toMatchObject({
      roomTypeName: "Suite",
      ratePlanName: "BAR",
      days: [expect.objectContaining({ roomRate: 150, roomsAvailable: 1 })],
    });
  });

  it("descarta días fuera del período solicitado", () => {
    const result = normalizeCloudbedsAvailability({
      data: [{
        roomTypeID: "dorm",
        roomTypeName: "Dormitorio",
        detailedRates: [
          { date: "2026-10-11", roomsAvailable: 5, roomRate: 20 },
          { date: "2026-10-12", roomsAvailable: 4, roomRate: 22 },
        ],
      }],
    }, "2026-10-12", "2026-10-18");

    expect(result.roomTypes[0]?.days).toHaveLength(1);
    expect(result.roomTypes[0]?.days[0]?.date).toBe("2026-10-12");
  });
});

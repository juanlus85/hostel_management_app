import { describe, expect, it } from "vitest";
import { addCalendarDays, mergeAgendaAvailability } from "../client/src/lib/agendaAvailabilityMerge";

const day = (date: string, price: number) => ({
  date,
  roomsAvailable: 2,
  roomRate: price,
  totalRate: price,
  rateId: "bar",
  restrictions: { closedToArrival: null, closedToDeparture: null, minimumStay: null, maximumStay: null },
});

describe("agendaAvailabilityMerge", () => {
  it("continúa el segundo tramo exactamente tras los primeros siete días", () => {
    expect(addCalendarDays("2026-10-13", 7)).toBe("2026-10-20");
  });

  it("combina tarifas iniciales y posteriores sin perder tipos de habitación", () => {
    const first = {
      startDate: "2026-10-13",
      endDate: "2026-10-19",
      roomTypes: [{ roomTypeId: "double", roomTypeName: "Doble", ratePlanName: "BAR", days: [day("2026-10-13", 80)] }],
    };
    const second = {
      startDate: "2026-10-20",
      endDate: "2026-10-26",
      roomTypes: [{ roomTypeId: "double", roomTypeName: "Doble", ratePlanName: "BAR", days: [day("2026-10-20", 90)] }],
    };

    expect(mergeAgendaAvailability(first, second)).toMatchObject({
      startDate: "2026-10-13",
      endDate: "2026-10-26",
      roomTypes: [expect.objectContaining({ days: [expect.objectContaining({ date: "2026-10-13" }), expect.objectContaining({ date: "2026-10-20" })] })],
    });
  });
});

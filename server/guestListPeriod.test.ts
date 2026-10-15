import { describe, expect, it } from "vitest";
import { getGuestListPeriodRange } from "../shared/guestListPeriod";

describe("filtro temporal de huéspedes", () => {
  const now = new Date(2026, 9, 15, 12, 0, 0);

  it("muestra por defecto los Check-ins completados de los últimos siete días", () => {
    expect(getGuestListPeriodRange("week", now)).toEqual({
      startDate: "2026-10-09",
      endDate: "2026-10-15",
      status: "completed",
    });
  });

  it("ofrece un mes completado o todos los registros", () => {
    expect(getGuestListPeriodRange("month", now)).toEqual({
      startDate: "2026-09-16",
      endDate: "2026-10-15",
      status: "completed",
    });
    expect(getGuestListPeriodRange("all", now)).toEqual({});
  });
});

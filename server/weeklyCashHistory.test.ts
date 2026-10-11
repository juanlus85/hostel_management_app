import { describe, expect, it } from "vitest";
import { buildWeeklyCashHistory, getRollingWeeklyCashRange } from "../shared/weeklyCashHistory";

describe("weekly cash history", () => {
  const referenceDate = new Date(2026, 9, 8, 12, 0, 0); // jueves 8 de octubre de 2026

  it("agrupa solo los cierres cerrados por semanas de lunes a domingo", () => {
    const history = buildWeeklyCashHistory(
      [
        { date: "2026-10-05", zReading: "100.25", status: "closed" },
        { date: "2026-10-11", zReading: "49.75", status: "closed" },
        { date: "2026-10-08", zReading: "999.99", status: "draft" },
        { date: "2026-09-27", zReading: "20.00", status: "closed" },
      ],
      2,
      referenceDate
    );

    expect(history).toHaveLength(2);
    expect(history[0]).toMatchObject({ weekStart: "2026-09-28", weekEnd: "2026-10-04", total: 0, isCurrent: false });
    expect(history[1]).toMatchObject({ weekStart: "2026-10-05", weekEnd: "2026-10-11", total: 150, isCurrent: true });
  });

  it("incluye la semana actual al calcular el rango de consulta", () => {
    expect(getRollingWeeklyCashRange(4, referenceDate)).toEqual({
      startDate: "2026-09-14",
      endDate: "2026-10-11",
    });
  });
});

import { describe, expect, it } from "vitest";
import { scheduledShiftHours, totalReportHours } from "../shared/hoursReport";

describe("informes de horas", () => {
  it("calcula turnos ordinarios y nocturnos", () => {
    expect(scheduledShiftHours("10:00", "18:30")).toBe(8.5);
    expect(scheduledShiftHours("22:00", "02:00")).toBe(4);
  });
  it("no suma turnos cancelados", () => {
    expect(totalReportHours([{ userId: 1, scheduledDate: "2026-08-01", scheduledStart: "10:00", scheduledEnd: "18:00", status: "completed" }, { userId: 1, scheduledDate: "2026-08-02", scheduledStart: "10:00", scheduledEnd: "18:00", status: "cancelled" }])).toBe(8);
  });
});

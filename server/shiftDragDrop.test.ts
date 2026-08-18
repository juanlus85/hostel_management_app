import { describe, expect, it } from "vitest";
import { canRescheduleShift } from "../shared/shiftDragDrop";

describe("reprogramación por arrastre de turnos", () => {
  it("solo permite mover turnos programados a una fecha distinta", () => {
    expect(canRescheduleShift("scheduled", "2026-08-18", "2026-08-19")).toBe(true);
    expect(canRescheduleShift("scheduled", "2026-08-18", "2026-08-18")).toBe(false);
    expect(canRescheduleShift("in_progress", "2026-08-18", "2026-08-19")).toBe(false);
  });
});

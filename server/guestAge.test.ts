import { describe, expect, it } from "vitest";
import { calculateAge, isMinor } from "../shared/guestAge";

describe("edad de huésped", () => {
  const reference = new Date(2026, 9, 11);

  it("calcula la edad sin redondear antes del cumpleaños", () => {
    expect(calculateAge("2008-10-12", reference)).toBe(17);
    expect(calculateAge("2008-10-11", reference)).toBe(18);
  });

  it("reconoce menores y descarta fechas inválidas", () => {
    expect(isMinor("2010-04-20", reference)).toBe(true);
    expect(isMinor("2000-04-20", reference)).toBe(false);
    expect(calculateAge("2026-13-01", reference)).toBeNull();
  });
});

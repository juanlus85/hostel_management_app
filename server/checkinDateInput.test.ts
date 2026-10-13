import { describe, expect, it } from "vitest";
import { normalizeDateOnly, parseCheckinDate, toDatabaseDate, toDateTimeLocal } from "../shared/checkinDateInput";

describe("fechas de Check-in Anticipado", () => {
  it("adapta fechas válidas al campo datetime-local", () => {
    expect(toDateTimeLocal("2026-08-20")).toBe("2026-08-20T11:00");
    expect(toDateTimeLocal("2026-08-20 16:00")).toBe("2026-08-20T16:00");
  });
  it("evita valores inválidos en el formulario y la base de datos", () => {
    expect(toDateTimeLocal("0000-00-00")).toBe("");
    expect(toDatabaseDate("invalid")).toBeUndefined();
  });
  it("no construye un objeto Date inválido para registros heredados", () => {
    expect(parseCheckinDate("0000-00-00")).toBeNull();
    expect(parseCheckinDate("2026-08-20 16:00")?.getFullYear()).toBe(2026);
  });
  it("normaliza el formato visual DD/MM/AAAA de Safari antes de enviarlo", () => {
    expect(normalizeDateOnly("11/11/1111")).toBe("1111-11-11");
    expect(toDatabaseDate("27/08/2026")).toBe("2026-08-27");
    expect(normalizeDateOnly("31/02/2026")).toBeUndefined();
  });
});

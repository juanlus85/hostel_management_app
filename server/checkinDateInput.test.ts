import { describe, expect, it } from "vitest";
import { toDatabaseDate, toDateTimeLocal } from "../shared/checkinDateInput";

describe("fechas de Check-in Anticipado", () => {
  it("adapta fechas válidas al campo datetime-local", () => {
    expect(toDateTimeLocal("2026-08-20")).toBe("2026-08-20T11:00");
    expect(toDateTimeLocal("2026-08-20 16:00")).toBe("2026-08-20T16:00");
  });
  it("evita valores inválidos en el formulario y la base de datos", () => {
    expect(toDateTimeLocal("0000-00-00")).toBe("");
    expect(toDatabaseDate("invalid")).toBeUndefined();
  });
});

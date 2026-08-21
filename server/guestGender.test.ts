import { describe, expect, it } from "vitest";
import { normalizeGuestGender } from "../shared/guestGender";

describe("normalización de sexo de huésped", () => {
  it("convierte los valores de interfaz al contrato del servidor", () => {
    expect(normalizeGuestGender("male")).toBe("Hombre");
    expect(normalizeGuestGender("female")).toBe("Mujer");
    expect(normalizeGuestGender("other")).toBe("Otro");
  });

  it("usa un valor permitido cuando el registro llega vacío", () => {
    expect(normalizeGuestGender("")).toBe("Hombre");
    expect(normalizeGuestGender(undefined)).toBe("Hombre");
  });
});

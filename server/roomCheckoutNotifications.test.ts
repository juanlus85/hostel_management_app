import { describe, expect, it } from "vitest";
import { checkoutNotificationContent, shouldCreateCheckoutNotification } from "../shared/roomCheckoutNotifications";

describe("notificaciones de checkout", () => {
  it("notifica cuando una habitación pasa a checkout", () => {
    expect(shouldCreateCheckoutNotification(undefined, "checkout")).toBe(true);
    expect(shouldCreateCheckoutNotification("empty", "checkout")).toBe(true);
  });

  it("evita avisos duplicados y no avisa en otros estados", () => {
    expect(shouldCreateCheckoutNotification("checkout", "checkout")).toBe(false);
    expect(shouldCreateCheckoutNotification("checkout", "ready")).toBe(false);
  });

  it("incluye habitación y fecha en el aviso", () => {
    expect(checkoutNotificationContent("15", "2026-08-18")).toEqual({
      type: "room_checkout",
      title: "Checkout: habitación 15",
      message: "La habitación 15 tiene un checkout registrado para el 2026-08-18. Está pendiente de preparar.",
    });
  });
});

import { describe, expect, it } from "vitest";
import {
  buildConfiguredReservationWelcome,
  buildOnlineCheckinInvitation,
  buildReservationWelcomeEmail,
  buildReservationWhatsAppMessage,
} from "./reservationMessaging";

const context = {
  guestName: "Ana <García>",
  checkInDate: "2026-08-30",
  checkOutDate: "2026-09-02",
  roomNumber: "15",
  roomType: "Twin",
  reservationCode: "CB-15",
};

describe("mensajería manual de reservas", () => {
  it("genera una bienvenida sin códigos de acceso", () => {
    const message = buildReservationWelcomeEmail(context, "es");
    expect(message.subject).toContain("Bienvenido");
    expect(message.html).toContain("Ana &lt;García&gt;");
    expect(message.text).not.toMatch(/código de acceso/i);
  });

  it("incluye el enlace seguro y las instrucciones en la invitación de check-in", () => {
    const message = buildOnlineCheckinInvitation(
      context,
      "https://management.example/checkin-online/token",
      "en"
    );
    expect(message.subject).toContain("online check-in");
    expect(message.html).toContain(
      "https://management.example/checkin-online/token"
    );
    expect(message.text).toContain("prefilled");
  });

  it("prepara un texto de WhatsApp sin enviarlo", () => {
    const message = buildReservationWhatsAppMessage(
      context,
      "online_checkin",
      "https://management.example/checkin-online/token",
      "es"
    );
    expect(message).toContain(
      "https://management.example/checkin-online/token"
    );
    expect(message).toContain("Check-in Online");
  });

  it("aplica las etiquetas de una plantilla de bienvenida configurable sin exponer códigos", () => {
    const message = buildConfiguredReservationWelcome(
      "Hola {{NOMBRE_HUESPED}}, te esperamos el {{FECHA_LLEGADA}} en {{NOMBRE_HOSTEL}}. Código: {{CODIGO_ENTRADA}}",
      context,
      "es",
      { name: "The Spot" }
    );
    expect(message.text).toContain(
      "Hola Ana <García>, te esperamos el 2026-08-30 en The Spot."
    );
    expect(message.text).not.toContain("{{CODIGO_ENTRADA}}");
    expect(message.text).not.toMatch(/\*\d{4}\*/);
  });
});

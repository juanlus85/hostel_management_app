import { describe, expect, it } from "vitest";
import {
  buildConfiguredReservationWelcome,
  buildConfiguredOnlineCheckinEmail,
  buildConfiguredReservationWhatsApp,
  buildOnlineCheckinInvitation,
  buildReservationWelcomeEmail,
  buildReservationWhatsAppMessage,
  configuredReservationTemplate,
} from "./reservationMessaging";

const context = {
  guestName: "Ana <García>",
  checkInDate: "2026-08-30",
  checkOutDate: "2026-09-02",
  roomNumber: "15",
  roomType: "Twin",
  reservationCode: "CB-15",
  entranceCode: "1469",
  roomCode: "2226",
};

describe("mensajería manual de reservas", () => {
  it("reutiliza la plantilla del otro canal cuando la específica está vacía", () => {
    const templates = {
      reservationWelcomeWhatsappEs: "Bienvenida unificada {{NOMBRE_HUESPED}}",
      reservationCheckinEmailEn: "Unified online check-in {{ENLACE_CHECKIN}}",
    };
    expect(
      configuredReservationTemplate(templates, "welcome", "email", "es")
    ).toBe("Bienvenida unificada {{NOMBRE_HUESPED}}");
    expect(
      configuredReservationTemplate(templates, "online_checkin", "whatsapp", "en")
    ).toBe("Unified online check-in {{ENLACE_CHECKIN}}");
  });

  it("genera una bienvenida completa con códigos de acceso", () => {
    const message = buildReservationWelcomeEmail(context, "es");
    expect(message.subject).toContain("Bienvenido");
    expect(message.html).toContain("Ana &lt;García&gt;");
    expect(message.text).toContain("código de acceso al hostel es: *1469*");
    expect(message.text).toContain("código para abrirla es: *2226*");
    expect(message.text).toContain("La clave del Wi-Fi es *holasevilla*");
  });

  it("pide documentos antes de revelar habitación y códigos en el Check-in con acceso", () => {
    const message = buildOnlineCheckinInvitation(
      { ...context, roomType: "Double Room with Shared Bathroom" },
      "https://management.example/checkin-online/token",
      "en"
    );
    expect(message.subject).toContain("online check-in");
    expect(message.html).toContain(
      "https://management.example/checkin-online/token"
    );
    expect(message.text).toContain("prefilled");
    expect(message.text).toContain("30 August 2026");
    expect(message.text).toContain("Before we provide your room details and access codes");
    expect(message.text).not.toContain("Double Room with Shared Bathroom");
    expect(message.text).not.toContain("Room 15");
    expect(message.text).not.toContain("1469");
    expect(message.html).toContain("The Spot Central Hostel");
  });

  it("mantiene la petición de agilidad y la validación física solo para el Pre-check-in", () => {
    const message = buildOnlineCheckinInvitation(
      { ...context, roomType: "Twin Room with Shared Bathroom" },
      "https://management.example/checkin-online/token",
      "es",
      "early"
    );
    expect(message.subject).toContain("Pre-check-in");
    expect(message.text).toContain("30 de agosto de 2026");
    expect(message.text).toContain("evitar esperas innecesarias en recepción");
    expect(message.text).toContain("documento físico original");
    expect(message.text).not.toContain("Habitación 15");
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

  it("aplica las etiquetas de códigos en una plantilla de bienvenida configurable", () => {
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
    expect(message.text).toContain("Código: 1469");
  });

  it("traduce el tipo y resuelve la planta en las plantillas de bienvenida", () => {
    const spanish = buildConfiguredReservationWelcome(
      "Tipo: {{TIPO_HABITACION}} · Planta: {{PLANTA}} · Wi-Fi: {{WIFI}}",
      {
        ...context,
        roomType: "Double Room with Shared Bathroom",
        floor: "P1",
        floorLevel: "First Floor",
      },
      "es",
      { name: "The Spot", wifiPassword: "holasevilla" }
    );
    expect(spanish.text).toContain(
      "Tipo: Habitación doble con cama de matrimonio y baño compartido"
    );
    expect(spanish.text).toContain("Planta: Primera planta (P1)");
    expect(spanish.text).toContain("Wi-Fi: holasevilla");

    const english = buildConfiguredReservationWhatsApp(
      "Type: {{TIPO_HABITACION}} · Floor: {{PLANTA}}",
      {
        ...context,
        roomType: "Habitación doble con 2 camas y baño privado",
        floor: "P1",
        floorLevel: "First Floor",
      },
      "welcome",
      null,
      "en",
      { name: "The Spot" }
    );
    expect(english).toContain("Type: Twin room with private bathroom");
    expect(english).toContain("Floor: First floor (P1)");
  });

  it("sustituye el enlace en una invitación de Check-in configurable", () => {
    const message = buildConfiguredOnlineCheckinEmail(
      "Hola {{NOMBRE_HUESPED}}, entra aquí: {{ENLACE_CHECKIN}}. Habitación: {{NUMERO_HABITACION}}. Código: {{CODIGO_ENTRADA}}",
      context,
      "https://management.example/checkin-online/token",
      "es",
      { name: "The Spot" }
    );
    expect(message.text).toContain("Hola Ana <García>");
    expect(message.text).toContain(
      "https://management.example/checkin-online/token"
    );
    expect(message.text).not.toContain("Habitación: 15");
    expect(message.text).not.toContain("Código: 1469");
  });

  it("mantiene el aviso de documento físico en una plantilla de Pre-check-in configurable", () => {
    const message = buildConfiguredOnlineCheckinEmail(
      "Hola {{NOMBRE_HUESPED}}, completa el Pre-check-in: {{ENLACE_CHECKIN}}",
      context,
      "https://management.example/checkin-online/token",
      "es",
      { name: "The Spot" },
      "early"
    );
    expect(message.subject).toContain("Pre-check-in");
    expect(message.text).toContain("Hola Ana <García>");
    expect(message.text).toContain("https://management.example/checkin-online/token");
    expect(message.text).toContain("documento físico original");
    expect(message.text).not.toContain("Habitación 15");
  });

  it("aplica una plantilla de WhatsApp antes de abrir la conversación", () => {
    const message = buildConfiguredReservationWhatsApp(
      "Hola {{NOMBRE_HUESPED}}, llegada: {{FECHA_LLEGADA}}.",
      context,
      "welcome",
      null,
      "es",
      { name: "The Spot" }
    );
    expect(message).toContain("Hola Ana <García>, llegada: 2026-08-30.");
    expect(message).toContain("Código de entrada al hostel: 1469");
  });

  it("adapta una plantilla de WhatsApp de Pre-check-in sin revelar códigos", () => {
    const message = buildConfiguredReservationWhatsApp(
      "Hello {{NOMBRE_HUESPED}}, complete here: {{ENLACE_CHECKIN}}",
      context,
      "early_checkin",
      "https://management.example/checkin-online/token",
      "en",
      { name: "The Spot" }
    );
    expect(message).toContain("Hello");
    expect(message).toContain("https://management.example/checkin-online/token");
    expect(message).toContain("original physical document");
    expect(message).not.toContain("1469");
    expect(message).not.toContain("2226");
  });

  it("incluye códigos en el WhatsApp de bienvenida sin crear Check-in Online", () => {
    const message = buildReservationWhatsAppMessage(context, "welcome", null, "es");
    expect(message).toContain("código de acceso al hostel es: *1469*");
    expect(message).toContain("código para abrirla es: *2226*");
    expect(message).not.toContain("Check-in Online");
  });

  it("traduce el tipo de habitación y no duplica el prefijo de habitación", () => {
    const message = buildReservationWelcomeEmail(
      {
        ...context,
        roomType: "Double Room with Shared Bathroom",
        roomNumber: "Habitación 8",
      },
      "es"
    );
    expect(message.text).toContain(
      "Habitación doble con cama de matrimonio y baño compartido, Habitación 8"
    );
    expect(message.text).not.toContain("habitación Habitación 8");
  });
});

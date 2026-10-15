export type ReservationMessageTemplateKind =
  | "welcome"
  | "online_checkin"
  | "early_checkin";
export type ReservationMessageTemplateLanguage = "es" | "en";

/**
 * Las mismas redacciones se usan en correo y WhatsApp. El enlace se sustituye
 * solamente en los mensajes de Check-in Online y Pre-check-in.
 */
export const RESERVATION_MESSAGE_TEMPLATES: Record<
  ReservationMessageTemplateKind,
  Record<ReservationMessageTemplateLanguage, string>
> = {
  welcome: {
    es: `Hola {{NOMBRE_HUESPED}},

Te escribimos desde {{NOMBRE_HOSTEL}}.

A la hora prevista de tu llegada la recepción estará cerrada, pero no te preocupes: puedes acceder al hostel y a tu habitación con estas instrucciones.

Tu reserva:
• {{TIPO_HABITACION}}
• {{HABITACION}} · {{PLANTA}}
• Entrada: {{FECHA_LLEGADA}} · Salida: {{FECHA_SALIDA}}

En la puerta principal encontrarás un teclado numérico. Tu código de acceso al hostel es: *{{CODIGO_ENTRADA}}*.

Junto a la puerta de {{HABITACION}} encontrarás una caja de llaves. El código para abrirla es: *{{CODIGO_HABITACION}}*.

La clave del Wi‑Fi es: *{{WIFI}}*.

Dirección: {{DIRECCION_HOSTEL}}

En la tercera planta encontrarás la zona común, con cocina, salón y terraza. Está abierta de 08:00 a 23:30.

No está permitido fumar dentro del hostel, salvo en la terraza de la tercera planta.

Si necesitas ayuda, puedes escribirnos o llamarnos al {{TELEFONO_HOSTEL}}.

Un saludo y buen viaje,
{{NOMBRE_HOSTEL}}`,
    en: `Hello {{NOMBRE_HUESPED}},

We are writing to you from {{NOMBRE_HOSTEL}}.

Our reception will be closed at your expected arrival time, but do not worry: you can access the hostel and your room using these instructions.

Your reservation:
• {{TIPO_HABITACION}}
• {{HABITACION}} · {{PLANTA}}
• Check-in: {{FECHA_LLEGADA}} · Check-out: {{FECHA_SALIDA}}

At the main entrance you will find an electronic keypad. Your hostel access code is: *{{CODIGO_ENTRADA}}*.

Next to the door of {{HABITACION}} you will find a key box. The code to open it is: *{{CODIGO_HABITACION}}*.

The Wi‑Fi password is: *{{WIFI}}*.

Address: {{DIRECCION_HOSTEL}}

On the third floor you will find our shared kitchen, lounge and rooftop terrace. It is open from 08:00 to 23:30.

Smoking is not permitted inside the hostel, except on the third-floor terrace.

If you need any help, please call or message us on {{TELEFONO_HOSTEL}}.

Kind regards,
{{NOMBRE_HOSTEL}}`,
  },
  online_checkin: {
    es: `Hola {{NOMBRE_HUESPED}},

Te escribimos desde {{NOMBRE_HOSTEL}}.

Para preparar tu llegada y facilitar el acceso si la recepción está cerrada, necesitamos que completes los datos de todos los huéspedes en el siguiente Check-in Online:

{{ENLACE_CHECKIN}}

Revisa los datos de la reserva, completa los documentos y la firma de todos los huéspedes.

Cuando el Check-in Online esté completado, recibirás la habitación asignada, los códigos de acceso y las instrucciones de llegada.

Un saludo,
{{NOMBRE_HOSTEL}}`,
    en: `Hello {{NOMBRE_HUESPED}},

We are writing to you from {{NOMBRE_HOSTEL}}.

To prepare your arrival and make access easier if reception is closed, please complete the details for every guest in the following Online Check-in:

{{ENLACE_CHECKIN}}

Please review the booking information, complete all identity document details and sign the form for every guest.

Once the Online Check-in has been completed, you will receive your assigned room, access codes and arrival instructions.

Kind regards,
{{NOMBRE_HOSTEL}}`,
  },
  early_checkin: {
    es: `Hola {{NOMBRE_HUESPED}},

Te escribimos desde {{NOMBRE_HOSTEL}}.

Para agilizar tu recepción el día {{FECHA_LLEGADA}}, te pedimos que completes previamente los datos de todos los huéspedes mediante este Pre-check-in:

{{ENLACE_CHECKIN}}

Este Pre-check-in nos permite preparar tu llegada, pero no incluye códigos de acceso ni número de habitación. Esa información se facilitará en recepción.

Importante: aunque los datos se rellenen previamente, cada huésped deberá presentar a la llegada su documento original físico. En recepción se comprobarán y validarán los datos facilitados. Sin presentar el documento original físico, la entrada será denegada conforme a la normativa aplicable.

Gracias por ayudarnos a agilizar tu llegada.

Un saludo,
{{NOMBRE_HOSTEL}}`,
    en: `Hello {{NOMBRE_HUESPED}},

We are writing to you from {{NOMBRE_HOSTEL}}.

To speed up your reception on {{FECHA_LLEGADA}}, please complete the details for every guest in advance using this Fast Check-in:

{{ENLACE_CHECKIN}}

This Fast Check-in allows us to prepare your arrival, but it does not include access codes or a room number. That information will be provided at reception.

Important: even if the information is completed in advance, every guest must present their original physical identity document upon arrival. Reception will check and validate the information provided. Without the original physical document, admission will be refused in accordance with applicable requirements.

Thank you for helping us make your arrival faster.

Kind regards,
{{NOMBRE_HOSTEL}}`,
  },
};

export function reservationMessageTemplate(
  kind: ReservationMessageTemplateKind,
  language: ReservationMessageTemplateLanguage
) {
  return RESERVATION_MESSAGE_TEMPLATES[kind][language];
}

/** Las frases cortas que mostraba la pantalla anterior eran ejemplos, no textos operativos completos. */
export function isLegacyReservationMessageTemplate(template: string | null | undefined) {
  const normalized = (template || "")
    .toLocaleLowerCase("es-ES")
    .replace(/\s+/g, " ")
    .trim();
  return [
    /^hola \{\{nombre_huesped\}\}, gracias por tu reserva en \{\{nombre_hostel\}\}/,
    /^hello \{\{nombre_huesped\}\}, thank you for your reservation at \{\{nombre_hostel\}\}/,
    /^hola \{\{nombre_huesped\}\}, completa tu check-in online aquí:/,
    /^hello \{\{nombre_huesped\}\}, complete your online check-in here:/,
    /^hola \{\{nombre_huesped\}\}, completa tu pre-check-in aquí:/,
    /^hello \{\{nombre_huesped\}\}, complete your fast check-in here:/,
  ].some(pattern => pattern.test(normalized));
}

export function canonicalReservationTemplateKey(
  kind: ReservationMessageTemplateKind,
  language: ReservationMessageTemplateLanguage
) {
  const locale = language === "en" ? "En" : "Es";
  const base =
    kind === "welcome"
      ? "reservationWelcomeEmail"
      : kind === "online_checkin"
        ? "reservationCheckinEmail"
        : "reservationEarlyCheckinEmail";
  return `${base}${locale}` as const;
}

import { renderArrivalTemplate } from "../shared/arrivalTemplate";

export type ReservationMessageLanguage = "es" | "en";
export type ReservationMessageType = "welcome" | "online_checkin";

export type ReservationMessageContext = {
  guestName: string | null;
  checkInDate: string;
  checkOutDate: string | null;
  roomNumber: string | null;
  roomType: string | null;
  reservationCode: string | null;
};

const escapeHtml = (value: string | null | undefined) =>
  String(value ?? "").replace(
    /[&<>'"]/g,
    character =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        character
      ] || character
  );
const displayName = (value: string | null) => value?.trim() || "huésped";
const formatDate = (
  date: string | null,
  language: ReservationMessageLanguage
) =>
  date
    ? new Date(`${date}T00:00:00`).toLocaleDateString(
        language === "en" ? "en-GB" : "es-ES",
        { day: "2-digit", month: "long", year: "numeric" }
      )
    : "—";

export function buildReservationWelcomeEmail(
  context: ReservationMessageContext,
  language: ReservationMessageLanguage
) {
  const name = escapeHtml(displayName(context.guestName));
  const room = context.roomNumber
    ? `${language === "en" ? "Room" : "Habitación"} ${escapeHtml(context.roomNumber)}`
    : language === "en"
      ? "your room"
      : "tu habitación";
  const arrival = formatDate(context.checkInDate, language);
  const departure = formatDate(context.checkOutDate, language);
  const subject =
    language === "en"
      ? "Welcome to The Spot Central Hostel"
      : "Bienvenido/a a The Spot Central Hostel";
  const text =
    language === "en"
      ? `Hello ${displayName(context.guestName)},\n\nThank you for your reservation at The Spot Central Hostel. We look forward to welcoming you on ${arrival}. Your departure is scheduled for ${departure}. ${context.roomNumber ? `Your assigned accommodation is ${room}${context.roomType ? ` (${context.roomType})` : ""}.` : "Your room information will be confirmed before arrival."}\n\nBest regards,\nThe Spot Central Hostel`
      : `Hola ${displayName(context.guestName)},\n\nGracias por tu reserva en The Spot Central Hostel. Te esperamos el ${arrival}. La salida está prevista para el ${departure}. ${context.roomNumber ? `Tu alojamiento asignado es ${room}${context.roomType ? ` (${context.roomType})` : ""}.` : "La información de tu habitación se confirmará antes de la llegada."}\n\nUn saludo,\nThe Spot Central Hostel`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#1f2937;line-height:1.6"><div style="background:#0f766e;color:#fff;padding:22px;border-radius:10px 10px 0 0"><h1 style="margin:0;font-size:22px">${escapeHtml(subject)}</h1></div><div style="background:#f8fafc;padding:26px;border-radius:0 0 10px 10px"><p>${language === "en" ? "Hello" : "Hola"} <strong>${name}</strong>,</p><p>${language === "en" ? "Thank you for your reservation at The Spot Central Hostel. We look forward to welcoming you." : "Gracias por tu reserva en The Spot Central Hostel. Estamos deseando recibirte."}</p><div style="background:#fff;border-left:4px solid #0f766e;padding:16px;border-radius:6px"><p style="margin:0 0 8px"><strong>${language === "en" ? "Arrival" : "Llegada"}:</strong> ${escapeHtml(arrival)}</p><p style="margin:0 0 8px"><strong>${language === "en" ? "Departure" : "Salida"}:</strong> ${escapeHtml(departure)}</p><p style="margin:0"><strong>${language === "en" ? "Accommodation" : "Alojamiento"}:</strong> ${escapeHtml(room)}${context.roomType ? ` · ${escapeHtml(context.roomType)}` : ""}</p></div><p>${language === "en" ? "You will receive the online check-in invitation separately when it is ready." : "Recibirás la invitación de Check-in Online por separado cuando esté preparada."}</p><p><strong>The Spot Central Hostel</strong></p></div></div>`;
  return { subject, text, html };
}

export function buildConfiguredReservationWelcome(
  template: string | null | undefined,
  context: ReservationMessageContext,
  language: ReservationMessageLanguage,
  hostel: {
    name?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
  }
) {
  if (!template?.trim()) return buildReservationWelcomeEmail(context, language);
  const text = renderArrivalTemplate(template, {
    guestName: context.guestName,
    roomNumber: context.roomNumber,
    roomType: context.roomType,
    hostelName: hostel.name || "The Spot Central Hostel",
    hostelAddress: hostel.address,
    hostelPhone: hostel.phone,
    hostelEmail: hostel.email,
    checkInDate: context.checkInDate,
    checkOutDate: context.checkOutDate,
    entranceCode: null,
    roomCode: null,
  }).trim();
  const subject =
    language === "en"
      ? "Welcome to The Spot Central Hostel"
      : "Bienvenido/a a The Spot Central Hostel";
  return {
    subject,
    text,
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#1f2937;line-height:1.6;white-space:pre-line">${escapeHtml(text)}</div>`,
  };
}

export function buildEditedReservationEmail(subject: string, text: string) {
  const cleanSubject = subject.trim();
  const cleanText = text.trim();
  return {
    subject: cleanSubject,
    text: cleanText,
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#1f2937;line-height:1.6;white-space:pre-line">${escapeHtml(cleanText)}</div>`,
  };
}

export function renderConfiguredReservationMessage(
  template: string | null | undefined,
  context: ReservationMessageContext,
  hostel: {
    name?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
  },
  checkinUrl: string | null = null
) {
  if (!template?.trim()) return null;
  return renderArrivalTemplate(template, {
    guestName: context.guestName,
    roomNumber: context.roomNumber,
    roomType: context.roomType,
    hostelName: hostel.name || "The Spot Central Hostel",
    hostelAddress: hostel.address,
    hostelPhone: hostel.phone,
    hostelEmail: hostel.email,
    checkInDate: context.checkInDate,
    checkOutDate: context.checkOutDate,
    entranceCode: null,
    roomCode: null,
  })
    .replace(/\{\{\s*ENLACE_CHECKIN\s*\}\}/gi, checkinUrl || "")
    .trim();
}

export function buildConfiguredOnlineCheckinEmail(
  template: string | null | undefined,
  context: ReservationMessageContext,
  checkinUrl: string,
  language: ReservationMessageLanguage,
  hostel: {
    name?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
  }
) {
  const text = renderConfiguredReservationMessage(
    template,
    context,
    hostel,
    checkinUrl
  );
  if (!text) return buildOnlineCheckinInvitation(context, checkinUrl, language);
  const subject =
    language === "en"
      ? "Complete your online check-in · The Spot Central Hostel"
      : "Completa tu Check-in Online · The Spot Central Hostel";
  return {
    subject,
    text,
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#1f2937;line-height:1.6;white-space:pre-line">${escapeHtml(text)}</div>`,
  };
}

export function buildConfiguredReservationWhatsApp(
  template: string | null | undefined,
  context: ReservationMessageContext,
  messageType: ReservationMessageType,
  checkinUrl: string | null,
  language: ReservationMessageLanguage,
  hostel: {
    name?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
  }
) {
  return (
    renderConfiguredReservationMessage(template, context, hostel, checkinUrl) ||
    buildReservationWhatsAppMessage(context, messageType, checkinUrl, language)
  );
}

export function buildOnlineCheckinInvitation(
  context: ReservationMessageContext,
  checkinUrl: string,
  language: ReservationMessageLanguage
) {
  const name = escapeHtml(displayName(context.guestName));
  const safeUrl = escapeHtml(checkinUrl);
  const subject =
    language === "en"
      ? "Complete your online check-in · The Spot Central Hostel"
      : "Completa tu Check-in Online · The Spot Central Hostel";
  const text =
    language === "en"
      ? `Hello ${displayName(context.guestName)},\n\nYou can complete your online check-in securely using this link:\n${checkinUrl}\n\nYour booking information has been prefilled where available. Please review it, complete the document details for all guests, and sign the form. You will receive your access instructions after completion.\n\nThe Spot Central Hostel`
      : `Hola ${displayName(context.guestName)},\n\nPuedes completar tu Check-in Online de forma segura en este enlace:\n${checkinUrl}\n\nHemos precargado los datos disponibles de tu reserva. Revísalos, completa los datos documentales de todos los huéspedes y firma el formulario. Recibirás las instrucciones de acceso después de completarlo.\n\nThe Spot Central Hostel`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#1f2937;line-height:1.6"><div style="background:#0f766e;color:#fff;padding:22px;border-radius:10px 10px 0 0"><h1 style="margin:0;font-size:22px">${escapeHtml(subject)}</h1></div><div style="background:#f8fafc;padding:26px;border-radius:0 0 10px 10px"><p>${language === "en" ? "Hello" : "Hola"} <strong>${name}</strong>,</p><p>${language === "en" ? "Please complete your secure online check-in before arrival." : "Completa tu Check-in Online seguro antes de la llegada."}</p><p style="text-align:center;margin:28px 0"><a href="${safeUrl}" style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;font-weight:bold;padding:13px 20px;border-radius:7px">${language === "en" ? "Open online check-in" : "Abrir Check-in Online"}</a></p><p style="font-size:13px;color:#475569;word-break:break-all">${safeUrl}</p><p>${language === "en" ? "Your available booking information has been prefilled. You may correct it, complete the document details for every guest, and sign the form. Access instructions are sent after the check-in is completed." : "Hemos precargado los datos disponibles de la reserva. Puedes corregirlos, completar los datos documentales de cada huésped y firmar el formulario. Las instrucciones de acceso se enviarán tras completarlo."}</p><p><strong>The Spot Central Hostel</strong></p></div></div>`;
  return { subject, text, html };
}

export function buildReservationWhatsAppMessage(
  context: ReservationMessageContext,
  messageType: "welcome" | "online_checkin",
  checkinUrl: string | null,
  language: ReservationMessageLanguage
) {
  const name = displayName(context.guestName);
  if (messageType === "online_checkin") {
    return language === "en"
      ? `Hello ${name}, you can complete your online check-in for The Spot Central Hostel here:\n\n${checkinUrl}\n\nYour booking details have been prefilled where available. Please complete the documents and signature for all guests. You will receive the access instructions once it is completed.`
      : `Hola ${name}, puedes completar tu Check-in Online de The Spot Central Hostel aquí:\n\n${checkinUrl}\n\nHemos precargado los datos disponibles de tu reserva. Completa los documentos y la firma de todos los huéspedes. Recibirás las instrucciones de acceso cuando esté terminado.`;
  }
  return language === "en"
    ? `Hello ${name}, thank you for your reservation at The Spot Central Hostel. We look forward to welcoming you on ${formatDate(context.checkInDate, language)}. We will send you the online check-in invitation separately when it is ready.`
    : `Hola ${name}, gracias por tu reserva en The Spot Central Hostel. Te esperamos el ${formatDate(context.checkInDate, language)}. Te enviaremos la invitación de Check-in Online por separado cuando esté preparada.`;
}

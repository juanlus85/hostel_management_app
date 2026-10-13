import { renderArrivalTemplate } from "../shared/arrivalTemplate";

export type ReservationMessageLanguage = "es" | "en";
export type ReservationMessageType = "welcome" | "online_checkin" | "early_checkin";

export type ReservationMessageContext = {
  guestName: string | null;
  checkInDate: string;
  checkOutDate: string | null;
  roomNumber: string | null;
  roomType: string | null;
  reservationCode: string | null;
  entranceCode?: string | null;
  roomCode?: string | null;
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
const roomTypeInMessage = (
  roomType: string | null,
  language: ReservationMessageLanguage
) => {
  if (!roomType) return language === "en" ? "your room" : "tu habitación";
  if (language === "en") return roomType;
  const normalized = roomType.toLocaleLowerCase("es-ES").trim();
  const translations: Record<string, string> = {
    "twin room with shared bathroom": "Habitación doble con 2 camas y baño compartido",
    "twin room with private bathroom": "Habitación doble con 2 camas y baño privado",
    "double room with shared bathroom": "Habitación doble con cama de matrimonio y baño compartido",
    "double room with private bathroom": "Habitación doble con cama de matrimonio y baño privado",
    "single room with shared bathroom": "Habitación individual con baño compartido",
    "single room with private bathroom": "Habitación individual con baño privado",
    "triple room with shared bathroom": "Habitación triple con baño compartido",
    "triple room with private bathroom": "Habitación triple con baño privado",
    "bed in 3-bed mixed dormitory": "Cama en habitación compartida mixta de 3 camas",
    "single bed in a 3-bed mixed dormitory": "Cama en habitación compartida mixta de 3 camas",
  };
  return translations[normalized] || roomType;
};
const roomLabel = (
  roomNumber: string | null,
  language: ReservationMessageLanguage
) => {
  const number = roomNumber?.trim();
  if (!number) return language === "en" ? "your room" : "tu habitación";
  if (/^(habitaci[oó]n|room)\b/i.test(number)) return number;
  return language === "en" ? `Room ${number}` : `Habitación ${number}`;
};
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

function appendAccessCodes(
  message: string,
  context: ReservationMessageContext,
  language: ReservationMessageLanguage
) {
  if (!context.entranceCode || !context.roomCode) return message;
  const hasEntranceCode = message.includes(context.entranceCode);
  const hasRoomCode = message.includes(context.roomCode);
  if (hasEntranceCode && hasRoomCode) return message;
  const codes =
    language === "en"
      ? `Hostel entrance code: ${context.entranceCode}\nRoom access code: ${context.roomCode}`
      : `Código de entrada al hostel: ${context.entranceCode}\nCódigo de acceso a la habitación: ${context.roomCode}`;
  return `${message.trim()}\n\n${codes}`;
}

export function buildReservationWelcomeEmail(
  context: ReservationMessageContext,
  language: ReservationMessageLanguage
) {
  const room = escapeHtml(roomLabel(context.roomNumber, language));
  const roomType = roomTypeInMessage(context.roomType, language);
  const accessInstructions =
    context.entranceCode && context.roomCode
      ? language === "en"
        ? `At the main entrance you will find an electronic keypad. Your hostel access code is: *${context.entranceCode}*.

Your booking is for ${roomType}${context.roomNumber ? `, ${roomLabel(context.roomNumber, language)}` : ""}. Next to the room door there is a key box. Your key-box code is: *${context.roomCode}*.`
        : `En la puerta principal encontrarás un panel electrónico con teclado numérico. Tu código de acceso al hostel es: *${context.entranceCode}*.

Has reservado ${roomType}${context.roomNumber ? `, ${roomLabel(context.roomNumber, language)}` : ""}. Junto a la puerta de la habitación encontrarás una caja de llaves. El código para abrirla es: *${context.roomCode}*.`
      : language === "en"
        ? `Your accommodation is ${room}${context.roomType ? ` (${roomType})` : ""}.`
        : `Tu alojamiento asignado es ${room}${context.roomType ? ` (${roomType})` : ""}.`;
  const subject =
    language === "en"
      ? "Welcome to The Spot Central Hostel"
      : "Bienvenido/a a The Spot Central Hostel";
  const text =
    language === "en"
      ? `Hello ${displayName(context.guestName)},

This is The Spot Central Hostel. Our reception will not be staffed in person at your arrival time, but do not worry: here are the access codes and instructions so you can enter straight away.

${accessInstructions}

The Wi-Fi password is *holasevilla*.

On the third floor you will find our shared kitchen, lounge and rooftop terrace. It is open from 8:00 to 23:30.

Smoking is not permitted anywhere in the hostel except on the third-floor terrace. This is very important: failure to comply may result in removal from the property and notification to the authorities.

If you need anything, contact us on +34 955 209 548.

Have a safe trip,
The Spot Central Hostel`
      : `Hola ${displayName(context.guestName)},

Te escribo desde The Spot Central Hostel. A la hora de tu llegada nuestra recepción no estará disponible de forma presencial, pero no te preocupes: aquí tienes los códigos e instrucciones para acceder inmediatamente.

${accessInstructions}

La clave del Wi-Fi es *holasevilla*.

En la tercera planta encontrarás nuestra zona común con cocina, salón y terraza. Está abierta de 8:00 a 23:30.

No está permitido fumar en el hostel, salvo en la terraza de la tercera planta. Es muy importante: el incumplimiento puede implicar la expulsión del establecimiento y la comunicación a las autoridades.

Si necesitas cualquier cosa, puedes contactar con nosotros en el +34 955 209 548.

Un saludo y buen viaje,
The Spot Central Hostel`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#1f2937;line-height:1.6;white-space:pre-line">${escapeHtml(text)}</div>`;
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
  const rendered = renderArrivalTemplate(template, {
    guestName: context.guestName,
    roomNumber: context.roomNumber,
    roomType: context.roomType,
    hostelName: hostel.name || "The Spot Central Hostel",
    hostelAddress: hostel.address,
    hostelPhone: hostel.phone,
    hostelEmail: hostel.email,
    checkInDate: context.checkInDate,
    checkOutDate: context.checkOutDate,
    entranceCode: context.entranceCode,
    roomCode: context.roomCode,
  }).trim();
  const text = appendAccessCodes(rendered, context, language);
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
    entranceCode: context.entranceCode,
    roomCode: context.roomCode,
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
  },
  mode: "access" | "early" = "access"
) {
  const text = renderConfiguredReservationMessage(
    template,
    context,
    hostel,
    checkinUrl
  );
  if (!text) return buildOnlineCheckinInvitation(context, checkinUrl, language, mode);
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
  const configured = renderConfiguredReservationMessage(
    template,
    context,
    hostel,
    checkinUrl
  );
  if (configured) {
    return messageType === "welcome"
      ? appendAccessCodes(configured, context, language)
      : configured;
  }
  return buildReservationWhatsAppMessage(
    context,
    messageType,
    checkinUrl,
    language
  );
}

export function buildOnlineCheckinInvitation(
  context: ReservationMessageContext,
  checkinUrl: string,
  language: ReservationMessageLanguage,
  mode: "access" | "early" = "access"
) {
  const name = escapeHtml(displayName(context.guestName));
  const safeUrl = escapeHtml(checkinUrl);
  const arrivalDate = formatDate(context.checkInDate, language);
  const roomType = roomTypeInMessage(context.roomType, language);
  const room = roomLabel(context.roomNumber, language);
  const bookingSummary =
    language === "en"
      ? `You have a reservation with us on <strong>${escapeHtml(arrivalDate)}</strong> for a <strong>${escapeHtml(roomType)}</strong>${context.roomNumber ? ` (${escapeHtml(room)})` : ""}.`
      : `Tienes una reserva con nosotros el <strong>${escapeHtml(arrivalDate)}</strong> para una <strong>${escapeHtml(roomType)}</strong>${context.roomNumber ? ` (${escapeHtml(room)})` : ""}.`;
  const isEarly = mode === "early";
  const subject =
    language === "en"
      ? isEarly
        ? "Complete your early check-in · The Spot Central Hostel"
        : "Complete your online check-in for your stay in Seville · The Spot Central Hostel"
      : isEarly
        ? "Completa tu Check-in anticipado · The Spot Central Hostel"
        : "Completa tu Check-in Online para tu estancia en Sevilla · The Spot Central Hostel";
  const text =
    language === "en"
      ? `Hello ${displayName(context.guestName)},\n\nWe are writing to you from The Spot Central Hostel in Seville. You have a reservation with us on ${arrivalDate} for a ${roomType}${context.roomNumber ? ` (${room})` : ""}.\n\nTo make your arrival quicker and avoid unnecessary waiting at reception, please complete the information in the ${isEarly ? "early check-in" : "online check-in"} link as soon as possible:\n${checkinUrl}\n\nWe have prefilled the booking information available. Please review it, complete the document details for every guest and sign the form.${isEarly ? " This will help us prepare your arrival. Access codes will be provided separately when needed." : " Once completed, you will receive your access instructions."}\n\nWe look forward to welcoming you :)\n\nThe Spot Central Hostel`
      : `Hola ${displayName(context.guestName)},\n\nTe escribimos desde The Spot Central Hostel, en Sevilla. Tienes una reserva con nosotros el ${arrivalDate} para una ${roomType}${context.roomNumber ? ` (${room})` : ""}.\n\nPara agilizar tu llegada y evitar esperas innecesarias en recepción, te agradeceríamos que completaras los datos del siguiente enlace de ${isEarly ? "Check-in anticipado" : "Check-in Online"} lo antes posible:\n${checkinUrl}\n\nHemos precargado la información disponible de la reserva. Revísala, completa los datos documentales de todos los huéspedes y firma el formulario.${isEarly ? " Esto nos ayudará a preparar tu llegada. Los códigos de acceso se facilitarán por separado cuando corresponda." : " Una vez completado, recibirás las instrucciones de acceso."}\n\n¡Te esperamos! :)\n\nThe Spot Central Hostel`;
  const intro =
    language === "en"
      ? "We are writing to you from <strong>The Spot Central Hostel</strong>, in Seville."
      : "Te escribimos desde <strong>The Spot Central Hostel</strong>, en Sevilla.";
  const request =
    language === "en"
      ? "To make your arrival quicker and avoid unnecessary waiting at reception, please complete the information in the online check-in link as soon as possible:"
      : "Para agilizar tu llegada y evitar esperas innecesarias en recepción, te agradeceríamos que completaras los datos del enlace de Check-in Online lo antes posible:";
  const completion =
    language === "en"
      ? "We have prefilled the booking information available. Please review it, complete the document details for every guest and sign the form. Once completed, you will receive your access instructions."
      : "Hemos precargado la información disponible de la reserva. Revísala, completa los datos documentales de todos los huéspedes y firma el formulario. Una vez completado, recibirás las instrucciones de acceso.";
  const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#1f2937;line-height:1.6"><div style="background:#0f766e;color:#fff;padding:22px;border-radius:10px 10px 0 0"><h1 style="margin:0;font-size:22px">${escapeHtml(subject)}</h1></div><div style="background:#f8fafc;padding:26px;border-radius:0 0 10px 10px"><p>${language === "en" ? "Hello" : "Hola"} <strong>${name}</strong>,</p><p>${intro}</p><p>${bookingSummary}</p><p>${request}</p><p style="text-align:center;margin:28px 0"><a href="${safeUrl}" style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;font-weight:bold;padding:13px 20px;border-radius:7px">${language === "en" ? "Open online check-in" : "Abrir Check-in Online"}</a></p><p style="font-size:13px;color:#475569;word-break:break-all">${safeUrl}</p><p>${completion}</p><p>${language === "en" ? "We look forward to welcoming you :)" : "¡Te esperamos! :)"}</p><p><strong>The Spot Central Hostel</strong></p></div></div>`;
  return { subject, text, html };
}

export function buildReservationWhatsAppMessage(
  context: ReservationMessageContext,
  messageType: ReservationMessageType,
  checkinUrl: string | null,
  language: ReservationMessageLanguage
) {
  const name = displayName(context.guestName);
  if (messageType === "online_checkin" || messageType === "early_checkin") {
    const isEarly = messageType === "early_checkin";
    return language === "en"
      ? `Hello ${name}, you can complete your ${isEarly ? "early check-in" : "online check-in"} for The Spot Central Hostel here:\n\n${checkinUrl}\n\nYour booking details have been prefilled where available. Please complete the documents and signature for all guests.${isEarly ? " This helps us prepare your arrival and reduce waiting time at reception." : " You will receive the access instructions once it is completed."}`
      : `Hola ${name}, puedes completar tu ${isEarly ? "Check-in anticipado" : "Check-in Online"} de The Spot Central Hostel aquí:\n\n${checkinUrl}\n\nHemos precargado los datos disponibles de tu reserva. Completa los documentos y la firma de todos los huéspedes.${isEarly ? " Esto nos ayudará a preparar tu llegada y reducir el tiempo de espera en recepción." : " Recibirás las instrucciones de acceso cuando esté terminado."}`;
  }
  return buildReservationWelcomeEmail(context, language).text;
}

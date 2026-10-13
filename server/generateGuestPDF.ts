import * as fs from "node:fs";
import * as path from "node:path";
import { jsPDF } from "jspdf";
import { getGuestById, getGuestsByGroupId } from "./db";

type GuestRecord = {
  id?: number;
  firstName?: string | null;
  lastName?: string | null;
  checkInDate?: string | null;
  createdAt?: Date | string | null;
  [key: string]: unknown;
};

function dateParts(value: string | Date | null | undefined) {
  const match = typeof value === "string" && /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) return { year: match[1], month: match[2], day: match[3] };

  const date = value ? new Date(value) : new Date();
  const validDate = Number.isNaN(date.getTime()) ? new Date() : date;
  return {
    year: String(validDate.getFullYear()),
    month: String(validDate.getMonth() + 1).padStart(2, "0"),
    day: String(validDate.getDate()).padStart(2, "0"),
  };
}

function safeFileSegment(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

/** Ubicación local del PDF: uploads/registros/MM-AAAA/DDMMAA - Nombre Apellidos.pdf */
export function getGuestRecordArchiveLocation(
  guest: GuestRecord,
  uploadsDirectory = path.join(process.cwd(), "uploads")
) {
  const { year, month, day } = dateParts(guest.checkInDate || guest.createdAt);
  const fullName = safeFileSegment(`${guest.firstName || ""} ${guest.lastName || ""}`) || "Huesped";
  const monthFolder = `${month}-${year}`;
  const fileName = `${day}${month}${year.slice(-2)} - ${fullName}.pdf`;
  const directory = path.join(uploadsDirectory, "registros", monthFolder);
  return { directory, fileName, filePath: path.join(directory, fileName) };
}

export function getGuestRecordPublicUrl(filePath: string, uploadsDirectory = path.join(process.cwd(), "uploads")) {
  const relativePath = path.relative(uploadsDirectory, filePath);
  if (!relativePath || relativePath.startsWith("..") || path.isAbsolute(relativePath)) return null;
  return `/uploads/${relativePath.split(path.sep).map(encodeURIComponent).join("/")}`;
}

/**
 * Genera el registro PDF y lo conserva localmente junto al resto de adjuntos:
 * `uploads/registros/MM-AAAA/DDMMAA - Nombre Apellidos.pdf`.
 */
export async function generateGuestPDF(guestId: number): Promise<string | null> {
  try {
    const guest = await getGuestById(guestId);
    if (!guest) return null;

    const group = await getGuestsByGroupId(guest.groupId);
    const travelers = group.length > 1 ? group : [guest];
    const mainGuest = travelers.find(traveler => traveler.isMainGuest) || travelers[0] || guest;
    const groupLocation = getGuestRecordArchiveLocation(mainGuest);
    fs.mkdirSync(groupLocation.directory, { recursive: true });
    // El PDF asociado a la ficha principal contiene todos los huéspedes
    // registrados juntos, uno por página. Así el enlace final de Check-in no
    // oculta al acompañante, pero cada acompañante conserva su copia individual.
    fs.writeFileSync(groupLocation.filePath, createGuestPdfBuffer(travelers));

    if (guest.id !== mainGuest.id) {
      const individualLocation = getGuestRecordArchiveLocation(guest);
      fs.mkdirSync(individualLocation.directory, { recursive: true });
      fs.writeFileSync(individualLocation.filePath, createGuestPdfBuffer(guest));
    }
    return groupLocation.filePath;
  } catch (error) {
    console.error("[generateGuestPDF] No se pudo archivar el registro:", error);
    return null;
  }
}

export function createGuestPdfBuffer(input: GuestRecord | GuestRecord[]): Buffer {
  const travelers = Array.isArray(input) ? input : [input];
  const guest = travelers[0] || {};
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 12;
  const columnWidth = 88;
  let y = 14;
  const addHeading = (text: string) => {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text(text, margin, y);
    y += 5;
    pdf.setDrawColor(180);
    pdf.line(margin, y, 198, y);
    y += 5;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
  };
  const value = (item: unknown) => String(item || "—");
  const addRow = (leftLabel: string, leftValue: unknown, rightLabel = "", rightValue: unknown = "") => {
    pdf.text(`${leftLabel}: ${value(leftValue)}`, margin, y);
    if (rightLabel) pdf.text(`${rightLabel}: ${value(rightValue)}`, margin + columnWidth, y);
    y += 5;
  };
  const pageBreak = () => {
    if (y > 265) {
      pdf.addPage();
      y = 14;
    }
  };

  travelers.forEach((traveler, index) => {
    if (index > 0) pdf.addPage();
    y = 14;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.text(travelers.length > 1 ? `FICHA DE REGISTRO · HUÉSPED ${index + 1} DE ${travelers.length}` : "FICHA DE REGISTRO DE HUÉSPED", margin, y);
    y += 7;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.text(`Generado: ${new Date().toLocaleString("es-ES")}`, margin, y);
    y += 8;

    addHeading("DATOS PERSONALES");
    addRow("Nombre", `${traveler.firstName || ""} ${traveler.lastName || ""}`.trim(), "Documento", `${traveler.documentType || ""} ${traveler.documentNumber || ""}`.trim());
    addRow("Nacionalidad", traveler.nationality, "Sexo", traveler.gender);
    addRow("Nacimiento", traveler.birthDate, "Teléfono", traveler.phone);
    addRow("Email", traveler.email, "Soporte", traveler.documentSupport);

    pageBreak();
    addHeading("DIRECCIÓN Y RESERVA");
    addRow("Dirección", `${traveler.street || ""} ${traveler.addressExtra || ""}`.trim(), "Ciudad", traveler.city);
    addRow("Provincia", traveler.province, "Código postal", traveler.postalCode);
    addRow("País", traveler.country, "Reserva", traveler.reservationNumber);
    addRow("Entrada", traveler.checkInDate, "Salida", traveler.checkOutDate);
    addRow("Habitación", traveler.roomNumber, "Tipo", traveler.roomType);
    addRow("Origen", traveler.reservationOrigin, "Alojamiento", traveler.accommodationType);

    pageBreak();
    addHeading("INFORMACIÓN DE PAGO");
    addRow("Tipo de pago", traveler.paymentType, "Fecha", traveler.paymentDate);
    addRow("Abonado", `€${traveler.amountPaid || "0"}`, "Pendiente", `€${traveler.amountPending || "0"}`);
    addRow("Titular", traveler.paymentHolder, "Medio", traveler.paymentMethod);

    pageBreak();
    addHeading("ACEPTACIÓN Y FIRMA");
    pdf.setFontSize(8.5);
    pdf.text("El huésped declara haber leído y aceptado las normas del establecimiento y la política de protección de datos.", margin, y, { maxWidth: 180 });
    y += 12;
    const signature = typeof traveler.signature === "string" ? traveler.signature : "";
    if (signature.startsWith("data:image")) {
      try {
        pdf.addImage(signature, "PNG", margin, y, 70, 28);
        y += 32;
      } catch {
        pdf.text("Firma digital registrada en el sistema.", margin, y);
        y += 6;
      }
    } else {
      pdf.text("Firma: no disponible", margin, y);
      y += 6;
    }
    pdf.setDrawColor(180);
    pdf.line(margin, y + 12, margin + 75, y + 12);
    pdf.setFontSize(8);
    pdf.text("Firma del huésped", margin, y + 17);
    pdf.text(`Tipo de check-in: ${traveler.checkinType || "presencial"} · Estado: ${traveler.status || "completed"}`, margin, 287);
  });
  return Buffer.from(pdf.output("arraybuffer"));
}

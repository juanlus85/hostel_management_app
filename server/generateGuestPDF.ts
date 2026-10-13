import * as fs from "node:fs";
import * as path from "node:path";
import { jsPDF } from "jspdf";
import { getGuestById } from "./db";

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

    const location = getGuestRecordArchiveLocation(guest);
    fs.mkdirSync(location.directory, { recursive: true });
    // Se reemplaza el mismo registro si recepción completa o corrige datos después.
    fs.writeFileSync(location.filePath, createGuestPdfBuffer(guest));
    return location.filePath;
  } catch (error) {
    console.error("[generateGuestPDF] No se pudo archivar el registro:", error);
    return null;
  }
}

export function createGuestPdfBuffer(guest: GuestRecord): Buffer {
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

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text("FICHA DE REGISTRO DE HUÉSPED", margin, y);
  y += 7;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text(`Generado: ${new Date().toLocaleString("es-ES")}`, margin, y);
  y += 8;

  addHeading("DATOS PERSONALES");
  addRow("Nombre", `${guest.firstName || ""} ${guest.lastName || ""}`.trim(), "Documento", `${guest.documentType || ""} ${guest.documentNumber || ""}`.trim());
  addRow("Nacionalidad", guest.nationality, "Sexo", guest.gender);
  addRow("Nacimiento", guest.birthDate, "Teléfono", guest.phone);
  addRow("Email", guest.email, "Soporte", guest.documentSupport);

  pageBreak();
  addHeading("DIRECCIÓN Y RESERVA");
  addRow("Dirección", `${guest.street || ""} ${guest.addressExtra || ""}`.trim(), "Ciudad", guest.city);
  addRow("Provincia", guest.province, "Código postal", guest.postalCode);
  addRow("País", guest.country, "Reserva", guest.reservationNumber);
  addRow("Entrada", guest.checkInDate, "Salida", guest.checkOutDate);
  addRow("Habitación", guest.roomNumber, "Tipo", guest.roomType);
  addRow("Origen", guest.reservationOrigin, "Alojamiento", guest.accommodationType);

  pageBreak();
  addHeading("INFORMACIÓN DE PAGO");
  addRow("Tipo de pago", guest.paymentType, "Fecha", guest.paymentDate);
  addRow("Abonado", `€${guest.amountPaid || "0"}`, "Pendiente", `€${guest.amountPending || "0"}`);
  addRow("Titular", guest.paymentHolder, "Medio", guest.paymentMethod);

  pageBreak();
  addHeading("ACEPTACIÓN Y FIRMA");
  pdf.setFontSize(8.5);
  pdf.text(
    "El huésped declara haber leído y aceptado las normas del establecimiento y la política de protección de datos.",
    margin,
    y,
    { maxWidth: 180 }
  );
  y += 12;
  const signature = typeof guest.signature === "string" ? guest.signature : "";
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
  pdf.text(`Tipo de check-in: ${guest.checkinType || "presencial"} · Estado: ${guest.status || "completed"}`, margin, 287);
  return Buffer.from(pdf.output("arraybuffer"));
}

import { jsPDF } from 'jspdf';
import * as fs from 'fs';
import * as path from 'path';

interface GuestData {
  id?: number | null;
  firstName: string;
  lastName: string;
  documentType: string;
  documentNumber: string;
  documentSupport?: string | null;
  nationality: string | null;
  birthDate?: string | null;
  gender?: string | null;
  phone?: string | null;
  email?: string | null;
  street?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  country?: string | null;
  reservationNumber?: string | null;
  roomNumber?: string | null;
  roomType?: string | null;
  checkInDate?: string | null;
  checkOutDate?: string | null;
  numberOfRooms?: number | null;
  accommodationType?: string | null;
  reservationOrigin?: string | null;
  paymentType?: string | null;
  paymentDate?: string | null;
  amountPaid?: string | null;
  amountPending?: string | null;
  paymentHolder?: string | null;
  paymentMethod?: string | null;
  signature?: string | null;
  status?: string | null;
}

export async function generateGuestPDF(guest: GuestData): Promise<string> {
  const doc = new jsPDF();
  
  const lineHeight = 6;
  const leftMargin = 15;
  const rightColumnX = 110;
  const pageWidth = 210; // A4 width in mm
  
  // Título centrado
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('FICHA DE REGISTRO DE VIAJERO', pageWidth / 2, 15, { align: 'center' });
  
  // COLUMNA IZQUIERDA
  let yLeft = 25;
  
  // Datos Personales
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('DATOS PERSONALES', leftMargin, yLeft);
  yLeft += lineHeight;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nombre: ${guest.firstName} ${guest.lastName}`, leftMargin, yLeft);
  yLeft += lineHeight;
  doc.text(`Documento: ${guest.documentType} ${guest.documentNumber}`, leftMargin, yLeft);
  yLeft += lineHeight;
  if (guest.documentSupport) {
    doc.text(`Soporte: ${guest.documentSupport}`, leftMargin, yLeft);
    yLeft += lineHeight;
  }
  doc.text(`Nacionalidad: ${guest.nationality}`, leftMargin, yLeft);
  yLeft += lineHeight;
  doc.text(`Nacimiento: ${guest.birthDate || "-"}`, leftMargin, yLeft);
  yLeft += lineHeight;
  doc.text(`Género: ${guest.gender || "-"}`, leftMargin, yLeft);
  yLeft += lineHeight;
  doc.text(`Teléfono: ${guest.phone || "-"}`, leftMargin, yLeft);
  yLeft += lineHeight;
  doc.text(`Email: ${guest.email || "-"}`, leftMargin, yLeft);
  yLeft += lineHeight + 2;
  
  // Dirección
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('DIRECCIÓN', leftMargin, yLeft);
  yLeft += lineHeight;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Calle: ${guest.street || "-"}`, leftMargin, yLeft);
  yLeft += lineHeight;
  doc.text(`Ciudad: ${guest.city || "-"}`, leftMargin, yLeft);
  yLeft += lineHeight;
  doc.text(`Provincia: ${guest.province || "-"}`, leftMargin, yLeft);
  yLeft += lineHeight;
  doc.text(`CP: ${guest.postalCode || "-"} | País: ${guest.country || "-"}`, leftMargin, yLeft);
  yLeft += lineHeight + 2;
  
  // COLUMNA DERECHA
  let yRight = 25;
  
  // Datos de Reserva
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('DATOS DE RESERVA', rightColumnX, yRight);
  yRight += lineHeight;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nº Reserva: ${guest.reservationNumber || "-"}`, rightColumnX, yRight);
  yRight += lineHeight;
  doc.text(`Habitación: ${guest.roomNumber || "-"}`, rightColumnX, yRight);
  yRight += lineHeight;
  doc.text(`Tipo: ${guest.roomType || "-"}`, rightColumnX, yRight);
  yRight += lineHeight;
  doc.text(`Check-in: ${guest.checkInDate ? new Date(guest.checkInDate).toLocaleDateString() : "-"}`, rightColumnX, yRight);
  yRight += lineHeight;
  doc.text(`Check-out: ${guest.checkOutDate ? new Date(guest.checkOutDate).toLocaleDateString() : "-"}`, rightColumnX, yRight);
  yRight += lineHeight;
  doc.text(`Nº Habitaciones: ${guest.numberOfRooms || "1"}`, rightColumnX, yRight);
  yRight += lineHeight;
  doc.text(`Alojamiento: ${guest.accommodationType || "-"}`, rightColumnX, yRight);
  yRight += lineHeight;
  doc.text(`Origen: ${guest.reservationOrigin || "-"}`, rightColumnX, yRight);
  yRight += lineHeight + 2;
  
  // Información de Pago
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMACIÓN DE PAGO', rightColumnX, yRight);
  yRight += lineHeight;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Tipo: ${guest.paymentType || "-"}`, rightColumnX, yRight);
  yRight += lineHeight;
  doc.text(`Fecha: ${guest.paymentDate || "-"}`, rightColumnX, yRight);
  yRight += lineHeight;
  doc.text(`Abonado: ${guest.amountPaid || "0"}€`, rightColumnX, yRight);
  yRight += lineHeight;
  doc.text(`Pendiente: ${guest.amountPending || "0"}€`, rightColumnX, yRight);
  yRight += lineHeight;
  doc.text(`Titular: ${guest.paymentHolder || "-"}`, rightColumnX, yRight);
  yRight += lineHeight;
  doc.text(`Método: ${guest.paymentMethod || "-"}`, rightColumnX, yRight);
  yRight += lineHeight + 2;
  
  // Usar la posición más baja de las dos columnas
  let y = Math.max(yLeft, yRight);
  
  // Declaración de Aceptación de Condiciones (compacta)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('ACEPTACIÓN DE CONDICIONES', leftMargin, y);
  y += lineHeight;
  
  // Checkbox marcado
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.rect(leftMargin, y - 2.5, 3, 3);
  doc.line(leftMargin + 0.5, y - 1, leftMargin + 1.5, y - 0.5);
  doc.line(leftMargin + 1.5, y - 0.5, leftMargin + 3, y - 2.5);
  
  // Texto de aceptación (compacto)
  doc.text('El huésped acepta las normas del establecimiento y la política de protección de datos.', leftMargin + 5, y);
  y += lineHeight;
  
  // Fecha de aceptación (compacta)
  const checkInDateTime = guest.checkInDate ? new Date(guest.checkInDate) : new Date();
  const acceptanceDate = checkInDateTime.toLocaleDateString('es-ES');
  doc.setFont('helvetica', 'italic');
  doc.text(`Firmado el ${acceptanceDate}`, leftMargin, y);
  y += lineHeight + 2;
  
  // Firma (más pequeña)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('FIRMA DEL HUÉSPED', leftMargin, y);
  y += lineHeight;
  
  if (guest.signature) {
    try {
      // Añadir imagen de firma (más pequeña para que quepa)
      doc.addImage(guest.signature, 'PNG', leftMargin, y, 60, 20);
      y += 22;
    } catch (e) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text('[Firma capturada]', leftMargin, y);
      y += lineHeight;
    }
  } else {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('[Sin firma]', leftMargin, y);
    y += lineHeight;
  }
  
  // Generar nombre de archivo: DDMMAA - Nombre Cliente.pdf
  const checkInDate = guest.checkInDate ? new Date(guest.checkInDate) : new Date();
  const day = String(checkInDate.getDate()).padStart(2, '0');
  const month = String(checkInDate.getMonth() + 1).padStart(2, '0');
  const year = String(checkInDate.getFullYear()).slice(-2);
  const clientName = `${guest.firstName} ${guest.lastName}`.replace(/[^a-zA-Z0-9\s]/g, '');
  const filename = `${day}${month}${year} - ${clientName}.pdf`;
  
  // Guardar PDF en carpeta Registros
  const registrosDir = path.join(process.cwd(), 'Registros');
  if (!fs.existsSync(registrosDir)) {
    fs.mkdirSync(registrosDir, { recursive: true });
  }
  
  const filepath = path.join(registrosDir, filename);
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  fs.writeFileSync(filepath, pdfBuffer);
  
  return filepath;
}

import * as fs from 'fs';
import * as path from 'path';
import { getGuestById } from './db';

/**
 * Genera un PDF con los datos del huésped y lo guarda en la carpeta Registros/
 * Formato del nombre: DDMMAA-NombreApellido.pdf
 */
export async function generateGuestPDF(guestId: number): Promise<string | null> {
  try {
    const guest = await getGuestById(guestId);
    if (!guest) {
      console.error(`[generateGuestPDF] Huésped ${guestId} no encontrado`);
      return null;
    }

    // Crear carpeta Registros/ si no existe
    const registrosDir = path.join(process.cwd(), 'Registros');
    if (!fs.existsSync(registrosDir)) {
      fs.mkdirSync(registrosDir, { recursive: true });
      console.log(`[generateGuestPDF] Carpeta Registros/ creada`);
    }

    // Generar nombre de archivo: DDMMAA-NombreApellido.pdf
    let filename = '';
    if (guest.checkInDate) {
      const [year, month, day] = guest.checkInDate.split('-');
      const dateStr = `${day}${month}${year.slice(2)}`;
      filename = `${dateStr}-${guest.firstName}${guest.lastName}.pdf`;
    } else {
      filename = `${guest.firstName}${guest.lastName}-${Date.now()}.pdf`;
    }

    // Limpiar caracteres especiales del nombre de archivo
    filename = filename.replace(/[^a-zA-Z0-9.-]/g, '');

    const filePath = path.join(registrosDir, filename);

    // Generar contenido del PDF (texto plano por ahora)
    // TODO: En el futuro, usar una librería como jsPDF o PDFKit para generar PDF real
    const content = generatePDFContent(guest);

    // Guardar archivo
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`[generateGuestPDF] PDF generado: ${filePath}`);

    return filePath;
  } catch (error) {
    console.error(`[generateGuestPDF] Error al generar PDF:`, error);
    return null;
  }
}

/**
 * Genera el contenido del PDF en formato texto
 */
function generatePDFContent(guest: any): string {
  const lines: string[] = [];

  lines.push('='.repeat(80));
  lines.push('FICHA DE REGISTRO DE HUÉSPED');
  lines.push('='.repeat(80));
  lines.push('');

  // Datos personales
  lines.push('DATOS PERSONALES');
  lines.push('-'.repeat(80));
  lines.push(`Nombre: ${guest.firstName || ''} ${guest.lastName || ''}`);
  lines.push(`Documento: ${guest.documentType || ''} ${guest.documentNumber || ''}`);
  if (guest.documentSupport) {
    lines.push(`Número de Soporte: ${guest.documentSupport}`);
  }
  lines.push(`Género: ${guest.gender || ''}`);
  lines.push(`Fecha de Nacimiento: ${guest.birthDate || ''}`);
  lines.push(`Nacionalidad: ${guest.nationality || ''}`);
  lines.push('');

  // Dirección
  lines.push('DIRECCIÓN');
  lines.push('-'.repeat(80));
  lines.push(`Calle: ${guest.street || ''}`);
  if (guest.addressExtra) {
    lines.push(`Complemento: ${guest.addressExtra}`);
  }
  lines.push(`Ciudad: ${guest.city || ''}`);
  if (guest.province) {
    lines.push(`Provincia: ${guest.province}`);
  }
  lines.push(`Código Postal: ${guest.postalCode || ''}`);
  lines.push(`País: ${guest.country || ''}`);
  lines.push('');

  // Contacto
  lines.push('CONTACTO');
  lines.push('-'.repeat(80));
  if (guest.phone) {
    lines.push(`Teléfono: ${guest.phone}`);
  }
  if (guest.email) {
    lines.push(`Email: ${guest.email}`);
  }
  lines.push('');

  // Reserva
  lines.push('DATOS DE RESERVA');
  lines.push('-'.repeat(80));
  if (guest.reservationNumber) {
    lines.push(`Número de Reserva: ${guest.reservationNumber}`);
  }
  lines.push(`Fecha de Entrada: ${guest.checkInDate || ''}`);
  lines.push(`Fecha de Salida: ${guest.checkOutDate || ''}`);
  lines.push(`Habitación: ${guest.roomNumber || ''}`);
  if (guest.roomType) {
    lines.push(`Tipo de Habitación: ${guest.roomType}`);
  }
  if (guest.numberOfRooms) {
    lines.push(`Número de Habitaciones: ${guest.numberOfRooms}`);
  }
  if (guest.accommodationType) {
    lines.push(`Tipo de Alojamiento: ${guest.accommodationType}`);
  }
  if (guest.reservationOrigin) {
    lines.push(`Origen de Reserva: ${guest.reservationOrigin}`);
  }
  lines.push('');

  // Pago
  lines.push('INFORMACIÓN DE PAGO');
  lines.push('-'.repeat(80));
  if (guest.paymentType) {
    lines.push(`Tipo de Pago: ${guest.paymentType}`);
  }
  if (guest.paymentDate) {
    lines.push(`Fecha de Pago: ${guest.paymentDate}`);
  }
  if (guest.amountPaid) {
    lines.push(`Cantidad Abonada: €${guest.amountPaid}`);
  }
  if (guest.amountPending) {
    lines.push(`Cantidad Pendiente: €${guest.amountPending}`);
  }
  if (guest.paymentHolder) {
    lines.push(`Titular del Pago: ${guest.paymentHolder}`);
  }
  if (guest.paymentMethod) {
    lines.push(`Medio de Pago: ${guest.paymentMethod}`);
  }
  lines.push('');

  // Aceptación de condiciones
  lines.push('ACEPTACIÓN DE CONDICIONES');
  lines.push('-'.repeat(80));
  lines.push('El huésped declara haber leído y aceptado:');
  lines.push('- Las normas del establecimiento');
  lines.push('- La política de protección de datos');
  lines.push('');
  if (guest.createdAt) {
    const fecha = new Date(guest.createdAt);
    lines.push(`Fecha y hora de aceptación: ${fecha.toLocaleString('es-ES')}`);
  }
  lines.push('');

  // Firma
  if (guest.signature) {
    lines.push('FIRMA DEL HUÉSPED');
    lines.push('-'.repeat(80));
    lines.push('[Firma digital guardada en base de datos]');
    lines.push('');
  }

  lines.push('='.repeat(80));
  lines.push(`Tipo de Check-in: ${guest.checkinType || 'presencial'}`);
  lines.push(`Estado: ${guest.status || 'completed'}`);
  lines.push(`Generado: ${new Date().toLocaleString('es-ES')}`);
  lines.push('='.repeat(80));

  return lines.join('\n');
}

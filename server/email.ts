import nodemailer from "nodemailer";
import { getDb } from "./db";
import { systemSettings } from "../drizzle/schema";
import { eq } from "drizzle-orm";

interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  fromEmail: string;
  fromName: string;
}

// Get SMTP configuration from database
export async function getSMTPConfig(): Promise<SMTPConfig | null> {
  const db = await getDb();
  if (!db) return null;

  const settings = await db.select().from(systemSettings);
  const config: Partial<SMTPConfig> = {};

  for (const setting of settings) {
    switch (setting.key) {
      case "smtp_host": config.host = setting.value || ""; break;
      case "smtp_port": config.port = parseInt(setting.value || "587"); break;
      case "smtp_secure": config.secure = setting.value === "true"; break;
      case "smtp_user": config.user = setting.value || ""; break;
      case "smtp_password": config.password = setting.value || ""; break;
      case "smtp_from_email": config.fromEmail = setting.value || ""; break;
      case "smtp_from_name": config.fromName = setting.value || "Hostel Management"; break;
    }
  }

  if (!config.host || !config.user || !config.password) {
    return null;
  }

  return config as SMTPConfig;
}

// Save SMTP configuration to database
export async function saveSMTPConfig(config: SMTPConfig): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const settings = [
    { key: "smtp_host", value: config.host, description: "SMTP server hostname" },
    { key: "smtp_port", value: config.port.toString(), description: "SMTP server port" },
    { key: "smtp_secure", value: config.secure.toString(), description: "Use SSL/TLS" },
    { key: "smtp_user", value: config.user, description: "SMTP username" },
    { key: "smtp_password", value: config.password, description: "SMTP password" },
    { key: "smtp_from_email", value: config.fromEmail, description: "From email address" },
    { key: "smtp_from_name", value: config.fromName, description: "From name" },
  ];

  for (const setting of settings) {
    const existing = await db.select().from(systemSettings).where(eq(systemSettings.key, setting.key));
    if (existing.length > 0) {
      await db.update(systemSettings).set({ value: setting.value }).where(eq(systemSettings.key, setting.key));
    } else {
      await db.insert(systemSettings).values(setting);
    }
  }
}

// Test SMTP connection
export async function testSMTPConnection(config: SMTPConfig): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.password,
      },
    });

    await transporter.verify();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Send email
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<{ success: boolean; error?: string }> {
  const config = await getSMTPConfig();
  if (!config) {
    console.log("[Email] SMTP not configured, skipping email send");
    return { success: false, error: "SMTP no configurado" };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.password,
      },
    });

    await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to,
      subject,
      text: text || html.replace(/<[^>]*>/g, ""),
      html,
    });

    console.log(`[Email] Sent to ${to}: ${subject}`);
    return { success: true };
  } catch (error: any) {
    console.error(`[Email] Failed to send to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
}

// Send email with attachment
export async function sendEmailWithAttachment(
  to: string,
  subject: string,
  html: string,
  attachmentUrl?: string,
  attachmentName?: string
): Promise<{ success: boolean; error?: string }> {
  const config = await getSMTPConfig();
  if (!config) {
    console.log("[Email] SMTP not configured, skipping email send");
    return { success: false, error: "SMTP no configurado" };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.password,
      },
    });

    const mailOptions: any = {
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to,
      subject,
      text: html.replace(/<[^>]*>/g, ""),
      html,
    };

    // Add attachment if URL provided
    if (attachmentUrl) {
      console.log(`[Email] Processing attachment: ${attachmentUrl}`);
      try {
        let buffer: Buffer;
        
        // Check if it's a local file path or external URL
        if (attachmentUrl.startsWith('/uploads/') || attachmentUrl.startsWith('uploads/')) {
          // Local file - read from disk
          const fs = await import('fs');
          const path = await import('path');
          const filePath = path.join(process.cwd(), attachmentUrl.replace(/^\//, ''));
          console.log(`[Email] Reading local file: ${filePath}`);
          
          if (fs.existsSync(filePath)) {
            buffer = fs.readFileSync(filePath);
            console.log(`[Email] Read local file: ${buffer.length} bytes`);
          } else {
            console.error(`[Email] Local file not found: ${filePath}`);
            throw new Error(`File not found: ${filePath}`);
          }
        } else {
          // External URL - download from internet
          console.log(`[Email] Downloading from URL: ${attachmentUrl}`);
          const response = await fetch(attachmentUrl);
          if (!response.ok) {
            console.error(`[Email] Failed to download attachment: ${response.statusText}`);
            throw new Error(`Failed to download attachment: ${response.statusText}`);
          }
          buffer = Buffer.from(await response.arrayBuffer());
          console.log(`[Email] Downloaded attachment: ${buffer.length} bytes`);
        }
        
        mailOptions.attachments = [{
          filename: attachmentName || "factura.pdf",
          content: buffer,
        }];
      } catch (downloadError: any) {
        console.error(`[Email] Error processing attachment:`, downloadError.message);
        // Continue sending email without attachment
      }
    }

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email] Sent to ${to}: ${subject}`);
    console.log(`[Email] Response:`, info.response);
    return { success: true };
  } catch (error: any) {
    console.error(`[Email] Failed to send to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
}

// Send invoice notification email
export async function sendInvoiceNotificationEmail(
  invoiceNumber: string,
  supplierName: string,
  amount: number,
  date: string,
  category: string,
  notes: string | null,
  fileUrl: string | null
): Promise<{ success: boolean; error?: string }> {
  const formattedDate = new Date(date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const subject = `Factura - ${supplierName} - ${formattedDate}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #3b82f6;">Nueva Factura Registrada</h2>
      <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 0;"><strong>Proveedor:</strong> ${supplierName}</p>
        <p style="margin: 8px 0 0;"><strong>Nº Factura:</strong> ${invoiceNumber}</p>
        <p style="margin: 8px 0 0;"><strong>Fecha:</strong> ${formattedDate}</p>
        <p style="margin: 8px 0 0;"><strong>Importe:</strong> €${amount.toFixed(2)}</p>
        <p style="margin: 8px 0 0;"><strong>Categoría:</strong> ${category}</p>
        ${notes ? `<p style="margin: 8px 0 0;"><strong>Notas:</strong> ${notes}</p>` : ''}
      </div>
      ${fileUrl ? '<p style="color: #059669;">Archivo adjunto incluido.</p>' : '<p style="color: #f59e0b;">Sin archivo adjunto.</p>'}
      <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">
        Este es un mensaje automático del sistema de gestión.
      </p>
    </div>
  `;

  const fileName = fileUrl ? `Factura_${supplierName.replace(/\s+/g, '_')}_${formattedDate.replace(/\//g, '-')}.${fileUrl.split('.').pop() || 'pdf'}` : undefined;
  
  const result = await sendEmailWithAttachment(
    'thespotcentralhostel@gmail.com',
    subject,
    html,
    fileUrl || undefined,
    fileName
  );
  console.log("[Email] Invoice notification result:", result);
  return result;
}

// Send shift notification email
export async function sendShiftNotificationEmail(
  employeeEmail: string,
  employeeName: string,
  type: "assigned" | "modified" | "deleted",
  shiftDate: string,
  shiftStart: string,
  shiftEnd: string
): Promise<void> {
  const typeLabels = {
    assigned: "Nuevo turno asignado",
    modified: "Turno modificado",
    deleted: "Turno eliminado",
  };

  const subject = `${typeLabels[type]} - ${shiftDate}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #3b82f6;">${typeLabels[type]}</h2>
      <p>Hola ${employeeName},</p>
      <p>Te informamos sobre un cambio en tu horario:</p>
      <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 0;"><strong>Fecha:</strong> ${shiftDate}</p>
        <p style="margin: 8px 0 0;"><strong>Horario:</strong> ${shiftStart} - ${shiftEnd}</p>
      </div>
      ${type === "deleted" ? "<p style='color: #ef4444;'>Este turno ha sido eliminado de tu calendario.</p>" : ""}
      <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">
        Este es un mensaje automático del sistema de gestión.
      </p>
    </div>
  `;

  await sendEmail(employeeEmail, subject, html);
}


// Send check-in anticipado confirmation email
export async function sendCheckinAnticipadoConfirmation(
  guestData: {
    firstName: string;
    lastName: string;
    email: string;
    documentNumber: string;
    checkInDate?: string;
    language?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const isSpanish = guestData.language === "es" || !guestData.language;
  
  const subject = isSpanish 
    ? "Confirmación de Check-in Anticipado - The Spot Central Hostel"
    : "Early Check-in Confirmation - The Spot Central Hostel";
  
  const html = isSpanish ? `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .info-box { background-color: white; padding: 20px; margin: 20px 0; border-left: 4px solid #2563eb; border-radius: 4px; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
        .highlight { color: #2563eb; font-weight: bold; }
        .warning { background-color: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; margin: 20px 0; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>¡Check-in Anticipado Recibido!</h1>
        </div>
        <div class="content">
          <p>Hola <strong>${guestData.firstName} ${guestData.lastName}</strong>,</p>
          
          <p>Hemos recibido correctamente tu información de check-in anticipado. Gracias por completar el formulario.</p>
          
          <div class="info-box">
            <h3>Resumen de tu Reserva</h3>
            <p><strong>Nombre:</strong> ${guestData.firstName} ${guestData.lastName}</p>
            <p><strong>Documento:</strong> ${guestData.documentNumber}</p>
            ${guestData.checkInDate ? `<p><strong>Fecha de llegada:</strong> ${new Date(guestData.checkInDate).toLocaleDateString('es-ES')}</p>` : ''}
          </div>
          
          <div class="warning">
            <h3>⚠️ Importante - Documento Original</h3>
            <p>Recuerda que <span class="highlight">debes presentar tu documento de identidad original</span> al hacer el check-in en recepción. Es un requisito obligatorio de la policía española.</p>
          </div>
          
          <p>Nuestro equipo revisará tu información y te asignará una habitación. Al llegar, solo tendrás que pasar por recepción para:</p>
          <ul>
            <li>Verificar tu documento original</li>
            <li>Recoger las llaves de tu habitación</li>
            <li>Recibir información sobre el hostel</li>
          </ul>
          
          <p>Si tienes alguna pregunta o necesitas modificar algo, no dudes en contactarnos.</p>
          
          <p>¡Te esperamos pronto!</p>
          
          <p><strong>The Spot Central Hostel Team</strong></p>
        </div>
        <div class="footer">
          <p>The Spot Central Hostel<br>
          Email: thespotcentralhostel@gmail.com</p>
        </div>
      </div>
    </body>
    </html>
  ` : `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .info-box { background-color: white; padding: 20px; margin: 20px 0; border-left: 4px solid #2563eb; border-radius: 4px; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
        .highlight { color: #2563eb; font-weight: bold; }
        .warning { background-color: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; margin: 20px 0; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Early Check-in Received!</h1>
        </div>
        <div class="content">
          <p>Hello <strong>${guestData.firstName} ${guestData.lastName}</strong>,</p>
          
          <p>We have successfully received your early check-in information. Thank you for completing the form.</p>
          
          <div class="info-box">
            <h3>Booking Summary</h3>
            <p><strong>Name:</strong> ${guestData.firstName} ${guestData.lastName}</p>
            <p><strong>Document:</strong> ${guestData.documentNumber}</p>
            ${guestData.checkInDate ? `<p><strong>Arrival date:</strong> ${new Date(guestData.checkInDate).toLocaleDateString('en-US')}</p>` : ''}
          </div>
          
          <div class="warning">
            <h3>⚠️ Important - Original Document</h3>
            <p>Remember that <span class="highlight">you must present your original ID document</span> when checking in at reception. This is a mandatory requirement by Spanish police.</p>
          </div>
          
          <p>Our team will review your information and assign you a room. Upon arrival, you just need to stop by reception to:</p>
          <ul>
            <li>Verify your original document</li>
            <li>Collect your room keys</li>
            <li>Receive information about the hostel</li>
          </ul>
          
          <p>If you have any questions or need to modify anything, please don't hesitate to contact us.</p>
          
          <p>See you soon!</p>
          
          <p><strong>The Spot Central Hostel Team</strong></p>
        </div>
        <div class="footer">
          <p>The Spot Central Hostel<br>
          Email: thespotcentralhostel@gmail.com</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  return sendEmail(guestData.email, subject, html);
}

export async function sendOnlineCheckinConfirmation(guestData: {
  firstName: string;
  email: string;
  language: string;
  checkInDate: string;
  roomNumber: string;
  roomCode?: string | null;
  entranceCode?: string | null;
  welcomeMessage?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  const isSpanish = guestData.language !== "en";
  const subject = isSpanish
    ? "Check-in online completado · The Spot Central Hostel"
    : "Online check-in completed · The Spot Central Hostel";
  const arrivalDate = new Date(`${guestData.checkInDate}T00:00:00`).toLocaleDateString(isSpanish ? "es-ES" : "en-GB");
  const html = isSpanish ? `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#1f2937;line-height:1.6">
      <div style="background:#0f766e;color:white;padding:24px;border-radius:10px 10px 0 0"><h1 style="margin:0">¡Check-in completado!</h1></div>
      <div style="background:#f8fafc;padding:28px;border-radius:0 0 10px 10px">
        <p>Hola <strong>${guestData.firstName}</strong>, tu registro online se ha completado correctamente.</p>
        ${guestData.welcomeMessage ? `<div style="background:#eff6ff;border-left:4px solid #2563eb;padding:14px;border-radius:6px;white-space:pre-line">${guestData.welcomeMessage}</div>` : ""}
        <p><strong>Llegada:</strong> ${arrivalDate}<br><strong>Habitación:</strong> ${guestData.roomNumber}</p>
        <div style="background:white;border-left:4px solid #0f766e;padding:18px;border-radius:6px">
          <h2 style="margin-top:0">Tus códigos de acceso</h2>
          <p style="margin:16px 0 4px"><strong>1. Código de acceso al hostel</strong></p>
          <p style="margin:0;font-size:24px;font-weight:bold;letter-spacing:3px;color:#0f766e">${guestData.entranceCode || "NO CONFIGURADO"}</p>
          <p style="margin:18px 0 4px"><strong>2. Código de la habitación ${guestData.roomNumber}</strong></p>
          <p style="margin:0;font-size:24px;font-weight:bold;letter-spacing:3px;color:#0f766e">${guestData.roomCode || "NO CONFIGURADO"}</p>
        </div>
        <p>Conserva este correo y presenta tu documento original cuando sea necesario.</p>
      </div>
    </div>` : `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#1f2937;line-height:1.6">
      <div style="background:#0f766e;color:white;padding:24px;border-radius:10px 10px 0 0"><h1 style="margin:0">Online check-in completed!</h1></div>
      <div style="background:#f8fafc;padding:28px;border-radius:0 0 10px 10px">
        <p>Hello <strong>${guestData.firstName}</strong>, your online registration has been completed successfully.</p>
        ${guestData.welcomeMessage ? `<div style="background:#eff6ff;border-left:4px solid #2563eb;padding:14px;border-radius:6px;white-space:pre-line">${guestData.welcomeMessage}</div>` : ""}
        <p><strong>Arrival:</strong> ${arrivalDate}<br><strong>Room:</strong> ${guestData.roomNumber}</p>
        <div style="background:white;border-left:4px solid #0f766e;padding:18px;border-radius:6px">
          <h2 style="margin-top:0">Your access codes</h2>
          <p style="margin:16px 0 4px"><strong>1. Hostel entrance code</strong></p>
          <p style="margin:0;font-size:24px;font-weight:bold;letter-spacing:3px;color:#0f766e">${guestData.entranceCode || "NOT CONFIGURED"}</p>
          <p style="margin:18px 0 4px"><strong>2. Room ${guestData.roomNumber} code</strong></p>
          <p style="margin:0;font-size:24px;font-weight:bold;letter-spacing:3px;color:#0f766e">${guestData.roomCode || "NOT CONFIGURED"}</p>
        </div>
        <p>Please keep this email and present your original ID document whenever required.</p>
      </div>
    </div>`;

  return sendEmail(guestData.email, subject, html);
}


// Send notification to reception when early check-in is received
export async function sendCheckinAnticipadoNotificationToReception(
  guestData: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    documentNumber: string;
    nationality?: string;
    checkInDate?: string;
    reservationNumber?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const subject = `Nuevo Check-in Anticipado Recibido - ${guestData.firstName} ${guestData.lastName}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #059669; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .info-box { background-color: white; padding: 20px; margin: 20px 0; border-left: 4px solid #059669; border-radius: 4px; }
        .data-row { display: flex; margin: 10px 0; }
        .data-label { font-weight: bold; min-width: 150px; color: #6b7280; }
        .data-value { color: #111827; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
        .action-needed { background-color: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; margin: 20px 0; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📋 Nuevo Check-in Anticipado</h1>
        </div>
        <div class="content">
          <p>Se ha recibido un nuevo formulario de check-in anticipado que requiere revisión y asignación de habitación.</p>
          
          <div class="info-box">
            <h3>Datos del Huésped</h3>
            <div class="data-row">
              <span class="data-label">Nombre completo:</span>
              <span class="data-value">${guestData.firstName} ${guestData.lastName}</span>
            </div>
            <div class="data-row">
              <span class="data-label">Documento:</span>
              <span class="data-value">${guestData.documentNumber}</span>
            </div>
            ${guestData.nationality ? `
            <div class="data-row">
              <span class="data-label">Nacionalidad:</span>
              <span class="data-value">${guestData.nationality}</span>
            </div>
            ` : ''}
            <div class="data-row">
              <span class="data-label">Email:</span>
              <span class="data-value">${guestData.email}</span>
            </div>
            ${guestData.phone ? `
            <div class="data-row">
              <span class="data-label">Teléfono:</span>
              <span class="data-value">${guestData.phone}</span>
            </div>
            ` : ''}
            ${guestData.reservationNumber ? `
            <div class="data-row">
              <span class="data-label">Nº Reserva:</span>
              <span class="data-value">${guestData.reservationNumber}</span>
            </div>
            ` : ''}
            ${guestData.checkInDate ? `
            <div class="data-row">
              <span class="data-label">Fecha de llegada:</span>
              <span class="data-value">${new Date(guestData.checkInDate).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            ` : ''}
          </div>
          
          <div class="action-needed">
            <h3>⚠️ Acciones Pendientes</h3>
            <ul>
              <li>Revisar los datos del huésped en el sistema</li>
              <li>Asignar habitación disponible</li>
              <li>Completar información de pago si es necesario</li>
              <li>Preparar llaves físicas para la llegada</li>
            </ul>
          </div>
          
          <p><strong>Accede al sistema de gestión para completar el check-in.</strong></p>
        </div>
        <div class="footer">
          <p>Sistema de Gestión - The Spot Central Hostel<br>
          Notificación automática</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  return sendEmail('thespotcentralhostel@gmail.com', subject, html);
}

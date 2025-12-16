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

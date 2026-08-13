export type ArrivalTemplateContext = {
  guestName?: string | null;
  roomNumber?: string | null;
  roomType?: string | null;
  floor?: string | null;
  entranceCode?: string | null;
  roomCode?: string | null;
  hostelName?: string | null;
  hostelAddress?: string | null;
  wifiPassword?: string | null;
  hostelPhone?: string | null;
  hostelEmail?: string | null;
  checkInDate?: string | null;
  checkOutDate?: string | null;
};

export const ARRIVAL_TEMPLATE_TAGS = [
  "{{NOMBRE_HUESPED}}", "{{HABITACION}}", "{{TIPO_HABITACION}}", "{{PLANTA}}",
  "{{CODIGO_ENTRADA}}", "{{CODIGO_HABITACION}}", "{{NOMBRE_HOSTEL}}", "{{DIRECCION_HOSTEL}}",
  "{{WIFI}}", "{{TELEFONO_HOSTEL}}", "{{EMAIL_HOSTEL}}", "{{FECHA_LLEGADA}}", "{{FECHA_SALIDA}}",
] as const;

export function renderArrivalTemplate(template: string | null | undefined, context: ArrivalTemplateContext): string {
  if (!template) return "";
  const values: Record<string, string> = {
    NOMBRE_HUESPED: context.guestName || "",
    HABITACION: context.roomNumber || "",
    TIPO_HABITACION: context.roomType || "",
    PLANTA: context.floor || "",
    CODIGO_ENTRADA: context.entranceCode || "",
    CODIGO_HABITACION: context.roomCode || "",
    NOMBRE_HOSTEL: context.hostelName || "",
    DIRECCION_HOSTEL: context.hostelAddress || "",
    WIFI: context.wifiPassword || "",
    TELEFONO_HOSTEL: context.hostelPhone || "",
    EMAIL_HOSTEL: context.hostelEmail || "",
    FECHA_LLEGADA: context.checkInDate || "",
    FECHA_SALIDA: context.checkOutDate || "",
  };
  return template.replace(/\{\{\s*([A-Z_]+)\s*\}\}/gi, (fullTag, tag: string) => values[tag.toUpperCase()] ?? fullTag);
}

export type GuestGender = "Hombre" | "Mujer" | "Otro";

export function normalizeGuestGender(value: string | null | undefined): GuestGender {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "mujer" || normalized === "female") return "Mujer";
  if (normalized === "otro" || normalized === "other") return "Otro";
  return "Hombre";
}

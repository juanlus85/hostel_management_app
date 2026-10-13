export function calculateAge(birthDate: string | null | undefined, referenceDate = new Date()): number | null {
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;
  const [year, month, day] = birthDate.split("-").map(Number);
  const birth = new Date(year, month - 1, day);
  if (birth.getFullYear() !== year || birth.getMonth() !== month - 1 || birth.getDate() !== day || birth > referenceDate) return null;

  let age = referenceDate.getFullYear() - year;
  const birthdayReached = referenceDate.getMonth() > month - 1 || (referenceDate.getMonth() === month - 1 && referenceDate.getDate() >= day);
  if (!birthdayReached) age -= 1;
  return age;
}

export function isMinor(birthDate: string | null | undefined, referenceDate = new Date()): boolean {
  const age = calculateAge(birthDate, referenceDate);
  return age !== null && age < 18;
}

export function isBirthDateAtLeastOneYearAgo(birthDate: string | null | undefined, referenceDate = new Date()): boolean {
  const age = calculateAge(birthDate, referenceDate);
  return age !== null && age >= 1;
}

export function latestAllowedBirthDate(referenceDate = new Date()): string {
  const date = new Date(referenceDate);
  date.setFullYear(date.getFullYear() - 1);
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

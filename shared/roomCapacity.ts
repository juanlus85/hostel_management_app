export function defaultGuestsForRoomType(roomType?: string | null): number {
  const type = (roomType || "").toLocaleLowerCase("es-ES");
  if (/(cuadruple|cuádruple|quad|4 camas|4 beds)/.test(type)) return 4;
  if (/(triple|3 camas|3 beds)/.test(type)) return 3;
  if (/(doble|double|twin|matrimonial|2 camas|2 beds)/.test(type)) return 2;
  return 1;
}

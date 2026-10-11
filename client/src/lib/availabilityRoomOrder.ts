function normalize(name: string) {
  return name
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function availabilityRoomOrder(name: string) {
  const value = normalize(name);
  const twoBeds = /\b(2|dos) camas?\b|\btwin\b/.test(value);
  const doubleBed = /cama doble|\bdouble\b/.test(value);
  const triple = /\btriple\b|\b3 camas?\b/.test(value);
  const privateBathroom = /bano privado|private bathroom/.test(value);
  const sharedBathroom = /bano compartido|shared bathroom/.test(value);
  const sharedBed = /cama en .*compartida|bed in .*dorm|dormitorio compartido/.test(value);

  if (twoBeds && privateBathroom) return 10;
  if (doubleBed && privateBathroom) return 20;
  if (twoBeds && sharedBathroom) return 30;
  if (doubleBed && sharedBathroom) return 40;
  if (triple && privateBathroom && !sharedBed) return 50;
  if (sharedBed && triple) return 60;
  return 100;
}

export function sortAvailabilityRoomTypes<T extends { roomTypeName: string }>(rooms: T[]) {
  return [...rooms].sort((a, b) => {
    const rank = availabilityRoomOrder(a.roomTypeName) - availabilityRoomOrder(b.roomTypeName);
    return rank || a.roomTypeName.localeCompare(b.roomTypeName, "es");
  });
}

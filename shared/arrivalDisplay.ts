export function translateRoomType(roomType: string | null | undefined, language: "es" | "en"): string {
  if (!roomType || language === "es") return roomType || "Habitación";
  const normalized = roomType.toLocaleLowerCase("es-ES").trim();
  const exact: Record<string, string> = {
    "habitación doble con 2 camas y baño compartido": "Twin room with shared bathroom",
    "habitación doble con cama de matrimonio y baño compartido": "Double room with shared bathroom",
    "habitación individual con baño compartido": "Single room with shared bathroom",
    "habitación triple con baño compartido": "Triple room with shared bathroom",
    "habitación cuádruple con baño compartido": "Quadruple room with shared bathroom",
    "una cama en habitación compartida mixta con 3 camas": "Single bed in a 3-bed mixed dormitory",
    "una cama en habitación compartida mixta con 4 camas": "Single bed in a 4-bed mixed dormitory",
  };
  if (exact[normalized]) return exact[normalized];
  return roomType
    .replace(/Habitación Doble/gi, "Double room")
    .replace(/Habitación Individual/gi, "Single room")
    .replace(/Habitación Triple/gi, "Triple room")
    .replace(/Habitación Cuádruple/gi, "Quadruple room")
    .replace(/baño compartido/gi, "shared bathroom")
    .replace(/cama de matrimonio/gi, "double bed")
    .replace(/camas/gi, "beds")
    .replace(/Habitación/gi, "Room");
}

export function translateFloor(floor: string | null | undefined, language: "es" | "en"): string {
  if (!floor) return "";
  if (language === "es") {
    if (/^PB$/i.test(floor)) return "Planta baja";
    return floor;
  }
  const normalized = floor.toLocaleLowerCase("es-ES").trim();
  const exact: Record<string, string> = {
    "pb": "Ground floor", "planta baja": "Ground floor", "ground floor": "Ground floor",
    "primera planta": "First floor", "1ª planta": "First floor", "first floor": "First floor",
    "segunda planta": "Second floor", "2ª planta": "Second floor", "second floor": "Second floor",
    "tercera planta": "Third floor", "3ª planta": "Third floor", "third floor": "Third floor",
  };
  return exact[normalized] || floor;
}

export function formatHostelAddress(address?: string | null): string {
  if (!address || /calle\s+adriano\s*,?\s*(n[ºo.]?\s*)?6/i.test(address)) return "Calle Adriano 6, Sevilla, Spain";
  return address;
}

export function googleMapsLink(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

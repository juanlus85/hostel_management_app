export function translateRoomType(roomType: string | null | undefined, language: "es" | "en"): string {
  if (!roomType) return language === "es" ? "Habitación" : "Room";
  const normalized = roomType.toLocaleLowerCase("es-ES").trim();
  if (language === "es") {
    const englishExact: Record<string, string> = {
      "twin room with shared bathroom": "Habitación doble con 2 camas y baño compartido",
      "twin room with private bathroom": "Habitación doble con 2 camas y baño privado",
      "double room with shared bathroom": "Habitación doble con cama de matrimonio y baño compartido",
      "double room with private bathroom": "Habitación doble con cama de matrimonio y baño privado",
      "single room with shared bathroom": "Habitación individual con baño compartido",
      "single room with private bathroom": "Habitación individual con baño privado",
      "triple room with shared bathroom": "Habitación triple con baño compartido",
      "triple room with private bathroom": "Habitación triple con baño privado",
      "bed in 3-bed mixed dormitory": "Cama en habitación compartida mixta de 3 camas",
      "single bed in a 3-bed mixed dormitory": "Cama en habitación compartida mixta de 3 camas",
      "bed in 4-bed mixed dormitory": "Cama en habitación compartida mixta de 4 camas",
      "single bed in a 4-bed mixed dormitory": "Cama en habitación compartida mixta de 4 camas",
    };
    return englishExact[normalized] || roomType;
  }
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
    const normalized = floor.toLocaleLowerCase("es-ES").trim();
    const exact: Record<string, string> = {
      "p0": "Planta baja (P0/PB)", "pb": "Planta baja (P0/PB)", "planta baja": "Planta baja (P0/PB)", "ground floor": "Planta baja (P0/PB)",
      "p1": "Primera planta (P1)", "primera planta": "Primera planta (P1)", "1ª planta": "Primera planta (P1)", "first floor": "Primera planta (P1)",
      "p2": "Segunda planta (P2)", "segunda planta": "Segunda planta (P2)", "2ª planta": "Segunda planta (P2)", "second floor": "Segunda planta (P2)",
      "p3": "Tercera planta (P3)", "tercera planta": "Tercera planta (P3)", "3ª planta": "Tercera planta (P3)", "third floor": "Tercera planta (P3)",
    };
    if (exact[normalized]) return exact[normalized];
    return floor;
  }
  const normalized = floor.toLocaleLowerCase("es-ES").trim();
  const exact: Record<string, string> = {
    "p0": "Ground floor (P0/PB)", "pb": "Ground floor (P0/PB)", "planta baja": "Ground floor (P0/PB)", "ground floor": "Ground floor (P0/PB)",
    "p1": "First floor (P1)", "primera planta": "First floor (P1)", "1ª planta": "First floor (P1)", "first floor": "First floor (P1)",
    "p2": "Second floor (P2)", "segunda planta": "Second floor (P2)", "2ª planta": "Second floor (P2)", "second floor": "Second floor (P2)",
    "p3": "Third floor (P3)", "tercera planta": "Third floor (P3)", "3ª planta": "Third floor (P3)", "third floor": "Third floor (P3)",
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

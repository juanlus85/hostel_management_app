import { describe, expect, it } from "vitest";
import { renderArrivalTemplate } from "@shared/arrivalTemplate";

describe("arrival template tags", () => {
  it("replaces guest, room and access-code tags", () => {
    const text = renderArrivalTemplate(
      "Hola {{NOMBRE_HUESPED}}, habitación {{HABITACION}}: entrada {{CODIGO_ENTRADA}}, llave {{CODIGO_HABITACION}}.",
      { guestName: "Paco", roomNumber: "15", entranceCode: "1469", roomCode: "2226" },
    );
    expect(text).toBe("Hola Paco, habitación 15: entrada 1469, llave 2226.");
  });

  it("keeps unknown tags and clears unavailable known values", () => {
    const text = renderArrivalTemplate("Wi-Fi {{WIFI}} / {{ETIQUETA_DESCONOCIDA}}", {});
    expect(text).toBe("Wi-Fi  / {{ETIQUETA_DESCONOCIDA}}");
  });
});

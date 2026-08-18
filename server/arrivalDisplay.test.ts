import { describe, expect, it } from "vitest";
import { formatHostelAddress, googleMapsLink, translateFloor, translateRoomType } from "../shared/arrivalDisplay";

describe("arrival display translations", () => {
  it("translates known room types and floors to English", () => {
    expect(translateRoomType("Habitación Doble con 2 camas y baño compartido", "en")).toBe("Twin room with shared bathroom");
    expect(translateFloor("PB", "en")).toBe("Ground floor");
  });
  it("uses a complete hostel address and Google Maps query", () => {
    const address = formatHostelAddress("Calle Adriano 6");
    expect(address).toBe("Calle Adriano 6, Sevilla, Spain");
    expect(googleMapsLink(address)).toContain("Calle%20Adriano%206%2C%20Sevilla%2C%20Spain");
  });
});

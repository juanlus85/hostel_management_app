import path from "node:path";
import { describe, expect, it } from "vitest";
import { createGuestPdfBuffer, getGuestRecordArchiveLocation, getGuestRecordPublicUrl } from "./generateGuestPDF";

describe("getGuestRecordArchiveLocation", () => {
  it("archiva cada ficha en el mes de su entrada con un nombre legible", () => {
    const result = getGuestRecordArchiveLocation(
      { firstName: "María José", lastName: "García López", checkInDate: "2026-02-09" },
      "/srv/hostel/uploads"
    );

    expect(result.directory).toBe(path.join("/srv/hostel/uploads", "registros", "02-2026"));
    expect(result.fileName).toBe("090226 - Maria Jose Garcia Lopez.pdf");
    expect(result.filePath).toBe(path.join("/srv/hostel/uploads", "registros", "02-2026", result.fileName));
  });

  it("usa la fecha de creación cuando no hay fecha de entrada", () => {
    const result = getGuestRecordArchiveLocation(
      { firstName: "Ana", lastName: "Pérez", createdAt: new Date("2026-10-03T10:00:00Z") },
      "/tmp/uploads"
    );

    expect(result.directory).toBe(path.join("/tmp/uploads", "registros", "10-2026"));
    expect(result.fileName).toBe("031026 - Ana Perez.pdf");
  });

  it("genera un PDF real para archivar el registro", () => {
    const pdf = createGuestPdfBuffer({
      firstName: "Ana",
      lastName: "Pérez",
      checkInDate: "2026-10-03",
      roomNumber: "15",
      status: "completed",
    });

    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    expect(pdf.length).toBeGreaterThan(1_000);
  });

  it("crea una URL pública codificada dentro de uploads", () => {
    expect(getGuestRecordPublicUrl("/srv/hostel/uploads/registros/10-2026/031026 - Ana Pérez.pdf", "/srv/hostel/uploads"))
      .toBe("/uploads/registros/10-2026/031026%20-%20Ana%20P%C3%A9rez.pdf");
    expect(getGuestRecordPublicUrl("/srv/hostel/private/registro.pdf", "/srv/hostel/uploads")).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import {
  nextPoliceCalendarDate,
  policeArrivalDateTime,
  policeCalendarDate,
  policeDate,
  policeDepartureDateTime,
} from "../shared/policeXmlDates";

describe("fechas del XML del Sistema de Hospedajes", () => {
  it("conserva el día almacenado sin convertirlo a UTC", () => {
    expect(policeCalendarDate("2026-10-19")).toBe("2026-10-19");
    expect(policeDate("2026-10-19")).toBe("2026-10-19+01:00");
    expect(policeArrivalDateTime("2026-10-19")).toBe(
      "2026-10-19T13:00:00.000+01:00"
    );
    expect(policeDepartureDateTime("2026-10-20")).toBe(
      "2026-10-20T11:00:00.000+01:00"
    );
  });

  it("acepta valores de fecha-hora conservando su fecha de calendario", () => {
    expect(policeCalendarDate("2026-10-19 00:00:00")).toBe("2026-10-19");
    expect(policeDate("2002-10-18")).toBe("2002-10-18+01:00");
  });

  it("calcula la salida del día siguiente sin depender de la zona horaria", () => {
    expect(nextPoliceCalendarDate("2026-10-19")).toBe("2026-10-20");
    expect(nextPoliceCalendarDate("2026-12-31")).toBe("2027-01-01");
  });
});

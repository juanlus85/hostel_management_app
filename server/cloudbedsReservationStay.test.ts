import { describe, expect, it } from "vitest";
import { preserveImportedStayDates } from "../shared/cloudbedsReservationStay";

describe("preserveImportedStayDates", () => {
  it("conserva la estancia completa si una carga diaria posterior llega incompleta", () => {
    expect(
      preserveImportedStayDates(
        { checkInDate: "2026-12-28", checkOutDate: "2027-01-04" },
        { checkInDate: "2026-12-30", checkOutDate: null }
      )
    ).toEqual({ checkInDate: "2026-12-28", checkOutDate: "2027-01-04" });
  });

  it("amplía la estancia si Cloudbeds informa una salida posterior", () => {
    expect(
      preserveImportedStayDates(
        { checkInDate: "2026-12-30", checkOutDate: "2027-01-02" },
        { checkInDate: "2026-12-28", checkOutDate: "2027-01-04" }
      )
    ).toEqual({ checkInDate: "2026-12-28", checkOutDate: "2027-01-04" });
  });
});

import { describe, expect, it } from "vitest";
import { getLoyverseOperationalWindow } from "./loyverseReceipts";

describe("jornada operativa de Loyverse", () => {
  it("calcula el intervalo de 07:00 a 06:59:59 de Sevilla en verano", () => {
    expect(getLoyverseOperationalWindow("2026-08-27")).toEqual({
      start: "2026-08-27T05:00:00.000Z",
      end: "2026-08-28T04:59:59.999Z",
    });
  });
});

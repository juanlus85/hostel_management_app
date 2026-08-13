import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";

describe("Check-in configuration routes", () => {
  it("exposes the protected settings update route used for code INE and legal URLs", () => {
    expect(appRouter._def.procedures["checkin.settings.get"]).toBeDefined();
    expect(appRouter._def.procedures["checkin.settings.update"]).toBeDefined();
  });

  it("keeps the guest detail route available for reviewing Police records", () => {
    expect(appRouter._def.procedures["checkin.guests.getById"]).toBeDefined();
    expect(appRouter._def.procedures["checkin.guests.search"]).toBeDefined();
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { buildCloudbedsAvailabilityChunks, cloudbedsRateUpdateForm, fetchCloudbedsAvailability, mergeCloudbedsAvailabilityWeeks, normalizeCloudbedsAvailability } from "./cloudbedsAvailability";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("normalizeCloudbedsAvailability", () => {
  it("normaliza precios y habitaciones disponibles por tipo y día", () => {
    const result = normalizeCloudbedsAvailability({
      data: [
        {
          roomTypeID: "double",
          roomTypeName: "Habitación Doble",
          rateID: "rate-double-base",
          detailedRates: [
            { date: "2026-10-12", roomsAvailable: "3", roomRate: "89.50" },
            { date: "2026-10-13", roomsAvailable: "2", roomRate: "99" },
          ],
        },
      ],
    }, "2026-10-12", "2026-10-18");

    expect(result.roomTypes).toEqual([
      expect.objectContaining({
        roomTypeId: "double",
        roomTypeName: "Habitación Doble",
        days: [
          expect.objectContaining({ date: "2026-10-12", roomsAvailable: 3, roomRate: 89.5, rateId: "rate-double-base" }),
          expect.objectContaining({ date: "2026-10-13", roomsAvailable: 2, roomRate: 99 }),
        ],
      }),
    ]);
  });

  it("prioriza la tarifa base sobre planes derivados del mismo tipo", () => {
    const result = normalizeCloudbedsAvailability({
      data: {
        suite: {
          roomTypeID: "suite",
          roomTypeName: "Suite",
          ratePlans: [
            {
              ratePlanID: "derived",
              ratePlanName: "Oferta anticipada",
              detailedRates: [{ date: "2026-10-12", roomsAvailable: 1, roomRate: 120 }],
            },
            {
              ratePlanID: "base",
              ratePlanName: "BAR",
              isBaseRate: true,
              detailedRates: [{ date: "2026-10-12", roomsAvailable: 1, roomRate: 150 }],
            },
          ],
        },
      }}, "2026-10-12", "2026-10-18");

    expect(result.roomTypes[0]).toMatchObject({
      roomTypeName: "Suite",
      ratePlanName: "BAR",
      days: [expect.objectContaining({ roomRate: 150, roomsAvailable: 1 })],
    });
  });

  it("lee tarifas cuando Cloudbeds las anida dentro de rates", () => {
    const result = normalizeCloudbedsAvailability({
      data: [{
        roomTypeID: "shared",
        roomTypeName: "Cama en dormitorio compartido",
        rates: [{
          ratePlanID: "bar",
          ratePlanName: "BAR",
          isBaseRate: true,
          rates: [{ date: "2026-10-12", roomsAvailable: "8", roomRate: "24.00" }],
        }],
      }],
    }, "2026-10-12", "2026-10-18");

    expect(result.roomTypes).toEqual([expect.objectContaining({
      roomTypeId: "shared",
      roomTypeName: "Cama en dormitorio compartido",
      days: [expect.objectContaining({ roomsAvailable: 8, roomRate: 24 })],
    })]);
  });

  it("lee roomRateDetailed y rateID del formato oficial de getRatePlans", () => {
    const result = normalizeCloudbedsAvailability({
      success: true,
      data: [{
        rateID: "cb-rate-42",
        isDerived: false,
        roomTypeID: "42",
        roomTypeName: "Habitación Doble",
        ratePlanNamePublic: "Tarifa base",
        roomRateDetailed: [{ date: "2026-10-12", rateBase: 76, totalRate: 76, roomsAvailable: 2, minLos: 1 }],
      }],
    }, "2026-10-12", "2026-10-18");

    expect(result.roomTypes[0]).toMatchObject({
      roomTypeId: "42",
      roomTypeName: "Habitación Doble",
      ratePlanName: "Tarifa base",
      days: [expect.objectContaining({ date: "2026-10-12", roomRate: 76, rateId: "cb-rate-42", roomsAvailable: 2 })],
    });
  });

  it("descarta días fuera del período solicitado", () => {
    const result = normalizeCloudbedsAvailability({
      data: [{
        roomTypeID: "dorm",
        roomTypeName: "Dormitorio",
        detailedRates: [
          { date: "2026-10-11", roomsAvailable: 5, roomRate: 20 },
          { date: "2026-10-12", roomsAvailable: 4, roomRate: 22 },
        ],
      }],
    }, "2026-10-12", "2026-10-18");

    expect(result.roomTypes[0]?.days).toHaveLength(1);
    expect(result.roomTypes[0]?.days[0]?.date).toBe("2026-10-12");
  });

  it("une los tramos de Cloudbeds para mostrar más de siete días", () => {
    const result = mergeCloudbedsAvailabilityWeeks([
      { startDate: "2026-10-12", endDate: "2026-10-19", roomTypes: [{ roomTypeId: "double", roomTypeName: "Doble", ratePlanName: "BAR", days: [{ date: "2026-10-12", roomsAvailable: 2, roomRate: 90, totalRate: 90, rateId: "r1", restrictions: { closedToArrival: null, closedToDeparture: null, minimumStay: null, maximumStay: null } }] }] },
      { startDate: "2026-10-19", endDate: "2026-10-26", roomTypes: [{ roomTypeId: "double", roomTypeName: "Doble", ratePlanName: "BAR", days: [{ date: "2026-10-19", roomsAvailable: 1, roomRate: 100, totalRate: 100, rateId: "r1", restrictions: { closedToArrival: null, closedToDeparture: null, minimumStay: null, maximumStay: null } }] }] },
    ], "2026-10-12", "2026-10-25");

    expect(result.roomTypes[0]?.days.map(day => day.date)).toEqual(["2026-10-12", "2026-10-19"]);
  });

  it("divide catorce días en dos consultas exactas de una semana", () => {
    expect(buildCloudbedsAvailabilityChunks("2026-10-13", "2026-10-26")).toEqual([
      { startDate: "2026-10-13", endDate: "2026-10-19" },
      { startDate: "2026-10-20", endDate: "2026-10-26" },
    ]);
  });

  it("consulta un día final adicional para evitar huecos entre semanas", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: [{
        roomTypeID: "double",
        roomTypeName: "Doble",
        rateID: "rate-double",
        detailedRates: [{ date: "2026-10-19", roomsAvailable: 2, roomRate: 99 }],
      }],
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchCloudbedsAvailability("api-key", "property", "2026-10-13", "2026-10-19");

    const request = fetchMock.mock.calls[0]?.[0] as URL;
    expect(request.searchParams.get("startDate")).toBe("2026-10-13");
    expect(request.searchParams.get("endDate")).toBe("2026-10-20");
  });

  it("reintenta una respuesta transitoria de Cloudbeds", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("<html>Temporal error</html>", { status: 504 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: [{
          roomTypeID: "double",
          roomTypeName: "Doble",
          rateID: "rate-double",
          detailedRates: [{ date: "2026-10-13", roomsAvailable: 2, roomRate: 99 }],
        }],
      }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchCloudbedsAvailability("api-key", "property", "2026-10-13", "2026-10-19")).resolves.toMatchObject({ roomTypes: [expect.anything()] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("prepara un cambio de precio para una única fecha", () => {
    const form = cloudbedsRateUpdateForm("rate-123", "2026-10-12", 85.5);
    expect(Object.fromEntries(form.entries())).toEqual({
      "rates[0][rateID]": "rate-123",
      "rates[0][interval][0][startDate]": "2026-10-12",
      "rates[0][interval][0][endDate]": "2026-10-12",
      "rates[0][interval][0][rate]": "85.5",
    });
  });

  it("explica cómo corregir una credencial sin permisos de tarifas", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: "access_denied",
      message: "The resource owner or authorization server denied the request.",
    }), { status: 401, headers: { "Content-Type": "application/json" } })));

    await expect(fetchCloudbedsAvailability("api-key", "property", "2026-10-12", "2026-10-18"))
      .rejects
      .toThrow("Renueva CLOUDBEDS_API_KEY");
  });
});

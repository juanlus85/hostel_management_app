import { afterEach, describe, expect, it, vi } from "vitest";
import {
  extractCloudbedsReservationSnapshot,
  fetchCloudbedsPaymentMethods,
  recordCloudbedsReservationPayment,
  updateCloudbedsReservationStatus,
} from "./cloudbedsReservationActions";

afterEach(() => vi.unstubAllGlobals());

describe("acciones de reserva Cloudbeds", () => {
  it("normaliza los métodos de pago devueltos por Cloudbeds", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [
      { type: "cash", paymentMethodName: "Efectivo" },
      { paymentType: "credit", name: "Tarjeta" },
    ] }), { status: 200 })));
    await expect(fetchCloudbedsPaymentMethods("cbat_test", "204754")).resolves.toEqual([
      { value: "cash", label: "Efectivo" },
      { value: "credit", label: "Tarjeta" },
    ]);
  });

  it("acepta métodos anidados y los nombres alternativos de Cloudbeds", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: {
      paymentMethods: [{ payment_method: "bank_transfer", payment_type_name: "Transferencia bancaria" }],
    } }), { status: 200 })));
    await expect(fetchCloudbedsPaymentMethods("cbat_test", "204754")).resolves.toEqual([
      { value: "bank_transfer", label: "Transferencia bancaria" },
    ]);
  });

  it("acepta métodos devueltos como mapa de claves", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ paymentMethods: {
      cash: { name: "Efectivo" },
      card: { display_name: "Tarjeta" },
    } }), { status: 200 })));
    await expect(fetchCloudbedsPaymentMethods("cbat_test", "204754")).resolves.toEqual([
      { value: "cash", label: "Efectivo" },
      { value: "card", label: "Tarjeta" },
    ]);
  });

  it("registra el pago con el método y el importe confirmados", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await recordCloudbedsReservationPayment({ apiKey: "cbat_test", propertyId: "204754", reservationId: "R-10", type: "cash", amount: 42.5, description: "Recibido en recepción" });
    expect(String(fetchMock.mock.calls[0][0])).toBe("https://api.cloudbeds.com/api/v1.3/postPayment");
    expect(fetchMock.mock.calls[0][1].method).toBe("POST");
    const body = new URLSearchParams(fetchMock.mock.calls[0][1].body);
    expect(Object.fromEntries(body.entries())).toMatchObject({ propertyID: "204754", reservationID: "R-10", type: "cash", amount: "42.50", description: "Recibido en recepción", isDeposit: "false" });
  });

  it("actualiza un estado permitido sin enviar correo automático", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await updateCloudbedsReservationStatus({ apiKey: "cbat_test", propertyId: "204754", reservationId: "R-10", status: "checked_out" });
    const body = new URLSearchParams(fetchMock.mock.calls[0][1].body);
    expect(String(fetchMock.mock.calls[0][0])).toBe("https://api.cloudbeds.com/api/v1.3/putReservation");
    expect(fetchMock.mock.calls[0][1].method).toBe("PUT");
    expect(Object.fromEntries(body.entries())).toMatchObject({ reservationID: "R-10", status: "checked_out", sendStatusChangeEmail: "false" });
  });

  it("lee estado y saldo tras actualizar Cloudbeds", () => {
    expect(extractCloudbedsReservationSnapshot({ reservation: { reservation_status: "checked_in", balanceDue: "14.50" } })).toEqual({ reservationStatus: "checked_in", amountPending: "14.50", hotelCollect: null });
  });

  it("identifica las reservas Hotel Collect en los términos de cobro", () => {
    expect(extractCloudbedsReservationSnapshot({ reservation: { payment_collection: "Hotel Collect" } }).hotelCollect).toBe(true);
    expect(extractCloudbedsReservationSnapshot({ reservation: { isHotelCollect: false } }).hotelCollect).toBe(false);
  });
});

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

  it("lee estado, saldo y huésped fiscal de Cloudbeds", () => {
    expect(extractCloudbedsReservationSnapshot({ reservation: { reservation_status: "checked_in", balanceDue: "14.50", guestID: 42 } })).toMatchObject({ reservationStatus: "checked_in", amountPending: "14.50", hotelCollect: null, guestId: 42 });
    expect(extractCloudbedsReservationSnapshot({ data: { guests: [{ guestId: "61" }] } }).guestId).toBe(61);
  });

  it("extrae dirección y método de pago para completar el registro de recepción", () => {
    const snapshot = extractCloudbedsReservationSnapshot({ reservation: {
      payment_method_name: "Tarjeta Booking",
      guests: [{
        first_name: "Ana",
        last_name: "Pérez",
        email_address: "ana@example.com",
        phone_number: "+34600000000",
        address: { address1: "Calle Adriano 6", address2: "2º A", postal_code: "41001", city: "Sevilla", province: "Sevilla", country_code: "ESP" },
      }],
      rooms: [{ room_name: "Habitación 51", room_type_name: "Double Room with Private Bathroom" }],
    } });
    expect(snapshot.guest).toEqual({ firstName: "Ana", lastName: "Pérez", email: "ana@example.com", phone: "+34600000000", street: "Calle Adriano 6", addressExtra: "2º A", postalCode: "41001", city: "Sevilla", province: "Sevilla", country: "ESP" });
    expect(snapshot.paymentMethod).toBe("Tarjeta Booking");
    expect(snapshot.roomNumber).toBe("Habitación 51");
    expect(snapshot.roomType).toBe("Double Room with Private Bathroom");
  });

  it("identifica las reservas Hotel Collect en los términos de cobro", () => {
    expect(extractCloudbedsReservationSnapshot({ reservation: { payment_collection: "Hotel Collect" } }).hotelCollect).toBe(true);
    expect(extractCloudbedsReservationSnapshot({ reservation: { isHotelCollect: false } }).hotelCollect).toBe(false);
  });

  it("extrae pago de canal, membresía e instrucciones especiales", () => {
    expect(extractCloudbedsReservationSnapshot({ reservation: {
      reservationPaidByChannel: true,
      membership: "Booking.com Genius",
      specialInstructions: "*** Genius booker *** This reservation has already been paid ***",
    } })).toMatchObject({
      hotelCollect: null,
      paymentCollection: "Pagada al canal · prepago",
      channelPaymentStatus: "Reserva prepagada al canal",
      channelMembership: "Booking.com Genius",
      specialInstructions: "*** Genius booker *** This reservation has already been paid ***",
    });
  });

  it("reconoce el prepago de Booking dentro de una respuesta anidada", () => {
    expect(extractCloudbedsReservationSnapshot({ data: { reservation: {
      source_name: "Booking.com",
      booking_instructions: "*** Genius booker *** THIS RESERVATION HAS BEEN PRE-PAID ***",
    } } })).toMatchObject({
      paymentCollection: "Pagada al canal · prepago",
      channelPaymentStatus: "Reserva prepagada al canal",
      specialInstructions: "*** Genius booker *** THIS RESERVATION HAS BEEN PRE-PAID ***",
    });
  });
});

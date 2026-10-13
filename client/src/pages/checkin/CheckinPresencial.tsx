import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { Download, FileCheck2, Loader2, Plus, Printer, Save } from "lucide-react";
import { toast } from "sonner";
import { COUNTRIES, PAYMENT_TYPES } from "@/../../shared/countries";
import { requiresDocumentSupport } from "@shared/documentSupport";
import { isBirthDateAtLeastOneYearAgo, isMinor } from "@shared/guestAge";
import { GuestFormFields, type GuestFormData } from "@/components/checkin/GuestFormFields";

type InitialGuest = Record<string, any>;

type CheckinPresencialProps = {
  initialGuest?: InitialGuest | null;
  onCompleted?: () => void;
  showArchiveConfirmation?: boolean;
  preloadSource?: "anticipado" | "reserva";
};

export default function CheckinPresencial({ initialGuest, onCompleted, showArchiveConfirmation = false, preloadSource = "anticipado" }: CheckinPresencialProps) {
  const [language, setLanguage] = useState<"es" | "en">(initialGuest?.language === "en" ? "en" : "es");
  const [guests, setGuests] = useState<GuestFormData[]>([
    {
      firstName: initialGuest?.firstName || "",
      lastName: initialGuest?.lastName || "",
      documentNumber: initialGuest?.documentNumber || "",
      documentType: initialGuest?.documentType || "PAS",
      supportNumber: initialGuest?.documentSupport || "",
      gender: initialGuest?.gender || "Hombre",
      nationality: initialGuest?.nationality || "ESP",
      nationalityOther: "",
      birthDate: initialGuest?.birthDate || "",
      phone: initialGuest?.phone || "",
      email: initialGuest?.email || "",
      relationship: initialGuest?.relationship || "",
    },
  ]);

  // Dirección compartida
  const [sharedAddress, setSharedAddress] = useState({
    street: initialGuest?.street || "",
    addressExtra: initialGuest?.addressExtra || "",
    postalCode: initialGuest?.postalCode || "",
    city: initialGuest?.city || "",
    province: initialGuest?.province || "",
    country: initialGuest?.country || "ESP",
  });

  // Información de reserva
  const [reservationData, setReservationData] = useState({
    reservationNumber: initialGuest?.reservationNumber || "",
    checkInDate: initialGuest?.checkInDate ? `${String(initialGuest.checkInDate).slice(0, 10)}T14:00` : new Date().toISOString().slice(0, 16),
    checkOutDate: initialGuest?.checkOutDate ? `${String(initialGuest.checkOutDate).slice(0, 10)}T11:00` : "",
    roomNumber: initialGuest?.roomNumber || "",
    roomType: initialGuest?.roomType || "",
    roomCode: initialGuest?.roomCode || "",
    entranceCode: initialGuest?.entranceCode || "",
    numberOfRooms: initialGuest?.numberOfRooms || 1,
    hasInternet: true,
    accommodationType: initialGuest?.accommodationType || "S.A. (Solo Aloj.)",
    reservationOrigin: initialGuest?.reservationOrigin || "Booking.com",
  });

  // Auto-calcular fecha de salida (+1 día a las 11:00)
  useEffect(() => {
    if (reservationData.checkInDate && !initialGuest?.checkOutDate) {
      const checkIn = new Date(reservationData.checkInDate);
      const checkOut = new Date(checkIn);
      checkOut.setDate(checkOut.getDate() + 1);
      checkOut.setHours(11, 0, 0, 0); // 11:00 AM
      setReservationData(prev => ({
        ...prev,
        checkOutDate: checkOut.toISOString().slice(0, 16)
      }));
    }
  }, [reservationData.checkInDate, initialGuest?.checkOutDate]);

  // Información de pago (OBLIGATORIA según normativa)
  const [paymentData, setPaymentData] = useState({
    paymentType: initialGuest?.paymentType || "TRANS",
    paymentDate: initialGuest?.paymentDate || new Date().toISOString().split("T")[0],
    amountPaid: initialGuest?.amountPaid || "0",
    amountPending: initialGuest?.amountPending || "0",
    paymentHolder: initialGuest?.paymentHolder || "",
    paymentMethod: initialGuest?.paymentMethod || "Transferencia Booking",
  });

  // Auto-rellenar titular del pago con nombre del huésped principal
  useEffect(() => {
    if (guests[0]?.firstName && guests[0]?.lastName) {
      setPaymentData(prev => ({
        ...prev,
        paymentHolder: `${guests[0].firstName} ${guests[0].lastName}`
      }));
    }
  }, [guests]);

  // Auto-actualizar fecha de pago con fecha de entrada
  useEffect(() => {
    if (reservationData.checkInDate) {
      setPaymentData(prev => ({
        ...prev,
        paymentDate: reservationData.checkInDate.split("T")[0]
      }));
    }
  }, [reservationData.checkInDate]);

  // Firma digital
  const [signature, setSignature] = useState(initialGuest?.signature || "");
  const [completedPdfUrl, setCompletedPdfUrl] = useState<string | null>(null);
  const [isCheckinSaved, setIsCheckinSaved] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(Boolean(initialGuest?.acceptedTerms));

  const { data: rooms } = trpc.accessCodes.list.useQuery(undefined, {
    retry: false,
  });
  const { data: settings } = trpc.checkin.settings.get.useQuery();
  const createGuest = trpc.checkin.guests.create.useMutation();
  const updateGuestRecord = trpc.checkin.guests.update.useMutation();
  const t = language === "en" ? {
    welcome: "Welcome to our home", booking: "Booking details", guests: "Guests", reservationNumber: "Reservation number", room: "Room", roomType: "Room type", arrival: "Arrival date and time", departure: "Departure date and time", board: "Board basis", origin: "Booking source", internet: "Internet", address: "Address (shared by all guests)", street: "Street and number", extra: "Additional address details", postalCode: "Postcode", city: "City", province: "Province", country: "Country", addGuest: "Add guest", payment: "Payment details", paymentType: "Payment type", paymentDate: "Payment date", paid: "Amount paid (€)", pending: "Amount pending (€)", holder: "Payment holder", method: "Payment method", terms: "Terms and signature", accept: "I accept the establishment conditions and privacy policy", signature: "Signature", signHere: "Sign here", clear: "Clear signature", save: "Complete check-in", saving: "Saving…", saved: "Check-in saved successfully", close: "Close", bookingData: "Data retrieved from the Cloudbeds reservation", earlyData: "Data retrieved from the early check-in", review: "Review the information, complete what is needed and confirm the registration. The assigned room is kept for reception only.", roomPlaceholder: "Select room", importedRoom: "Imported from Cloudbeds", addressPlaceholder: "Main Street, 123", extraPlaceholder: "Floor, door, etc.", holderPlaceholder: "Name and surname", methodPlaceholder: "Visa, Mastercard, PayPal, etc.", priorSignature: "The signature supplied previously will be kept if a new one is not made.",
  } : {
    welcome: "Bienvenido/a a nuestro hostel", booking: "Información de reserva", guests: "Huéspedes", reservationNumber: "Número de reserva", room: "Habitación", roomType: "Tipo de habitación", arrival: "Fecha y hora de entrada", departure: "Fecha y hora de salida", board: "Régimen", origin: "Origen de reserva", internet: "Internet", address: "Dirección (compartida por todos los huéspedes)", street: "Calle y número", extra: "Información adicional", postalCode: "Código postal", city: "Ciudad", province: "Provincia", country: "País", addGuest: "Añadir huésped", payment: "Información de pago", paymentType: "Tipo de pago", paymentDate: "Fecha de pago", paid: "Cantidad abonada (€)", pending: "Cantidad pendiente (€)", holder: "Titular del pago", method: "Medio de pago", terms: "Condiciones y firma", accept: "Acepto las condiciones del establecimiento y la política de protección de datos", signature: "Firma", signHere: "Firme aquí", clear: "Borrar firma", save: "Completar Check-in", saving: "Guardando…", saved: "Check-in guardado correctamente", close: "Cerrar", bookingData: "Datos recuperados de la reserva de Cloudbeds", earlyData: "Datos recuperados del Check-in anticipado", review: "Revisa la información, completa lo necesario y confirma el registro. La habitación asignada se conserva solo para recepción.", roomPlaceholder: "Seleccionar habitación", importedRoom: "Importada de Cloudbeds", addressPlaceholder: "Calle Principal, 123", extraPlaceholder: "Piso, puerta, etc.", holderPlaceholder: "Nombre y apellidos", methodPlaceholder: "Visa, Mastercard, PayPal, etc.", priorSignature: "La firma aportada previamente se conservará si no se realiza una nueva.",
  };

  // Auto-completar tipo de habitación al seleccionar número
  useEffect(() => {
    if (reservationData.roomNumber && rooms) {
      const selectedRoom = rooms.find(r => r.roomNumber === reservationData.roomNumber);
      if (selectedRoom) {
        setReservationData(prev => ({
          ...prev,
          roomType: selectedRoom.roomType,
          roomCode: selectedRoom.roomCode,
          entranceCode: selectedRoom.entranceCode || "",
        }));
      }
    }
  }, [reservationData.roomNumber, rooms]);

  // Inicializar canvas de firma
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Ajustar dimensiones del canvas al tamaño del contenedor
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = 200; // Altura fija
      
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
      }
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    
    return () => window.removeEventListener("resize", resizeCanvas);
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setSignature(canvas.toDataURL());
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setSignature("");
    }
  };

  const addGuest = () => {
    if (guests.length >= 3) {
      toast.error("Máximo 3 huéspedes por reserva");
      return;
    }

    setGuests([
      ...guests,
      {
        firstName: "",
        lastName: "",
        documentNumber: "",
        documentType: "PAS",
        supportNumber: "",
        gender: "Hombre",
        nationality: "ESP",
        nationalityOther: "",
        birthDate: "",
        phone: "",
        email: "",
      },
    ]);
  };

  const removeGuest = (index: number) => {
    if (guests.length === 1) {
      toast.error("Debe haber al menos un huésped");
      return;
    }
    setGuests(guests.filter((_, i) => i !== index));
  };

  const updateGuest = (index: number, field: keyof GuestFormData, value: string) => {
    const newGuests = [...guests];
    const updatedGuest = { ...newGuests[index], [field]: value };
    newGuests[index] = requiresDocumentSupport(updatedGuest.documentType, updatedGuest.nationality)
      ? updatedGuest
      : { ...updatedGuest, supportNumber: "" };
    setGuests(newGuests);
  };

  const handleSubmit = async () => {
    // Validar campos obligatorios
    if (!reservationData.checkInDate) {
      toast.error("La fecha de entrada es obligatoria");
      return;
    }

    if (!reservationData.roomNumber) {
      toast.error("Debe seleccionar una habitación");
      return;
    }

    if (!paymentData.paymentType) {
      toast.error("El tipo de pago es obligatorio");
      return;
    }

    if (!paymentData.paymentDate) {
      toast.error("La fecha de pago es obligatoria");
      return;
    }

    // Validar huéspedes
    for (let i = 0; i < guests.length; i++) {
      const guest = guests[i];
      if (!guest.firstName || !guest.lastName || !guest.documentNumber) {
        toast.error(`Complete los datos del huésped ${i + 1}`);
        return;
      }

      if (!guest.birthDate) {
        toast.error(`La fecha de nacimiento del huésped ${i + 1} es obligatoria`);
        return;
      }

      if (!isBirthDateAtLeastOneYearAgo(guest.birthDate)) {
        toast.error(`La fecha de nacimiento del huésped ${i + 1} debe tener al menos un año de antigüedad`);
        return;
      }

      if (isMinor(guest.birthDate) && !guest.relationship) {
        toast.error(`Indique el parentesco del huésped menor de edad ${i + 1}`);
        return;
      }

      if (!guest.nationality) {
        toast.error(`La nacionalidad del huésped ${i + 1} es obligatoria`);
        return;
      }

      if (requiresDocumentSupport(guest.documentType, guest.nationality) && !guest.supportNumber.trim()) {
        toast.error(`El número de soporte del huésped ${i + 1} es obligatorio para DNI/NIF y NIE`);
        return;
      }

      if (guest.nationality === "OTRO" && !guest.nationalityOther) {
        toast.error(`Especifique la nacionalidad del huésped ${i + 1}`);
        return;
      }
    }

    // Validar dirección compartida
    if (!sharedAddress.street || !sharedAddress.city || !sharedAddress.country) {
      toast.error("Complete la dirección de los huéspedes");
      return;
    }

    // Validar aceptación de condiciones
    if (!acceptedTerms) {
      toast.error("Debe aceptar las condiciones del establecimiento y la política de protección de datos");
      return;
    }

    // Validar firma del huésped principal
    if (!signature) {
      toast.error("El huésped principal debe firmar");
      return;
    }

    // Mantener el grupo original cuando recepción termina un Check-in anticipado.
    const groupId = initialGuest?.groupId || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      let archivedPdfUrl: string | null = null;
      // Guardar cada huésped
      for (let i = 0; i < guests.length; i++) {
        const guest = guests[i];
        const isMainGuest = i === 0;
        const guestData = {
          // Datos personales
          firstName: guest.firstName,
          lastName: guest.lastName,
          documentNumber: guest.documentNumber,
          documentType: guest.documentType,
          documentSupport: requiresDocumentSupport(guest.documentType, guest.nationality) ? guest.supportNumber.trim() : undefined,
          gender: guest.gender as "Hombre" | "Mujer" | "Otro",
          nationality: guest.nationality === "OTRO" ? guest.nationalityOther : guest.nationality,
          birthDate: guest.birthDate,
          relationship: isMinor(guest.birthDate) ? guest.relationship as "HJ" | "NI" | "SB" | "PM" | "AB" | "HR" | "TU" | "OT" : undefined,
          
          // Dirección compartida
          street: sharedAddress.street,
          addressExtra: sharedAddress.addressExtra || undefined,
          postalCode: sharedAddress.postalCode || undefined,
          city: sharedAddress.city,
          province: sharedAddress.province || undefined,
          country: sharedAddress.country,
          
          // Contacto
          phone: guest.phone || undefined,
          email: guest.email || undefined,
          
          // Reserva
          reservationNumber: reservationData.reservationNumber || undefined,
          checkInDate: reservationData.checkInDate.split("T")[0], // Convertir YYYY-MM-DDTHH:MM a YYYY-MM-DD
          checkOutDate: reservationData.checkOutDate ? reservationData.checkOutDate.split("T")[0] : undefined,
          roomNumber: reservationData.roomNumber,
          roomType: reservationData.roomType || undefined,
          roomCode: reservationData.roomCode || undefined,
          entranceCode: reservationData.entranceCode || undefined,
          numberOfRooms: reservationData.numberOfRooms,
          hasInternet: reservationData.hasInternet,
          accommodationType: reservationData.accommodationType as any,
          reservationOrigin: reservationData.reservationOrigin as any,
          
          // Pago
          paymentType: paymentData.paymentType as any,
          paymentDate: paymentData.paymentDate,
          amountPaid: paymentData.amountPaid ? paymentData.amountPaid : "0",
          amountPending: paymentData.amountPending ? paymentData.amountPending : "0",
          paymentHolder: paymentData.paymentHolder || undefined,
          paymentMethod: paymentData.paymentMethod || undefined,
          
          // Grupo y firma
          numberOfGuests: guests.length,
          signature: isMainGuest ? signature : undefined,
          isMainGuest,
          groupId,
          status: "completed" as const,
          checkinType: "presencial" as const,
        };

        // El primer huésped anticipado ya existe: se completa su ficha y se
        // conservan los datos previamente aportados, incluida su habitación.
        if (initialGuest?.id && isMainGuest) {
          const { checkinType: _checkinType, groupId: _groupId, isMainGuest: _isMainGuest, ...updateData } = guestData;
          const result = await updateGuestRecord.mutateAsync({
            id: initialGuest.id,
            ...updateData,
          });
          archivedPdfUrl = result.recordPdfUrl || archivedPdfUrl;
        } else {
          const result = await createGuest.mutateAsync(guestData);
          if (isMainGuest) archivedPdfUrl = result.recordPdfUrl || archivedPdfUrl;
        }
      }

      toast.success(`Check-in completado: ${guests.length} huésped(es) registrado(s)`);

      if (initialGuest) {
        if (showArchiveConfirmation) {
          setCompletedPdfUrl(archivedPdfUrl);
          setIsCheckinSaved(true);
          return;
        }
        onCompleted?.();
        return;
      }
      
      // Limpiar formulario
      setGuests([
        {
          firstName: "",
          lastName: "",
          documentNumber: "",
          documentType: "PAS",
          supportNumber: "",
          gender: "Hombre",
          nationality: "ESP",
          nationalityOther: "",
          birthDate: "",
          phone: "",
          email: "",
        },
      ]);
      setSharedAddress({
        street: "",
        addressExtra: "",
        postalCode: "",
        city: "",
        province: "",
        country: "ESP",
      });
      setReservationData({
        reservationNumber: "",
        checkInDate: "",
        checkOutDate: "",
        roomNumber: "",
        roomType: "",
        roomCode: "",
        entranceCode: "",
        numberOfRooms: 1,
        hasInternet: true,
        accommodationType: "S.A. (Solo Aloj.)",
        reservationOrigin: "Booking.com",
      });
      setPaymentData({
        paymentType: "TRANS",
        paymentDate: new Date().toISOString().split("T")[0],
        amountPaid: "",
        amountPending: "",
        paymentHolder: "",
        paymentMethod: "",
      });
      clearSignature();
    } catch (error: any) {
      toast.error(error.message || "Error al registrar el check-in");
    }
  };

  if (!settings) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isCheckinSaved) {
    const printRecord = () => {
      if (!completedPdfUrl) return;
      const popup = window.open(completedPdfUrl, "_blank", "noopener,noreferrer");
      if (!popup) toast.error("El navegador bloqueó la ventana de impresión. Permite las ventanas emergentes e inténtalo de nuevo.");
    };
    return <Card className="mx-3 border-emerald-200 bg-emerald-50 p-5 text-center sm:mx-0 sm:p-8">
      <FileCheck2 className="mx-auto h-11 w-11 text-emerald-700" />
      <h2 className="mt-3 text-xl font-bold text-emerald-950">{t.saved}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-emerald-900">Los datos se han registrado y la ficha PDF se ha guardado automáticamente en el servidor, dentro de <strong>uploads/registros</strong> y su carpeta mensual.</p>
      {completedPdfUrl ? <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row"><a href={completedPdfUrl} download className="inline-flex h-10 items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-800"><Download className="mr-2 h-4 w-4" />Guardar PDF</a><Button type="button" variant="outline" onClick={printRecord}><Printer className="mr-2 h-4 w-4" />Abrir / imprimir PDF</Button></div> : <p className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">El Check-in se guardó, pero no se pudo confirmar el enlace al PDF. Revisa la carpeta local <strong>uploads/registros</strong>.</p>}
      <Button type="button" variant="ghost" className="mt-4" onClick={onCompleted}>{t.close}</Button>
    </Card>;
  }

  return (
    <div className="w-full min-w-0 space-y-4 overflow-x-hidden px-3 py-4 sm:space-y-6 sm:p-0">
      {/* Header */}
      <Card className="min-w-0 gap-3 p-4 sm:p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
        <div className="flex flex-col gap-3 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <div><h1 className="text-2xl font-bold sm:text-3xl">{t.welcome}</h1>
          <p className="text-lg text-muted-foreground">
            {settings.hostelName || "Hostel"} • RTA: {settings.hostelRta || "N/A"}
          </p>
          </div>
          <div className="inline-flex self-center rounded-lg border bg-background/80 p-1 text-sm font-medium sm:self-auto" aria-label="Seleccionar idioma / Select language"><Button type="button" size="sm" variant={language === "es" ? "default" : "ghost"} onClick={() => setLanguage("es")}>ES</Button><Button type="button" size="sm" variant={language === "en" ? "default" : "ghost"} onClick={() => setLanguage("en")}>EN</Button></div>
        </div>
      </Card>

      {initialGuest && (
        <Card className="min-w-0 gap-2 border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
          <p className="font-semibold">{preloadSource === "reserva" ? t.bookingData : t.earlyData}</p>
          <p className="mt-1">{t.review}</p>
        </Card>
      )}

      <nav aria-label="Navegación de Check-in" className="flex gap-2 overflow-x-auto rounded-lg border bg-muted/35 p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {[
          ["booking-section", t.booking],
          ["address-section", language === "en" ? "Address" : "Dirección"],
          ["guests-section", t.guests],
          ["payment-section", t.payment],
          ["signature-section", t.signature],
        ].map(([id, label]) => <Button key={id} type="button" variant="outline" size="sm" className="shrink-0 bg-background" onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })}>{label}</Button>)}
      </nav>

      {/* Información de Reserva */}
      <Card id="booking-section" className="min-w-0 scroll-mt-4 p-4 sm:p-6">
        <h2 className="mb-4 text-xl font-bold">{t.booking}</h2>
        <div className="grid min-w-0 grid-cols-1 gap-4 [&>div]:min-w-0 md:grid-cols-2">
          <div>
            <Label htmlFor="reservationNumber">{t.reservationNumber}</Label>
            <Input
              id="reservationNumber"
              value={reservationData.reservationNumber}
              onChange={(e) => setReservationData({ ...reservationData, reservationNumber: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="roomNumber">{t.room} *</Label>
            <Select
              value={reservationData.roomNumber}
              onValueChange={(value) => setReservationData({ ...reservationData, roomNumber: value })}
            >
              <SelectTrigger className="w-full min-w-0">
                <SelectValue placeholder={t.roomPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {reservationData.roomNumber && !rooms?.some(room => room.roomNumber === reservationData.roomNumber) && (
                  <SelectItem value={reservationData.roomNumber}>
                    {t.room} {reservationData.roomNumber} · {t.importedRoom}
                  </SelectItem>
                )}
                {rooms?.map((room) => (
                  <SelectItem key={room.id} value={room.roomNumber}>
                    {t.room} {room.roomNumber} - {room.roomType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="roomType">{t.roomType}</Label>
            <Input
              id="roomType"
              value={reservationData.roomType}
              disabled
              className="bg-muted"
            />
          </div>

          <div>
            <Label htmlFor="checkInDate">{t.arrival} *</Label>
            <Input
              id="checkInDate"
              type="datetime-local"
              value={reservationData.checkInDate}
              onChange={(e) => setReservationData({ ...reservationData, checkInDate: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="checkOutDate">{t.departure}</Label>
            <Input
              id="checkOutDate"
              type="datetime-local"
              value={reservationData.checkOutDate}
              onChange={(e) => setReservationData({ ...reservationData, checkOutDate: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="accommodationType">{t.board}</Label>
            <Select
              value={reservationData.accommodationType}
              onValueChange={(value) => setReservationData({ ...reservationData, accommodationType: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="S.A. (Solo Aloj.)">S.A. ({language === "en" ? "Room only" : "Solo alojamiento"})</SelectItem>
                <SelectItem value="A.D. (Aloj. y Desayuno)">A.D. ({language === "en" ? "Bed and breakfast" : "Alojamiento y desayuno"})</SelectItem>
                <SelectItem value="M.P. (Media Pensión)">M.P. ({language === "en" ? "Half board" : "Media pensión"})</SelectItem>
                <SelectItem value="P.C. (Pensión Completa)">P.C. ({language === "en" ? "Full board" : "Pensión completa"})</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="reservationOrigin">{t.origin}</Label>
            <Select
              value={reservationData.reservationOrigin}
              onValueChange={(value) => setReservationData({ ...reservationData, reservationOrigin: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Walk In">{language === "en" ? "Walk-in" : "Recepción directa"}</SelectItem>
                <SelectItem value="Booking.com">Booking.com</SelectItem>
                <SelectItem value="Airbnb">Airbnb</SelectItem>
                <SelectItem value="Expedia">Expedia</SelectItem>
                <SelectItem value="Website">{language === "en" ? "Website" : "Web"}</SelectItem>
                <SelectItem value="Phone">{language === "en" ? "Phone" : "Teléfono"}</SelectItem>
                <SelectItem value="Email">Email</SelectItem>
                <SelectItem value="Other">{language === "en" ? "Other" : "Otro"}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="hasInternet"
              checked={reservationData.hasInternet}
              onCheckedChange={(checked) => setReservationData({ ...reservationData, hasInternet: checked as boolean })}
            />
            <Label htmlFor="hasInternet">{t.internet}</Label>
          </div>
        </div>
      </Card>

      {/* Dirección Compartida */}
      <Card id="address-section" className="min-w-0 scroll-mt-4 p-4 sm:p-6">
        <h2 className="mb-4 text-xl font-bold">{t.address} *</h2>
        <div className="grid min-w-0 grid-cols-1 gap-4 [&>div]:min-w-0 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label htmlFor="street">{t.street} *</Label>
            <Input
              id="street"
              value={sharedAddress.street}
              onChange={(e) => setSharedAddress({ ...sharedAddress, street: e.target.value })}
              placeholder={t.addressPlaceholder}
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="addressExtra">{t.extra}</Label>
            <Input
              id="addressExtra"
              value={sharedAddress.addressExtra}
              onChange={(e) => setSharedAddress({ ...sharedAddress, addressExtra: e.target.value })}
              placeholder={t.extraPlaceholder}
            />
          </div>

          <div>
            <Label htmlFor="postalCode">{t.postalCode}</Label>
            <Input
              id="postalCode"
              value={sharedAddress.postalCode}
              onChange={(e) => setSharedAddress({ ...sharedAddress, postalCode: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="city">{t.city} *</Label>
            <Input
              id="city"
              value={sharedAddress.city}
              onChange={(e) => setSharedAddress({ ...sharedAddress, city: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="province">{t.province}</Label>
            <Input
              id="province"
              value={sharedAddress.province}
              onChange={(e) => setSharedAddress({ ...sharedAddress, province: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="country">{t.country} *</Label>
            <Select
              value={sharedAddress.country}
              onValueChange={(value) => setSharedAddress({ ...sharedAddress, country: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((country) => (
                  <SelectItem key={country.code} value={country.code}>
                    {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Huéspedes */}
      <section id="guests-section" className="scroll-mt-4 space-y-4">
        {guests.map((guest, index) => (
          <GuestFormFields
            key={index}
            guest={guest}
            index={index}
            removable={index > 0}
            language={language}
            onChange={(field, value) => updateGuest(index, field, value)}
            onRemove={() => removeGuest(index)}
          />
        ))}

        {guests.length < 3 && (
          <Button onClick={addGuest} variant="outline" className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            {t.addGuest} ({guests.length}/3)
          </Button>
        )}
      </section>

      {/* Información de Pago (OBLIGATORIA) */}
      <Card id="payment-section" className="min-w-0 scroll-mt-4 p-4 sm:p-6">
        <h2 className="mb-4 text-xl font-bold">{t.payment} *</h2>
        <div className="grid min-w-0 grid-cols-1 gap-4 [&>div]:min-w-0 md:grid-cols-2">
          <div>
            <Label htmlFor="paymentType">{t.paymentType} *</Label>
            <Select
              value={paymentData.paymentType}
              onValueChange={(value) => setPaymentData({ ...paymentData, paymentType: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EFECT">{language === "en" ? "Cash" : "Efectivo"}</SelectItem>
                <SelectItem value="TARJT">{language === "en" ? "Card" : "Tarjeta"}</SelectItem>
                <SelectItem value="TRANS">{language === "en" ? "Bank transfer" : "Transferencia"}</SelectItem>
                <SelectItem value="PLATF">{language === "en" ? "Platform (Booking, Airbnb...)" : "Plataforma (Booking, Airbnb...)"}</SelectItem>
                <SelectItem value="MOVIL">{language === "en" ? "Mobile payment (Bizum, PayPal...)" : "Pago móvil (Bizum, PayPal...)"}</SelectItem>
                <SelectItem value="TREG">{language === "en" ? "Gift transfer" : "Transferencia regalo"}</SelectItem>
                <SelectItem value="DESTI">{language === "en" ? "Destination" : "Destino"}</SelectItem>
                <SelectItem value="OTRO">{language === "en" ? "Other" : "Otro"}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="paymentDate">{t.paymentDate} *</Label>
            <Input
              id="paymentDate"
              type="date"
              value={paymentData.paymentDate}
              onChange={(e) => setPaymentData({ ...paymentData, paymentDate: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="amountPaid">{t.paid}</Label>
            <Input
              id="amountPaid"
              type="number"
              step="0.01"
              value={paymentData.amountPaid}
              onChange={(e) => setPaymentData({ ...paymentData, amountPaid: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="amountPending">{t.pending}</Label>
            <Input
              id="amountPending"
              type="number"
              step="0.01"
              value={paymentData.amountPending}
              onChange={(e) => setPaymentData({ ...paymentData, amountPending: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="paymentHolder">{t.holder}</Label>
            <Input
              id="paymentHolder"
              value={paymentData.paymentHolder}
              onChange={(e) => setPaymentData({ ...paymentData, paymentHolder: e.target.value })}
              placeholder={t.holderPlaceholder}
            />
          </div>

          <div>
            <Label htmlFor="paymentMethod">{t.method}</Label>
            <Input
              id="paymentMethod"
              value={paymentData.paymentMethod}
              onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
              placeholder={t.methodPlaceholder}
            />
          </div>

          {paymentData.paymentType === "TARJT" && (
            <div>
              <Label htmlFor="cardExpiry">{language === "en" ? "Card expiry date" : "Fecha de caducidad de tarjeta"}</Label>
              <Input
                id="cardExpiry"
                value={paymentData.paymentMethod}
                onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
                placeholder="MM/AAAA"
              />
            </div>
          )}
        </div>
      </Card>

      {/* Condiciones y Firma */}
      <Card id="signature-section" className="min-w-0 scroll-mt-4 p-4 sm:p-6">
        <h2 className="mb-4 text-xl font-bold">{t.terms}</h2>
        
        {/* Texto de condiciones */}
        <div className="mb-6 space-y-4 p-4 bg-muted rounded-lg">
          <div>
            <p className="text-sm">{language === "en" ? "The guests state that they have read, know, undertake and agree to comply with the rules and conditions of the establishment." : "Los huéspedes manifiestan que han leído, conocen y se comprometen a cumplir las normas y condiciones del establecimiento."}</p>
          </div>
          
          <div>
            <p className="text-sm">{language === "en" ? "The guests state that they have read, know, undertake and agree to comply with the rules and conditions of the establishment. These are available to the guests, displayed at the reception of the establishment." : "Los huéspedes manifiestan que han leído, conocen y se comprometen a cumplir las normas y condiciones del establecimiento. Éstas se encuentran a disposición del huésped, expuestas en la recepción del establecimiento."}</p>
          </div>
        </div>

        {/* Checkbox de aceptación */}
        <div className="mb-6 flex items-start space-x-3 p-4 border-2 border-primary/20 rounded-lg bg-primary/5">
          <Checkbox
            id="acceptTerms"
            checked={acceptedTerms}
            onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
            className="mt-1"
          />
          <label
            htmlFor="acceptTerms"
            className="text-sm font-medium leading-relaxed cursor-pointer"
          >
            {t.accept} *
          </label>
        </div>

        {/* Firma */}
        <div className="space-y-4">
          <Label className="text-base font-semibold">{t.signature} *</Label>
          {initialGuest?.signature && !isDrawing && (
            <p className="text-sm text-emerald-700">{t.priorSignature}</p>
          )}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-white">
            <canvas
              ref={canvasRef}
              className="w-full touch-none border border-gray-200"
              style={{ height: "200px" }}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            <p className="text-xs text-muted-foreground text-center mt-2">
              {t.signHere}
            </p>
          </div>
          <Button variant="outline" onClick={clearSignature}>
            {t.clear}
          </Button>
        </div>
      </Card>

      {/* Botón de Guardar */}
      <div className="sticky bottom-0 -mx-3 flex justify-stretch border-t bg-background/95 px-3 py-3 backdrop-blur sm:static sm:mx-0 sm:justify-end sm:border-0 sm:bg-transparent sm:p-0">
        <Button
          onClick={handleSubmit}
          disabled={createGuest.isPending || updateGuestRecord.isPending}
          size="lg"
          className="w-full sm:w-auto"
        >
          {createGuest.isPending || updateGuestRecord.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t.saving}
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              {t.save}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

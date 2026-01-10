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
import { Loader2, Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { COUNTRIES, getAllowedDocumentTypes, PAYMENT_TYPES, GENDER_CODES } from "@/../../shared/countries";

interface GuestData {
  firstName: string;
  lastName: string;
  documentNumber: string;
  documentType: string;
  gender: string;
  nationality: string;
  nationalityOther: string; // Campo libre cuando selecciona "Otro"
  birthDate: string;
  phone: string;
  email: string;
}

export default function CheckinPresencial() {
  const [guests, setGuests] = useState<GuestData[]>([
    {
      firstName: "",
      lastName: "",
      documentNumber: "",
      documentType: "PAS",
      gender: "male",
      nationality: "ESP",
      nationalityOther: "",
      birthDate: "",
      phone: "",
      email: "",
    },
  ]);

  // Dirección compartida
  const [sharedAddress, setSharedAddress] = useState({
    street: "",
    addressExtra: "",
    postalCode: "",
    city: "",
    province: "",
    country: "ESP",
  });

  // Información de reserva
  const [reservationData, setReservationData] = useState({
    reservationNumber: "",
    checkInDate: new Date().toISOString().slice(0, 16), // YYYY-MM-DDTHH:MM
    checkOutDate: "",
    roomNumber: "",
    roomType: "",
    roomCode: "",
    entranceCode: "",
    numberOfRooms: 1,
    hasInternet: true,
    accommodationType: "S.A. (Solo Aloj.)",
    reservationOrigin: "Walk In",
  });

  // Auto-calcular fecha de salida (+1 día)
  useEffect(() => {
    if (reservationData.checkInDate) {
      const checkIn = new Date(reservationData.checkInDate);
      const checkOut = new Date(checkIn);
      checkOut.setDate(checkOut.getDate() + 1);
      setReservationData(prev => ({
        ...prev,
        checkOutDate: checkOut.toISOString().slice(0, 16)
      }));
    }
  }, [reservationData.checkInDate]);

  // Información de pago (OBLIGATORIA según normativa)
  const [paymentData, setPaymentData] = useState({
    paymentType: "Efectivo",
    paymentDate: new Date().toISOString().split("T")[0],
    amountPaid: "",
    amountPending: "",
    paymentHolder: "",
    paymentMethod: "", // Visa, Mastercard, etc.
  });

  // Firma digital
  const [signature, setSignature] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const { data: rooms } = trpc.accessCodes.list.useQuery();
  const { data: settings } = trpc.checkin.settings.get.useQuery();
  const createGuest = trpc.checkin.guests.create.useMutation();

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
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

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
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

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
        gender: "male",
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

  const updateGuest = (index: number, field: keyof GuestData, value: string) => {
    const newGuests = [...guests];
    newGuests[index] = { ...newGuests[index], [field]: value };
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

      if (!guest.nationality) {
        toast.error(`La nacionalidad del huésped ${i + 1} es obligatoria`);
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

    // Validar firma del huésped principal
    if (!signature) {
      toast.error("El huésped principal debe firmar");
      return;
    }

    // Generar groupId único para vincular huéspedes
    const groupId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Guardar cada huésped
      for (let i = 0; i < guests.length; i++) {
        const guest = guests[i];
        const isMainGuest = i === 0;

        await createGuest.mutateAsync({
          // Datos personales
          firstName: guest.firstName,
          lastName: guest.lastName,
          documentNumber: guest.documentNumber,
          documentType: guest.documentType,
          gender: guest.gender as "male" | "female" | "other",
          nationality: guest.nationality === "OTRO" ? guest.nationalityOther : guest.nationality,
          birthDate: guest.birthDate,
          
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
          checkInDate: reservationData.checkInDate,
          checkOutDate: reservationData.checkOutDate || undefined,
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
          amountPaid: paymentData.amountPaid || undefined,
          amountPending: paymentData.amountPending || undefined,
          paymentHolder: paymentData.paymentHolder || undefined,
          paymentMethod: paymentData.paymentMethod || undefined,
          
          // Grupo y firma
          numberOfGuests: guests.length,
          signature: isMainGuest ? signature : undefined,
          isMainGuest,
          groupId,
          status: "completed",
          checkinType: "presencial",
        });
      }

      toast.success(`Check-in completado: ${guests.length} huésped(es) registrado(s)`);
      
      // Limpiar formulario
      setGuests([
        {
          firstName: "",
          lastName: "",
          documentNumber: "",
          documentType: "PAS",
          gender: "male",
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
        reservationOrigin: "Walk In",
      });
      setPaymentData({
        paymentType: "EFECT",
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Welcome to our Home</h1>
          <p className="text-lg text-muted-foreground">
            {settings.hostelName || "Hostel"} • RTA: {settings.hostelRta || "N/A"}
          </p>
        </div>
      </Card>

      {/* Información de Reserva */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Información de Reserva</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="reservationNumber">Número de Reserva</Label>
            <Input
              id="reservationNumber"
              value={reservationData.reservationNumber}
              onChange={(e) => setReservationData({ ...reservationData, reservationNumber: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="roomNumber">Habitación *</Label>
            <Select
              value={reservationData.roomNumber}
              onValueChange={(value) => setReservationData({ ...reservationData, roomNumber: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar habitación" />
              </SelectTrigger>
              <SelectContent>
                {rooms?.map((room) => (
                  <SelectItem key={room.id} value={room.roomNumber}>
                    Habitación {room.roomNumber} - {room.roomType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="roomType">Tipo de Habitación</Label>
            <Input
              id="roomType"
              value={reservationData.roomType}
              disabled
              className="bg-muted"
            />
          </div>

          <div>
            <Label htmlFor="checkInDate">Fecha y Hora de Entrada *</Label>
            <Input
              id="checkInDate"
              type="datetime-local"
              value={reservationData.checkInDate}
              onChange={(e) => setReservationData({ ...reservationData, checkInDate: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="checkOutDate">Fecha y Hora de Salida</Label>
            <Input
              id="checkOutDate"
              type="datetime-local"
              value={reservationData.checkOutDate}
              onChange={(e) => setReservationData({ ...reservationData, checkOutDate: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="accommodationType">Régimen</Label>
            <Select
              value={reservationData.accommodationType}
              onValueChange={(value) => setReservationData({ ...reservationData, accommodationType: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="S.A. (Solo Aloj.)">S.A. (Solo Aloj.)</SelectItem>
                <SelectItem value="A.D. (Aloj. y Desayuno)">A.D. (Aloj. y Desayuno)</SelectItem>
                <SelectItem value="M.P. (Media Pensión)">M.P. (Media Pensión)</SelectItem>
                <SelectItem value="P.C. (Pensión Completa)">P.C. (Pensión Completa)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="reservationOrigin">Origen de Reserva</Label>
            <Select
              value={reservationData.reservationOrigin}
              onValueChange={(value) => setReservationData({ ...reservationData, reservationOrigin: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Walk In">Walk In</SelectItem>
                <SelectItem value="Booking.com">Booking.com</SelectItem>
                <SelectItem value="Airbnb">Airbnb</SelectItem>
                <SelectItem value="Expedia">Expedia</SelectItem>
                <SelectItem value="Website">Website</SelectItem>
                <SelectItem value="Phone">Phone</SelectItem>
                <SelectItem value="Email">Email</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="hasInternet"
              checked={reservationData.hasInternet}
              onCheckedChange={(checked) => setReservationData({ ...reservationData, hasInternet: checked as boolean })}
            />
            <Label htmlFor="hasInternet">Internet</Label>
          </div>
        </div>
      </Card>

      {/* Información de Pago (OBLIGATORIA) */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Información de Pago *</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="paymentType">Tipo de Pago *</Label>
            <Select
              value={paymentData.paymentType}
              onValueChange={(value) => setPaymentData({ ...paymentData, paymentType: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Efectivo">Efectivo</SelectItem>
                <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                <SelectItem value="Transferencia">Transferencia</SelectItem>
                <SelectItem value="PayPal">PayPal</SelectItem>
                <SelectItem value="Bizum">Bizum</SelectItem>
                <SelectItem value="Otro">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="paymentDate">Fecha de Pago *</Label>
            <Input
              id="paymentDate"
              type="date"
              value={paymentData.paymentDate}
              onChange={(e) => setPaymentData({ ...paymentData, paymentDate: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="amountPaid">Cantidad Abonada (€)</Label>
            <Input
              id="amountPaid"
              type="number"
              step="0.01"
              value={paymentData.amountPaid}
              onChange={(e) => setPaymentData({ ...paymentData, amountPaid: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="amountPending">Cantidad Pendiente (€)</Label>
            <Input
              id="amountPending"
              type="number"
              step="0.01"
              value={paymentData.amountPending}
              onChange={(e) => setPaymentData({ ...paymentData, amountPending: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="paymentHolder">Titular del Pago</Label>
            <Input
              id="paymentHolder"
              value={paymentData.paymentHolder}
              onChange={(e) => setPaymentData({ ...paymentData, paymentHolder: e.target.value })}
              placeholder="Nombre y apellidos"
            />
          </div>

          <div>
            <Label htmlFor="paymentMethod">Medio de Pago</Label>
            <Input
              id="paymentMethod"
              value={paymentData.paymentMethod}
              onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
              placeholder="Visa, Mastercard, PayPal, etc."
            />
          </div>

          {paymentData.paymentType === "Tarjeta" && (
            <div>
              <Label htmlFor="cardExpiry">Fecha de Caducidad Tarjeta</Label>
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

      {/* Dirección Compartida */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Dirección (Compartida por todos los huéspedes) *</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="street">Calle y Número *</Label>
            <Input
              id="street"
              value={sharedAddress.street}
              onChange={(e) => setSharedAddress({ ...sharedAddress, street: e.target.value })}
              placeholder="Calle Principal, 123"
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="addressExtra">Información Adicional</Label>
            <Input
              id="addressExtra"
              value={sharedAddress.addressExtra}
              onChange={(e) => setSharedAddress({ ...sharedAddress, addressExtra: e.target.value })}
              placeholder="Piso, puerta, etc."
            />
          </div>

          <div>
            <Label htmlFor="postalCode">Código Postal</Label>
            <Input
              id="postalCode"
              value={sharedAddress.postalCode}
              onChange={(e) => setSharedAddress({ ...sharedAddress, postalCode: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="city">Ciudad *</Label>
            <Input
              id="city"
              value={sharedAddress.city}
              onChange={(e) => setSharedAddress({ ...sharedAddress, city: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="province">Provincia</Label>
            <Input
              id="province"
              value={sharedAddress.province}
              onChange={(e) => setSharedAddress({ ...sharedAddress, province: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="country">País *</Label>
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
      {guests.map((guest, index) => {
        const allowedDocs = getAllowedDocumentTypes(guest.nationality);
        const isSpanish = guest.nationality === "ESP";
        const country = COUNTRIES.find(c => c.code === guest.nationality);
        const isEU = country?.isEU || false;

        return (
          <Card key={index} className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                Huésped {index + 1} {index === 0 && "(Principal)"}
              </h2>
              {index > 0 && (
                <Button variant="destructive" size="sm" onClick={() => removeGuest(index)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`firstName-${index}`}>Nombre *</Label>
                <Input
                  id={`firstName-${index}`}
                  value={guest.firstName}
                  onChange={(e) => updateGuest(index, "firstName", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor={`lastName-${index}`}>Apellidos *</Label>
                <Input
                  id={`lastName-${index}`}
                  value={guest.lastName}
                  onChange={(e) => updateGuest(index, "lastName", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor={`nationality-${index}`}>Nacionalidad *</Label>
                <Select
                  value={guest.nationality}
                  onValueChange={(value) => updateGuest(index, "nationality", value)}
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
                    <SelectItem value="OTRO">Otro (especificar)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {guest.nationality === "OTRO" && (
                <div>
                  <Label htmlFor={`nationalityOther-${index}`}>Especificar País *</Label>
                  <Input
                    id={`nationalityOther-${index}`}
                    value={guest.nationalityOther}
                    onChange={(e) => updateGuest(index, "nationalityOther", e.target.value)}
                    placeholder="Nombre del país"
                  />
                </div>
              )}

              <div>
                <Label htmlFor={`documentType-${index}`}>Tipo de Documento *</Label>
                <Select
                  value={guest.documentType}
                  onValueChange={(value) => updateGuest(index, "documentType", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedDocs.map((doc) => (
                      <SelectItem key={doc.code} value={doc.code}>
                        {doc.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {isSpanish && "Españoles: DNI o Pasaporte"}
                  {isEU && !isSpanish && "Europeos: NIE o Pasaporte"}
                  {!isEU && !isSpanish && "No europeos: Solo Pasaporte"}
                </p>
              </div>

              <div>
                <Label htmlFor={`documentNumber-${index}`}>Número de Documento *</Label>
                <Input
                  id={`documentNumber-${index}`}
                  value={guest.documentNumber}
                  onChange={(e) => updateGuest(index, "documentNumber", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor={`gender-${index}`}>Sexo *</Label>
                <Select
                  value={guest.gender}
                  onValueChange={(value) => updateGuest(index, "gender", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Hombre</SelectItem>
                    <SelectItem value="female">Mujer</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor={`birthDate-${index}`}>Fecha de Nacimiento *</Label>
                <Input
                  id={`birthDate-${index}`}
                  type="date"
                  value={guest.birthDate}
                  onChange={(e) => updateGuest(index, "birthDate", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor={`phone-${index}`}>Teléfono</Label>
                <Input
                  id={`phone-${index}`}
                  type="tel"
                  value={guest.phone}
                  onChange={(e) => updateGuest(index, "phone", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor={`email-${index}`}>Email</Label>
                <Input
                  id={`email-${index}`}
                  type="email"
                  value={guest.email}
                  onChange={(e) => updateGuest(index, "email", e.target.value)}
                />
              </div>
            </div>
          </Card>
        );
      })}

      {guests.length < 3 && (
        <Button onClick={addGuest} variant="outline" className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Añadir Huésped ({guests.length}/3)
        </Button>
      )}

      {/* Firma Digital (solo huésped principal) */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Firma del Huésped Principal *</h2>
        <div className="space-y-4">
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
          </div>
          <Button variant="outline" onClick={clearSignature}>
            Borrar Firma
          </Button>
        </div>
      </Card>

      {/* Botón de Guardar */}
      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={createGuest.isPending}
          size="lg"
        >
          {createGuest.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Completar Check-in
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

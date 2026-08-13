import { useRef, useState } from "react";
import { Camera, FileScan, Loader2, Plus, Save, Trash2, UserRound } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { COUNTRIES } from "@/lib/countries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type GuestForm = {
  firstName: string; lastName: string; documentType: "NIF" | "NIE" | "PAS" | "OTRO"; documentNumber: string; documentSupport: string;
  nationality: string; gender: "Hombre" | "Mujer" | "Otro"; birthDate: string; documentExpiry: string; street: string; addressExtra: string;
  postalCode: string; city: string; province: string; country: string; phone: string; email: string;
};

type ReservationForm = {
  reservationNumber: string; reservationOrigin: string;
  checkInDate: string; checkOutDate: string; roomNumber: string; roomType: string;
  paymentType: "EFECT" | "TARJT" | "TRANS" | "PLATF" | "MOVIL" | "TREG" | "DESTI" | "OTRO"; amountPaid: string;
};

const blankGuest = (): GuestForm => ({ firstName: "", lastName: "", documentType: "PAS", documentNumber: "", documentSupport: "", nationality: "ESP", gender: "Hombre", birthDate: "", documentExpiry: "", street: "", addressExtra: "", postalCode: "", city: "", province: "", country: "ESP", phone: "", email: "" });
const today = () => new Date().toISOString().slice(0, 10);
const tomorrow = () => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

export default function TabletRegistroPolicia() {
  const [reservation, setReservation] = useState<ReservationForm>({ reservationNumber: "", reservationOrigin: "Walk In", checkInDate: today(), checkOutDate: tomorrow(), roomNumber: "", roomType: "", paymentType: "EFECT", amountPaid: "0" });
  const [guests, setGuests] = useState<GuestForm[]>([blankGuest()]);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const scanInput = useRef<HTMLInputElement>(null);
  const [scanningIndex, setScanningIndex] = useState<number | null>(null);
  const registerGroup = trpc.checkin.tablet.registerGroup.useMutation({
    onSuccess: (result) => {
      toast.success(`Registro creado para ${result.guestIds.length} huésped(es)`);
      setReservation({ reservationNumber: "", reservationOrigin: "Walk In", checkInDate: today(), checkOutDate: tomorrow(), roomNumber: "", roomType: "", paymentType: "EFECT", amountPaid: "0" });
      setGuests([blankGuest()]);
      setPrivacyAccepted(false);
    },
    onError: (error) => toast.error(error.message || "No se pudo guardar el registro"),
  });
  const scanDocument = trpc.checkin.tablet.scanDocument.useMutation();

  const updateGuest = (index: number, patch: Partial<GuestForm>) => setGuests((current) => current.map((guest, guestIndex) => guestIndex === index ? { ...guest, ...patch } : guest));
  const startScan = (index: number) => { setScanningIndex(index); scanInput.current?.click(); };
  const handleDocument = async (file?: File) => {
    if (!file || scanningIndex === null) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return toast.error("Usa una imagen JPG, PNG o WEBP del documento");
    if (file.size > 8 * 1024 * 1024) return toast.error("La imagen no puede superar 8 MB");
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const result = await scanDocument.mutateAsync({ imageData: String(reader.result), contentType: file.type as "image/jpeg" | "image/png" | "image/webp" });
        const fields = result.fields as Partial<GuestForm>;
        const validTypes = ["NIF", "NIE", "PAS", "OTRO"];
        const validGender = ["Hombre", "Mujer", "Otro"];
        updateGuest(scanningIndex, {
          ...fields,
          documentType: validTypes.includes(fields.documentType || "") ? fields.documentType as GuestForm["documentType"] : undefined,
          gender: validGender.includes(fields.gender || "") ? fields.gender as GuestForm["gender"] : undefined,
        });
        toast.success("Datos detectados. Revísalos antes de guardar.");
      } catch (error: any) { toast.error(error.message || "No se pudo leer el documento"); }
      finally { setScanningIndex(null); if (scanInput.current) scanInput.current.value = ""; }
    };
    reader.readAsDataURL(file);
  };

  const submit = () => {
    if (!reservation.roomNumber.trim()) return toast.error("Indica la habitación de la reserva");
    if (!privacyAccepted) return toast.error("Debes confirmar la información de privacidad");
    registerGroup.mutate({ ...reservation, reservationOrigin: reservation.reservationOrigin as "Walk In" | "Booking.com" | "Airbnb" | "Expedia" | "Website" | "Phone" | "Email" | "Other", guests: guests.map((guest) => ({ ...guest, acceptedPrivacy: true })) });
  };

  return <main className="mx-auto min-h-screen max-w-6xl bg-slate-50 p-4 sm:p-8"><div className="mb-6 text-center"><p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">The Spot Central Hostel</p><h1 className="mt-1 text-3xl font-bold">Registro de huéspedes para Policía</h1><p className="mt-2 text-muted-foreground">Introduce una reserva y todos sus huéspedes. Solo se guardan los datos confirmados.</p></div><input ref={scanInput} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={(event) => handleDocument(event.target.files?.[0])} />
    <Card className="mb-6"><CardHeader><CardTitle>Datos de la reserva</CardTitle><CardDescription>Estos datos se aplicarán a todos los huéspedes de esta reserva.</CardDescription></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Field label="Nº reserva" optional><Input value={reservation.reservationNumber} onChange={(e) => setReservation({ ...reservation, reservationNumber: e.target.value })} placeholder="Opcional" /></Field><Field label="Origen"><Select value={reservation.reservationOrigin} onValueChange={(value) => setReservation({ ...reservation, reservationOrigin: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Walk In">Recepción / Walk In</SelectItem><SelectItem value="Booking.com">Booking.com</SelectItem><SelectItem value="Airbnb">Airbnb</SelectItem><SelectItem value="Expedia">Expedia</SelectItem><SelectItem value="Website">Web</SelectItem><SelectItem value="Phone">Teléfono</SelectItem><SelectItem value="Email">Email</SelectItem><SelectItem value="Other">Otro</SelectItem></SelectContent></Select></Field><Field label="Fecha entrada"><Input required type="date" value={reservation.checkInDate} onChange={(e) => setReservation({ ...reservation, checkInDate: e.target.value })} /></Field><Field label="Fecha salida"><Input required type="date" value={reservation.checkOutDate} onChange={(e) => setReservation({ ...reservation, checkOutDate: e.target.value })} /></Field><Field label="Habitación"><Input required value={reservation.roomNumber} onChange={(e) => setReservation({ ...reservation, roomNumber: e.target.value })} /></Field><Field label="Tipo de habitación" optional><Input value={reservation.roomType} onChange={(e) => setReservation({ ...reservation, roomType: e.target.value })} /></Field><Field label="Pago"><Select value={reservation.paymentType} onValueChange={(value) => setReservation({ ...reservation, paymentType: value as typeof reservation.paymentType })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="EFECT">Efectivo</SelectItem><SelectItem value="TARJT">Tarjeta</SelectItem><SelectItem value="TRANS">Transferencia</SelectItem><SelectItem value="PLATF">Plataforma</SelectItem><SelectItem value="MOVIL">Móvil</SelectItem><SelectItem value="OTRO">Otro</SelectItem></SelectContent></Select></Field><Field label="Importe abonado"><Input type="number" min="0" step="0.01" value={reservation.amountPaid} onChange={(e) => setReservation({ ...reservation, amountPaid: e.target.value })} /></Field></CardContent></Card>
    <div className="mb-4 flex items-center justify-between"><div><h2 className="text-xl font-bold">Huéspedes ({guests.length})</h2><p className="text-sm text-muted-foreground">Los campos marcados con * son necesarios para la comunicación policial.</p></div><Button type="button" variant="outline" onClick={() => setGuests([...guests, blankGuest()])}><Plus className="mr-2 h-4 w-4" />Añadir huésped</Button></div>
    <div className="space-y-5">{guests.map((guest, index) => <Card key={index}><CardHeader className="flex flex-row items-center justify-between space-y-0"><div><CardTitle className="flex items-center gap-2"><UserRound className="h-5 w-5" />Huésped {index + 1}</CardTitle><CardDescription>{index === 0 ? "Titular principal de la reserva" : "Acompañante"}</CardDescription></div><div className="flex gap-2"><Button type="button" variant="outline" disabled={scanDocument.isPending} onClick={() => startScan(index)}>{scanDocument.isPending && scanningIndex === index ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}{scanDocument.isPending && scanningIndex === index ? "Leyendo…" : "Escanear documento"}</Button>{guests.length > 1 && <Button type="button" variant="ghost" size="icon" aria-label="Eliminar huésped" onClick={() => setGuests(guests.filter((_, guestIndex) => guestIndex !== index))}><Trash2 className="h-4 w-4 text-destructive" /></Button>}</div></CardHeader><CardContent><div className="mb-5 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"><FileScan className="mr-2 inline h-4 w-4" /><strong>Escaneo opcional.</strong> La imagen se usa solo para extraer los campos automáticamente. No se almacena en esta aplicación, ni en los registros del huésped. Revisa siempre los datos antes de guardar.</div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Field label="Nombre"><Input required value={guest.firstName} onChange={(e) => updateGuest(index, { firstName: e.target.value })} /></Field><Field label="Apellidos"><Input required value={guest.lastName} onChange={(e) => updateGuest(index, { lastName: e.target.value })} /></Field><Field label="Tipo documento"><Select value={guest.documentType} onValueChange={(value) => updateGuest(index, { documentType: value as GuestForm["documentType"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="NIF">DNI / NIF</SelectItem><SelectItem value="NIE">NIE</SelectItem><SelectItem value="PAS">Pasaporte</SelectItem><SelectItem value="OTRO">Otro ID</SelectItem></SelectContent></Select></Field><Field label="Nº documento"><Input required value={guest.documentNumber} onChange={(e) => updateGuest(index, { documentNumber: e.target.value })} /></Field><Field label="Nº soporte" optional><Input value={guest.documentSupport} onChange={(e) => updateGuest(index, { documentSupport: e.target.value })} /></Field><Field label="Nacionalidad"><CountrySelect value={guest.nationality} onChange={(value) => updateGuest(index, { nationality: value })} /></Field><Field label="Sexo"><Select value={guest.gender} onValueChange={(value) => updateGuest(index, { gender: value as GuestForm["gender"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Hombre">Hombre</SelectItem><SelectItem value="Mujer">Mujer</SelectItem><SelectItem value="Otro">Otro</SelectItem></SelectContent></Select></Field><Field label="Fecha nacimiento"><Input required type="date" value={guest.birthDate} onChange={(e) => updateGuest(index, { birthDate: e.target.value })} /></Field><Field label="Caducidad documento" optional><Input type="date" value={guest.documentExpiry} onChange={(e) => updateGuest(index, { documentExpiry: e.target.value })} /></Field><div className="sm:col-span-2 lg:col-span-3"><Field label="Dirección"><Input required value={guest.street} onChange={(e) => updateGuest(index, { street: e.target.value })} /></Field></div><Field label="Código postal"><Input required value={guest.postalCode} onChange={(e) => updateGuest(index, { postalCode: e.target.value })} /></Field><Field label="Ciudad"><Input required value={guest.city} onChange={(e) => updateGuest(index, { city: e.target.value })} /></Field><Field label="Provincia" optional><Input value={guest.province} onChange={(e) => updateGuest(index, { province: e.target.value })} /></Field><Field label="País"><CountrySelect value={guest.country} onChange={(value) => updateGuest(index, { country: value })} /></Field><Field label="Teléfono"><Input required type="tel" value={guest.phone} onChange={(e) => updateGuest(index, { phone: e.target.value })} /></Field><Field label="Email"><Input required type="email" value={guest.email} onChange={(e) => updateGuest(index, { email: e.target.value })} /></Field></div></CardContent></Card>)}</div>
    <Card className="mt-6"><CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><label className="flex items-start gap-3 text-sm"><Checkbox checked={privacyAccepted} onCheckedChange={(value) => setPrivacyAccepted(value === true)} /><span>Confirmo que los huéspedes han sido informados del tratamiento de sus datos para el registro obligatorio de viajeros y que los datos introducidos son correctos.</span></label><Button size="lg" disabled={registerGroup.isPending} onClick={submit}>{registerGroup.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}{registerGroup.isPending ? "Guardando…" : `Guardar ${guests.length} huésped(es)`}</Button></CardContent></Card>
  </main>;
}

function Field({ label, children, optional = false }: { label: string; children: React.ReactNode; optional?: boolean }) { return <div className="space-y-2"><Label>{label}{optional ? "" : " *"}</Label>{children}</div>; }
function CountrySelect({ value, onChange }: { value: string; onChange: (value: string) => void }) { return <Select value={value} onValueChange={onChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{COUNTRIES.map((country, index) => <SelectItem key={`${country.code}-${country.name}-${index}`} value={country.code}>{country.name}</SelectItem>)}</SelectContent></Select>; }

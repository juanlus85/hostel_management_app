import { useEffect, useMemo, useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { CalendarDays, CheckCircle2, Loader2, Search, Send, Users } from "lucide-react";
import { toast } from "sonner";

type ReservationDraft = {
  startDate: string;
  nights: string;
  rooms: string;
  adults: string;
  children: string;
  roomTypeId: string;
  roomId: string;
  guestFirstName: string;
  guestLastName: string;
  guestEmail: string;
  guestPhone: string;
  guestCountry: string;
  guestZip: string;
  sourceId: string;
  estimatedArrivalTime: string;
  paymentMethod: "cash" | "credit" | "ebanking" | "pay_pal";
  sendEmailConfirmation: boolean;
};

type ConfirmedReservation = ReservationDraft & {
  endDate: string;
  roomsNumber: number;
  adultsNumber: number;
  childrenNumber: number;
  nightsNumber: number;
  roomTypeName: string;
  rate: number | null;
};

type BookableRoomType = {
  roomTypeId: string;
  roomTypeName: string;
  roomsAvailable: number;
  maxGuests: number | null;
  rate: number | null;
  rateId: string | null;
  individualRooms: Array<{ roomId: string; roomName: string; dormRoomName: string | null }>;
};

function positiveInt(value: string, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function addNights(startDate: string, nights: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return "";
  const date = new Date(`${startDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + nights);
  return date.toISOString().slice(0, 10);
}

function money(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "Precio no disponible";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value);
}

function roomKey(value: string | null | undefined) {
  const text = String(value || "").trim().toLowerCase();
  const trailingNumber = text.match(/(\d+(?:-\d+)?)\s*$/)?.[1];
  return trailingNumber || text.replace(/[^a-z0-9]/g, "");
}

function paymentMethodLabel(value: ReservationDraft["paymentMethod"]) {
  return { cash: "Efectivo", credit: "Tarjeta", ebanking: "Transferencia bancaria", pay_pal: "PayPal" }[value];
}

function emptyDraft(startDate: string, roomTypeId = "", roomId = ""): ReservationDraft {
  return {
    startDate,
    nights: "1",
    rooms: "1",
    adults: "1",
    children: "0",
    roomTypeId,
    roomId,
    guestFirstName: "",
    guestLastName: "",
    guestEmail: "",
    guestPhone: "",
    guestCountry: "ES",
    guestZip: "",
    sourceId: "",
    estimatedArrivalTime: "",
    paymentMethod: "cash",
    sendEmailConfirmation: false,
  };
}

export function CreateCloudbedsReservationDialog({
  open,
  onOpenChange,
  initialDate,
  initialRoomTypeId,
  initialRoomTypeName,
  initialRoomId,
  initialRoomName,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate: string;
  initialRoomTypeId?: string | null;
  initialRoomTypeName?: string | null;
  initialRoomId?: string | null;
  initialRoomName?: string | null;
  onCreated: (result: { reservationId: string | null; roomTypeName: string }) => void;
}) {
  const [draft, setDraft] = useState(() => emptyDraft(initialDate, initialRoomTypeId || "", initialRoomId || ""));
  const [availabilityChecked, setAvailabilityChecked] = useState(false);
  const [availableRoomTypes, setAvailableRoomTypes] = useState<BookableRoomType[]>([]);
  const [pendingConfirmation, setPendingConfirmation] = useState<ConfirmedReservation | null>(null);
  const sources = trpc.cloudbedsAvailability.getReservationSources.useQuery(undefined, { enabled: open, retry: false });
  const checkAvailability = trpc.cloudbedsAvailability.getBookableRoomTypes.useMutation({
    onSuccess: (roomTypes: BookableRoomType[]) => {
      setAvailableRoomTypes(roomTypes);
      setAvailabilityChecked(true);
      setDraft(current => {
        const keepSelection = roomTypes.some(roomType => roomType.roomTypeId === current.roomTypeId);
        const initialSelection = roomTypes.find(roomType => roomType.roomTypeId === initialRoomTypeId)?.roomTypeId;
        const roomTypeId = keepSelection ? current.roomTypeId : initialSelection || roomTypes[0]?.roomTypeId || "";
        const roomType = roomTypes.find(candidate => candidate.roomTypeId === roomTypeId);
        const matchingRoom = roomType?.individualRooms.find(room => room.roomId === current.roomId || (initialRoomName && roomKey(room.roomName) === roomKey(initialRoomName)));
        const roomId = matchingRoom?.roomId || "";
        return { ...current, roomTypeId, roomId };
      });
      if (!roomTypes.length) toast.warning("Cloudbeds no tiene habitaciones disponibles para esa estancia.");
    },
    onError: (error: { message: string }) => {
      setAvailableRoomTypes([]);
      setAvailabilityChecked(false);
      toast.error(error.message);
    },
  });
  const createReservation = trpc.cloudbedsAvailability.createManualReservation.useMutation({
    onSuccess: result => {
      toast.success(`Reserva creada en Cloudbeds${result.reservationId ? ` · ${result.reservationId}` : ""}`);
      setPendingConfirmation(null);
      onOpenChange(false);
      onCreated({ reservationId: result.reservationId, roomTypeName: result.roomTypeName });
    },
    onError: error => toast.error(error.message),
  });

  useEffect(() => {
    if (!open) return;
    setDraft(emptyDraft(initialDate, initialRoomTypeId || "", initialRoomId || ""));
    setAvailableRoomTypes([]);
    setAvailabilityChecked(false);
    setPendingConfirmation(null);
  }, [open, initialDate, initialRoomTypeId, initialRoomId]);

  useEffect(() => {
    const preferredSource = sources.data?.find(source => source.isDefault) || sources.data?.[0];
    if (preferredSource) {
      setDraft(current => current.sourceId ? current : { ...current, sourceId: preferredSource.sourceId });
    }
  }, [sources.data]);

  const nightsNumber = Math.max(1, positiveInt(draft.nights, 1));
  const roomsNumber = Math.max(1, positiveInt(draft.rooms, 1));
  const adultsNumber = Math.max(1, positiveInt(draft.adults, 1));
  const childrenNumber = Math.max(0, positiveInt(draft.children));
  const endDate = addNights(draft.startDate, nightsNumber);
  const selectedRoomType = availableRoomTypes.find(roomType => roomType.roomTypeId === draft.roomTypeId) || null;
  const selectedIndividualRoom = selectedRoomType?.individualRooms.find(room => room.roomId === draft.roomId) || null;
  const canCheckAvailability = Boolean(draft.startDate && endDate && nightsNumber > 0 && roomsNumber > 0 && adultsNumber > 0);

  const set = <Key extends keyof ReservationDraft>(key: Key, value: ReservationDraft[Key]) => {
    setDraft(current => ({ ...current, [key]: value }));
    if (["startDate", "nights", "rooms", "adults", "children"].includes(key)) {
      setAvailabilityChecked(false);
      setAvailableRoomTypes([]);
    }
  };

  const requestConfirmation = () => {
    if (!availabilityChecked || !selectedRoomType) return toast.error("Comprueba la disponibilidad y selecciona una habitación disponible.");
    if (!draft.guestFirstName.trim() || !draft.guestLastName.trim()) return toast.error("Indica el nombre y los apellidos del huésped.");
    if (!/^\S+@\S+\.\S+$/.test(draft.guestEmail.trim())) return toast.error("Indica un correo electrónico válido.");
    if (draft.guestPhone.trim().length < 5) return toast.error("Indica un teléfono de contacto válido.");
    if (!/^[A-Za-z]{2}$/.test(draft.guestCountry.trim())) return toast.error("El país debe ser un código de dos letras, por ejemplo ES.");
    if (!draft.guestZip.trim()) return toast.error("Indica el código postal del huésped.");
    setPendingConfirmation({
      ...draft,
      endDate,
      roomsNumber,
      adultsNumber,
      childrenNumber,
      nightsNumber,
      roomTypeName: selectedRoomType.roomTypeName,
      rate: selectedRoomType.rate,
    });
  };

  const submitReservation = () => {
    if (!pendingConfirmation) return;
    createReservation.mutate({
      startDate: pendingConfirmation.startDate,
      endDate: pendingConfirmation.endDate,
      roomTypeId: pendingConfirmation.roomTypeId,
      roomId: pendingConfirmation.roomId || undefined,
      rooms: pendingConfirmation.roomsNumber,
      adults: pendingConfirmation.adultsNumber,
      children: pendingConfirmation.childrenNumber,
      guestFirstName: pendingConfirmation.guestFirstName,
      guestLastName: pendingConfirmation.guestLastName,
      guestEmail: pendingConfirmation.guestEmail,
      guestPhone: pendingConfirmation.guestPhone,
      guestCountry: pendingConfirmation.guestCountry.toUpperCase(),
      guestZip: pendingConfirmation.guestZip,
      sourceId: pendingConfirmation.sourceId || undefined,
      estimatedArrivalTime: pendingConfirmation.estimatedArrivalTime || undefined,
      paymentMethod: pendingConfirmation.paymentMethod,
      sendEmailConfirmation: pendingConfirmation.sendEmailConfirmation,
    });
  };

  return <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Nueva reserva</DialogTitle>
          <DialogDescription>
            {initialRoomName ? `Habitación seleccionada: ${initialRoomName}${initialRoomTypeName ? ` · ${initialRoomTypeName}` : ""}. ` : initialRoomTypeName ? `Inicio seleccionado: ${initialRoomTypeName}. ` : ""}
            Comprueba la disponibilidad antes de confirmar. La reserva solo se enviará a Cloudbeds tras revisar el resumen final.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <section className="rounded-xl border border-sky-200 bg-sky-50/60 p-4">
            <div className="flex items-center gap-2 font-semibold text-sky-950"><CalendarDays className="h-4 w-4" />Estancia y ocupación</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-5">
              <label className="space-y-1 text-sm font-medium sm:col-span-2">Entrada<Input type="date" value={draft.startDate} onChange={event => set("startDate", event.target.value)} /></label>
              <label className="space-y-1 text-sm font-medium">Noches<Input min="1" max="60" type="number" value={draft.nights} onChange={event => set("nights", event.target.value)} /></label>
              <div className="space-y-1 text-sm font-medium"><span>Salida</span><div className="flex h-10 items-center rounded-md border bg-background px-3 text-sm font-normal">{endDate || "—"}</div></div>
              <label className="space-y-1 text-sm font-medium">Habitaciones<Input min="1" max="5" type="number" value={draft.rooms} disabled={Boolean(draft.roomId)} onChange={event => set("rooms", event.target.value)} /></label>
              <label className="space-y-1 text-sm font-medium">Adultos<Input min="1" max="20" type="number" value={draft.adults} onChange={event => set("adults", event.target.value)} /></label>
              <label className="space-y-1 text-sm font-medium">Menores<Input min="0" max="20" type="number" value={draft.children} onChange={event => set("children", event.target.value)} /></label>
              <label className="space-y-1 text-sm font-medium sm:col-span-2">Llegada prevista <span className="font-normal text-muted-foreground">(opcional)</span><Input type="time" value={draft.estimatedArrivalTime} onChange={event => set("estimatedArrivalTime", event.target.value)} /></label>
            </div>
            <Button className="mt-4 bg-sky-700 hover:bg-sky-800" type="button" onClick={() => checkAvailability.mutate({ startDate: draft.startDate, endDate, rooms: roomsNumber, adults: adultsNumber, children: childrenNumber })} disabled={!canCheckAvailability || checkAvailability.isPending}>
              {checkAvailability.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}Comprobar disponibilidad
            </Button>
          </section>

          <section className="rounded-xl border p-4">
            <p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-4 w-4 text-emerald-700" />Tipo de habitación disponible</p>
            {!availabilityChecked ? <p className="mt-2 text-sm text-muted-foreground">Indica las noches y la ocupación, y pulsa «Comprobar disponibilidad».</p> : availableRoomTypes.length ? <div className="mt-3 grid gap-2 sm:grid-cols-2">{availableRoomTypes.map(roomType => <button type="button" key={roomType.roomTypeId} disabled={Boolean(initialRoomId || initialRoomName) && roomType.roomTypeId !== initialRoomTypeId} onClick={() => setDraft(current => ({ ...current, roomTypeId: roomType.roomTypeId, roomId: "" }))} className={`rounded-lg border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${draft.roomTypeId === roomType.roomTypeId ? "border-sky-600 bg-sky-50 ring-1 ring-sky-600" : "hover:border-slate-400"}`}><p className="font-semibold text-slate-900">{roomType.roomTypeName}</p><p className="mt-1 text-sm text-emerald-700">{roomType.roomsAvailable} disponible{roomType.roomsAvailable === 1 ? "" : "s"}</p><p className="mt-1 text-sm text-muted-foreground">{money(roomType.rate)} · estancia consultada</p>{roomType.maxGuests !== null && <p className="mt-1 text-xs text-muted-foreground">Máx. {roomType.maxGuests} huésped{roomType.maxGuests === 1 ? "" : "es"} por habitación</p>}</button>)}</div> : <p className="mt-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">No hay disponibilidad para la estancia y ocupación solicitadas.</p>}
            {availabilityChecked && (initialRoomId || initialRoomName) && !selectedIndividualRoom && <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-900">La habitación elegida ya no aparece libre para toda esta estancia. Selecciona otro hueco en la agenda.</p>}
            {selectedIndividualRoom && <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900"><strong>Habitación asignada:</strong> {selectedIndividualRoom.roomName}. Cloudbeds ha confirmado que está libre para la estancia seleccionada.</p>}
          </section>

          <section className="rounded-xl border p-4">
            <div className="flex items-center gap-2 font-semibold"><Users className="h-4 w-4 text-sky-700" />Datos del huésped</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm font-medium">Nombre<Input value={draft.guestFirstName} onChange={event => set("guestFirstName", event.target.value)} /></label>
              <label className="space-y-1 text-sm font-medium">Apellidos<Input value={draft.guestLastName} onChange={event => set("guestLastName", event.target.value)} /></label>
              <label className="space-y-1 text-sm font-medium">Correo electrónico<Input type="email" value={draft.guestEmail} onChange={event => set("guestEmail", event.target.value)} /></label>
              <label className="space-y-1 text-sm font-medium">Teléfono<Input type="tel" value={draft.guestPhone} onChange={event => set("guestPhone", event.target.value)} /></label>
              <label className="space-y-1 text-sm font-medium">País <span className="font-normal text-muted-foreground">(ISO, p. ej. ES)</span><Input maxLength={2} value={draft.guestCountry} onChange={event => set("guestCountry", event.target.value.toUpperCase())} /></label>
              <label className="space-y-1 text-sm font-medium">Código postal<Input value={draft.guestZip} onChange={event => set("guestZip", event.target.value)} /></label>
              <label className="space-y-1 text-sm font-medium sm:col-span-2">Origen de la reserva<select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm" value={draft.sourceId} onChange={event => set("sourceId", event.target.value)} disabled={sources.isLoading || Boolean(sources.error)}><option value="">Recepción directa</option>{sources.data?.map(source => <option key={source.sourceId} value={source.sourceId}>{source.name}</option>)}</select>{sources.error && <p className="text-xs font-normal text-muted-foreground">No se pudieron cargar los orígenes; Cloudbeds usará la fuente predeterminada.</p>}</label>
              <label className="space-y-1 text-sm font-medium sm:col-span-2">Método de pago en Cloudbeds<select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm" value={draft.paymentMethod} onChange={event => set("paymentMethod", event.target.value as ReservationDraft["paymentMethod"])}><option value="cash">Efectivo</option><option value="credit">Tarjeta</option><option value="ebanking">Transferencia bancaria</option><option value="pay_pal">PayPal</option></select><p className="text-xs font-normal text-muted-foreground">Cloudbeds exige este dato para crear la reserva. No registra un cobro en este paso.</p></label>
            </div>
            <label className="mt-4 flex items-start gap-2 text-sm"><input className="mt-0.5 h-4 w-4" type="checkbox" checked={draft.sendEmailConfirmation} onChange={event => set("sendEmailConfirmation", event.target.checked)} /><span>Enviar la confirmación estándar de Cloudbeds al huésped.</span></label>
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={!selectedRoomType || !availabilityChecked || Boolean((initialRoomId || initialRoomName) && !selectedIndividualRoom) || createReservation.isPending} onClick={requestConfirmation} className="bg-emerald-700 hover:bg-emerald-800"><Send className="mr-2 h-4 w-4" />Revisar y crear reserva</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog open={Boolean(pendingConfirmation)} onOpenChange={open => { if (!open) setPendingConfirmation(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>Confirmar nueva reserva en Cloudbeds</AlertDialogTitle><AlertDialogDescription>Esta acción creará una reserva real en Cloudbeds. Comprueba el resumen antes de confirmar.</AlertDialogDescription></AlertDialogHeader>
        {pendingConfirmation && <div className="space-y-2 rounded-lg border bg-muted/40 p-4 text-sm"><p><strong>Huésped:</strong> {pendingConfirmation.guestFirstName} {pendingConfirmation.guestLastName}</p><p><strong>Estancia:</strong> {pendingConfirmation.startDate} → {pendingConfirmation.endDate} · {pendingConfirmation.nightsNumber} noche{pendingConfirmation.nightsNumber === 1 ? "" : "s"}</p><p><strong>Habitación:</strong> {selectedIndividualRoom?.roomName || pendingConfirmation.roomTypeName} · {pendingConfirmation.roomsNumber} unidad{pendingConfirmation.roomsNumber === 1 ? "" : "es"}</p><p><strong>Ocupación:</strong> {pendingConfirmation.adultsNumber} adulto{pendingConfirmation.adultsNumber === 1 ? "" : "s"}{pendingConfirmation.childrenNumber ? ` · ${pendingConfirmation.childrenNumber} menor${pendingConfirmation.childrenNumber === 1 ? "" : "es"}` : ""}</p><p><strong>Precio consultado:</strong> {money(pendingConfirmation.rate)}</p><p><strong>Método de pago:</strong> {paymentMethodLabel(pendingConfirmation.paymentMethod)}</p><p><strong>Contacto:</strong> {pendingConfirmation.guestEmail} · {pendingConfirmation.guestPhone}</p>{pendingConfirmation.sendEmailConfirmation && <p><strong>Correo:</strong> Cloudbeds enviará su confirmación estándar.</p>}</div>}
        <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction disabled={createReservation.isPending} onClick={submitReservation}>{createReservation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Crear reserva en Cloudbeds</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}

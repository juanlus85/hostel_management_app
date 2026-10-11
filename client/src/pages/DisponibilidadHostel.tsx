import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, BedDouble, CalendarDays, Cloud, Euro, Loader2, Pencil, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { sortAvailabilityRoomTypes } from "@/lib/availabilityRoomOrder";

type AvailabilityResult = Awaited<ReturnType<typeof import("../../../server/cloudbedsAvailability").fetchCloudbedsAvailability>> & { fetchedAt?: string };
type RateEditor = {
  roomTypeName: string;
  date: string;
  rateId: string;
  previousRate: number;
};
type PendingRateChange = RateEditor & { rate: number };

function formatDateLocal(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function displayDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("es-ES", { weekday: "short", day: "2-digit", month: "short" });
}

function money(value: number | null) {
  return value === null ? "—" : new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);
}

function stockTone(rooms: number | null) {
  if (rooms === null) return "bg-slate-100 text-slate-700";
  if (rooms <= 0) return "bg-rose-100 text-rose-800";
  if (rooms <= 2) return "bg-amber-100 text-amber-800";
  return "bg-emerald-100 text-emerald-800";
}

export default function DisponibilidadHostel() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [startDate, setStartDate] = useState(() => formatDateLocal(new Date()));
  const [availability, setAvailability] = useState<AvailabilityResult | null>(null);
  const [rateEditor, setRateEditor] = useState<RateEditor | null>(null);
  const [newRate, setNewRate] = useState("");
  const [pendingRateChange, setPendingRateChange] = useState<PendingRateChange | null>(null);

  const importWeekMutation = trpc.cloudbedsAvailability.importWeek.useMutation({
    onSuccess: result => {
      setAvailability(result);
    },
    onError: error => toast.error(error.message),
  });
  const loadAvailability = useCallback(() => {
    if (startDate) importWeekMutation.mutate({ startDate });
  }, [importWeekMutation.mutate, startDate]);

  useEffect(() => {
    loadAvailability();
  }, [loadAvailability]);

  const updateRate = trpc.cloudbedsAvailability.updateRate.useMutation({
    onSuccess: result => {
      toast.success(result.jobReferenceId ? `Precio enviado a Cloudbeds · referencia ${result.jobReferenceId}` : "Precio enviado a Cloudbeds", {
        description: "Cloudbeds procesa el cambio en segundo plano. Actualiza la disponibilidad dentro de unos segundos para confirmar el nuevo importe.",
      });
      setPendingRateChange(null);
      setRateEditor(null);
    },
    onError: error => toast.error(error.message),
  });

  const days = useMemo(() => {
    if (!availability) return [];
    const dates = new Set<string>();
    availability.roomTypes.forEach(room => room.days.forEach(day => dates.add(day.date)));
    return Array.from(dates).sort();
  }, [availability]);

  const roomTypes = useMemo(
    () => availability ? sortAvailabilityRoomTypes(availability.roomTypes) : [],
    [availability]
  );

  const summary = useMemo(() => {
    if (!availability) return null;
    return availability.roomTypes.reduce((acc, room) => {
      room.days.forEach(day => {
        if (day.roomsAvailable !== null) acc.available += day.roomsAvailable;
        if (day.roomsAvailable === 0) acc.soldOut += 1;
      });
      return acc;
    }, { available: 0, soldOut: 0 });
  }, [availability]);

  const openRateEditor = (roomTypeName: string, date: string, rateId: string | null, currentRate: number | null) => {
    if (!rateId || currentRate === null) {
      toast.error("Cloudbeds no ha devuelto un identificador editable para esta tarifa. Actualiza la consulta o revisa que sea una tarifa base.");
      return;
    }
    setRateEditor({ roomTypeName, date, rateId, previousRate: currentRate });
    setNewRate(currentRate.toFixed(2));
  };

  const prepareRateConfirmation = () => {
    if (!rateEditor) return;
    const rate = Number(newRate.replace(",", "."));
    if (!Number.isFinite(rate) || rate < 0) {
      toast.error("Indica un precio válido, igual o superior a 0 €.");
      return;
    }
    setPendingRateChange({ ...rateEditor, rate });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sky-700"><Cloud className="h-5 w-5" /><span className="text-sm font-semibold">Cloudbeds · carga al abrir</span></div>
          <h1 className="text-2xl font-bold tracking-tight">Disponibilidad Hostel</h1>
          <p className="mt-1 text-muted-foreground">Disponibilidad y precio por tipo de habitación para los próximos siete días.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2"><CalendarDays className="h-4 w-4 text-muted-foreground" /><label htmlFor="availability-start" className="sr-only">Inicio del período</label><Input id="availability-start" type="date" value={startDate} onChange={event => setStartDate(event.target.value)} className="h-7 w-[142px] border-0 bg-transparent p-0 shadow-none focus-visible:ring-0" /></div>
          <Button onClick={loadAvailability} disabled={importWeekMutation.isPending || !startDate} className="bg-sky-700 hover:bg-sky-800">
            {importWeekMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Actualizar disponibilidad
          </Button>
        </div>
      </div>

      <Card className="border-sky-100 bg-gradient-to-r from-sky-50/80 via-background to-cyan-50/60">
        <CardContent className="flex flex-col gap-3 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-sky-700" /><p>La disponibilidad se consulta automáticamente al abrir y al cambiar el período. No hay sincronización periódica. {isAdmin ? "Cada precio se modifica de forma individual y requiere una confirmación antes de enviarlo a Cloudbeds." : ""}</p></div>
          {availability?.fetchedAt && <p className="shrink-0 text-xs text-muted-foreground">Actualizado: {new Date(availability.fetchedAt).toLocaleString("es-ES")}</p>}
        </CardContent>
      </Card>

      {availability && summary && <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardDescription>Tipos de habitación</CardDescription><CardTitle className="text-3xl text-sky-800">{availability.roomTypes.length}</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Con tarifa o disponibilidad en el período.</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Unidades disponibles</CardDescription><CardTitle className="text-3xl text-emerald-700">{summary.available}</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Suma de disponibilidad por día y tipo.</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Fechas agotadas</CardDescription><CardTitle className="text-3xl text-rose-700">{summary.soldOut}</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Combinaciones sin unidades disponibles.</CardContent></Card>
      </div>}

      {!availability && !importWeekMutation.isPending && <Card className="border-dashed"><CardContent className="flex flex-col items-center justify-center py-16 text-center"><div className="mb-4 rounded-full bg-sky-100 p-4 text-sky-700"><BedDouble className="h-8 w-8" /></div><h2 className="font-semibold">No se ha podido cargar el calendario</h2><p className="mt-2 max-w-lg text-sm text-muted-foreground">Pulsa “Actualizar disponibilidad” para repetir la consulta manual a Cloudbeds.</p></CardContent></Card>}

      {importWeekMutation.isPending && !availability && <Card><CardContent className="flex items-center justify-center gap-3 py-16 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin text-sky-700" />Consultando disponibilidad y precios en Cloudbeds…</CardContent></Card>}

      {availability && <Card className="overflow-hidden">
        <CardHeader><CardTitle className="flex items-center gap-2"><BedDouble className="h-5 w-5 text-sky-700" />Calendario de precios y disponibilidad</CardTitle><CardDescription>Verde: buena disponibilidad · ámbar: pocas unidades · rojo: agotado. Las habitaciones siguen el orden operativo del Hostel.</CardDescription></CardHeader>
        <CardContent className="p-0">
          <div className="isolate overflow-x-auto overscroll-x-contain">
            <table className="min-w-[940px] w-full border-collapse text-sm">
              <thead className="bg-muted/60"><tr><th className="sticky left-0 z-30 w-[190px] min-w-[190px] border-b bg-muted px-3 py-3 text-left font-semibold shadow-[8px_0_12px_-12px_rgba(15,23,42,0.65)] sm:w-[240px] sm:min-w-[240px] sm:px-4">Tipo de habitación</th>{days.map(day => <th key={day} className="min-w-[108px] border-b border-l px-3 py-3 text-center font-semibold capitalize">{displayDate(day)}</th>)}</tr></thead>
              <tbody>{roomTypes.map((room, index) => {
                const byDate = new Map(room.days.map(day => [day.date, day]));
                return <tr key={room.roomTypeId} className={index % 2 ? "bg-muted/20" : "bg-background"}><td className="sticky left-0 z-20 w-[190px] min-w-[190px] border-b bg-background px-3 py-4 align-top shadow-[8px_0_12px_-12px_rgba(15,23,42,0.65)] sm:w-[240px] sm:min-w-[240px] sm:px-4"><p className="font-semibold leading-snug">{room.roomTypeName}</p>{room.ratePlanName && <p className="mt-1 text-xs text-muted-foreground">Tarifa: {room.ratePlanName}</p>}</td>{days.map(date => { const day = byDate.get(date); const currentRate = day?.roomRate ?? day?.totalRate ?? null; return <td key={date} className="border-b border-l px-3 py-3 text-center align-top">{day ? <div className="space-y-2"><span className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ${stockTone(day.roomsAvailable)}`}>{day.roomsAvailable === null ? "— plazas" : `${day.roomsAvailable} ${day.roomsAvailable === 1 ? "unidad" : "unidades"}`}</span><div className="flex items-center justify-center gap-1 font-semibold text-slate-800"><Euro className="h-3.5 w-3.5 text-sky-700" />{money(currentRate)}</div>{isAdmin && <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs text-sky-700 hover:text-sky-900" onClick={() => openRateEditor(room.roomTypeName, date, day.rateId, currentRate)}><Pencil className="mr-1 h-3.5 w-3.5" />Precio</Button>}{(day.restrictions.closedToArrival || day.restrictions.closedToDeparture || day.restrictions.minimumStay) && <p className="text-[10px] text-muted-foreground">{day.restrictions.closedToArrival ? "Sin entrada" : day.restrictions.closedToDeparture ? "Sin salida" : `Mín. ${day.restrictions.minimumStay} noches`}</p>}</div> : <span className="text-muted-foreground">—</span>}</td>; })}</tr>})}</tbody>
            </table>
          </div>
        </CardContent>
      </Card>}

      <Dialog open={Boolean(rateEditor)} onOpenChange={open => { if (!open) setRateEditor(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Modificar precio</DialogTitle><DialogDescription>Actualiza únicamente la tarifa base de una fecha. Cloudbeds rechazará automáticamente cualquier tarifa derivada.</DialogDescription></DialogHeader>
          {rateEditor && <div className="space-y-4 rounded-lg bg-muted/50 p-4 text-sm"><div><p className="font-semibold">{rateEditor.roomTypeName}</p><p className="text-muted-foreground">{displayDate(rateEditor.date)} · Precio actual: {money(rateEditor.previousRate)}</p></div><div className="space-y-2"><label htmlFor="new-rate" className="font-medium">Nuevo precio</label><Input id="new-rate" type="number" min="0" step="0.01" inputMode="decimal" value={newRate} onChange={event => setNewRate(event.target.value)} autoFocus /></div></div>}
          <DialogFooter><Button variant="outline" onClick={() => setRateEditor(null)}>Cancelar</Button><Button onClick={prepareRateConfirmation} className="bg-sky-700 hover:bg-sky-800">Revisar cambio</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(pendingRateChange)} onOpenChange={open => { if (!open) setPendingRateChange(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Confirmar cambio en Cloudbeds</AlertDialogTitle><AlertDialogDescription>Esta acción actualizará una tarifa en Cloudbeds y sus canales conectados. Revisa los datos antes de continuar.</AlertDialogDescription></AlertDialogHeader>
          {pendingRateChange && <div className="rounded-lg border bg-muted/40 p-4 text-sm"><p><strong>Habitación:</strong> {pendingRateChange.roomTypeName}</p><p><strong>Fecha:</strong> {displayDate(pendingRateChange.date)}</p><p><strong>Precio actual:</strong> {money(pendingRateChange.previousRate)}</p><p><strong>Nuevo precio:</strong> {money(pendingRateChange.rate)}</p></div>}
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => pendingRateChange && updateRate.mutate({ rateId: pendingRateChange.rateId, date: pendingRateChange.date, rate: pendingRateChange.rate })} disabled={updateRate.isPending} className="bg-sky-700 hover:bg-sky-800">{updateRate.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Actualizar en Cloudbeds</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

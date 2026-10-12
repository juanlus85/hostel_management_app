import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { BedDouble, CalendarDays, Cloud, Euro, Loader2, Pencil, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { sortAvailabilityRoomTypes } from "@/lib/availabilityRoomOrder";
import { AvailabilityReservations } from "@/components/AvailabilityReservations";

type AvailabilityResult = Awaited<ReturnType<typeof import("../../../server/cloudbedsAvailability").fetchCloudbedsAvailability>> & { fetchedAt?: string };
type RateEditor = {
  roomTypeName: string;
  date: string;
  rateId: string;
  previousRate: number;
};
type PendingRateChange = RateEditor & { rate: number };
type RateDraft = RateEditor & { rateText: string };
const availabilityPeriods = [7, 14, 30, 60] as const;

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
  const [periodDays, setPeriodDays] = useState<(typeof availabilityPeriods)[number]>(7);
  const [availability, setAvailability] = useState<AvailabilityResult | null>(null);
  const [rateEditor, setRateEditor] = useState<RateEditor | null>(null);
  const [newRate, setNewRate] = useState("");
  const [pendingRateChange, setPendingRateChange] = useState<PendingRateChange | null>(null);
  const [rateDrafts, setRateDrafts] = useState<Record<string, RateDraft>>({});
  const [pendingRateBatch, setPendingRateBatch] = useState<RateDraft[] | null>(null);
  const [section, setSection] = useState<"reservations" | "availability">("reservations");
  const autoLoadedAvailabilityDate = useRef<string | null>(null);

  const importWeekMutation = trpc.cloudbedsAvailability.importWeek.useMutation({
    onSuccess: result => {
      setAvailability(result);
    },
    onError: error => toast.error(error.message),
  });
  const loadAvailability = () => {
    if (startDate) importWeekMutation.mutate({ startDate, days: periodDays });
  };

  useEffect(() => {
    const loadKey = `${startDate}:${periodDays}`;
    if (section !== "availability" || !startDate || autoLoadedAvailabilityDate.current === loadKey) return;
    autoLoadedAvailabilityDate.current = loadKey;
    importWeekMutation.mutate({ startDate, days: periodDays });
  }, [section, startDate, periodDays]);

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
  const updateRates = trpc.cloudbedsAvailability.updateRates.useMutation({
    onSuccess: result => {
      setPendingRateBatch(null);
      const successfulKeys = new Set(result.updated.map(change => `${change.rateId}:${change.date}`));
      setRateDrafts(current => Object.fromEntries(Object.entries(current).filter(([key]) => !successfulKeys.has(key))));
      if (result.failed.length) {
        toast.warning(`${result.updated.length} precios enviados; ${result.failed.length} no pudieron actualizarse.`);
      } else {
        toast.success(`${result.updated.length} precios enviados a Cloudbeds.`);
      }
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
  const rateKey = (rateId: string, date: string) => `${rateId}:${date}`;
  const setRateDraft = (editor: RateEditor, rateText: string) => {
    setRateDrafts(current => ({ ...current, [rateKey(editor.rateId, editor.date)]: { ...editor, rateText } }));
  };
  const editedRateDrafts = useMemo(() => Object.values(rateDrafts).filter(draft => {
    const value = Number(draft.rateText.replace(",", "."));
    return Number.isFinite(value) && value >= 0 && Math.abs(value - draft.previousRate) > 0.004;
  }), [rateDrafts]);
  const focusRateInput = (event: KeyboardEvent<HTMLInputElement>, rowIndex: number, dayIndex: number) => {
    const direction = event.key === "ArrowRight" ? [0, 1] : event.key === "ArrowLeft" ? [0, -1] : event.key === "ArrowDown" ? [1, 0] : event.key === "ArrowUp" ? [-1, 0] : null;
    if (!direction) return;
    const nextRow = rowIndex + direction[0];
    const nextDay = dayIndex + direction[1];
    const next = document.querySelector<HTMLInputElement>(`[data-rate-row="${nextRow}"][data-rate-day="${nextDay}"]`);
    if (next) {
      event.preventDefault();
      next.focus();
      next.select();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sky-700"><Cloud className="h-5 w-5" /><span className="text-sm font-semibold">Cloudbeds · carga al abrir cada pestaña</span></div>
          <h1 className="text-2xl font-bold tracking-tight">Disponibilidad Hostel</h1>
          <p className="mt-1 text-muted-foreground">Disponibilidad y precio final con IVA incluido por tipo de habitación para los próximos {periodDays} días.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2"><CalendarDays className="h-4 w-4 text-muted-foreground" /><label htmlFor="availability-start" className="sr-only">Inicio del período</label><Input id="availability-start" type="date" value={startDate} onChange={event => setStartDate(event.target.value)} className="h-7 w-[142px] border-0 bg-transparent p-0 shadow-none focus-visible:ring-0" /></div>
          <label className="flex h-10 items-center gap-2 rounded-lg border bg-background px-3 text-sm font-medium text-muted-foreground" htmlFor="availability-period"><span>Mostrar</span><select id="availability-period" value={periodDays} onChange={event => setPeriodDays(Number(event.target.value) as (typeof availabilityPeriods)[number])} className="bg-transparent font-semibold text-foreground outline-none">{availabilityPeriods.map(days => <option key={days} value={days}>{days} días</option>)}</select></label>
          <Button onClick={loadAvailability} disabled={importWeekMutation.isPending || !startDate} className="bg-sky-700 hover:bg-sky-800">
            {importWeekMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Actualizar disponibilidad
          </Button>
        </div>
      </div>

      <div className="flex w-full gap-2 rounded-xl border bg-muted/40 p-1 sm:w-fit" role="tablist" aria-label="Secciones de disponibilidad">
        <Button variant={section === "reservations" ? "default" : "ghost"} size="sm" onClick={() => setSection("reservations")}><CalendarDays className="mr-2 h-4 w-4" />Reservas</Button>
        <Button variant={section === "availability" ? "default" : "ghost"} size="sm" onClick={() => setSection("availability")}><BedDouble className="mr-2 h-4 w-4" />Disponibilidad y precios</Button>
      </div>

      {section === "reservations" ? <AvailabilityReservations autoImport /> : <>
      {!availability && !importWeekMutation.isPending && <Card className="border-dashed"><CardContent className="flex flex-col items-center justify-center py-16 text-center"><div className="mb-4 rounded-full bg-sky-100 p-4 text-sky-700"><BedDouble className="h-8 w-8" /></div><h2 className="font-semibold">No se ha podido cargar el calendario</h2><p className="mt-2 max-w-lg text-sm text-muted-foreground">{importWeekMutation.error?.message || "Pulsa “Actualizar disponibilidad” para repetir la consulta manual a Cloudbeds."}</p></CardContent></Card>}

      {importWeekMutation.isPending && !availability && <Card><CardContent className="flex items-center justify-center gap-3 py-16 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin text-sky-700" />Consultando disponibilidad y precios en Cloudbeds…</CardContent></Card>}

      {availability && <Card className="overflow-hidden">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><CardTitle className="flex items-center gap-2"><BedDouble className="h-5 w-5 text-sky-700" />Calendario de precios y disponibilidad</CardTitle><CardDescription>Precio final con IVA incluido. Usa Tab para avanzar y las flechas para recorrer la cuadrícula. Las habitaciones siguen el orden operativo del Hostel.</CardDescription></div>{isAdmin && <div className="flex flex-col items-stretch gap-2 sm:items-end"><p className="text-xs text-muted-foreground">{editedRateDrafts.length ? `${editedRateDrafts.length} cambios pendientes` : "Edita los precios directamente"}</p><Button disabled={!editedRateDrafts.length || updateRates.isPending} onClick={() => setPendingRateBatch(editedRateDrafts)} className="bg-sky-700 hover:bg-sky-800">{updateRates.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Enviar {editedRateDrafts.length || ""} precios</Button></div>}</CardHeader>
        <CardContent className="p-0">
          <div className="isolate overflow-x-auto overscroll-x-contain">
            <table className="min-w-[940px] w-full border-collapse text-sm">
              <thead className="bg-muted/60"><tr><th className="sticky left-0 z-30 w-[190px] min-w-[190px] border-b bg-muted px-3 py-3 text-left font-semibold shadow-[8px_0_12px_-12px_rgba(15,23,42,0.65)] sm:w-[240px] sm:min-w-[240px] sm:px-4">Tipo de habitación</th>{days.map(day => <th key={day} className="min-w-[108px] border-b border-l px-3 py-3 text-center font-semibold capitalize">{displayDate(day)}</th>)}</tr></thead>
              <tbody>{roomTypes.map((room, rowIndex) => {
                const byDate = new Map(room.days.map(day => [day.date, day]));
                return <tr key={room.roomTypeId} className={rowIndex % 2 ? "bg-muted/20" : "bg-background"}><td className="sticky left-0 z-20 w-[190px] min-w-[190px] border-b bg-background px-3 py-4 align-top shadow-[8px_0_12px_-12px_rgba(15,23,42,0.65)] sm:w-[240px] sm:min-w-[240px] sm:px-4"><p className="font-semibold leading-snug">{room.roomTypeName}</p>{room.ratePlanName && <p className="mt-1 text-xs text-muted-foreground">Tarifa: {room.ratePlanName}</p>}</td>{days.map((date, dayIndex) => { const day = byDate.get(date); const currentRate = day?.totalRate ?? day?.roomRate ?? null; const hasRestrictions = Boolean(day?.restrictions.closedToArrival || day?.restrictions.closedToDeparture || (day?.restrictions.minimumStay && day.restrictions.minimumStay > 0)); const editor = day?.rateId && currentRate !== null ? { roomTypeName: room.roomTypeName, date, rateId: day.rateId, previousRate: currentRate ?? 0 } : null; const draft = editor ? rateDrafts[rateKey(editor.rateId, editor.date)] : null; return <td key={date} className="border-b border-l px-3 py-3 text-center align-top">{day ? <div className="space-y-2"><span className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ${stockTone(day.roomsAvailable)}`}>{day.roomsAvailable === null ? "— plazas" : `${day.roomsAvailable} ${day.roomsAvailable === 1 ? "unidad" : "unidades"}`}</span>{isAdmin && editor ? <div className="space-y-1"><label className="sr-only" htmlFor={`rate-${rowIndex}-${dayIndex}`}>Precio de {room.roomTypeName} el {displayDate(date)}</label><div className="flex items-center rounded-md border bg-background px-1 shadow-sm focus-within:ring-2 focus-within:ring-sky-600"><Euro className="h-3.5 w-3.5 shrink-0 text-sky-700" /><Input id={`rate-${rowIndex}-${dayIndex}`} data-rate-row={rowIndex} data-rate-day={dayIndex} type="number" min="0" step="0.01" inputMode="decimal" value={draft?.rateText ?? editor.previousRate.toFixed(2)} onFocus={event => event.currentTarget.select()} onKeyDown={event => focusRateInput(event, rowIndex, dayIndex)} onChange={event => setRateDraft(editor, event.target.value)} className={`h-8 min-w-0 border-0 p-1 text-center font-semibold shadow-none focus-visible:ring-0 ${draft ? "text-sky-800" : "text-slate-800"}`} /></div><p className="text-[10px] text-muted-foreground">IVA incluido</p></div> : <><div className="flex items-center justify-center gap-1 font-semibold text-slate-800"><Euro className="h-3.5 w-3.5 text-sky-700" />{money(currentRate)}</div><p className="text-[10px] text-muted-foreground">IVA incluido</p></>}{hasRestrictions && <p className="text-[10px] text-muted-foreground">{day.restrictions.closedToArrival ? "Sin entrada" : day.restrictions.closedToDeparture ? "Sin salida" : `Mín. ${day.restrictions.minimumStay} noches`}</p>}</div> : <span className="text-muted-foreground">—</span>}</td>; })}</tr>})}</tbody>
            </table>
          </div>
        </CardContent>
      </Card>}

      </>}

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

      <AlertDialog open={Boolean(pendingRateBatch)} onOpenChange={open => { if (!open) setPendingRateBatch(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Confirmar envío de precios a Cloudbeds</AlertDialogTitle><AlertDialogDescription>Se actualizarán {pendingRateBatch?.length || 0} tarifas base en Cloudbeds. Revisa los cambios antes de enviarlos.</AlertDialogDescription></AlertDialogHeader>
          {pendingRateBatch && <div className="max-h-64 overflow-y-auto rounded-lg border bg-muted/40 p-3 text-sm"><div className="space-y-2">{pendingRateBatch.map(change => <div key={rateKey(change.rateId, change.date)} className="flex justify-between gap-3"><span>{change.roomTypeName} · {displayDate(change.date)}</span><strong>{money(Number(change.rateText.replace(",", ".")))}</strong></div>)}</div></div>}
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => pendingRateBatch && updateRates.mutate({ changes: pendingRateBatch.map(change => ({ rateId: change.rateId, date: change.date, rate: Number(change.rateText.replace(",", ".")) })) })} disabled={updateRates.isPending} className="bg-sky-700 hover:bg-sky-800">{updateRates.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Enviar precios</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

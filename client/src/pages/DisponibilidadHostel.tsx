import { useMemo, useState } from "react";
import { AlertCircle, BedDouble, CalendarDays, Cloud, Download, Euro, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";

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
  const [startDate, setStartDate] = useState(() => formatDateLocal(new Date()));
  const [availability, setAvailability] = useState<Awaited<ReturnType<typeof import("../../../server/cloudbedsAvailability").fetchCloudbedsAvailability>> & { fetchedAt?: string } | null>(null);
  const importWeek = trpc.cloudbedsAvailability.importWeek.useMutation({
    onSuccess: result => {
      setAvailability(result);
      toast.success(`${result.roomTypes.length} tipos de habitación actualizados desde Cloudbeds`);
    },
    onError: error => toast.error(error.message),
  });

  const days = useMemo(() => {
    if (!availability) return [];
    const dates = new Set<string>();
    availability.roomTypes.forEach(room => room.days.forEach(day => dates.add(day.date)));
    return Array.from(dates).sort();
  }, [availability]);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sky-700"><Cloud className="h-5 w-5" /><span className="text-sm font-semibold">Cloudbeds · consulta manual</span></div>
          <h1 className="text-2xl font-bold tracking-tight">Disponibilidad Hostel</h1>
          <p className="mt-1 text-muted-foreground">Disponibilidad y precio por tipo de habitación para los próximos siete días.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2"><CalendarDays className="h-4 w-4 text-muted-foreground" /><label htmlFor="availability-start" className="sr-only">Inicio del período</label><Input id="availability-start" type="date" value={startDate} onChange={event => setStartDate(event.target.value)} className="h-7 w-[142px] border-0 bg-transparent p-0 shadow-none focus-visible:ring-0" /></div>
          <Button onClick={() => importWeek.mutate({ startDate })} disabled={importWeek.isPending || !startDate} className="bg-sky-700 hover:bg-sky-800">
            {importWeek.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : availability ? <RefreshCw className="mr-2 h-4 w-4" /> : <Download className="mr-2 h-4 w-4" />}
            {availability ? "Actualizar disponibilidad" : "Importar disponibilidad"}
          </Button>
        </div>
      </div>

      <Card className="border-sky-100 bg-gradient-to-r from-sky-50/80 via-background to-cyan-50/60">
        <CardContent className="flex flex-col gap-3 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-sky-700" /><p>La importación es de <strong>solo lectura</strong>: consulta Cloudbeds bajo demanda y no modifica reservas, precios ni disponibilidad.</p></div>
          {availability?.fetchedAt && <p className="shrink-0 text-xs text-muted-foreground">Actualizado: {new Date(availability.fetchedAt).toLocaleString("es-ES")}</p>}
        </CardContent>
      </Card>

      {availability && summary && <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardDescription>Tipos de habitación</CardDescription><CardTitle className="text-3xl text-sky-800">{availability.roomTypes.length}</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Con tarifa o disponibilidad en el período.</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Unidades disponibles</CardDescription><CardTitle className="text-3xl text-emerald-700">{summary.available}</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Suma de disponibilidad por día y tipo.</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Fechas agotadas</CardDescription><CardTitle className="text-3xl text-rose-700">{summary.soldOut}</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Combinaciones sin unidades disponibles.</CardContent></Card>
      </div>}

      {!availability && !importWeek.isPending && <Card className="border-dashed"><CardContent className="flex flex-col items-center justify-center py-16 text-center"><div className="mb-4 rounded-full bg-sky-100 p-4 text-sky-700"><BedDouble className="h-8 w-8" /></div><h2 className="font-semibold">Consulta el calendario de Cloudbeds</h2><p className="mt-2 max-w-lg text-sm text-muted-foreground">Selecciona el día de inicio y pulsa “Importar disponibilidad” para ver el precio y las plazas de cada tipo de habitación durante los siete días siguientes.</p></CardContent></Card>}

      {importWeek.isPending && <Card><CardContent className="flex items-center justify-center gap-3 py-16 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin text-sky-700" />Consultando disponibilidad y precios en Cloudbeds…</CardContent></Card>}

      {availability && <Card className="overflow-hidden">
        <CardHeader><CardTitle className="flex items-center gap-2"><BedDouble className="h-5 w-5 text-sky-700" />Calendario de precios y disponibilidad</CardTitle><CardDescription>Verde: buena disponibilidad · ámbar: pocas unidades · rojo: agotado. El precio mostrado es la tarifa base disponible por defecto.</CardDescription></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-[1020px] w-full border-collapse text-sm">
              <thead className="bg-muted/60"><tr><th className="sticky left-0 z-10 min-w-[220px] border-b bg-muted/95 px-4 py-3 text-left font-semibold">Tipo de habitación</th>{days.map(day => <th key={day} className="min-w-[112px] border-b border-l px-3 py-3 text-center font-semibold capitalize">{displayDate(day)}</th>)}</tr></thead>
              <tbody>{availability.roomTypes.map((room, index) => {
                const byDate = new Map(room.days.map(day => [day.date, day]));
                return <tr key={room.roomTypeId} className={index % 2 ? "bg-muted/20" : "bg-background"}><td className="sticky left-0 z-10 border-b bg-inherit px-4 py-4 align-top"><p className="font-semibold">{room.roomTypeName}</p>{room.ratePlanName && <p className="mt-1 text-xs text-muted-foreground">Tarifa: {room.ratePlanName}</p>}</td>{days.map(date => { const day = byDate.get(date); return <td key={date} className="border-b border-l px-3 py-3 text-center align-top">{day ? <div className="space-y-2"><span className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ${stockTone(day.roomsAvailable)}`}>{day.roomsAvailable === null ? "— plazas" : `${day.roomsAvailable} ${day.roomsAvailable === 1 ? "unidad" : "unidades"}`}</span><div className="flex items-center justify-center gap-1 font-semibold text-slate-800"><Euro className="h-3.5 w-3.5 text-sky-700" />{money(day.roomRate ?? day.totalRate)}</div>{(day.restrictions.closedToArrival || day.restrictions.closedToDeparture || day.restrictions.minimumStay) && <p className="text-[10px] text-muted-foreground">{day.restrictions.closedToArrival ? "Sin entrada" : day.restrictions.closedToDeparture ? "Sin salida" : `Mín. ${day.restrictions.minimumStay} noches`}</p>}</div> : <span className="text-muted-foreground">—</span>}</td>; })}</tr>})}</tbody>
            </table>
          </div>
        </CardContent>
      </Card>}
    </div>
  );
}

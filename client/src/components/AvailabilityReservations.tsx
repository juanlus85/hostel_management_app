import { useMemo, useState } from "react";
import { BedDouble, CalendarDays, CreditCard, Loader2, RefreshCw, StickyNote } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { buildReservationAgenda, type ReservationAgendaTone } from "@shared/reservationAgenda";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const madridDate = (date: Date) => date.toLocaleDateString("en-CA", { timeZone: "Europe/Madrid" });
const agendaToneClasses: Record<ReservationAgendaTone, string> = {
  emerald: "border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600",
  sky: "border-cyan-500 bg-cyan-500 text-white hover:bg-cyan-600",
  amber: "border-amber-400 bg-amber-400 text-amber-950 hover:bg-amber-500",
  slate: "border-slate-400 bg-slate-400 text-white hover:bg-slate-500",
  rose: "border-rose-400 bg-rose-400 text-white hover:bg-rose-500",
};

function getReservationWindow() {
  const today = new Date(`${madridDate(new Date())}T12:00:00`);
  const dates = Array.from({ length: 5 }, (_, index) => {
    const date = new Date(today);
    date.setDate(date.getDate() + index - 1);
    return madridDate(date);
  });
  return { dates, dateFrom: dates[0], dateTo: dates[4] };
}

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });
}

function formatDay(date: string) {
  const parts = new Intl.DateTimeFormat("es-ES", { weekday: "short", day: "numeric", month: "short" }).formatToParts(new Date(`${date}T12:00:00`));
  return {
    weekday: parts.find(part => part.type === "weekday")?.value.replace(".", "") || "",
    date: parts.find(part => part.type === "day")?.value || "",
    month: parts.find(part => part.type === "month")?.value.replace(".", "") || "",
  };
}

function compactDate(date: string | null | undefined) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short" })
    .format(new Date(`${date}T12:00:00`))
    .replace(".", "");
}

function money(value: string | number | null | undefined) {
  const amount = Number(String(value ?? "0").replace(",", "."));
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(Number.isFinite(amount) ? amount : 0);
}

function reservationStatus(value: string | null | undefined) {
  const status = value?.toLowerCase().replace(/[\s-]+/g, "_") || "";
  const labels: Record<string, string> = {
    in_progress: "En curso",
    confirmed: "Confirmada",
    not_confirmed: "Sin confirmar",
    cancelled: "Cancelada",
    canceled: "Cancelada",
    checked_in: "Check-in realizado",
    checked_out: "Check-out realizado",
    no_show: "No presentado",
  };
  return labels[status] || value || "Sin estado";
}

function statusTone(value: string | null | undefined) {
  const status = value?.toLowerCase().replace(/[\s-]+/g, "_") || "";
  if (["cancelled", "canceled", "no_show"].includes(status)) return "border-rose-200 bg-rose-50 text-rose-800";
  if (["checked_in", "checked_out"].includes(status)) return "border-slate-200 bg-slate-50 text-slate-700";
  if (status === "confirmed") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  return "border-amber-200 bg-amber-50 text-amber-800";
}

export function AvailabilityReservations() {
  const [window] = useState(getReservationWindow);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const utils = trpc.useUtils();
  const reservations = trpc.checkin.externalImports.listCloudbedsUpcomingReservations.useQuery({ dateFrom: window.dateFrom, dateTo: window.dateTo });
  const importReservations = trpc.checkin.externalImports.importCloudbedsUpcomingReservations.useMutation({
    onSuccess: result => {
      toast.success(`Reservas actualizadas: ${result.recordsImported}`);
      utils.checkin.externalImports.listCloudbedsUpcomingReservations.invalidate({ dateFrom: window.dateFrom, dateTo: window.dateTo });
    },
    onError: error => toast.error(error.message),
  });
  const detail = trpc.checkin.externalImports.getCloudbedsUpcomingReservationDetail.useQuery(
    { id: selectedId ?? 0 },
    { enabled: selectedId !== null, retry: false },
  );

  const agenda = useMemo(() => buildReservationAgenda(reservations.data || [], window.dates), [reservations.data, window.dates]);
  const arrivalsByDate = useMemo(() => new Map(window.dates.map(date => [date, (reservations.data || []).filter(reservation => reservation.checkInDate === date).length])), [reservations.data, window.dates]);
  const selected = (reservations.data || []).find(reservation => reservation.id === selectedId) || null;
  const reservation = detail.data?.reservation || selected;
  const payments = detail.data?.payments;
  const gridStyle = { gridTemplateColumns: `minmax(225px, 1.35fr) repeat(${window.dates.length}, minmax(142px, 1fr))` };

  return <div className="space-y-5">
    <Card className="border-sky-100 shadow-sm">
      <CardHeader className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-sky-700" />Agenda de reservas</CardTitle>
          <CardDescription className="mt-1">Vista por tipo de habitación y estancia. Pulsa una reserva para ver huésped, pagos y notas.</CardDescription>
        </div>
        <Button className="bg-sky-700 hover:bg-sky-800" onClick={() => importReservations.mutate()} disabled={importReservations.isPending}>
          {importReservations.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Actualizar reservas
        </Button>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-x-5 gap-y-2 border-t bg-sky-50/30 py-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-red-500" />Importe pendiente</span>
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" />Notas de la reserva</span>
        <span className="inline-flex items-center gap-2"><span className="h-3 w-5 rounded bg-emerald-500" />Check-in pagado</span>
        <span className="inline-flex items-center gap-2"><span className="h-3 w-5 rounded bg-rose-400" />Check-in con saldo</span>
        <span className="inline-flex items-center gap-2"><span className="h-3 w-5 rounded bg-cyan-500" />Pendiente de Check-in</span>
        <span className="inline-flex items-center gap-2"><span className="h-3 w-5 rounded bg-slate-400" />Check-out o cancelada</span>
      </CardContent>
    </Card>

    {reservations.isLoading ? <Card><CardContent className="flex items-center justify-center gap-3 py-16 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin text-sky-700" />Cargando reservas importadas…</CardContent></Card> : agenda.length ? <Card className="overflow-hidden border-slate-200 shadow-sm">
      <CardContent className="p-0">
        <div className="isolate overflow-x-auto overscroll-x-contain">
          <div className="min-w-[940px]">
            <div className="grid border-b bg-slate-50/80" style={gridStyle}>
              <div className="sticky left-0 z-30 border-r bg-slate-50 px-4 py-4 text-xs font-bold uppercase tracking-wide text-slate-600 shadow-[8px_0_12px_-12px_rgba(15,23,42,0.55)]">Tipo · habitación</div>
              {window.dates.map((date, index) => {
                const day = formatDay(date);
                const isToday = index === 1;
                const arrivals = arrivalsByDate.get(date) || 0;
                return <div key={date} className={`border-r px-3 py-3 text-center ${isToday ? "bg-sky-50 text-sky-800" : ""}`}><p className="text-[11px] font-semibold uppercase tracking-wide">{index === 0 ? "Ayer" : isToday ? "Hoy" : day.weekday}</p><p className="mt-0.5 text-2xl font-bold leading-none">{day.date}</p><p className="mt-1 text-[11px] capitalize text-muted-foreground">{day.month} · {arrivals} llegada{arrivals === 1 ? "" : "s"}</p></div>;
              })}
            </div>

            {agenda.map(group => <section key={group.key} className="border-b last:border-b-0">
              <div className="grid bg-slate-100/85" style={gridStyle}>
                <div className="sticky left-0 z-20 border-r bg-slate-100 px-4 py-3 shadow-[8px_0_12px_-12px_rgba(15,23,42,0.5)]"><p className="flex items-center gap-2 text-sm font-bold text-slate-800"><BedDouble className="h-4 w-4 text-sky-700" />{group.label}</p><p className="mt-1 text-xs text-muted-foreground">{group.reservationsCount} reserva{group.reservationsCount === 1 ? "" : "s"}</p></div>
                <div className="col-span-5 px-4 py-3 text-xs text-slate-500">Agenda de estancias y asignaciones de este tipo</div>
              </div>
              {group.rooms.map(room => <div key={room.key} className="grid min-h-[64px] bg-background" style={{ ...gridStyle, gridAutoRows: "minmax(64px, auto)" }}>
                <div className="sticky left-0 z-20 flex items-center border-r border-b bg-background px-4 shadow-[8px_0_12px_-12px_rgba(15,23,42,0.48)]" style={{ gridColumn: 1, gridRow: `1 / span ${room.laneCount}` }}><p className="text-sm font-medium text-slate-800">{room.label}</p></div>
                {window.dates.map((date, index) => <div key={date} className="border-b border-r bg-slate-50/35" style={{ gridColumn: index + 2, gridRow: `1 / span ${room.laneCount}` }} />)}
                {room.cards.map(card => <button key={card.reservation.id} type="button" title={`${card.reservation.guestName || "Huésped sin nombre"} · Entrada ${compactDate(card.reservation.checkInDate)} · Salida ${compactDate(card.reservation.checkOutDate)}`} onClick={() => setSelectedId(card.reservation.id)} className={`relative z-10 m-1 min-w-0 self-center overflow-visible rounded-l-md rounded-r-full border px-3 py-2 text-left shadow-sm transition duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-700 ${agendaToneClasses[card.tone]}`} style={{ gridColumn: `${card.startColumn + 2} / span ${card.span}`, gridRow: card.lane + 1 }}>
                  {card.hasPendingAmount && <span aria-label="Importe pendiente" title="Importe pendiente" className="absolute -top-1.5 left-2 h-3 w-3 rounded-full border-2 border-white bg-red-500 shadow-sm" />}
                  {card.hasNotes && <span aria-label="Tiene notas" title="Tiene notas" className="absolute -top-1.5 left-6 h-3 w-3 rounded-full border-2 border-white bg-amber-400 shadow-sm" />}
                  <span className="block truncate text-sm font-bold leading-tight">{card.reservation.guestName || "Huésped sin nombre"}</span>
                  <span className="mt-0.5 block truncate text-[11px] font-medium opacity-90">Entra {compactDate(card.reservation.checkInDate)} · Sale {compactDate(card.reservation.checkOutDate)}</span>
                </button>)}
              </div>)}
            </section>)}
          </div>
        </div>
      </CardContent>
    </Card> : <Card className="border-dashed"><CardContent className="flex flex-col items-center justify-center py-16 text-center"><CalendarDays className="mb-3 h-8 w-8 text-sky-700" /><h2 className="font-semibold">No hay reservas para este período</h2><p className="mt-2 max-w-md text-sm text-muted-foreground">Pulsa “Actualizar reservas” para importar la agenda de ayer, hoy y los próximos tres días desde Cloudbeds.</p></CardContent></Card>}

    <Dialog open={selectedId !== null} onOpenChange={open => { if (!open) setSelectedId(null); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>Detalle de reserva</DialogTitle><DialogDescription>{reservation?.reservationCode ? `Código ${reservation.reservationCode}` : "Información sincronizada desde Cloudbeds"}</DialogDescription></DialogHeader>
        {!reservation || detail.isLoading ? <div className="flex items-center justify-center gap-3 py-12 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin text-sky-700" />Cargando detalle y pagos…</div> : <div className="space-y-5">
          <section className="grid gap-3 rounded-xl border bg-muted/30 p-4 sm:grid-cols-2">
            <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Huésped</p><p className="mt-1 font-semibold">{reservation.guestName || "Sin nombre"}</p><p className="mt-1 text-sm text-muted-foreground">{reservation.guestEmail || "Sin correo"}</p><p className="text-sm text-muted-foreground">{reservation.guestPhone || "Sin teléfono"}</p></div>
            <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Estado</p><Badge variant="outline" className={`mt-1 ${statusTone(reservation.reservationStatus)}`}>{reservationStatus(reservation.reservationStatus)}</Badge><p className="mt-3 text-sm"><strong>Origen:</strong> {reservation.bookingSource || "No indicado"}</p><p className="mt-1 text-sm"><strong>Huéspedes:</strong> {reservation.guestCount ?? "—"}</p></div>
          </section>
          <section className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2"><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Entrada</p><p className="mt-1 font-semibold">{formatDate(reservation.checkInDate)}</p></div><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Salida</p><p className="mt-1 font-semibold">{reservation.checkOutDate ? formatDate(reservation.checkOutDate) : "No indicada"}</p></div><div className="sm:col-span-2"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Habitación</p><p className="mt-1 font-semibold">{reservation.roomNumber ? `Hab. ${reservation.roomNumber}` : "Sin asignar"}</p><p className="mt-1 text-sm text-muted-foreground">{reservation.roomType || "Tipo pendiente"}</p></div></section>
          <section className="rounded-xl border p-4"><div className="flex items-center justify-between gap-3"><div><p className="flex items-center gap-2 font-semibold"><CreditCard className="h-4 w-4 text-sky-700" />Pagos y movimientos</p><p className="mt-1 text-sm text-muted-foreground">Saldo pendiente informado por Cloudbeds: <strong className={Number(reservation.amountPending) > 0 ? "text-amber-700" : "text-emerald-700"}>{money(reservation.amountPending)}</strong></p></div>{detail.isFetching && <Loader2 className="h-4 w-4 animate-spin text-sky-700" />}</div>
            {payments ? <><div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-lg bg-emerald-50 p-3"><p className="text-xs text-emerald-800">Cobrado</p><p className="mt-1 font-bold text-emerald-800">{money(payments.paidTotal)}</p></div><div className="rounded-lg bg-rose-50 p-3"><p className="text-xs text-rose-800">Devuelto</p><p className="mt-1 font-bold text-rose-800">{money(payments.refundedTotal)}</p></div><div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-700">Cargos</p><p className="mt-1 font-bold text-slate-800">{money(payments.chargeTotal)}</p></div></div>{payments.movements.length ? <div className="mt-4 divide-y rounded-lg border">{payments.movements.map(movement => <div className="flex items-center justify-between gap-3 p-3 text-sm" key={movement.id || `${movement.label}-${movement.occurredAt}`}><div><p className="font-medium">{movement.label}</p><p className="text-xs text-muted-foreground">{movement.occurredAt ? new Date(movement.occurredAt).toLocaleString("es-ES") : movement.serviceDate || "Sin fecha"}</p></div><p className={movement.kind === "payment" ? "font-semibold text-emerald-700" : "font-semibold text-slate-800"}>{movement.kind === "payment" ? "Pago" : "Cargo"} · {money(Math.abs(movement.amount))}</p></div>)}</div> : <p className="mt-4 text-sm text-muted-foreground">Cloudbeds no ha devuelto movimientos para esta reserva.</p>}</> : <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{detail.data?.paymentWarning || "No se han podido cargar los movimientos de pago."}</p>}
          </section>
          <section className="rounded-xl border p-4"><p className="flex items-center gap-2 font-semibold"><StickyNote className="h-4 w-4 text-amber-600" />Notas de la reserva</p><p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{reservation.reservationNotes || "Sin notas importadas."}</p></section>
        </div>}
      </DialogContent>
    </Dialog>
  </div>;
}

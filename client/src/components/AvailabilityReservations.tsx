import { useMemo, useState } from "react";
import { CalendarDays, ChevronRight, CreditCard, ExternalLink, Loader2, RefreshCw, UserRound } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const madridDate = (date: Date) => date.toLocaleDateString("en-CA", { timeZone: "Europe/Madrid" });

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

  const byDate = useMemo(() => {
    const rows = reservations.data || [];
    return new Map(window.dates.map(date => [date, rows.filter(reservation => reservation.checkInDate === date)]));
  }, [reservations.data, window.dates]);
  const selected = (reservations.data || []).find(reservation => reservation.id === selectedId) || null;
  const reservation = detail.data?.reservation || selected;
  const payments = detail.data?.payments;

  return <div className="space-y-5">
    <Card className="border-sky-100">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-sky-700" />Reservas y llegadas</CardTitle>
          <CardDescription>Ayer, hoy y los tres próximos días. Pulsa una reserva para consultar huésped, estancia y movimientos de pago.</CardDescription>
        </div>
        <Button className="bg-sky-700 hover:bg-sky-800" onClick={() => importReservations.mutate()} disabled={importReservations.isPending}>
          {importReservations.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Actualizar reservas
        </Button>
      </CardHeader>
      <CardContent>
        {reservations.isLoading ? <div className="flex items-center justify-center gap-3 py-10 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin text-sky-700" />Cargando reservas importadas…</div> : <p className="text-sm text-muted-foreground">{reservations.data?.length ? "Las reservas se mantienen separadas de las cajas y se muestran con su estado actual importado de Cloudbeds." : "Aún no hay reservas para este período. Pulsa “Actualizar reservas” para importarlas desde Cloudbeds."}</p>}
      </CardContent>
    </Card>

    <div className="grid gap-4 xl:grid-cols-5">
      {window.dates.map((date, index) => {
        const rows = byDate.get(date) || [];
        const title = index === 0 ? "Ayer" : index === 1 ? "Hoy" : formatDate(date);
        return <Card key={date} className={index === 1 ? "border-sky-300 shadow-sm" : "border-border"}>
          <CardHeader className="space-y-1 border-b bg-muted/20 py-4"><CardTitle className="text-base capitalize">{title}</CardTitle><CardDescription className="capitalize">{formatDate(date)} · {rows.length} {rows.length === 1 ? "reserva" : "reservas"}</CardDescription></CardHeader>
          <CardContent className="space-y-3 p-3">
            {rows.length ? rows.map(row => <button key={row.id} type="button" onClick={() => setSelectedId(row.id)} className="group w-full rounded-lg border bg-background p-3 text-left shadow-sm transition hover:border-sky-300 hover:bg-sky-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600">
              <div className="flex items-start justify-between gap-2"><p className="line-clamp-2 font-semibold">{row.guestName || "Huésped sin nombre"}</p><ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5" /></div>
              <Badge variant="outline" className={`mt-2 max-w-full truncate ${statusTone(row.reservationStatus)}`}>{reservationStatus(row.reservationStatus)}</Badge>
              <p className="mt-3 text-sm font-medium">{row.roomNumber ? `Hab. ${row.roomNumber}` : "Habitación sin asignar"}</p>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{row.roomType || "Tipo pendiente"}</p>
              <div className="mt-3 flex items-center justify-between gap-2 border-t pt-2 text-xs"><span>{row.guestCount ?? "—"} huéspedes</span><span className={Number(row.amountPending) > 0 ? "font-semibold text-amber-700" : "font-semibold text-emerald-700"}>{Number(row.amountPending) > 0 ? `Pend. ${money(row.amountPending)}` : "Sin saldo"}</span></div>
            </button>) : <div className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">Sin llegadas</div>}
          </CardContent>
        </Card>;
      })}
    </div>

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
          <section className="rounded-xl border p-4"><p className="flex items-center gap-2 font-semibold"><UserRound className="h-4 w-4 text-sky-700" />Notas de la reserva</p><p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{reservation.reservationNotes || "Sin notas importadas."}</p></section>
        </div>}
      </DialogContent>
    </Dialog>
  </div>;
}

import { useEffect, useMemo, useRef, useState } from "react";
import { BedDouble, CalendarDays, CheckCircle2, CreditCard, FileText, Loader2, Mail, MessageCircle, PencilLine, PlusCircle, ReceiptText, RefreshCw, Send, StickyNote } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { buildReservationAgenda, type ReservationAgendaTone } from "@shared/reservationAgenda";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/_core/hooks/useAuth";
import { getReservationWindowRange } from "@/lib/reservationWindow";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const madridDate = (date: Date) => date.toLocaleDateString("en-CA", { timeZone: "Europe/Madrid" });
const agendaToneClasses: Record<ReservationAgendaTone, string> = {
  emerald: "border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600",
  sky: "border-cyan-500 bg-cyan-500 text-white hover:bg-cyan-600",
  amber: "border-amber-400 bg-amber-400 text-amber-950 hover:bg-amber-500",
  slate: "border-slate-400 bg-slate-400 text-white hover:bg-slate-500",
  rose: "border-rose-400 bg-rose-400 text-white hover:bg-rose-500",
};

const statusOptions = [
  { value: "confirmed", label: "Confirmada" },
  { value: "not_confirmed", label: "Sin confirmar" },
  { value: "checked_in", label: "Check-in realizado" },
  { value: "checked_out", label: "Check-out realizado" },
  { value: "canceled", label: "Cancelada" },
  { value: "no_show", label: "No presentado" },
] as const;
type CloudbedsStatus = typeof statusOptions[number]["value"];
type PaymentDraft = { type: string; label: string; amount: string; description: string; isDeposit: boolean };
type PendingPayment = PaymentDraft & { amountNumber: number };
type PendingStatus = { status: CloudbedsStatus; label: string };
type MessageLanguage = "es" | "en";
type WelcomeEditor = { reservationId: number; guestName: string; guestEmail: string; messageType: "welcome" | "online_checkin"; subject: string; message: string };
type WhatsAppEditor = { reservationId: number; guestName: string; messageType: "welcome" | "online_checkin"; message: string };

function getReservationWindow() {
  return getReservationWindowRange(madridDate(new Date()));
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
    completed: "Check-out realizado",
    no_show: "No presentado",
  };
  return labels[status] || value || "Sin estado";
}

function editableStatus(value: string | null | undefined): CloudbedsStatus {
  const normalized = value?.toLowerCase().replace(/[\s-]+/g, "_") || "";
  if (normalized === "cancelled") return "canceled";
  if (normalized === "completed") return "checked_out";
  if (normalized === "in_progress") return "checked_in";
  return statusOptions.some(option => option.value === normalized) ? normalized as CloudbedsStatus : "confirmed";
}

function statusTone(value: string | null | undefined) {
  const status = value?.toLowerCase().replace(/[\s-]+/g, "_") || "";
  if (["cancelled", "canceled", "no_show"].includes(status)) return "border-rose-200 bg-rose-50 text-rose-800";
  if (status === "checked_out") return "border-slate-200 bg-slate-50 text-slate-700";
  if (status === "checked_in") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  return "border-sky-200 bg-sky-50 text-sky-800";
}

function agendaCardGridStyle(card: { startSlot: number; endSlot: number; lane: number }) {
  const firstColumn = Math.floor(card.startSlot);
  const endColumn = Math.ceil(card.endSlot);
  const startOffset = card.startSlot - firstColumn;
  const endOffset = endColumn - card.endSlot;
  return {
    gridColumn: `${firstColumn + 2} / span ${endColumn - firstColumn}`,
    gridRow: card.lane + 1,
    marginLeft: startOffset ? `calc(${(startOffset / (endColumn - firstColumn)) * 100}% + 4px)` : "4px",
    marginRight: endOffset ? `calc(${(endOffset / (endColumn - firstColumn)) * 100}% + 4px)` : "4px",
    marginTop: "4px",
    marginBottom: "4px",
  };
}

export function AvailabilityReservations({ autoImport = false }: { autoImport?: boolean }) {
  const { user } = useAuth();
  const [window] = useState(getReservationWindow);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showUnassignedReservations, setShowUnassignedReservations] = useState(false);
  const [detailTab, setDetailTab] = useState("information");
  const [paymentEditor, setPaymentEditor] = useState<PaymentDraft | null>(null);
  const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(null);
  const [statusEditor, setStatusEditor] = useState<CloudbedsStatus | null>(null);
  const [pendingStatus, setPendingStatus] = useState<PendingStatus | null>(null);
  const [messageLanguage, setMessageLanguage] = useState<MessageLanguage>("es");
  const [welcomeEditor, setWelcomeEditor] = useState<WelcomeEditor | null>(null);
  const [whatsAppEditor, setWhatsAppEditor] = useState<WhatsAppEditor | null>(null);
  const utils = trpc.useUtils();
  const reservations = trpc.checkin.externalImports.listCloudbedsUpcomingReservations.useQuery({ dateFrom: window.dateFrom, dateTo: window.dateTo });
  const importReservations = trpc.checkin.externalImports.importCloudbedsUpcomingReservations.useMutation({
    onSuccess: result => {
      toast.success(`Reservas actualizadas: ${result.recordsImported}`);
      utils.checkin.externalImports.listCloudbedsUpcomingReservations.invalidate({ dateFrom: window.dateFrom, dateTo: window.dateTo });
    },
    onError: error => toast.error(error.message),
  });
  const hasImportedOnEntry = useRef(false);
  useEffect(() => {
    if (!autoImport || hasImportedOnEntry.current) return;
    hasImportedOnEntry.current = true;
    importReservations.mutate();
  }, [autoImport, importReservations.mutate]);
  const detail = trpc.checkin.externalImports.getCloudbedsUpcomingReservationDetail.useQuery(
    { id: selectedId ?? 0 },
    { enabled: selectedId !== null, retry: false },
  );
  const fiscalDocuments = trpc.checkin.externalImports.listCloudbedsReservationFiscalDocuments.useQuery(
    { id: selectedId ?? 0 },
    { enabled: selectedId !== null && detailTab === "billing", retry: false },
  );
  const downloadFiscalDocument = trpc.checkin.externalImports.downloadCloudbedsReservationFiscalDocument.useMutation({
    onSuccess: result => {
      const raw = globalThis.atob(result.dataBase64);
      const bytes = Uint8Array.from(raw, character => character.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: result.contentType }));
      const link = document.createElement("a");
      link.href = url;
      link.download = result.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success("Documento oficial de Cloudbeds descargado");
    },
    onError: error => toast.error(error.message),
  });
  const paymentMethods = trpc.checkin.externalImports.getCloudbedsPaymentMethods.useQuery(undefined, {
    enabled: Boolean(paymentEditor && selectedId !== null && user?.role === "admin"),
    retry: false,
  });
  const recordPayment = trpc.checkin.externalImports.recordCloudbedsReservationPayment.useMutation({
    onSuccess: result => {
      toast.success("Pago registrado en Cloudbeds");
      if (result.syncWarning) toast.warning(result.syncWarning);
      setPendingPayment(null);
      setPaymentEditor(null);
      utils.checkin.externalImports.listCloudbedsUpcomingReservations.invalidate({ dateFrom: window.dateFrom, dateTo: window.dateTo });
      if (selectedId !== null) utils.checkin.externalImports.getCloudbedsUpcomingReservationDetail.invalidate({ id: selectedId });
    },
    onError: error => toast.error(error.message),
  });
  const updateStatus = trpc.checkin.externalImports.updateCloudbedsUpcomingReservationStatus.useMutation({
    onSuccess: result => {
      toast.success(`Estado actualizado en Cloudbeds: ${reservationStatus(result.status)}`);
      setPendingStatus(null);
      setStatusEditor(null);
      utils.checkin.externalImports.listCloudbedsUpcomingReservations.invalidate({ dateFrom: window.dateFrom, dateTo: window.dateTo });
      if (selectedId !== null) utils.checkin.externalImports.getCloudbedsUpcomingReservationDetail.invalidate({ id: selectedId });
    },
    onError: error => toast.error(error.message),
  });
  const setReviewed = trpc.checkin.externalImports.setCloudbedsUpcomingReservationReviewed.useMutation({
    onSuccess: () => {
      toast.success("Reserva revisada");
      utils.checkin.externalImports.listCloudbedsUpcomingReservations.invalidate({ dateFrom: window.dateFrom, dateTo: window.dateTo });
    },
    onError: error => toast.error(error.message),
  });
  const prepareReservationMessage = trpc.checkin.externalImports.prepareCloudbedsReservationWelcome.useMutation({
    onError: error => toast.error(error.message),
  });
  const sendReservationEmail = trpc.checkin.externalImports.sendCloudbedsReservationEmail.useMutation({
    onSuccess: (_result, variables) => {
      toast.success(variables.messageType === "welcome" ? "Correo de bienvenida enviado" : "Invitación de Check-in Online enviada");
      setWelcomeEditor(null);
    },
    onError: error => toast.error(error.message),
  });
  const prepareReservationWhatsApp = trpc.checkin.externalImports.prepareCloudbedsReservationWhatsApp.useMutation({
    onError: error => toast.error(error.message),
  });

  const displayedReservations = useMemo(
    () =>
      (reservations.data || []).filter(
        reservation => showUnassignedReservations || Boolean(reservation.roomNumber?.trim())
      ),
    [reservations.data, showUnassignedReservations]
  );
  const hiddenUnassignedReservations = Math.max(
    0,
    (reservations.data || []).filter(reservation => !reservation.roomNumber?.trim()).length
  );
  const agenda = useMemo(() => buildReservationAgenda(displayedReservations, window.dates), [displayedReservations, window.dates]);
  const arrivalsByDate = useMemo(() => new Map(window.dates.map(date => [date, (reservations.data || []).filter(reservation => reservation.checkInDate === date).length])), [reservations.data, window.dates]);
  const selected = (reservations.data || []).find(reservation => reservation.id === selectedId) || null;
  const reservation = detail.data?.reservation || selected;
  const payments = detail.data?.payments;
  const gridStyle = { gridTemplateColumns: `var(--agenda-label-column) repeat(${window.dates.length}, var(--agenda-day-column))` };
  const canRecordPayments = user?.role === "admin";
  const canManageReservations = user?.role === "admin";
  const todayIndex = 1;
  const officialPending = Number(String(reservation?.amountPending ?? "0").replace(",", "."));
  const plannedTotal = payments ? payments.chargeTotal + payments.pendingChargeTotal : 0;
  const plannedBalance = payments ? plannedTotal + payments.refundedTotal - payments.paidTotal : null;
  const plannedCredit = plannedBalance !== null && plannedBalance < -0.004 ? Math.abs(plannedBalance) : 0;
  const hotelCollect = Boolean(detail.data?.reservation && "hotelCollect" in detail.data.reservation && detail.data.reservation.hotelCollect === true);

  const openPaymentEditor = () => {
    const amountPending = Number(String(reservation?.amountPending ?? "0").replace(",", "."));
    setPaymentEditor({ type: "", label: "", amount: Number.isFinite(amountPending) && amountPending > 0 ? amountPending.toFixed(2) : "", description: "", isDeposit: false });
  };
  const preparePayment = () => {
    if (!paymentEditor) return;
    const amountNumber = Number(paymentEditor.amount.replace(",", "."));
    if (!paymentEditor.type || !paymentEditor.label) return toast.error("Selecciona un método de pago de Cloudbeds.");
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) return toast.error("Indica un importe de pago válido, superior a 0 €.");
    setPendingPayment({ ...paymentEditor, amountNumber });
  };
  const prepareStatus = () => {
    if (!statusEditor) return;
    const label = statusOptions.find(option => option.value === statusEditor)?.label || statusEditor;
    setPendingStatus({ status: statusEditor, label });
  };
  const editReservationEmail = async (messageType: "welcome" | "online_checkin") => {
    if (!reservation?.guestEmail) return toast.error("La reserva no tiene correo electrónico");
    try {
      const draft = await prepareReservationMessage.mutateAsync({ externalReservationId: reservation.id, language: messageLanguage, messageType });
      setWelcomeEditor({ reservationId: reservation.id, guestName: reservation.guestName || "este huésped", guestEmail: reservation.guestEmail, messageType, subject: draft.subject, message: draft.text });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo preparar el correo");
    }
  };
  const editReservationWhatsApp = async (messageType: "welcome" | "online_checkin") => {
    if (!reservation) return;
    try {
      const draft = await prepareReservationWhatsApp.mutateAsync({ externalReservationId: reservation.id, language: messageLanguage, messageType });
      setWhatsAppEditor({ reservationId: reservation.id, guestName: reservation.guestName || "este huésped", messageType, message: draft.message });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo preparar WhatsApp");
    }
  };
  const sendEditedWelcome = () => {
    if (!welcomeEditor) return;
    if (!welcomeEditor.subject.trim() || !welcomeEditor.message.trim()) return toast.error("Indica el asunto y el contenido del correo");
    if (!globalThis.window.confirm(`¿Enviar el correo personalizado a ${welcomeEditor.guestName} (${welcomeEditor.guestEmail})?`)) return;
    sendReservationEmail.mutate({
      externalReservationId: welcomeEditor.reservationId,
      messageType: welcomeEditor.messageType,
      language: messageLanguage,
      subject: welcomeEditor.subject,
      message: welcomeEditor.message,
    });
  };
  const openEditedWhatsApp = async () => {
    if (!whatsAppEditor?.message.trim()) return toast.error("Indica el mensaje de WhatsApp");
    try {
      const draft = await prepareReservationWhatsApp.mutateAsync({ externalReservationId: whatsAppEditor.reservationId, messageType: whatsAppEditor.messageType, language: messageLanguage, message: whatsAppEditor.message });
      const phone = draft.phone.replace(/\D/g, "");
      if (!phone) throw new Error("El teléfono de la reserva no es válido");
      globalThis.window.open(`https://wa.me/${phone}?text=${encodeURIComponent(draft.message)}`, "_blank", "noopener,noreferrer");
      setWhatsAppEditor(null);
      toast.success("WhatsApp preparado. Confirma el envío desde WhatsApp.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo preparar WhatsApp");
    }
  };
  return <div className="flex flex-col gap-5">
    <Card className="order-2 border-sky-100 shadow-sm">
      <CardHeader className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-sky-700" />Agenda de reservas</CardTitle>
          <CardDescription className="mt-1">Vista por tipo de habitación y estancia. Pulsa una reserva para ver huésped, pagos y notas.</CardDescription>
        </div>
        <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => setShowUnassignedReservations(current => !current)}>{showUnassignedReservations ? "Ocultar sin habitación" : `Mostrar sin habitación${hiddenUnassignedReservations ? ` (${hiddenUnassignedReservations})` : ""}`}</Button><Button className="bg-sky-700 hover:bg-sky-800" onClick={() => importReservations.mutate()} disabled={importReservations.isPending}>
          {importReservations.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Actualizar reservas
        </Button></div>
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
          <div className="min-w-[472px] sm:min-w-[935px]">
            <div className="reservation-agenda-grid grid border-b bg-slate-50/80" style={gridStyle}>
              <div className="sticky left-0 z-30 border-r bg-slate-50 px-2 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-600 shadow-[8px_0_12px_-12px_rgba(15,23,42,0.55)] sm:px-4 sm:py-4 sm:text-xs">Tipo · hab.</div>
              {window.dates.map((date, index) => {
                const day = formatDay(date);
                const isToday = index === todayIndex;
                const arrivals = arrivalsByDate.get(date) || 0;
                return <div key={date} className={`border-r px-1 py-2 text-center ${isToday ? "z-10 border-x-2 border-amber-400 bg-amber-100 text-amber-950 shadow-[inset_0_3px_0_rgb(251_191_36)]" : ""} sm:px-3 sm:py-3`}><p className="text-[9px] font-semibold uppercase tracking-wide sm:text-[11px]">{index === 0 ? "Ayer" : isToday ? "Hoy" : day.weekday}</p><p className="mt-0.5 text-lg font-bold leading-none sm:text-2xl">{day.date}</p><p className="mt-1 text-[9px] capitalize text-muted-foreground sm:text-[11px]"><span className="sm:hidden">{arrivals} lleg.</span><span className="hidden sm:inline">{day.month} · {arrivals} llegada{arrivals === 1 ? "" : "s"}</span></p></div>;
              })}
            </div>
            {agenda.map(group => <section key={group.key} className="border-b last:border-b-0">
              <div className="reservation-agenda-grid grid h-8 border-y border-slate-200 bg-slate-100/95" style={gridStyle}>
                <div className="sticky left-0 z-20 flex min-w-0 items-center border-r bg-slate-100 px-2 shadow-[8px_0_12px_-12px_rgba(15,23,42,0.5)] sm:px-4"><p title={group.label} className="flex min-w-0 items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-700 sm:gap-2 sm:text-xs"><BedDouble className="h-3 w-3 shrink-0 text-sky-700" /><span className="truncate">{group.label}</span><span className="shrink-0 text-[9px] font-medium normal-case tracking-normal text-slate-500">· {group.reservationsCount} res.</span></p></div>
                {window.dates.map((date, index) => <div key={date} aria-hidden="true" className={`border-r ${index === todayIndex ? "border-x-2 border-amber-400 bg-amber-50" : ""}`} />)}
              </div>
              {group.rooms.map(room => <div key={room.key} className="reservation-agenda-grid grid min-h-[48px] bg-background sm:min-h-[64px]" style={{ ...gridStyle, gridAutoRows: "minmax(var(--agenda-row-height), auto)" }}>
                <div className="sticky left-0 z-20 flex min-w-0 items-center border-r border-b bg-background px-2 shadow-[8px_0_12px_-12px_rgba(15,23,42,0.48)] sm:px-4" style={{ gridColumn: 1, gridRow: `1 / span ${room.laneCount}` }}><p title={room.label} className="truncate text-xs font-medium text-slate-800 sm:text-sm">{room.label}</p></div>
                {window.dates.map((date, index) => <div key={date} className={`border-b border-r bg-slate-50/35 ${index === todayIndex ? "border-x-2 border-amber-400 bg-amber-50/70" : ""}`} style={{ gridColumn: index + 2, gridRow: `1 / span ${room.laneCount}` }} />)}
                {room.cards.map(card => <button key={card.reservation.id} type="button" title={`${card.reservation.guestName || "Huésped sin nombre"} · Entrada ${compactDate(card.reservation.checkInDate)} · Salida ${compactDate(card.reservation.checkOutDate)}`} onClick={() => { setSelectedId(card.reservation.id); setDetailTab("information"); }} className={`relative z-10 min-w-0 self-center overflow-visible border px-1.5 py-1 text-left shadow-sm transition duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-700 sm:px-3 sm:py-2 ${card.startSlot % 1 ? "rounded-l-none" : "rounded-l-md"} ${card.endSlot % 1 ? "rounded-r-none" : "rounded-r-full"} ${agendaToneClasses[card.tone]}`} style={agendaCardGridStyle(card)}>
                  {card.hasPendingAmount && <span aria-label="Importe pendiente" title="Importe pendiente" className="absolute -top-1 left-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500 shadow-sm sm:-top-1.5 sm:left-2 sm:h-3 sm:w-3" />}
                  {card.hasNotes && <span aria-label="Tiene notas" title="Tiene notas" className="absolute -top-1 left-4 h-2.5 w-2.5 rounded-full border-2 border-white bg-amber-400 shadow-sm sm:-top-1.5 sm:left-6 sm:h-3 sm:w-3" />}
                  <span className="block truncate text-[10px] font-bold leading-tight sm:text-sm">{card.reservation.guestName || "Huésped sin nombre"}</span>
                  <span className="mt-0.5 block truncate text-[9px] font-medium opacity-90 sm:text-[11px]"><span className="sm:hidden">{compactDate(card.reservation.checkInDate)} → {compactDate(card.reservation.checkOutDate)}</span><span className="hidden sm:inline">Entra {compactDate(card.reservation.checkInDate)} · Sale {compactDate(card.reservation.checkOutDate)}</span></span>
                </button>)}
              </div>)}
            </section>)}
          </div>
        </div>
      </CardContent>
    </Card> : <Card className="border-dashed"><CardContent className="flex flex-col items-center justify-center py-16 text-center"><CalendarDays className="mb-3 h-8 w-8 text-sky-700" /><h2 className="font-semibold">No hay reservas visibles para este período</h2><p className="mt-2 max-w-md text-sm text-muted-foreground">Actualiza las reservas o despliega las reservas sin habitación asignada para revisar la agenda completa.</p></CardContent></Card>}

    <Dialog open={selectedId !== null} onOpenChange={open => { if (!open) setSelectedId(null); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>Detalle de reserva</DialogTitle><DialogDescription>{reservation?.reservationCode ? `Código ${reservation.reservationCode}` : "Información sincronizada desde Cloudbeds"}</DialogDescription></DialogHeader>
        {!reservation || detail.isLoading ? <div className="flex items-center justify-center gap-3 py-12 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin text-sky-700" />Cargando detalle y pagos…</div> : <Tabs value={detailTab} onValueChange={setDetailTab}>
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-4">
            <TabsTrigger value="information">Información</TabsTrigger>
            <TabsTrigger value="charges">Cobros y cargos</TabsTrigger>
            <TabsTrigger value="billing">Facturación</TabsTrigger>
            <TabsTrigger value="checkin">Check-in y mensajes</TabsTrigger>
          </TabsList>

          <TabsContent value="information" className="mt-4 space-y-4">
            {hotelCollect && <section className="rounded-xl border-2 border-amber-400 bg-amber-50 p-4 text-amber-950"><p className="flex items-center gap-2 font-bold"><CreditCard className="h-5 w-5" />Hotel Collect · cobrar en el hotel</p><p className="mt-1 text-sm">Esta reserva debe cobrarse directamente al huésped en el establecimiento. Comprueba el saldo oficial en la pestaña Cobros y cargos.</p></section>}
            <section className="grid gap-3 rounded-xl border bg-muted/30 p-4 sm:grid-cols-2">
              <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Huésped</p><p className="mt-1 font-semibold">{reservation.guestName || "Sin nombre"}</p><p className="mt-1 text-sm text-muted-foreground">{reservation.guestEmail || "Sin correo"}</p><p className="text-sm text-muted-foreground">{reservation.guestPhone || "Sin teléfono"}</p></div>
              <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Estado</p><Badge variant="outline" className={`mt-1 ${statusTone(reservation.reservationStatus)}`}>{reservationStatus(reservation.reservationStatus)}</Badge>{canManageReservations && <Button type="button" variant="outline" size="sm" className="mt-3 w-full sm:w-auto" onClick={() => setStatusEditor(editableStatus(reservation.reservationStatus))}><PencilLine className="mr-2 h-3.5 w-3.5" />Cambiar estado</Button>}<p className="mt-3 text-sm"><strong>Origen:</strong> {reservation.bookingSource || "No indicado"}</p><p className="mt-1 text-sm"><strong>Huéspedes:</strong> {reservation.guestCount ?? "—"}</p></div>
            </section>
            <section className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2"><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Entrada</p><p className="mt-1 font-semibold">{formatDate(reservation.checkInDate)}</p></div><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Salida</p><p className="mt-1 font-semibold">{reservation.checkOutDate ? formatDate(reservation.checkOutDate) : "No indicada"}</p></div><div className="sm:col-span-2"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Habitación</p><p className="mt-1 font-semibold">{reservation.roomNumber ? `Hab. ${reservation.roomNumber}` : "Sin asignar"}</p><p className="mt-1 text-sm text-muted-foreground">{reservation.roomType || "Tipo pendiente"}</p></div></section>
            <section className="rounded-xl border p-4"><p className="flex items-center gap-2 font-semibold"><StickyNote className="h-4 w-4 text-amber-600" />Notas de la reserva</p><p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{reservation.reservationNotes || "Sin notas importadas."}</p></section>
          </TabsContent>

          <TabsContent value="charges" className="mt-4">
            <section className="rounded-xl border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="flex items-center gap-2 font-semibold"><CreditCard className="h-4 w-4 text-sky-700" />Pagos y movimientos</p><p className="mt-1 text-sm text-muted-foreground">Saldo oficial de Cloudbeds: <strong className={officialPending > 0 ? "text-rose-700" : "text-emerald-700"}>{money(reservation.amountPending)}</strong></p></div><div className="flex items-center gap-2">{detail.isFetching && <Loader2 className="h-4 w-4 animate-spin text-sky-700" />}{canRecordPayments && <Button type="button" size="sm" onClick={openPaymentEditor}><PlusCircle className="mr-2 h-4 w-4" />Añadir pago</Button>}</div></div>
              {payments ? <><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><div className="rounded-lg bg-emerald-50 p-3"><p className="text-xs text-emerald-800">Cobrado</p><p className="mt-1 font-bold text-emerald-800">{money(payments.paidTotal)}</p></div><div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-700">Cargos contabilizados</p><p className="mt-1 font-bold text-slate-800">{money(payments.chargeTotal)}</p></div><div className="rounded-lg bg-sky-50 p-3"><p className="text-xs text-sky-800">Noches futuras</p><p className="mt-1 font-bold text-sky-800">{money(payments.pendingChargeTotal)}</p></div><div className="rounded-lg bg-violet-50 p-3"><p className="text-xs text-violet-800">Estancia total prevista</p><p className="mt-1 font-bold text-violet-800">{money(plannedTotal)}</p></div><div className={officialPending > 0 ? "rounded-lg bg-rose-50 p-3" : "rounded-lg bg-emerald-50 p-3"}><p className={officialPending > 0 ? "text-xs text-rose-800" : "text-xs text-emerald-800"}>Saldo oficial Cloudbeds</p><p className={officialPending > 0 ? "mt-1 font-bold text-rose-800" : "mt-1 font-bold text-emerald-800"}>{money(reservation.amountPending)}</p></div></div>{plannedCredit > 0.004 && officialPending <= 0.004 && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">La reserva tiene un crédito de {money(plannedCredit)} frente al importe previsto. Cloudbeds indica saldo oficial a cero.</p>}{payments.pendingWarning ? <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">No se han podido consultar las noches futuras: {payments.pendingWarning}</p> : null}{payments.movements.length ? <div className="mt-4 divide-y rounded-lg border">{payments.movements.map(movement => <div className="flex items-center justify-between gap-3 p-3 text-sm" key={movement.id || `${movement.label}-${movement.occurredAt}`}><div><p className="font-medium">{movement.label}</p><p className="text-xs text-muted-foreground">{movement.occurredAt ? new Date(movement.occurredAt).toLocaleString("es-ES") : movement.serviceDate || "Sin fecha"}</p></div><p className={movement.kind === "payment" ? "font-semibold text-emerald-700" : "font-semibold text-slate-800"}>{movement.kind === "payment" ? "Pago" : "Cargo"} · {money(Math.abs(movement.amount))}</p></div>)}</div> : <p className="mt-4 text-sm text-muted-foreground">Cloudbeds no ha devuelto movimientos ya contabilizados para esta reserva.</p>}{payments.pendingMovements.length ? <div className="mt-4"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-sky-800">Noches y cargos futuros</p><div className="divide-y rounded-lg border border-sky-100 bg-sky-50/30">{payments.pendingMovements.map(movement => <div className="flex items-center justify-between gap-3 p-3 text-sm" key={movement.id || `pending-${movement.label}-${movement.serviceDate}`}><div><p className="font-medium text-sky-950">{movement.label}</p><p className="text-xs text-sky-800">Previsto: {movement.serviceDate || "Sin fecha"}</p></div><p className="font-semibold text-sky-900">Cargo · {money(Math.abs(movement.amount))}</p></div>)}</div></div> : null}</> : <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{detail.data?.paymentWarning || "No se han podido cargar los movimientos de pago."}</p>}
            </section>
          </TabsContent>

          <TabsContent value="billing" className="mt-4 space-y-4">
            <section className="rounded-xl border bg-violet-50/50 p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-violet-100 p-2 text-violet-700"><ReceiptText className="h-5 w-5" /></div>
                <div>
                  <p className="font-semibold">Documentos oficiales de Cloudbeds</p>
                  <p className="mt-1 text-sm text-muted-foreground">Aquí solo se muestran y descargan las facturas y recibos emitidos por Cloudbeds para esta reserva. No se generan PDFs locales.</p>
                </div>
              </div>
              {fiscalDocuments.isLoading ? <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin text-violet-700" />Consultando documentos oficiales…</div> : fiscalDocuments.error ? <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{fiscalDocuments.error.message}</p> : fiscalDocuments.data?.length ? <div className="mt-4 divide-y rounded-lg border bg-background">{fiscalDocuments.data.map(document => <div key={document.id} className="flex flex-wrap items-center justify-between gap-3 p-3"><div className="min-w-0"><p className="flex items-center gap-2 font-medium"><FileText className="h-4 w-4 shrink-0 text-violet-700" />{document.kind === "RECEIPT" ? "Recibo" : document.kind === "INVOICE" ? "Factura" : document.kind || "Documento"}{document.number ? ` · ${document.number}` : ""}</p><p className="mt-1 text-xs text-muted-foreground">{document.status || "Sin estado"}{document.amount !== null ? ` · ${money(document.amount)}${document.currency ? ` ${document.currency}` : ""}` : ""}{document.createdAt ? ` · ${new Date(document.createdAt).toLocaleDateString("es-ES")}` : ""}</p></div><Button type="button" size="sm" variant="outline" disabled={downloadFiscalDocument.isPending} onClick={() => downloadFiscalDocument.mutate({ id: reservation.id, documentId: document.id })}>{downloadFiscalDocument.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ReceiptText className="mr-2 h-4 w-4" />}Descargar</Button></div>)}</div> : <p className="mt-4 rounded-lg border border-dashed bg-background/70 p-4 text-sm text-muted-foreground">Cloudbeds no tiene todavía ninguna factura ni recibo emitido para esta reserva.</p>}
              <p className="mt-4 text-xs text-muted-foreground">La emisión oficial requiere la configuración fiscal de Cloudbeds y la selección confirmada de transacciones; por ello no se sustituye por un documento generado localmente.</p>
            </section>
          </TabsContent>

          <TabsContent value="checkin" className="mt-4 space-y-4">
            {canManageReservations ? <><section className="rounded-xl border p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold">Check-in y mensajería</p><p className="mt-1 text-sm text-muted-foreground">Los correos se envían solo tras confirmar. WhatsApp abre un borrador para revisión y envío manual.</p></div><div className="flex rounded-md border bg-background p-0.5 text-xs"><Button variant={messageLanguage === "es" ? "secondary" : "ghost"} size="sm" className="h-7 px-2" onClick={() => setMessageLanguage("es")}>ES</Button><Button variant={messageLanguage === "en" ? "secondary" : "ghost"} size="sm" className="h-7 px-2" onClick={() => setMessageLanguage("en")}>EN</Button></div></div><div className="mt-4 grid gap-2 sm:grid-cols-2"><Button variant="outline" disabled={setReviewed.isPending} onClick={() => setReviewed.mutate({ id: reservation.id, isReviewed: !reservation.isReviewed })}><CheckCircle2 className="mr-2 h-4 w-4" />{reservation.isReviewed ? "Quitar revisión" : "Marcar revisada"}</Button><Button variant="outline" disabled={prepareReservationMessage.isPending} onClick={() => editReservationEmail("welcome")}><Mail className="mr-2 h-4 w-4" />Correo de bienvenida</Button><Button variant="outline" disabled={prepareReservationMessage.isPending} onClick={() => editReservationEmail("online_checkin")}><Mail className="mr-2 h-4 w-4" />Enviar Check-in Online</Button><Button variant="outline" disabled={prepareReservationWhatsApp.isPending} onClick={() => editReservationWhatsApp("welcome")}><MessageCircle className="mr-2 h-4 w-4" />WhatsApp bienvenida</Button><Button variant="outline" disabled={prepareReservationWhatsApp.isPending} onClick={() => editReservationWhatsApp("online_checkin")} className="sm:col-span-2"><MessageCircle className="mr-2 h-4 w-4" />WhatsApp Check-in Online</Button></div></section></> : <p className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">Las acciones de comunicación y cambio de estado requieren permiso de administración.</p>}
          </TabsContent>
        </Tabs>}
      </DialogContent>
    </Dialog>

    <Dialog open={Boolean(welcomeEditor)} onOpenChange={open => !open && setWelcomeEditor(null)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>Personalizar correo</DialogTitle><DialogDescription>Revisa y adapta el mensaje para {welcomeEditor?.guestName || "la reserva"} antes de enviarlo a {welcomeEditor?.guestEmail || ""}.</DialogDescription></DialogHeader>
        <div className="space-y-4 py-2"><div className="space-y-2"><label htmlFor="reservation-email-subject" className="text-sm font-medium">Asunto</label><Input id="reservation-email-subject" value={welcomeEditor?.subject || ""} onChange={event => setWelcomeEditor(current => current ? { ...current, subject: event.target.value } : current)} /></div><div className="space-y-2"><label htmlFor="reservation-email-message" className="text-sm font-medium">Mensaje</label><textarea id="reservation-email-message" className="min-h-64 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={welcomeEditor?.message || ""} onChange={event => setWelcomeEditor(current => current ? { ...current, message: event.target.value } : current)} /></div><p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">El correo se enviará únicamente después de tu confirmación.</p></div>
        <DialogFooter><Button variant="outline" onClick={() => setWelcomeEditor(null)}>Cancelar</Button><Button onClick={sendEditedWelcome} disabled={sendReservationEmail.isPending}>{sendReservationEmail.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{welcomeEditor?.messageType === "online_checkin" ? "Enviar Check-in" : "Enviar bienvenida"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={Boolean(whatsAppEditor)} onOpenChange={open => !open && setWhatsAppEditor(null)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>Personalizar WhatsApp</DialogTitle><DialogDescription>Revisa el mensaje para {whatsAppEditor?.guestName || "la reserva"}. WhatsApp se abrirá después para que confirmes el envío manualmente.</DialogDescription></DialogHeader>
        <div className="space-y-2 py-2"><label htmlFor="reservation-whatsapp-message" className="text-sm font-medium">Mensaje</label><textarea id="reservation-whatsapp-message" className="min-h-64 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={whatsAppEditor?.message || ""} onChange={event => setWhatsAppEditor(current => current ? { ...current, message: event.target.value } : current)} /></div>
        <DialogFooter><Button variant="outline" onClick={() => setWhatsAppEditor(null)}>Cancelar</Button><Button onClick={openEditedWhatsApp} disabled={prepareReservationWhatsApp.isPending}>{prepareReservationWhatsApp.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Abrir WhatsApp</Button></DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={Boolean(paymentEditor)} onOpenChange={open => { if (!open) setPaymentEditor(null); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Registrar pago</DialogTitle><DialogDescription>Se registrará un pago ya recibido en el folio de Cloudbeds. No se procesan tarjetas ni se almacenan datos de pago.</DialogDescription></DialogHeader>
        {paymentEditor && <div className="space-y-4"><div className="rounded-lg bg-muted/50 p-3 text-sm"><p className="font-semibold">{reservation?.guestName || "Reserva"}</p><p className="mt-1 text-muted-foreground">Saldo pendiente: {money(reservation?.amountPending)}</p></div><div className="space-y-2"><label htmlFor="payment-method" className="text-sm font-medium">Método de pago</label><select id="payment-method" value={paymentEditor.type} disabled={paymentMethods.isLoading || !paymentMethods.data?.length} onChange={event => { const method = paymentMethods.data?.find(item => item.value === event.target.value); setPaymentEditor(current => current ? { ...current, type: event.target.value, label: method?.label || "" } : current); }} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><option value="">{paymentMethods.isLoading ? "Cargando métodos de Cloudbeds…" : paymentMethods.data?.length ? "Selecciona un método" : "No hay métodos disponibles"}</option>{paymentMethods.data?.map(method => <option key={method.value} value={method.value}>{method.label}</option>)}</select>{paymentMethods.error && <p className="text-xs text-rose-700">{paymentMethods.error.message}</p>}</div><div className="space-y-2"><label htmlFor="payment-amount" className="text-sm font-medium">Importe recibido (€)</label><Input id="payment-amount" type="number" min="0.01" step="0.01" inputMode="decimal" value={paymentEditor.amount} onChange={event => setPaymentEditor(current => current ? { ...current, amount: event.target.value } : current)} /></div><div className="space-y-2"><label htmlFor="payment-description" className="text-sm font-medium">Referencia o nota <span className="text-muted-foreground">(opcional)</span></label><textarea id="payment-description" value={paymentEditor.description} onChange={event => setPaymentEditor(current => current ? { ...current, description: event.target.value } : current)} className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="Ej. efectivo recibido en recepción" /></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={paymentEditor.isDeposit} onChange={event => setPaymentEditor(current => current ? { ...current, isDeposit: event.target.checked } : current)} />Registrar como depósito</label></div>}
        <DialogFooter><Button variant="outline" onClick={() => setPaymentEditor(null)}>Cancelar</Button><Button onClick={preparePayment} disabled={paymentMethods.isLoading || !paymentMethods.data?.length}>Revisar pago</Button></DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={statusEditor !== null} onOpenChange={open => { if (!open) setStatusEditor(null); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Cambiar estado de reserva</DialogTitle><DialogDescription>El nuevo estado se enviará directamente a Cloudbeds. La reserva local se actualizará después de la confirmación.</DialogDescription></DialogHeader>
        <div className="space-y-2"><label htmlFor="reservation-status" className="text-sm font-medium">Nuevo estado</label><select id="reservation-status" value={statusEditor || "confirmed"} onChange={event => setStatusEditor(event.target.value as CloudbedsStatus)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{statusOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
        <DialogFooter><Button variant="outline" onClick={() => setStatusEditor(null)}>Cancelar</Button><Button onClick={prepareStatus}>Revisar cambio</Button></DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog open={Boolean(pendingPayment)} onOpenChange={open => { if (!open) setPendingPayment(null); }}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar pago en Cloudbeds</AlertDialogTitle><AlertDialogDescription>Este registro se añadirá al folio de la reserva en Cloudbeds. Revisa los datos antes de continuar.</AlertDialogDescription></AlertDialogHeader>{pendingPayment && <div className="rounded-lg border bg-muted/40 p-4 text-sm"><p><strong>Reserva:</strong> {reservation?.guestName || "Sin nombre"}</p><p><strong>Método:</strong> {pendingPayment.label}</p><p><strong>Importe:</strong> {money(pendingPayment.amountNumber)}</p><p><strong>Tipo:</strong> {pendingPayment.isDeposit ? "Depósito" : "Pago"}</p>{pendingPayment.description && <p><strong>Nota:</strong> {pendingPayment.description}</p>}</div>}<AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction disabled={recordPayment.isPending} onClick={() => selectedId !== null && pendingPayment && recordPayment.mutate({ id: selectedId, type: pendingPayment.type, amount: pendingPayment.amountNumber, description: pendingPayment.description || undefined, isDeposit: pendingPayment.isDeposit })}>{recordPayment.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Registrar en Cloudbeds</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
    </AlertDialog>

    <AlertDialog open={Boolean(pendingStatus)} onOpenChange={open => { if (!open) setPendingStatus(null); }}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar cambio de estado</AlertDialogTitle><AlertDialogDescription>Este cambio modificará el estado de la reserva en Cloudbeds.</AlertDialogDescription></AlertDialogHeader>{pendingStatus && <div className="rounded-lg border bg-muted/40 p-4 text-sm"><p><strong>Reserva:</strong> {reservation?.guestName || "Sin nombre"}</p><p><strong>Estado actual:</strong> {reservationStatus(reservation?.reservationStatus)}</p><p><strong>Nuevo estado:</strong> {pendingStatus.label}</p></div>}<AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction disabled={updateStatus.isPending} onClick={() => selectedId !== null && pendingStatus && updateStatus.mutate({ id: selectedId, status: pendingStatus.status })}>{updateStatus.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Actualizar en Cloudbeds</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
    </AlertDialog>
  </div>;
}

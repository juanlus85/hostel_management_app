import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { BedDouble, CalendarDays, CheckCircle2, ClipboardCheck, ClipboardCopy, CreditCard, Euro, FileText, Loader2, Mail, MessageCircle, PencilLine, PlusCircle, ReceiptText, RefreshCw, Send, StickyNote } from "lucide-react";
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
import { availabilityRoomTypeKey, buildAgendaAvailabilityByType, findAgendaAvailabilityDay } from "@/lib/availabilityAgenda";
import { addCalendarDays, mergeAgendaAvailability, type AgendaAvailabilityResult } from "@/lib/agendaAvailabilityMerge";
import { hasAgendaRateChanged, isLargeAgendaRateChange, parseAgendaRate } from "@/lib/agendaRateSafety";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CheckinPresencial from "@/pages/checkin/CheckinPresencial";
import { CreateCloudbedsReservationDialog } from "@/components/CreateCloudbedsReservationDialog";

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
type ReservationMessageType = "welcome" | "online_checkin" | "early_checkin";
type WelcomeEditor = { reservationId: number; guestName: string; guestEmail: string; messageType: ReservationMessageType; subject: string; message: string };
type WhatsAppEditor = { reservationId: number; guestName: string; messageType: ReservationMessageType; message: string };
type AgendaRateEditor = { roomTypeName: string; date: string; rateId: string; previousRate: number; rateText: string };

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

function isFridayOrSaturday(date: string) {
  const weekday = new Date(`${date}T12:00:00`).getDay();
  return weekday === 5 || weekday === 6;
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

function decimalText(value: string | number | null | undefined) {
  const amount = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(amount) ? amount.toFixed(2) : "0.00";
}

function checkinPaymentType(...values: Array<string | null | undefined>) {
  const value = values.filter(Boolean).join(" ").toLowerCase();
  if (/cash|efectivo/.test(value)) return "EFECT";
  if (/card|tarjeta|visa|mastercard/.test(value)) return "TARJT";
  if (/transfer|bank|banco/.test(value)) return "TRANS";
  if (/booking|airbnb|expedia|platform|plataforma|hotel collect/.test(value)) return "PLATF";
  if (/bizum|paypal|movil|móvil/.test(value)) return "MOVIL";
  return "OTRO";
}

function checkinCountryCode(value: string | null | undefined) {
  const country = String(value || "").trim().toUpperCase();
  const aliases: Record<string, string> = {
    ES: "ESP", ESPAÑA: "ESP", SPAIN: "ESP", FR: "FRA", FRANCE: "FRA", DE: "DEU", GERMANY: "DEU", IT: "ITA", ITALY: "ITA", PT: "PRT", PORTUGAL: "PRT", GB: "GBR", UK: "GBR", UNITEDKINGDOM: "GBR", US: "USA", UNITEDSTATES: "USA",
  };
  return /^[A-Z]{3}$/.test(country) ? country : aliases[country.replace(/[\s.]/g, "")] || "ESP";
}

function checkinRoomNumber(value: string | null | undefined) {
  const normalized = String(value || "").trim();
  if (!normalized) return "";
  // Cloudbeds puede devolver "Hab. Habitación 51", "Room 8" o "P1 · room 8",
  // mientras que el selector de recepción usa la clave configurada: "51", "8" o "42-1".
  const match = normalized.match(/(\d+(?:-\d+)?)\s*$/);
  return match?.[1] || normalized;
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
  const [reservationCheckinOpen, setReservationCheckinOpen] = useState(false);
  const [showUnassignedReservations, setShowUnassignedReservations] = useState(false);
  const [detailTab, setDetailTab] = useState("information");
  const [fiscalKind, setFiscalKind] = useState<"invoice" | "receipt" | null>(null);
  const [paymentEditor, setPaymentEditor] = useState<PaymentDraft | null>(null);
  const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(null);
  const [statusEditor, setStatusEditor] = useState<CloudbedsStatus | null>(null);
  const [pendingStatus, setPendingStatus] = useState<PendingStatus | null>(null);
  const [messageLanguage, setMessageLanguage] = useState<MessageLanguage>("es");
  const [welcomeEditor, setWelcomeEditor] = useState<WelcomeEditor | null>(null);
  const [whatsAppEditor, setWhatsAppEditor] = useState<WhatsAppEditor | null>(null);
  const [newReservationSlot, setNewReservationSlot] = useState<{ date: string; roomTypeId?: string | null; roomTypeName?: string | null; roomName?: string | null } | null>(null);
  const [agendaAvailability, setAgendaAvailability] = useState<AgendaAvailabilityResult | null>(null);
  const [agendaAvailabilityError, setAgendaAvailabilityError] = useState<string | null>(null);
  const [isLoadingAgendaSecondWeek, setIsLoadingAgendaSecondWeek] = useState(false);
  const [agendaRateDrafts, setAgendaRateDrafts] = useState<Record<string, AgendaRateEditor>>({});
  const [pendingAgendaRates, setPendingAgendaRates] = useState<AgendaRateEditor[] | null>(null);
  const [hasConfirmedLargeAgendaChanges, setHasConfirmedLargeAgendaChanges] = useState(false);
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
  const hasLoadedAgendaAvailability = useRef(false);
  const agendaAvailabilityStartDate = window.dates[1] || window.dateFrom;
  const importAgendaAvailability = trpc.cloudbedsAvailability.importWeek.useMutation();
  const loadAgendaAvailability = (importReservationsAfter = false) => {
    setAgendaAvailabilityError(null);
    setIsLoadingAgendaSecondWeek(false);
    importAgendaAvailability.mutate({ startDate: agendaAvailabilityStartDate, days: 7 }, {
      onSuccess: firstWeek => {
        setAgendaAvailability(firstWeek);
        setIsLoadingAgendaSecondWeek(true);
        importAgendaAvailability.mutate({ startDate: addCalendarDays(agendaAvailabilityStartDate, 7), days: 7 }, {
          onSuccess: secondWeek => {
            setAgendaAvailability(current => current ? mergeAgendaAvailability(current, secondWeek) : secondWeek);
            setIsLoadingAgendaSecondWeek(false);
            if (importReservationsAfter && !hasImportedOnEntry.current) {
              hasImportedOnEntry.current = true;
              importReservations.mutate({ days: 15 });
            }
          },
          onError: error => {
            setIsLoadingAgendaSecondWeek(false);
            toast.warning(`Los próximos 7 días no se cargaron: ${error.message}`);
            if (importReservationsAfter && !hasImportedOnEntry.current) {
              hasImportedOnEntry.current = true;
              importReservations.mutate({ days: 15 });
            }
          },
        });
      },
      onError: error => {
        setAgendaAvailabilityError(error.message);
        toast.error(`No se pudo cargar disponibilidad y precios: ${error.message}`);
      },
    });
  };
  useEffect(() => {
    if (!autoImport || hasLoadedAgendaAvailability.current) return;
    hasLoadedAgendaAvailability.current = true;
    loadAgendaAvailability(true);
  }, [agendaAvailabilityStartDate, autoImport]);
  const detail = trpc.checkin.externalImports.getCloudbedsUpcomingReservationDetail.useQuery(
    { id: selectedId ?? 0 },
    { enabled: selectedId !== null, retry: false },
  );
  const fiscalDocuments = trpc.checkin.externalImports.listCloudbedsReservationFiscalDocuments.useQuery(
    { id: selectedId ?? 0 },
    { enabled: selectedId !== null && detailTab === "billing", retry: false },
  );
  const fiscalTransactions = trpc.checkin.externalImports.getCloudbedsReservationFiscalTransactions.useQuery(
    { id: selectedId ?? 0, kind: fiscalKind || "invoice" },
    { enabled: selectedId !== null && fiscalKind !== null, retry: false },
  );
  const createFiscalDocument = trpc.checkin.externalImports.createCloudbedsReservationFiscalDocument.useMutation({
    onSuccess: () => {
      toast.success("Documento oficial solicitado a Cloudbeds. Se actualizará la lista cuando esté disponible.");
      setFiscalKind(null);
      if (selectedId !== null) utils.checkin.externalImports.listCloudbedsReservationFiscalDocuments.invalidate({ id: selectedId });
    },
    onError: error => toast.error(error.message),
  });
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
      toast.success(variables.messageType === "welcome" ? "Correo de bienvenida enviado" : variables.messageType === "early_checkin" ? "Invitación de Check-in anticipado enviada" : "Invitación de Check-in con códigos enviada");
      setWelcomeEditor(null);
      if (selectedId !== null) utils.checkin.externalImports.getCloudbedsUpcomingReservationDetail.invalidate({ id: selectedId });
      utils.checkin.externalImports.listCloudbedsUpcomingReservations.invalidate({ dateFrom: window.dateFrom, dateTo: window.dateTo });
    },
    onError: error => toast.error(error.message),
  });
  const prepareReservationWhatsApp = trpc.checkin.externalImports.prepareCloudbedsReservationWhatsApp.useMutation({
    onError: error => toast.error(error.message),
  });
  const updateAgendaRates = trpc.cloudbedsAvailability.updateRates.useMutation({
    onSuccess: result => {
      setPendingAgendaRates(null);
      const updated = new Set(result.updated.map(change => `${change.rateId}:${change.date}`));
      setAgendaRateDrafts(current => Object.fromEntries(Object.entries(current).filter(([key]) => !updated.has(key))));
      if (result.failed.length) {
        toast.warning(`${result.updated.length} precios enviados; ${result.failed.length} no pudieron actualizarse.`);
      } else {
        toast.success(`${result.updated.length} precios enviados a Cloudbeds.`);
      }
      loadAgendaAvailability();
    },
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
  const availabilityByType = useMemo(
    () => buildAgendaAvailabilityByType(agendaAvailability?.roomTypes || []),
    [agendaAvailability]
  );
  const arrivalsByDate = useMemo(() => new Map(window.dates.map(date => [date, (reservations.data || []).filter(reservation => reservation.checkInDate === date).length])), [reservations.data, window.dates]);
  const selected = (reservations.data || []).find(reservation => reservation.id === selectedId) || null;
  const reservation = detail.data?.reservation || selected;
  const reservationCheckinGuest = useMemo(() => {
    if (!reservation) return null;
    const snapshot = detail.data?.snapshot;
    const payments = detail.data?.payments;
    const nameParts = (reservation.guestName || "").trim().split(/\s+/).filter(Boolean);
    const source = String(reservation.bookingSource || "").toLowerCase();
    const reservationOrigin = source.includes("booking") ? "Booking.com" : source.includes("airbnb") ? "Airbnb" : source.includes("expedia") ? "Expedia" : source.includes("website") ? "Website" : source.includes("phone") ? "Phone" : source.includes("email") ? "Email" : "Other";
    const paymentMovement = payments?.movements.find(movement => movement.kind === "payment");
    const paidAmount = payments ? Math.max(0, payments.paidTotal - payments.refundedTotal) : 0;
    return {
      firstName: snapshot?.guest.firstName || nameParts[0] || "",
      lastName: snapshot?.guest.lastName || nameParts.slice(1).join(" "),
      email: snapshot?.guest.email || reservation.guestEmail || "",
      phone: snapshot?.guest.phone || reservation.guestPhone || "",
      street: snapshot?.guest.street || "",
      addressExtra: snapshot?.guest.addressExtra || "",
      postalCode: snapshot?.guest.postalCode || "",
      city: snapshot?.guest.city || "",
      province: snapshot?.guest.province || "",
      country: checkinCountryCode(snapshot?.guest.country),
      reservationNumber: reservation.reservationCode || reservation.sourceReservationId || selected?.reservationCode || selected?.sourceReservationId || "",
      checkInDate: reservation.checkInDate || "",
      checkOutDate: reservation.checkOutDate || "",
      roomNumber: checkinRoomNumber(snapshot?.roomNumber || reservation.roomNumber || selected?.roomNumber),
      roomType: snapshot?.roomType || reservation.roomType || selected?.roomType || "",
      numberOfGuests: reservation.guestCount || 1,
      numberOfRooms: 1,
      reservationOrigin,
      accommodationType: "S.A. (Solo Aloj.)",
      paymentType: checkinPaymentType(snapshot?.paymentType, snapshot?.paymentMethod, paymentMovement?.label, reservation.bookingSource),
      paymentDate: reservation.checkInDate || "",
      amountPaid: decimalText(paidAmount),
      amountPending: decimalText(snapshot?.amountPending ?? reservation.amountPending),
      paymentHolder: snapshot?.guest.firstName || snapshot?.guest.lastName ? `${snapshot?.guest.firstName || ""} ${snapshot?.guest.lastName || ""}`.trim() : reservation.guestName || "",
      paymentMethod: snapshot?.paymentMethod || paymentMovement?.label || reservation.bookingSource || "",
    };
  }, [detail.data?.payments, detail.data?.snapshot, reservation]);
  const payments = detail.data?.payments;
  const onlineCheckinSent = detail.data?.communications?.find(
    communication => communication.messageType === "online_checkin" && communication.channel === "email" && communication.status === "sent"
  );
  const earlyCheckinSent = detail.data?.communications?.find(
    communication => communication.messageType === "early_checkin" && communication.channel === "email" && communication.status === "sent"
  );
  const gridStyle = { gridTemplateColumns: `var(--agenda-label-column) repeat(${window.dates.length}, var(--agenda-day-column))` };
  const canRecordPayments = user?.role === "admin";
  const canManageReservations = user?.role === "admin";
  const canCreateReservations = user?.role === "admin";
  const canManageMessages = user?.role === "admin" || user?.role === "user";
  const canEditAgendaRates = user?.role === "admin";
  const todayIndex = 1;
  const officialPending = Number(String(reservation?.amountPending ?? "0").replace(",", "."));
  const plannedTotal = payments ? payments.chargeTotal + payments.pendingChargeTotal : 0;
  const plannedBalance = payments ? plannedTotal + payments.refundedTotal - payments.paidTotal : null;
  const plannedCredit = plannedBalance !== null && plannedBalance < -0.004 ? Math.abs(plannedBalance) : 0;
  const hotelCollect = Boolean(detail.data?.reservation && "hotelCollect" in detail.data.reservation && detail.data.reservation.hotelCollect === true);
  const agendaRateKey = (rateId: string, date: string) => `${rateId}:${date}`;
  const setAgendaRateDraft = (editor: Omit<AgendaRateEditor, "rateText">, rateText: string) => {
    setAgendaRateDrafts(current => ({
      ...current,
      [agendaRateKey(editor.rateId, editor.date)]: { ...editor, rateText },
    }));
  };
  const editedAgendaRates = useMemo(
    () => Object.values(agendaRateDrafts).filter(hasAgendaRateChanged),
    [agendaRateDrafts]
  );
  const largeAgendaRateChanges = useMemo(
    () => (pendingAgendaRates || []).filter(isLargeAgendaRateChange),
    [pendingAgendaRates]
  );
  const requestAgendaRateUpdate = () => {
    setHasConfirmedLargeAgendaChanges(false);
    setPendingAgendaRates(editedAgendaRates);
  };
  const focusAgendaRateInput = (event: KeyboardEvent<HTMLInputElement>, rowIndex: number, dayIndex: number) => {
    const movement = event.key === "ArrowRight" ? [0, 1] : event.key === "ArrowLeft" ? [0, -1] : event.key === "ArrowDown" ? [1, 0] : event.key === "ArrowUp" ? [-1, 0] : null;
    if (!movement) return;
    const next = document.querySelector<HTMLInputElement>(`[data-agenda-rate-row="${rowIndex + movement[0]}"][data-agenda-rate-day="${dayIndex + movement[1]}"]`);
    if (next) {
      event.preventDefault();
      next.focus();
      next.select();
    }
  };

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
  const editReservationEmail = async (messageType: ReservationMessageType) => {
    if (!reservation?.guestEmail) return toast.error("La reserva no tiene correo electrónico");
    try {
      const draft = await prepareReservationMessage.mutateAsync({ externalReservationId: reservation.id, language: messageLanguage, messageType });
      setWelcomeEditor({ reservationId: reservation.id, guestName: reservation.guestName || "este huésped", guestEmail: reservation.guestEmail, messageType, subject: draft.subject, message: draft.text });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo preparar el correo");
    }
  };
  const editReservationWhatsApp = async (messageType: ReservationMessageType) => {
    if (!reservation) return;
    try {
      const draft = await prepareReservationWhatsApp.mutateAsync({ externalReservationId: reservation.id, language: messageLanguage, messageType });
      setWhatsAppEditor({ reservationId: reservation.id, guestName: reservation.guestName || "este huésped", messageType, message: draft.message });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo preparar WhatsApp");
    }
  };
  const copyReservationCodes = async () => {
    if (!reservation) return;
    try {
      const draft = await prepareReservationMessage.mutateAsync({
        externalReservationId: reservation.id,
        language: messageLanguage,
        messageType: "welcome",
      });
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(draft.text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = draft.text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }
      toast.success("Mensaje de códigos copiado al portapapeles");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo copiar el mensaje de códigos");
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
          <CardDescription className="mt-1">Vista por tipo de habitación y estancia. Pulsa una reserva para ver huésped, pagos y notas; pulsa un día libre para crear una reserva.</CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">{canEditAgendaRates && editedAgendaRates.length > 0 && <Button className="bg-amber-500 text-amber-950 hover:bg-amber-400" onClick={requestAgendaRateUpdate} disabled={updateAgendaRates.isPending}><Send className="mr-2 h-4 w-4" />Enviar {editedAgendaRates.length} precio{editedAgendaRates.length === 1 ? "" : "s"}</Button>}<Button variant="outline" size="sm" onClick={() => setShowUnassignedReservations(current => !current)}>{showUnassignedReservations ? "Ocultar sin habitación" : `Mostrar sin habitación${hiddenUnassignedReservations ? ` (${hiddenUnassignedReservations})` : ""}`}</Button><Button className="bg-sky-700 hover:bg-sky-800" onClick={() => importReservations.mutate({ days: 5 })} disabled={importReservations.isPending}>
          {importReservations.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Actualizar 5 días
        </Button><Button variant="outline" size="sm" onClick={() => importReservations.mutate({ days: 15 })} disabled={importReservations.isPending}>
          Actualizar 15 días
        </Button><Button variant="outline" size="sm" onClick={() => loadAgendaAvailability()} disabled={importAgendaAvailability.isPending}>{importAgendaAvailability.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Actualizar precios</Button></div>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-x-5 gap-y-2 border-t bg-sky-50/30 py-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-red-500" />Importe pendiente</span>
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" />Notas de la reserva</span>
        <span className="inline-flex items-center gap-2"><span className="h-3 w-5 rounded bg-emerald-500" />Check-in pagado</span>
        <span className="inline-flex items-center gap-2"><span className="h-3 w-5 rounded bg-rose-400" />Check-in con saldo</span>
        <span className="inline-flex items-center gap-2"><span className="h-3 w-5 rounded bg-cyan-500" />Pendiente de Check-in</span>
        <span className="inline-flex items-center gap-2"><span className="h-3 w-5 rounded bg-slate-400" />Check-out o cancelada</span>
      </CardContent>
      {isLoadingAgendaSecondWeek && <CardContent className="border-t bg-sky-50 py-2 text-xs text-sky-900">Los primeros 7 días ya están disponibles. Completando los 7 días siguientes…</CardContent>}
      {agendaAvailabilityError && <CardContent className="border-t border-amber-200 bg-amber-50 py-3 text-sm text-amber-950">
        <strong>No se cargaron precios ni disponibilidad.</strong> {agendaAvailabilityError}
      </CardContent>}
    </Card>

      {reservations.isLoading ? <Card><CardContent className="flex items-center justify-center gap-3 py-16 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin text-sky-700" />Cargando reservas importadas…</CardContent></Card> : agenda.length ? <Card className="overflow-hidden border-slate-200 shadow-sm">
      {canEditAgendaRates && editedAgendaRates.length > 0 && <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-amber-300 bg-amber-50 px-3 py-2 shadow-sm sm:px-4"><p className="text-sm font-medium text-amber-950"><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-amber-500" />{editedAgendaRates.length} precio{editedAgendaRates.length === 1 ? " modificado" : "s modificados"} pendiente{editedAgendaRates.length === 1 ? "" : "s"}</p><Button size="sm" className="bg-amber-500 text-amber-950 hover:bg-amber-400" onClick={requestAgendaRateUpdate} disabled={updateAgendaRates.isPending}><Send className="mr-2 h-4 w-4" />Enviar precios</Button></div>}
      <CardContent className="p-0">
        <div className="isolate overflow-x-auto overscroll-x-contain">
          <div className="min-w-[472px] sm:min-w-[935px]">
            <div className="reservation-agenda-grid grid border-b bg-slate-50/80" style={gridStyle}>
              <div className="sticky left-0 z-30 border-r bg-slate-50 px-2 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-600 shadow-[8px_0_12px_-12px_rgba(15,23,42,0.55)] sm:px-4 sm:py-4 sm:text-xs">Tipo · hab.</div>
              {window.dates.map((date, index) => {
                const day = formatDay(date);
                const isToday = index === todayIndex;
                const isWeekend = isFridayOrSaturday(date);
                const arrivals = arrivalsByDate.get(date) || 0;
                return <div key={date} className={`border-r px-1 py-2 text-center ${isToday ? "z-10 border-x-2 border-amber-400 bg-amber-100 text-amber-950 shadow-[inset_0_3px_0_rgb(251_191_36)]" : isWeekend ? "bg-slate-200/70" : ""} sm:px-3 sm:py-3`}><p className="text-[9px] font-semibold uppercase tracking-wide sm:text-[11px]">{index === 0 ? "Ayer" : isToday ? "Hoy" : day.weekday}</p><p className="mt-0.5 text-lg font-bold leading-none sm:text-2xl">{day.date}</p><p className="mt-1 text-[9px] capitalize text-muted-foreground sm:text-[11px]"><span className="sm:hidden">{arrivals} lleg.</span><span className="hidden sm:inline">{day.month} · {arrivals} llegada{arrivals === 1 ? "" : "s"}</span></p></div>;
              })}
            </div>
            {agenda.map((group, groupIndex) => {
              const availabilityType = availabilityByType.get(availabilityRoomTypeKey(group.label));
              return <section key={group.key} className="border-b last:border-b-0">
              <div className="reservation-agenda-grid grid h-8 border-y border-slate-200 bg-slate-100/95" style={gridStyle}>
                <div className="sticky left-0 z-20 flex min-w-0 items-center border-r bg-slate-100 px-2 shadow-[8px_0_12px_-12px_rgba(15,23,42,0.5)] sm:px-4"><p title={group.label} className="flex min-w-0 items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-700 sm:gap-2 sm:text-xs"><BedDouble className="h-3 w-3 shrink-0 text-sky-700" /><span className="truncate">{group.label}</span><span className="shrink-0 text-[9px] font-medium normal-case tracking-normal text-slate-500">· {group.reservationsCount} res.</span></p></div>
                {window.dates.map((date, index) => {
                  const day = findAgendaAvailabilityDay(availabilityType, date);
                  const currentRate = day?.totalRate ?? day?.roomRate ?? null;
                  const editor = day?.rateId && currentRate !== null ? { roomTypeName: group.label, date, rateId: day.rateId, previousRate: currentRate } : null;
                  const draft = editor ? agendaRateDrafts[agendaRateKey(editor.rateId, editor.date)] : null;
                  const todayStyle = index === todayIndex ? "border-x-2 border-amber-400 bg-amber-50" : "";
                  const weekendStyle = index !== todayIndex && isFridayOrSaturday(date) ? "bg-slate-200/60" : "";
                  const isEdited = Boolean(draft && hasAgendaRateChanged(draft));
                  return <div key={date} className={`flex min-w-0 items-center justify-center border-r px-0.5 ${todayStyle} ${weekendStyle} sm:px-1`}>
                    {day ? <>
                      <span className={`mr-0.5 shrink-0 text-[8px] font-semibold ${day.roomsAvailable === null ? "text-slate-500" : day.roomsAvailable <= 0 ? "text-rose-700" : day.roomsAvailable <= 2 ? "text-amber-700" : "text-emerald-700"}`}>{day.roomsAvailable === null ? "—" : day.roomsAvailable}</span>
                      {canEditAgendaRates && editor ? <div className={`flex min-w-0 flex-1 items-center rounded border px-0.5 shadow-sm focus-within:ring-2 focus-within:ring-sky-600 ${isEdited ? "border-amber-400 bg-amber-200" : "bg-background"}`}><Euro className={`h-2.5 w-2.5 shrink-0 ${isEdited ? "text-amber-800" : "text-sky-700"}`} /><Input aria-label={`Precio de ${group.label} el ${date}`} data-agenda-rate-row={groupIndex} data-agenda-rate-day={index} type="number" min="0" step="0.01" inputMode="decimal" value={draft?.rateText ?? editor.previousRate.toFixed(2)} onFocus={event => event.currentTarget.select()} onKeyDown={event => focusAgendaRateInput(event, groupIndex, index)} onChange={event => setAgendaRateDraft(editor, event.target.value)} className={`h-5 min-w-0 border-0 bg-transparent p-0 text-center text-[9px] font-bold shadow-none focus-visible:ring-0 ${isEdited ? "text-amber-950" : "text-slate-800"}`} /></div> : <span className="min-w-0 truncate text-[9px] font-bold text-slate-800">{currentRate === null ? "—" : money(currentRate)}</span>}
                    </> : <span className="text-[10px] text-slate-400">—</span>}
                  </div>;
                })}
              </div>
              {group.rooms.map(room => <div key={room.key} className="reservation-agenda-grid grid min-h-[48px] bg-background sm:min-h-[64px]" style={{ ...gridStyle, gridAutoRows: "minmax(var(--agenda-row-height), auto)" }}>
                <div className="sticky left-0 z-20 flex min-w-0 items-center border-r border-b bg-background px-2 shadow-[8px_0_12px_-12px_rgba(15,23,42,0.48)] sm:px-4" style={{ gridColumn: 1, gridRow: `1 / span ${room.laneCount}` }}><p title={room.label} className="truncate text-xs font-medium text-slate-800 sm:text-sm">{room.label}</p></div>
                {window.dates.map((date, index) => {
                  // El agregado por tipo puede marcar cero aunque esta habitación
                  // concreta esté libre. Cloudbeds la valida después con getRooms.
                  const canCreateFromSlot = canCreateReservations && room.key !== "unassigned";
                  const cellClass = `border-b border-r ${index === todayIndex ? "border-x-2 border-amber-400 bg-amber-50/70" : isFridayOrSaturday(date) ? "bg-slate-100/80" : "bg-slate-50/35"}`;
                  return canCreateFromSlot ? <button key={date} type="button" title={`Crear reserva en ${room.label}: ${group.label} · ${date}`} aria-label={`Crear reserva en ${room.label} de ${group.label} el ${date}`} onClick={() => setNewReservationSlot({ date, roomTypeId: availabilityType?.roomTypeId, roomTypeName: group.label, roomName: room.label })} className={`${cellClass} relative z-0 cursor-pointer text-transparent transition hover:bg-sky-100 focus-visible:z-20 focus-visible:bg-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-700`} style={{ gridColumn: index + 2, gridRow: `1 / span ${room.laneCount}` }}>Libre</button> : <div key={date} className={cellClass} style={{ gridColumn: index + 2, gridRow: `1 / span ${room.laneCount}` }} />;
                })}
                {room.cards.map(card => <button key={card.reservation.id} type="button" title={`${card.reservation.guestName || "Huésped sin nombre"} · Entrada ${compactDate(card.reservation.checkInDate)} · Salida ${compactDate(card.reservation.checkOutDate)}`} onClick={() => { setSelectedId(card.reservation.id); setDetailTab("information"); }} className={`relative z-10 min-w-0 self-center overflow-visible border px-1.5 py-1 text-left shadow-sm transition duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-700 sm:px-3 sm:py-2 ${card.startSlot % 1 ? "rounded-l-none" : "rounded-l-md"} ${card.endSlot % 1 ? "rounded-r-none" : "rounded-r-full"} ${agendaToneClasses[card.tone]}`} style={agendaCardGridStyle(card)}>
                  {card.hasPendingAmount && <span aria-label="Importe pendiente" title="Importe pendiente" className="absolute -top-1 left-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500 shadow-sm sm:-top-1.5 sm:left-2 sm:h-3 sm:w-3" />}
                  {card.hasNotes && <span aria-label="Tiene notas" title="Tiene notas" className="absolute -top-1 left-4 h-2.5 w-2.5 rounded-full border-2 border-white bg-amber-400 shadow-sm sm:-top-1.5 sm:left-6 sm:h-3 sm:w-3" />}
                  {card.hasCheckinInvitation && <span aria-label="Check-in Online enviado" title="Check-in Online enviado" className="absolute -top-1 right-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-blue-500 shadow-sm sm:-top-1.5 sm:right-2 sm:h-3 sm:w-3" />}
                  {card.hasCheckinCompleted && <span aria-label="Check-in Online completado" title="Check-in Online completado" className="absolute -top-1 right-4 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 shadow-sm sm:-top-1.5 sm:right-6 sm:h-3 sm:w-3" />}
                  <span className="block truncate text-[10px] font-bold leading-tight sm:text-sm">{card.reservation.guestName || "Huésped sin nombre"}</span>
                  <span className="mt-0.5 block truncate text-[9px] font-medium opacity-90 sm:text-[11px]"><span className="sm:hidden">{compactDate(card.reservation.checkInDate)} → {compactDate(card.reservation.checkOutDate)}</span><span className="hidden sm:inline">Entra {compactDate(card.reservation.checkInDate)} · Sale {compactDate(card.reservation.checkOutDate)}</span></span>
                </button>)}
              </div>)}
            </section>;
            })}
          </div>
        </div>
      </CardContent>
    </Card> : <Card className="border-dashed"><CardContent className="flex flex-col items-center justify-center py-16 text-center"><CalendarDays className="mb-3 h-8 w-8 text-sky-700" /><h2 className="font-semibold">No hay reservas visibles para este período</h2><p className="mt-2 max-w-md text-sm text-muted-foreground">Actualiza las reservas o despliega las reservas sin habitación asignada para revisar la agenda completa.</p></CardContent></Card>}

    {newReservationSlot && <CreateCloudbedsReservationDialog
      open={Boolean(newReservationSlot)}
      onOpenChange={open => { if (!open) setNewReservationSlot(null); }}
      initialDate={newReservationSlot.date}
      initialRoomTypeId={newReservationSlot.roomTypeId}
      initialRoomTypeName={newReservationSlot.roomTypeName}
      initialRoomName={newReservationSlot.roomName}
      onCreated={() => {
        setNewReservationSlot(null);
        // Tras crear una reserva se actualiza la misma ventana visible para incorporar
        // la nueva estancia y las posibles asignaciones de habitación de Cloudbeds.
        importReservations.mutate({ days: 15 });
      }}
    />}

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
            {canManageReservations && <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div><p className="font-semibold text-emerald-950">Registro de llegada</p><p className="mt-1 text-sm text-emerald-800">Abre el Check-in con la reserva y la habitación ya precargadas para completar los datos y la firma.</p></div>
              <Button type="button" className="bg-emerald-700 hover:bg-emerald-800" onClick={() => setReservationCheckinOpen(true)}><ClipboardCheck className="mr-2 h-4 w-4" />Realizar Check-in</Button>
            </section>}
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
              <div className="flex items-start gap-3"><div className="rounded-lg bg-violet-100 p-2 text-violet-700"><ReceiptText className="h-5 w-5" /></div><div><p className="font-semibold">Documentos oficiales de Cloudbeds</p><p className="mt-1 text-sm text-muted-foreground">Emite y descarga documentos fiscales directamente desde Cloudbeds para esta reserva.</p></div></div>
              {fiscalDocuments.isLoading ? <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin text-violet-700" />Consultando documentos oficiales…</div> : fiscalDocuments.error ? <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{fiscalDocuments.error.message}</p> : fiscalDocuments.data?.length ? <div className="mt-4 divide-y rounded-lg border bg-background">{fiscalDocuments.data.map(document => <div key={document.id} className="flex flex-wrap items-center justify-between gap-3 p-3"><div className="min-w-0"><p className="flex items-center gap-2 font-medium"><FileText className="h-4 w-4 shrink-0 text-violet-700" />{document.kind === "RECEIPT" ? "Recibo" : document.kind === "INVOICE" ? "Factura" : document.kind || "Documento"}{document.number ? ` · ${document.number}` : ""}</p><p className="mt-1 text-xs text-muted-foreground">{document.status || "Sin estado"}{document.amount !== null ? ` · ${money(document.amount)}${document.currency ? ` ${document.currency}` : ""}` : ""}</p></div><Button type="button" size="sm" variant="outline" disabled={downloadFiscalDocument.isPending} onClick={() => downloadFiscalDocument.mutate({ id: reservation.id, documentId: document.id })}><ReceiptText className="mr-2 h-4 w-4" />Descargar</Button></div>)}</div> : <p className="mt-4 rounded-lg border border-dashed bg-background/70 p-4 text-sm text-muted-foreground">Todavía no hay documentos emitidos para esta reserva.</p>}
              {canManageReservations && <div className="mt-4 flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => setFiscalKind("invoice")}>Generar factura</Button><Button type="button" variant="outline" onClick={() => setFiscalKind("receipt")}>Generar recibo</Button></div>}
              {fiscalKind && <div className="mt-4 rounded-lg border bg-background p-4"><p className="font-medium">Preparar {fiscalKind === "invoice" ? "factura" : "recibo"}</p><p className="mt-1 text-xs text-muted-foreground">Se incluirán los movimientos mostrados. La emisión fiscal se confirma antes de enviarse a Cloudbeds.</p>{fiscalTransactions.isLoading ? <p className="mt-3 text-sm text-muted-foreground">Consultando movimientos…</p> : fiscalTransactions.error ? <p className="mt-3 text-sm text-rose-700">{fiscalTransactions.error.message}</p> : fiscalTransactions.data?.length ? <><div className="mt-3 divide-y rounded-md border">{fiscalTransactions.data.map(item => <div key={item.id} className="flex justify-between gap-3 p-2 text-sm"><span>{item.label}</span><strong>{item.amount === null ? "—" : money(item.amount)}</strong></div>)}</div><Button className="mt-3" onClick={() => { const count = fiscalTransactions.data?.length || 0; if (globalThis.window.confirm(`Vas a emitir un ${fiscalKind === "invoice" ? "factura" : "recibo"} oficial de Cloudbeds con ${count} movimiento(s). Esta acción fiscal no se puede deshacer desde la aplicación. ¿Confirmas la emisión?`)) createFiscalDocument.mutate({ id: reservation.id, kind: fiscalKind, transactionIds: fiscalTransactions.data?.map(item => item.id) || [] }); }} disabled={createFiscalDocument.isPending}>{createFiscalDocument.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirmar emisión en Cloudbeds</Button></> : <p className="mt-3 text-sm text-muted-foreground">Cloudbeds no ha devuelto movimientos disponibles para emitir este documento.</p>}<Button className="ml-2 mt-3" variant="ghost" onClick={() => setFiscalKind(null)}>Cancelar</Button></div>}
            </section>
          </TabsContent>

          <TabsContent value="checkin" className="mt-4 space-y-4">
            {canManageMessages ? <section className="rounded-xl border p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><p className="font-semibold">Check-in y mensajería</p><p className="mt-1 text-sm text-muted-foreground">Los correos se envían solo tras confirmar. WhatsApp abre un borrador para revisión y envío manual.</p></div>
                <div className="flex rounded-md border bg-background p-0.5 text-xs"><Button variant={messageLanguage === "es" ? "secondary" : "ghost"} size="sm" className="h-7 px-2" onClick={() => setMessageLanguage("es")}>ES</Button><Button variant={messageLanguage === "en" ? "secondary" : "ghost"} size="sm" className="h-7 px-2" onClick={() => setMessageLanguage("en")}>EN</Button></div>
              </div>
              {onlineCheckinSent && (
                <div className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950">
                  <p className="font-semibold">Check-in con códigos ya enviado</p>
                  <p className="mt-1">Se envió por correo el {new Date(onlineCheckinSent.sentAt || onlineCheckinSent.createdAt).toLocaleString("es-ES")}.</p>
                </div>
              )}
              {earlyCheckinSent && (
                <div className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950">
                  <p className="font-semibold">Check-in anticipado ya enviado</p>
                  <p className="mt-1">Se envió por correo el {new Date(earlyCheckinSent.sentAt || earlyCheckinSent.createdAt).toLocaleString("es-ES")}.</p>
                </div>
              )}
              {welcomeEditor ? <div className="mt-4 space-y-4 rounded-lg border bg-muted/20 p-4"><div><p className="font-medium">Personalizar correo</p><p className="mt-1 text-sm text-muted-foreground">Revisa el correo antes de enviarlo a {welcomeEditor.guestEmail}.</p></div><div className="space-y-2"><label htmlFor="reservation-email-subject" className="text-sm font-medium">Asunto</label><Input id="reservation-email-subject" value={welcomeEditor.subject} onChange={event => setWelcomeEditor(current => current ? { ...current, subject: event.target.value } : current)} /></div><div className="space-y-2"><label htmlFor="reservation-email-message" className="text-sm font-medium">Mensaje</label><textarea id="reservation-email-message" className="min-h-48 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={welcomeEditor.message} onChange={event => setWelcomeEditor(current => current ? { ...current, message: event.target.value } : current)} /></div><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setWelcomeEditor(null)}>Cancelar</Button><Button onClick={sendEditedWelcome} disabled={sendReservationEmail.isPending}>{sendReservationEmail.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{welcomeEditor.messageType === "online_checkin" ? "Enviar Check-in con códigos" : welcomeEditor.messageType === "early_checkin" ? "Enviar Check-in anticipado" : "Enviar bienvenida"}</Button></div></div> : whatsAppEditor ? <div className="mt-4 space-y-4 rounded-lg border bg-muted/20 p-4"><div><p className="font-medium">Personalizar WhatsApp</p><p className="mt-1 text-sm text-muted-foreground">Se abrirá un borrador en WhatsApp para enviarlo manualmente.</p></div><div className="space-y-2"><label htmlFor="reservation-whatsapp-message" className="text-sm font-medium">Mensaje</label><textarea id="reservation-whatsapp-message" className="min-h-48 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={whatsAppEditor.message} onChange={event => setWhatsAppEditor(current => current ? { ...current, message: event.target.value } : current)} /></div><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setWhatsAppEditor(null)}>Cancelar</Button><Button onClick={openEditedWhatsApp} disabled={prepareReservationWhatsApp.isPending}>{prepareReservationWhatsApp.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Abrir WhatsApp</Button></div></div> : <div className="mt-4 grid gap-2 sm:grid-cols-2"><Button variant="outline" disabled={setReviewed.isPending} onClick={() => setReviewed.mutate({ id: reservation.id, isReviewed: !reservation.isReviewed })}><CheckCircle2 className="mr-2 h-4 w-4" />{reservation.isReviewed ? "Quitar revisión" : "Marcar revisada"}</Button><Button variant="outline" disabled={prepareReservationMessage.isPending} onClick={copyReservationCodes}><ClipboardCopy className="mr-2 h-4 w-4" />Copiar mensaje de códigos</Button><Button variant="outline" disabled={prepareReservationMessage.isPending} onClick={() => editReservationEmail("welcome")}><Mail className="mr-2 h-4 w-4" />Enviar códigos por correo</Button><Button variant="outline" disabled={prepareReservationMessage.isPending} onClick={() => editReservationEmail("online_checkin")}><Mail className="mr-2 h-4 w-4" />Enviar Check-in con códigos</Button><Button variant="outline" disabled={prepareReservationMessage.isPending} onClick={() => editReservationEmail("early_checkin")}><Mail className="mr-2 h-4 w-4" />Enviar Check-in anticipado</Button><Button variant="outline" disabled={prepareReservationWhatsApp.isPending} onClick={() => editReservationWhatsApp("welcome")}><MessageCircle className="mr-2 h-4 w-4" />Enviar códigos por WhatsApp</Button><Button variant="outline" disabled={prepareReservationWhatsApp.isPending} onClick={() => editReservationWhatsApp("online_checkin")} className="sm:col-span-2"><MessageCircle className="mr-2 h-4 w-4" />WhatsApp Check-in con códigos</Button><Button variant="outline" disabled={prepareReservationWhatsApp.isPending} onClick={() => editReservationWhatsApp("early_checkin")} className="sm:col-span-2"><MessageCircle className="mr-2 h-4 w-4" />WhatsApp Check-in anticipado</Button></div>}
            </section> : <p className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">Las acciones de comunicación requieren un usuario de recepción o administración.</p>}
          </TabsContent>
        </Tabs>}
      </DialogContent>
    </Dialog>

    <Dialog open={reservationCheckinOpen} onOpenChange={setReservationCheckinOpen}>
      <DialogContent className="h-[100dvh] max-h-[100dvh] w-screen max-w-none overflow-y-auto rounded-none p-3 sm:h-[94vh] sm:max-h-[94vh] sm:w-[min(96vw,1180px)] sm:max-w-[1180px] sm:rounded-xl sm:p-6">
        <DialogHeader>
          <DialogTitle>Realizar Check-in de la reserva</DialogTitle>
          <DialogDescription>
            Los datos de Cloudbeds y la habitación asignada ya están cargados. Completa la información documental, revisa la firma y guarda el registro.
          </DialogDescription>
        </DialogHeader>
        {reservationCheckinGuest && <CheckinPresencial
          key={selectedId ?? "reservation"}
          initialGuest={reservationCheckinGuest}
          showArchiveConfirmation
          preloadSource="reserva"
          onCompleted={() => {
            setReservationCheckinOpen(false);
            setSelectedId(null);
            utils.checkin.externalImports.listCloudbedsUpcomingReservations.invalidate({ dateFrom: window.dateFrom, dateTo: window.dateTo });
          }}
        />}
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

    <AlertDialog open={Boolean(pendingAgendaRates)} onOpenChange={open => { if (!open) setPendingAgendaRates(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>Confirmar envío de precios</AlertDialogTitle><AlertDialogDescription>Se actualizarán {pendingAgendaRates?.length || 0} tarifas base en Cloudbeds. Revisa los cambios antes de enviarlos.</AlertDialogDescription></AlertDialogHeader>
        {pendingAgendaRates && <>
          <div className="max-h-56 overflow-y-auto rounded-lg border bg-muted/40 p-3 text-sm"><div className="space-y-2">{pendingAgendaRates.map(change => <div key={agendaRateKey(change.rateId, change.date)} className="flex justify-between gap-3"><span>{change.roomTypeName} · {compactDate(change.date)}</span><strong>{money(change.previousRate)} → {money(parseAgendaRate(change.rateText) ?? 0)}</strong></div>)}</div></div>
          {largeAgendaRateChanges.length > 0 && <label className="block rounded-lg border-2 border-amber-400 bg-amber-50 p-3 text-sm text-amber-950"><span className="block font-semibold">Revisa cambios inusualmente grandes</span><span className="mt-1 block">Hay {largeAgendaRateChanges.length} cambio{largeAgendaRateChanges.length === 1 ? "" : "s"} de 50 € o más, o superiores al 50 %. Confirma que no se trata de un error de escritura.</span><span className="mt-3 flex items-center gap-2"><input type="checkbox" checked={hasConfirmedLargeAgendaChanges} onChange={event => setHasConfirmedLargeAgendaChanges(event.target.checked)} className="h-4 w-4 accent-amber-600" />Confirmo estos cambios de precio</span></label>}
        </>}
        <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction disabled={updateAgendaRates.isPending || (largeAgendaRateChanges.length > 0 && !hasConfirmedLargeAgendaChanges)} onClick={() => pendingAgendaRates && updateAgendaRates.mutate({ changes: pendingAgendaRates.map(change => ({ rateId: change.rateId, date: change.date, rate: parseAgendaRate(change.rateText) ?? 0 })) })}>{updateAgendaRates.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Enviar precios</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>;
}

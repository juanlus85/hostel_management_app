import { useEffect, useMemo, useRef, useState } from "react";
import { useRoute } from "wouter";
import { Building2, CheckCircle2, Copy, KeyRound, Loader2, Mail, MapPin, MessageCircle, Phone, ShieldCheck, Wifi } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { COUNTRIES } from "@/lib/countries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { renderArrivalTemplate } from "@shared/arrivalTemplate";
import { formatHostelAddress, googleMapsLink, translateFloor, translateRoomType } from "@shared/arrivalDisplay";

type Language = "es" | "en";
type DocumentType = "NIF" | "NIE" | "PAS" | "OTRO";
type Gender = "Hombre" | "Mujer" | "Otro";
type GuestForm = {
  firstName: string; lastName: string; documentNumber: string; documentSupport: string; documentType: DocumentType;
  gender: Gender; nationality: string; birthDate: string; documentExpiry: string; street: string; addressExtra: string;
  postalCode: string; city: string; province: string; country: string; phone: string; email: string; signature: string;
  acceptedTerms: boolean; acceptedPrivacy: boolean;
};
type OnlineCompletion = {
  success: boolean; roomNumber: string; roomCode?: string | null; entranceCode?: string | null; checkInDate: string;
  roomType?: string | null; floor?: string; floorLevel?: string; hostelName: string; hostelAddress?: string;
  hostelPhone?: string; hostelEmail?: string; wifiPassword?: string; arrivalMapUrl?: string;
  arrivalIntroEs?: string; arrivalIntroEn?: string; keyInstructionsEs?: string; keyInstructionsEn?: string;
  commonAreasEs?: string; commonAreasEn?: string; houseRulesEs?: string; houseRulesEn?: string;
};

const emptyGuest = (email = ""): GuestForm => ({
  firstName: "", lastName: "", documentNumber: "", documentSupport: "", documentType: "PAS", gender: "Hombre",
  nationality: "ESP", birthDate: "", documentExpiry: "", street: "", addressExtra: "", postalCode: "", city: "",
  province: "", country: "ESP", phone: "", email, signature: "", acceptedTerms: false, acceptedPrivacy: false,
});
const inputClass = "min-h-12 text-base";
const hostelLogo = import.meta.env.VITE_APP_LOGO;

export default function CheckinOnlinePublico() {
  const [, params] = useRoute("/checkin-online/:token");
  const token = params?.token || "";
  const [lang, setLang] = useState<Language>("es");
  const [submitted, setSubmitted] = useState<OnlineCompletion | null>(null);
  const [guests, setGuests] = useState<GuestForm[]>([emptyGuest()]);
  const { data: invitation, isLoading, error } = trpc.checkin.online.getPublic.useQuery({ token }, { enabled: !!token, retry: false });
  const complete = trpc.checkin.online.completePublic.useMutation();
  const t = (es: string, en: string) => lang === "es" ? es : en;
  const termsUrl = lang === "es" ? invitation?.termsUrlEs : invitation?.termsUrlEn;
  const privacyUrl = lang === "es" ? invitation?.privacyUrlEs : invitation?.privacyUrlEn;
  const countries = useMemo(() => [...COUNTRIES].sort((a, b) => (lang === "es" ? a.name : a.nameEn).localeCompare(lang === "es" ? b.name : b.nameEn)), [lang]);

  useEffect(() => {
    if (!invitation) return;
    setLang(invitation.language as Language);
    setGuests(Array.from({ length: invitation.numberOfGuests }, (_, index) => emptyGuest(index === 0 ? invitation.email || "" : "")));
  }, [invitation?.email, invitation?.numberOfGuests, invitation?.language]);

  const updateGuest = (index: number, patch: Partial<GuestForm>) => {
    setGuests((current) => current.map((guest, guestIndex) => guestIndex === index ? { ...guest, ...patch } : guest));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (guests.some((guest) => !guest.signature || !guest.acceptedTerms || !guest.acceptedPrivacy)) {
      toast.error(t("Cada huésped debe firmar y aceptar las condiciones y privacidad", "Every guest must sign and accept the terms and privacy policy"));
      return;
    }
    if (guests.some((guest) => guest.documentType === "NIF" && guest.nationality === "ESP" && !guest.documentSupport)) {
      toast.error(t("El número de soporte es obligatorio para DNI español", "The support number is required for Spanish ID"));
      return;
    }
    try {
      const primary = guests[0];
      const result = await complete.mutateAsync({
        ...primary,
        token,
        language: lang,
        acceptedTerms: true as const,
        acceptedPrivacy: true as const,
        guests: guests.map((guest) => ({ ...guest, email: guest.email || undefined, acceptedTerms: true as const, acceptedPrivacy: true as const })),
      });
      setSubmitted(result);
    } catch (submissionError: any) {
      toast.error(submissionError.message || t("No se pudo completar el check-in", "Could not complete the check-in"));
    }
  };

  if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-slate-50"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (error || !invitation) return <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4"><Card className="max-w-md"><CardHeader><CardTitle>{t("Enlace no disponible", "Link unavailable")}</CardTitle><CardDescription>{error?.message || t("Este enlace no es válido o ha caducado.", "This link is not valid or has expired.")}</CardDescription></CardHeader></Card></div>;
  if (submitted) return <ArrivalConfirmation lang={lang} guestName={guests[0]?.firstName || ""} guestEmail={guests[0]?.email || ""} data={submitted} />;
  if (invitation.completed) return <ArrivalConfirmation lang={lang} guestName={invitation.guestName || ""} guestEmail={invitation.email || ""} data={{ success: true, roomNumber: invitation.roomNumber, roomCode: invitation.roomCode, entranceCode: invitation.entranceCode, checkInDate: invitation.checkInDate, roomType: invitation.roomType, floor: invitation.floor, floorLevel: invitation.floorLevel, hostelName: invitation.hostelName, hostelAddress: invitation.hostelAddress, hostelPhone: invitation.hostelPhone, hostelEmail: invitation.hostelEmail, wifiPassword: invitation.wifiPassword, arrivalMapUrl: invitation.arrivalMapUrl, arrivalIntroEs: invitation.arrivalIntroEs, arrivalIntroEn: invitation.arrivalIntroEn, keyInstructionsEs: invitation.keyInstructionsEs, keyInstructionsEn: invitation.keyInstructionsEn, commonAreasEs: invitation.commonAreasEs, commonAreasEn: invitation.commonAreasEn, houseRulesEs: invitation.houseRulesEs, houseRulesEn: invitation.houseRulesEn }} />;

  const welcomeTemplate = lang === "es" ? invitation.welcomeMessageEs : invitation.welcomeMessageEn;
  const welcomeMessage = renderArrivalTemplate(welcomeTemplate, {
    guestName: guests[0]?.firstName,
    roomNumber: invitation.roomNumber,
    roomType: translateRoomType(invitation.roomType, lang),
    floor: translateFloor(lang === "en" ? invitation.floorLevel || invitation.floor : invitation.floor, lang),
    hostelName: invitation.hostelName,
    hostelAddress: formatHostelAddress(invitation.hostelAddress),
    wifiPassword: invitation.wifiPassword,
    hostelPhone: invitation.hostelPhone,
    hostelEmail: invitation.hostelEmail,
    checkInDate: invitation.checkInDate,
    checkOutDate: invitation.checkOutDate,
  });

  return <div className="min-h-screen bg-slate-50 py-3 sm:py-10"><main className="mx-auto max-w-3xl px-3 sm:px-4"><Card className="overflow-hidden"><CardHeader className="space-y-4 px-4 py-5 sm:px-6"><LanguageSwitch lang={lang} setLang={setLang} /><div className="text-center">{hostelLogo ? <img src={hostelLogo} alt={invitation.hostelName} className="mx-auto mb-3 h-14 max-w-[220px] object-contain" /> : <Building2 className="mx-auto mb-3 h-10 w-10 text-primary" />}<CardTitle className="text-xl sm:text-2xl">{invitation.hostelName}</CardTitle><CardDescription>{t("Completa tu check-in online de forma segura", "Complete your online check-in securely")}</CardDescription></div>{welcomeMessage && <div className="whitespace-pre-line rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm leading-6">{welcomeMessage}</div>}<div className="rounded-lg bg-muted p-3 text-sm leading-6"><strong>{t("Reserva:", "Booking:")}</strong> {invitation.reservationNumber || "—"}<br className="sm:hidden" /> <span className="hidden sm:inline">· </span><strong>{t("Llegada:", "Arrival:")}</strong> {invitation.checkInDate}<br className="sm:hidden" /> <span className="hidden sm:inline">· </span><strong>{t("Salida:", "Departure:")}</strong> {invitation.checkOutDate}<br /><strong>{t("Huéspedes:", "Guests:")}</strong> {invitation.numberOfGuests}</div></CardHeader><CardContent className="px-4 pb-6 sm:px-6"><form onSubmit={submit} className="space-y-6">{guests.map((guest, index) => <GuestCard key={index} index={index} total={guests.length} guest={guest} update={(patch) => updateGuest(index, patch)} lang={lang} t={t} countries={countries} termsUrl={termsUrl} privacyUrl={privacyUrl} primary={index === 0} lockEmail={index === 0 && Boolean(invitation.email)} />)}<Button type="submit" className="min-h-12 w-full text-base" disabled={complete.isPending}>{complete.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ShieldCheck className="mr-2 h-5 w-5" />}{t("Completar check-in y recibir códigos", "Complete check-in and receive codes")}</Button></form></CardContent></Card></main></div>;
}

function GuestCard({ index, total, guest, update, lang, t, countries, termsUrl, privacyUrl, primary, lockEmail }: { index: number; total: number; guest: GuestForm; update: (patch: Partial<GuestForm>) => void; lang: Language; t: (es: string, en: string) => string; countries: typeof COUNTRIES; termsUrl?: string; privacyUrl?: string; primary: boolean; lockEmail: boolean; }) {
  return <section className="space-y-5 rounded-xl border bg-white p-4 shadow-sm sm:p-5"><div><p className="text-xs font-semibold uppercase tracking-wide text-primary">{t("Huésped", "Guest")} {index + 1} {t("de", "of")} {total}</p><h2 className="mt-1 font-semibold">{primary ? t("Titular de la reserva", "Booking holder") : `${t("Acompañante", "Additional guest")} ${index + 1}`}</h2></div><div className="space-y-4"><h3 className="font-medium">{t("Datos personales", "Personal details")}</h3><div className="grid gap-4 sm:grid-cols-2"><Field label={t("Nombre", "First name")}><Input required className={inputClass} value={guest.firstName} onChange={(event) => update({ firstName: event.target.value })} /></Field><Field label={t("Apellidos", "Last name")}><Input required className={inputClass} value={guest.lastName} onChange={(event) => update({ lastName: event.target.value })} /></Field><Field label={t("Nacionalidad", "Nationality")}><CountrySelect value={guest.nationality} lang={lang} countries={countries} onChange={(value) => update({ nationality: value })} /></Field><Field label={t("Sexo", "Gender")}><Select value={guest.gender} onValueChange={(value) => update({ gender: value as Gender })}><SelectTrigger className={inputClass}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Hombre">{t("Hombre", "Male")}</SelectItem><SelectItem value="Mujer">{t("Mujer", "Female")}</SelectItem><SelectItem value="Otro">{t("Otro", "Other")}</SelectItem></SelectContent></Select></Field><Field label={t("Tipo de documento", "Document type")}><Select value={guest.documentType} onValueChange={(value) => update({ documentType: value as DocumentType })}><SelectTrigger className={inputClass}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="NIF">DNI/NIF</SelectItem><SelectItem value="NIE">NIE</SelectItem><SelectItem value="PAS">{t("Pasaporte", "Passport")}</SelectItem><SelectItem value="OTRO">{t("Otro", "Other")}</SelectItem></SelectContent></Select></Field><Field label={t("Número de documento", "Document number")}><Input required className={inputClass} value={guest.documentNumber} onChange={(event) => update({ documentNumber: event.target.value })} /></Field>{guest.documentType === "NIF" && guest.nationality === "ESP" && <Field label={t("Número de soporte (frontal DNI)", "Support number (front of Spanish ID)")}><Input required className={inputClass} value={guest.documentSupport} onChange={(event) => update({ documentSupport: event.target.value })} /></Field>}<Field label={t("Fecha de nacimiento", "Date of birth")}><Input required className={inputClass} type="date" value={guest.birthDate} onChange={(event) => update({ birthDate: event.target.value })} /></Field><Field label={t("Caducidad del documento", "Document expiry")} optional><Input className={inputClass} type="date" value={guest.documentExpiry} onChange={(event) => update({ documentExpiry: event.target.value })} /></Field><Field label={t("Teléfono", "Phone")}><Input required className={inputClass} type="tel" inputMode="tel" value={guest.phone} onChange={(event) => update({ phone: event.target.value })} /></Field><Field label="Email" optional={!primary}><Input required={primary} className={`${inputClass} ${lockEmail ? "bg-muted" : ""}`} readOnly={lockEmail} type="email" value={guest.email} onChange={(event) => update({ email: event.target.value })} /></Field></div></div><div className="space-y-4"><h3 className="font-medium">{t("Dirección", "Address")}</h3><div className="grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><Field label={t("Dirección", "Street address")}><Input required className={inputClass} value={guest.street} onChange={(event) => update({ street: event.target.value })} /></Field></div><div className="sm:col-span-2"><Field label={t("Complemento", "Address line 2")} optional><Input className={inputClass} value={guest.addressExtra} onChange={(event) => update({ addressExtra: event.target.value })} /></Field></div><Field label={t("Código postal", "Postal code")}><Input required className={inputClass} inputMode="numeric" value={guest.postalCode} onChange={(event) => update({ postalCode: event.target.value })} /></Field><Field label={t("Ciudad", "City")}><Input required className={inputClass} value={guest.city} onChange={(event) => update({ city: event.target.value })} /></Field><Field label={t("Provincia", "Province")} optional><Input className={inputClass} value={guest.province} onChange={(event) => update({ province: event.target.value })} /></Field><Field label={t("País", "Country")}><CountrySelect value={guest.country} lang={lang} countries={countries} onChange={(value) => update({ country: value })} /></Field></div></div><SignaturePad lang={lang} t={t} value={guest.signature} onChange={(signature) => update({ signature })} /><section className="space-y-3 rounded-lg bg-muted/50 p-4"><Consent checked={guest.acceptedTerms} setChecked={(acceptedTerms) => update({ acceptedTerms })} id={`terms-online-${index}`} prefix={t("Confirmo que los datos facilitados son correctos y acepto las ", "I confirm that the information provided is correct and accept the ")} url={termsUrl} linkLabel={t("condiciones del establecimiento", "establishment terms")} suffix="." /><Consent checked={guest.acceptedPrivacy} setChecked={(acceptedPrivacy) => update({ acceptedPrivacy })} id={`privacy-online-${index}`} prefix={t("Acepto la ", "I accept the ")} url={privacyUrl} linkLabel={t("política de privacidad", "privacy policy")} suffix={t(" y el tratamiento de mis datos para el registro de huéspedes.", " and the processing of my data for guest registration.")} /></section></section>;
}

function SignaturePad({ lang, t, value, onChange }: { lang: Language; t: (es: string, en: string) => string; value: string; onChange: (value: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * (canvas.width / rect.width), y: (event.clientY - rect.top) * (canvas.height / rect.height) };
  };
  const start = (event: React.PointerEvent<HTMLCanvasElement>) => { event.currentTarget.setPointerCapture(event.pointerId); const context = canvasRef.current?.getContext("2d"); if (!context) return; context.strokeStyle = "#111827"; context.lineWidth = 2; context.lineCap = "round"; const p = point(event); context.beginPath(); context.moveTo(p.x, p.y); setDrawing(true); };
  const draw = (event: React.PointerEvent<HTMLCanvasElement>) => { if (!drawing) return; const context = canvasRef.current?.getContext("2d"); if (!context) return; const p = point(event); context.lineTo(p.x, p.y); context.stroke(); onChange(canvasRef.current?.toDataURL("image/png") || ""); };
  const clear = () => { canvasRef.current?.getContext("2d")?.clearRect(0, 0, 900, 260); onChange(""); };
  return <section className="space-y-3"><h3 className="font-medium">{t("Firma", "Signature")}</h3><p className="text-sm text-muted-foreground">{t("Firma dentro del recuadro con el dedo o el ratón.", "Sign inside the box using your finger or mouse.")}</p><canvas ref={canvasRef} width={900} height={260} className="h-40 w-full touch-none rounded-md border bg-white" onPointerDown={start} onPointerMove={draw} onPointerUp={() => setDrawing(false)} onPointerCancel={() => setDrawing(false)} />{value && <Button type="button" variant="outline" size="sm" onClick={clear}>{t("Borrar firma", "Clear signature")}</Button>}</section>;
}

function ArrivalConfirmation({ lang, guestName, guestEmail, data }: { lang: Language; guestName: string; guestEmail: string; data: OnlineCompletion }) {
  const t = (es: string, en: string) => lang === "es" ? es : en;
  const copyCode = async (code?: string | null) => { if (!code) return; try { await navigator.clipboard.writeText(code); toast.success(t("Código copiado", "Code copied")); } catch { toast.error(t("No se pudo copiar el código", "Could not copy the code")); } };
  const floor = translateFloor(lang === "en" ? data.floorLevel || data.floor : data.floor || data.floorLevel, lang);
  const roomType = translateRoomType(data.roomType, lang);
  const address = formatHostelAddress(data.hostelAddress);
  const mapsUrl = googleMapsLink(address);
  const context = { guestName, roomNumber: data.roomNumber, roomType, floor, entranceCode: data.entranceCode, roomCode: data.roomCode, hostelName: data.hostelName, hostelAddress: address, wifiPassword: data.wifiPassword, hostelPhone: data.hostelPhone, hostelEmail: data.hostelEmail, checkInDate: data.checkInDate };
  const intro = renderArrivalTemplate(lang === "es" ? data.arrivalIntroEs : data.arrivalIntroEn, context);
  const keyInstructions = renderArrivalTemplate(lang === "es" ? data.keyInstructionsEs : data.keyInstructionsEn, context);
  const commonAreas = renderArrivalTemplate(lang === "es" ? data.commonAreasEs : data.commonAreasEn, context);
  const houseRules = renderArrivalTemplate(lang === "es" ? data.houseRulesEs : data.houseRulesEn, context);
  const defaultIntro = t(`Hola ${guestName}. Sigue estas indicaciones para acceder al hostel y a tu habitación.`, `Hello ${guestName}. Follow these instructions to access the hostel and your room.`);
  const shareText = [data.hostelName, "", intro || defaultIntro, "", `${t("Código de entrada", "Entrance code")}: ${data.entranceCode || "—"}`, `${t("Código de habitación", "Room code")}: ${data.roomCode || "—"}`, `${t("Habitación", "Room")} ${data.roomNumber}${roomType ? ` · ${roomType}` : ""}${floor ? ` · ${floor}` : ""}`, address, mapsUrl, data.wifiPassword ? `Wi‑Fi: ${data.wifiPassword}` : "", commonAreas || "", houseRules || "", [data.hostelPhone, data.hostelEmail].filter(Boolean).join(" · ")].filter(Boolean).join("\n");
  const emailHref = `mailto:${encodeURIComponent(guestEmail)}?subject=${encodeURIComponent(t("Instrucciones de llegada", "Arrival instructions"))}&body=${encodeURIComponent(shareText)}`;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
  return <div className="min-h-screen bg-gradient-to-br from-teal-50 to-sky-100 p-3 py-6 sm:p-8"><Card className="mx-auto max-w-2xl"><CardHeader className="text-center">{hostelLogo && <img src={hostelLogo} alt={data.hostelName} className="mx-auto mb-4 h-14 max-w-[220px] object-contain" />}<CheckCircle2 className="mx-auto h-16 w-16 text-teal-600" /><CardTitle className="mt-3 text-2xl">{t("¡Check-in completado!", "Check-in completed!")}</CardTitle><CardDescription>{t("Tus códigos y esta guía también se han enviado a tu email.", "Your codes and this guide have also been sent to your email.")}</CardDescription></CardHeader><CardContent className="space-y-5"><section className="rounded-xl border border-teal-200 bg-teal-50 p-5"><h2 className="font-bold text-teal-950">{t("Guía de llegada", "Arrival guide")}</h2><p className="mt-2 whitespace-pre-line text-sm leading-6 text-teal-950">{intro || defaultIntro}</p></section><section className="grid gap-3 sm:grid-cols-2"><CodeBox label={t("1. Código de acceso al hostel", "1. Hostel entrance code")} code={data.entranceCode} onCopy={copyCode} copyLabel={t("Copiar", "Copy")} /><CodeBox label={t("2. Código de tu habitación", "2. Your room code")} code={data.roomCode} onCopy={copyCode} copyLabel={t("Copiar", "Copy")} /></section><GuideBlock icon={<MapPin className="h-5 w-5" />} title={t("Ubicación", "Location")}><a className="font-semibold text-teal-700 underline" href={mapsUrl} target="_blank" rel="noopener noreferrer">{address}</a><a className="mt-2 inline-flex font-semibold text-teal-700 underline" href={mapsUrl} target="_blank" rel="noopener noreferrer">{t("Abrir en Google Maps", "Open in Google Maps")}</a></GuideBlock><GuideBlock icon={<KeyRound className="h-5 w-5" />} title={t("Tu habitación", "Your room")}><p><strong>{roomType} · {t("Habitación", "Room")} {data.roomNumber}{floor ? ` · ${floor}` : ""}</strong></p><p className="mt-2 whitespace-pre-line">{keyInstructions || t("Utiliza el código de habitación indicado arriba para acceder.", "Use the room code shown above to access your room.")}</p></GuideBlock>{data.wifiPassword && <GuideBlock icon={<Wifi className="h-5 w-5" />} title="Wi‑Fi"><p>{t("Contraseña", "Password")}: <strong className="tracking-wide">{data.wifiPassword}</strong></p></GuideBlock>}{commonAreas && <GuideBlock icon={<Building2 className="h-5 w-5" />} title={t("Zonas comunes", "Common areas")}><p className="whitespace-pre-line">{commonAreas}</p></GuideBlock>}{houseRules && <GuideBlock icon={<ShieldCheck className="h-5 w-5" />} title={t("Normas del hostel", "Hostel rules")}><p className="whitespace-pre-line">{houseRules}</p></GuideBlock>}<GuideBlock icon={<Phone className="h-5 w-5" />} title={t("¿Necesitas ayuda?", "Need help?")}><div className="space-y-1">{data.hostelPhone && <p><a className="font-semibold text-teal-700 underline" href={`tel:${data.hostelPhone}`}>{data.hostelPhone}</a></p>}{data.hostelEmail && <p><a className="font-semibold text-teal-700 underline" href={`mailto:${data.hostelEmail}`}>{data.hostelEmail}</a></p>}</div></GuideBlock><section className="rounded-xl border bg-slate-50 p-5"><h2 className="mb-3 font-bold text-slate-900">{t("Guardar o compartir estas instrucciones", "Save or share these instructions")}</h2><div className="flex flex-col gap-3 sm:flex-row"><Button asChild className="flex-1"><a href={emailHref}><Mail className="mr-2 h-4 w-4" />{t("Enviar por email", "Send by email")}</a></Button><Button asChild variant="outline" className="flex-1"><a href={whatsappHref} target="_blank" rel="noopener noreferrer"><MessageCircle className="mr-2 h-4 w-4" />WhatsApp</a></Button></div></section></CardContent></Card></div>;
}

function GuideBlock({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) { return <section className="rounded-xl border bg-white p-5 text-sm leading-6 text-slate-700"><h2 className="mb-2 flex items-center gap-2 font-bold text-slate-900">{icon}{title}</h2>{children}</section>; }
function CodeBox({ label, code, onCopy, copyLabel }: { label: string; code?: string | null; onCopy: (code?: string | null) => void; copyLabel: string }) { return <div className="rounded-lg border border-teal-200 bg-teal-50 p-4"><p className="font-medium">{label}</p><div className="mt-2 flex items-center justify-between"><code className="text-xl font-bold tracking-[0.2em]">{code || "—"}</code>{code && <Button variant="outline" size="sm" onClick={() => onCopy(code)}><Copy className="mr-2 h-4 w-4" />{copyLabel}</Button>}</div></div>; }
function Consent({ checked, setChecked, id, prefix, url, linkLabel, suffix }: { checked: boolean; setChecked: (value: boolean) => void; id: string; prefix: string; url?: string; linkLabel: string; suffix: string }) { return <div className="flex items-start gap-3"><Checkbox id={id} checked={checked} onCheckedChange={(value) => setChecked(value === true)} /><Label htmlFor={id} className="cursor-pointer leading-5">{prefix}{url ? <a className="font-semibold underline" href={url} target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()}>{linkLabel}</a> : linkLabel}{suffix}</Label></div>; }
function LanguageSwitch({ lang, setLang }: { lang: Language; setLang: (language: Language) => void }) { return <div className="flex justify-center gap-2"><Button type="button" size="sm" onClick={() => setLang("es")} className={`border-0 bg-gradient-to-r from-red-600 via-yellow-300 to-red-600 font-bold text-slate-950 shadow-sm hover:opacity-90 ${lang === "es" ? "ring-2 ring-slate-900 ring-offset-2" : "opacity-70"}`}>ESPAÑOL</Button><Button type="button" size="sm" onClick={() => setLang("en")} className={`border-0 bg-gradient-to-r from-blue-900 via-white to-red-600 font-bold text-slate-900 shadow-sm hover:opacity-90 ${lang === "en" ? "ring-2 ring-slate-900 ring-offset-2" : "opacity-70"}`}>ENGLISH</Button></div>; }
function Field({ label, children, optional = false }: { label: string; children: React.ReactNode; optional?: boolean }) { return <div className="space-y-2"><Label>{label}{optional ? "" : " *"}</Label>{children}</div>; }
function CountrySelect({ value, lang, countries, onChange }: { value: string; lang: Language; countries: typeof COUNTRIES; onChange: (value: string) => void }) { return <Select value={value} onValueChange={onChange}><SelectTrigger className={inputClass}><SelectValue /></SelectTrigger><SelectContent>{countries.map((country) => <SelectItem key={country.code} value={country.code}>{lang === "es" ? country.name : country.nameEn}</SelectItem>)}</SelectContent></Select>; }

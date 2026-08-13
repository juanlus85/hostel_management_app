import { useRoute } from "wouter";
import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Copy, Loader2, MapPin, ShieldCheck, Wifi, KeyRound, Building2, Phone, Mail, Info, MessageCircle } from "lucide-react";
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

type Language = "es" | "en";
type DocumentType = "NIF" | "NIE" | "PAS" | "OTRO";
type Gender = "Hombre" | "Mujer" | "Otro";
type OnlineCompletion = {
  success: boolean;
  roomNumber: string;
  roomCode?: string | null;
  entranceCode?: string | null;
  checkInDate: string;
  roomType?: string | null;
  floor?: string;
  floorLevel?: string;
  hostelName: string;
  hostelAddress?: string;
  hostelPhone?: string;
  hostelEmail?: string;
  wifiPassword?: string;
  arrivalMapUrl?: string;
  arrivalIntroEs?: string;
  arrivalIntroEn?: string;
  keyInstructionsEs?: string;
  keyInstructionsEn?: string;
  commonAreasEs?: string;
  commonAreasEn?: string;
  houseRulesEs?: string;
  houseRulesEn?: string;
};

export default function CheckinOnlinePublico() {
  const [, params] = useRoute("/checkin-online/:token");
  const token = params?.token || "";
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [lang, setLang] = useState<Language>("es");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [submitted, setSubmitted] = useState<OnlineCompletion | null>(null);
  const [form, setForm] = useState({
    firstName: "", lastName: "", documentNumber: "", documentSupport: "", documentType: "PAS" as DocumentType,
    gender: "Hombre" as Gender, nationality: "ESP", birthDate: "", documentExpiry: "", street: "", addressExtra: "", postalCode: "", city: "", province: "", country: "ESP", phone: "", email: "",
  });

  const { data: invitation, isLoading, error } = trpc.checkin.online.getPublic.useQuery({ token }, { enabled: !!token, retry: false });
  const complete = trpc.checkin.online.completePublic.useMutation();
  const t = (es: string, en: string) => lang === "es" ? es : en;
  const termsUrl = lang === "es" ? invitation?.termsUrlEs : invitation?.termsUrlEn;
  const privacyUrl = lang === "es" ? invitation?.privacyUrlEs : invitation?.privacyUrlEn;
  const welcomeTemplate = lang === "es" ? invitation?.welcomeMessageEs : invitation?.welcomeMessageEn;
  const welcomeMessage = renderArrivalTemplate(welcomeTemplate, {
    guestName: form.firstName,
    roomNumber: invitation?.roomNumber,
    roomType: invitation?.roomType,
    floor: lang === "en" ? invitation?.floorLevel : invitation?.floor,
    hostelName: invitation?.hostelName,
    hostelAddress: invitation?.hostelAddress,
    wifiPassword: invitation?.wifiPassword,
    hostelPhone: invitation?.hostelPhone,
    hostelEmail: invitation?.hostelEmail,
    checkInDate: invitation?.checkInDate,
    checkOutDate: invitation?.checkOutDate,
  });
  const countries = useMemo(() => [...COUNTRIES].sort((a, b) => (lang === "es" ? a.name : a.nameEn).localeCompare(lang === "es" ? b.name : b.nameEn)), [lang]);

  useEffect(() => {
    if (invitation) {
      setLang(invitation.language as Language);
      setForm((current) => ({ ...current, email: invitation.email }));
    }
  }, [invitation]);
  useEffect(() => {
    const context = signatureCanvasRef.current?.getContext("2d");
    if (context) {
      context.strokeStyle = "#111827";
      context.lineWidth = 2;
      context.lineCap = "round";
      context.lineJoin = "round";
    }
  }, []);

  const getPoint = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = signatureCanvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const source = "touches" in event ? event.touches[0] : event;
    return { x: (source.clientX - rect.left) * (canvas.width / rect.width), y: (source.clientY - rect.top) * (canvas.height / rect.height) };
  };
  const startDrawing = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const context = signatureCanvasRef.current?.getContext("2d");
    if (!context) return;
    const point = getPoint(event);
    context.beginPath();
    context.moveTo(point.x, point.y);
    setIsDrawing(true);
    setHasSignature(true);
  };
  const draw = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    event.preventDefault();
    const context = signatureCanvasRef.current?.getContext("2d");
    if (!context) return;
    const point = getPoint(event);
    context.lineTo(point.x, point.y);
    context.stroke();
  };
  const clearSignature = () => {
    const canvas = signatureCanvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!acceptedTerms || !acceptedPrivacy) return toast.error(t("Debes aceptar las condiciones y la política de privacidad", "You must accept the terms and privacy policy"));
    if (!hasSignature) return toast.error(t("La firma es obligatoria", "Signature is required"));
    if (form.documentType === "NIF" && form.nationality === "ESP" && !form.documentSupport) return toast.error(t("El número de soporte es obligatorio para DNI español", "The support number is required for Spanish ID"));
    try {
      const result = await complete.mutateAsync({ ...form, token, language: lang, signature: signatureCanvasRef.current?.toDataURL("image/png") || "", acceptedTerms: true, acceptedPrivacy: true });
      setSubmitted(result);
    } catch (submissionError: any) {
      toast.error(submissionError.message || t("No se pudo completar el check-in", "Could not complete the check-in"));
    }
  };

  if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-slate-50"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (error || !invitation) return <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4"><Card className="max-w-md"><CardHeader><CardTitle>{t("Enlace no disponible", "Link unavailable")}</CardTitle><CardDescription>{error?.message || t("Este enlace no es válido o ha caducado.", "This link is not valid or has expired.")}</CardDescription></CardHeader></Card></div>;
  if (submitted) return <ArrivalConfirmation lang={lang} guestName={form.firstName} guestEmail={form.email} data={submitted} />;
  if (invitation.completed) return <ArrivalConfirmation lang={lang} guestName={invitation.guestName || ""} guestEmail={invitation.email} data={{ success: true, roomNumber: invitation.roomNumber, roomCode: invitation.roomCode, entranceCode: invitation.entranceCode, checkInDate: invitation.checkInDate, roomType: invitation.roomType, floor: invitation.floor, floorLevel: invitation.floorLevel, hostelName: invitation.hostelName, hostelAddress: invitation.hostelAddress, hostelPhone: invitation.hostelPhone, hostelEmail: invitation.hostelEmail, wifiPassword: invitation.wifiPassword, arrivalMapUrl: invitation.arrivalMapUrl, arrivalIntroEs: invitation.arrivalIntroEs, arrivalIntroEn: invitation.arrivalIntroEn, keyInstructionsEs: invitation.keyInstructionsEs, keyInstructionsEn: invitation.keyInstructionsEn, commonAreasEs: invitation.commonAreasEs, commonAreasEn: invitation.commonAreasEn, houseRulesEs: invitation.houseRulesEs, houseRulesEn: invitation.houseRulesEn }} />;

  return <div className="min-h-screen bg-slate-50 py-6 sm:py-10"><main className="mx-auto max-w-3xl px-4"><Card><CardHeader className="space-y-5"><LanguageSwitch lang={lang} setLang={setLang} /><div className="text-center"><CardTitle className="text-2xl">{invitation.hostelName}</CardTitle><CardDescription>{t("Completa tu check-in online de forma segura", "Complete your online check-in securely")}</CardDescription></div>{welcomeMessage && <div className="whitespace-pre-line rounded-md border border-primary/20 bg-primary/5 p-4 text-sm">{welcomeMessage}</div>}<div className="rounded-md bg-muted p-3 text-sm"><strong>{t("Reserva:", "Booking:")}</strong> {invitation.reservationNumber || "—"} · <strong>{t("Llegada:", "Arrival:")}</strong> {invitation.checkInDate} · <strong>{t("Salida:", "Departure:")}</strong> {invitation.checkOutDate}</div></CardHeader><CardContent><form onSubmit={submit} className="space-y-7"><section className="space-y-4"><h2 className="font-semibold">{t("Datos personales", "Personal details")}</h2><div className="grid gap-4 sm:grid-cols-2"><Field label={t("Nombre", "First name")}><Input required value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} /></Field><Field label={t("Apellidos", "Last name")}><Input required value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} /></Field><Field label={t("Nacionalidad", "Nationality")}><CountrySelect value={form.nationality} lang={lang} countries={countries} onChange={(value) => setForm({ ...form, nationality: value })} /></Field><Field label={t("Sexo", "Gender")}><Select value={form.gender} onValueChange={(value) => setForm({ ...form, gender: value as Gender })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Hombre">{t("Hombre", "Male")}</SelectItem><SelectItem value="Mujer">{t("Mujer", "Female")}</SelectItem><SelectItem value="Otro">{t("Otro", "Other")}</SelectItem></SelectContent></Select></Field><Field label={t("Tipo de documento", "Document type")}><Select value={form.documentType} onValueChange={(value) => setForm({ ...form, documentType: value as DocumentType })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="NIF">DNI/NIF</SelectItem><SelectItem value="NIE">NIE</SelectItem><SelectItem value="PAS">{t("Pasaporte", "Passport")}</SelectItem><SelectItem value="OTRO">{t("Otro", "Other")}</SelectItem></SelectContent></Select></Field><Field label={t("Número de documento", "Document number")}><Input required value={form.documentNumber} onChange={(event) => setForm({ ...form, documentNumber: event.target.value })} /></Field>{form.documentType === "NIF" && form.nationality === "ESP" && <Field label={t("Número de soporte (frontal del DNI)", "Support number (front of Spanish ID)")}><Input required value={form.documentSupport} onChange={(event) => setForm({ ...form, documentSupport: event.target.value })} /></Field>}<Field label={t("Fecha de nacimiento", "Date of birth")}><Input required type="date" value={form.birthDate} onChange={(event) => setForm({ ...form, birthDate: event.target.value })} /></Field><Field label={t("Caducidad del documento", "Document expiry")} optional><Input type="date" value={form.documentExpiry} onChange={(event) => setForm({ ...form, documentExpiry: event.target.value })} /></Field><Field label={t("Teléfono", "Phone")}><Input required type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field><Field label="Email"><Input required readOnly className="bg-muted" value={form.email} /></Field></div></section><section className="space-y-4"><h2 className="font-semibold">{t("Dirección", "Address")}</h2><div className="grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><Field label={t("Dirección", "Street address")}><Input required value={form.street} onChange={(event) => setForm({ ...form, street: event.target.value })} /></Field></div><div className="sm:col-span-2"><Field label={t("Complemento", "Address line 2")} optional><Input value={form.addressExtra} onChange={(event) => setForm({ ...form, addressExtra: event.target.value })} /></Field></div><Field label={t("Código postal", "Postal code")}><Input required value={form.postalCode} onChange={(event) => setForm({ ...form, postalCode: event.target.value })} /></Field><Field label={t("Ciudad", "City")}><Input required value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} /></Field><Field label={t("Provincia", "Province")} optional><Input value={form.province} onChange={(event) => setForm({ ...form, province: event.target.value })} /></Field><Field label={t("País", "Country")}><CountrySelect value={form.country} lang={lang} countries={countries} onChange={(value) => setForm({ ...form, country: value })} /></Field></div></section><section className="space-y-3"><h2 className="font-semibold">{t("Firma", "Signature")}</h2><p className="text-sm text-muted-foreground">{t("Firma dentro del recuadro con el dedo o el ratón.", "Sign inside the box using your finger or mouse.")}</p><canvas ref={signatureCanvasRef} width={900} height={260} className="h-40 w-full touch-none rounded-md border bg-white" onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={() => setIsDrawing(false)} onMouseLeave={() => setIsDrawing(false)} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={() => setIsDrawing(false)} /><Button type="button" variant="outline" size="sm" onClick={clearSignature}>{t("Borrar firma", "Clear signature")}</Button></section><section className="space-y-3 rounded-lg bg-muted/50 p-4"><Consent checked={acceptedTerms} setChecked={setAcceptedTerms} id="terms-online" prefix={t("Acepto las ", "I accept the ")} url={termsUrl} linkLabel={t("condiciones del establecimiento", "establishment terms")} suffix={t(" y confirmo que los datos facilitados son correctos.", " and confirm that the information provided is correct.")} /><Consent checked={acceptedPrivacy} setChecked={setAcceptedPrivacy} id="privacy-online" prefix={t("Acepto la ", "I accept the ")} url={privacyUrl} linkLabel={t("política de privacidad", "privacy policy")} suffix={t(" y el tratamiento de mis datos para el registro de huéspedes.", " and the processing of my data for guest registration.")} /></section><Button type="submit" className="w-full" disabled={complete.isPending}>{complete.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}{t("Completar check-in y recibir códigos", "Complete check-in and receive codes")}</Button></form></CardContent></Card></main></div>;
}

function ArrivalConfirmation({ lang, guestName, guestEmail, data }: { lang: Language; guestName: string; guestEmail: string; data: OnlineCompletion }) {
  const t = (es: string, en: string) => lang === "es" ? es : en;
  const copyCode = async (code?: string | null) => { if (code) { await navigator.clipboard.writeText(code); toast.success(t("Código copiado", "Code copied")); } };
  const floor = lang === "en" ? data.floorLevel || data.floor : data.floor || data.floorLevel;
  const templateContext = { guestName, roomNumber: data.roomNumber, roomType: data.roomType, floor, entranceCode: data.entranceCode, roomCode: data.roomCode, hostelName: data.hostelName, hostelAddress: data.hostelAddress, wifiPassword: data.wifiPassword, hostelPhone: data.hostelPhone, hostelEmail: data.hostelEmail, checkInDate: data.checkInDate };
  const intro = renderArrivalTemplate(lang === "es" ? data.arrivalIntroEs : data.arrivalIntroEn, templateContext);
  const keyInstructions = renderArrivalTemplate(lang === "es" ? data.keyInstructionsEs : data.keyInstructionsEn, templateContext);
  const commonAreas = renderArrivalTemplate(lang === "es" ? data.commonAreasEs : data.commonAreasEn, templateContext);
  const houseRules = renderArrivalTemplate(lang === "es" ? data.houseRulesEs : data.houseRulesEn, templateContext);
  const defaultIntro = t(`Hola ${guestName}. La recepción podría no estar abierta presencialmente a tu llegada, pero no te preocupes: sigue estas indicaciones para acceder al hostel y a tu habitación.`, `Hello ${guestName}. Reception may not be open in person when you arrive, but do not worry: follow these instructions to access the hostel and your room.`);
  const shareText = [data.hostelName, "", intro || defaultIntro, "", `${t("Código de entrada", "Entrance code")}: ${data.entranceCode || "—"}`, `${t("Código de habitación", "Room code")}: ${data.roomCode || "—"}`, `${t("Habitación", "Room")} ${data.roomNumber}${data.roomType ? ` · ${data.roomType}` : ""}${floor ? ` · ${floor}` : ""}`, data.hostelAddress || "", data.arrivalMapUrl || "", data.wifiPassword ? `Wi‑Fi: ${data.wifiPassword}` : "", commonAreas || "", houseRules || "", [data.hostelPhone, data.hostelEmail].filter(Boolean).join(" · ")].filter(Boolean).join("\n");
  const emailHref = `mailto:${encodeURIComponent(guestEmail)}?subject=${encodeURIComponent(t("Instrucciones de llegada", "Arrival instructions"))}&body=${encodeURIComponent(shareText)}`;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
  return <div className="min-h-screen bg-gradient-to-br from-teal-50 to-sky-100 p-4 py-8 sm:p-8"><Card className="mx-auto max-w-2xl"><CardHeader className="text-center"><CheckCircle2 className="mx-auto h-16 w-16 text-teal-600" /><CardTitle className="mt-3 text-2xl">{t("¡Check-in completado!", "Check-in completed!")}</CardTitle><CardDescription>{t("Tus códigos y esta guía también se han enviado a tu email.", "Your codes and this guide have also been sent to your email.")}</CardDescription></CardHeader><CardContent className="space-y-5"><section className="rounded-xl border border-teal-200 bg-teal-50 p-5"><h2 className="font-bold text-teal-950">{t("Guía de llegada", "Arrival guide")}</h2><p className="mt-2 whitespace-pre-line text-sm leading-6 text-teal-950">{intro || defaultIntro}</p></section><section className="grid gap-3 sm:grid-cols-2"><CodeBox label={t("1. Código de acceso al hostel", "1. Hostel entrance code")} code={data.entranceCode} onCopy={copyCode} copyLabel={t("Copiar", "Copy")} /><CodeBox label={t("2. Código de tu habitación", "2. Your room code")} code={data.roomCode} onCopy={copyCode} copyLabel={t("Copiar", "Copy")} /></section><GuideBlock icon={<MapPin className="h-5 w-5" />} title={t("Ubicación", "Location")}><p>{data.hostelAddress || t("Consulta la dirección en tu confirmación de reserva.", "Please check your reservation confirmation for the address.")}</p>{data.arrivalMapUrl && <a className="mt-2 inline-flex font-semibold text-teal-700 underline" href={data.arrivalMapUrl} target="_blank" rel="noopener noreferrer">{t("Abrir mapa de llegada", "Open arrival map")}</a>}</GuideBlock><GuideBlock icon={<KeyRound className="h-5 w-5" />} title={t("Tu habitación", "Your room")}><p><strong>{data.roomType || t("Habitación", "Room")} · {t("Habitación", "Room")} {data.roomNumber}{floor ? ` · ${floor}` : ""}</strong></p><p className="mt-2 whitespace-pre-line">{keyInstructions || t("Utiliza el código de habitación indicado arriba para acceder. Si tu reserva incluye tarjeta o llave física, sigue la indicación recibida de recepción.", "Use the room code shown above to access your room. If your reservation includes a physical key card, follow the instruction provided by reception.")}</p></GuideBlock>{data.wifiPassword && <GuideBlock icon={<Wifi className="h-5 w-5" />} title="Wi‑Fi"><p>{t("Contraseña", "Password")}: <strong className="tracking-wide">{data.wifiPassword}</strong></p></GuideBlock>}{commonAreas && <GuideBlock icon={<Building2 className="h-5 w-5" />} title={t("Zonas comunes", "Common areas")}><p className="whitespace-pre-line">{commonAreas}</p></GuideBlock>}{houseRules && <GuideBlock icon={<Info className="h-5 w-5" />} title={t("Normas del hostel", "Hostel rules")}><p className="whitespace-pre-line">{houseRules}</p></GuideBlock>}<GuideBlock icon={<Phone className="h-5 w-5" />} title={t("¿Necesitas ayuda?", "Need help?")}><div className="space-y-1">{data.hostelPhone && <p><a className="font-semibold text-teal-700 underline" href={`tel:${data.hostelPhone}`}>{data.hostelPhone}</a></p>}{data.hostelEmail && <p><a className="font-semibold text-teal-700 underline" href={`mailto:${data.hostelEmail}`}>{data.hostelEmail}</a></p>}{!data.hostelPhone && !data.hostelEmail && <p>{t("Consulta los datos de contacto de tu reserva.", "Please check your reservation for contact details.")}</p>}</div></GuideBlock><section className="rounded-xl border bg-slate-50 p-5"><h2 className="mb-3 font-bold text-slate-900">{t("Guardar o compartir estas instrucciones", "Save or share these instructions")}</h2><div className="flex flex-col gap-3 sm:flex-row"><Button asChild className="flex-1"><a href={emailHref}><Mail className="mr-2 h-4 w-4" />{t("Enviar por email", "Send by email")}</a></Button><Button asChild variant="outline" className="flex-1"><a href={whatsappHref} target="_blank" rel="noopener noreferrer"><MessageCircle className="mr-2 h-4 w-4" />WhatsApp</a></Button></div></section><p className="pt-2 text-center text-sm text-muted-foreground">{t("Conserva este email y presenta tu documento original si se te solicita.", "Keep this email and present your original ID document if requested.")}</p></CardContent></Card></div>;
}

function GuideBlock({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) { return <section className="rounded-xl border bg-white p-5 text-sm leading-6 text-slate-700"><h2 className="mb-2 flex items-center gap-2 font-bold text-slate-900">{icon}{title}</h2>{children}</section>; }
function Consent({ checked, setChecked, id, prefix, url, linkLabel, suffix }: { checked: boolean; setChecked: (value: boolean) => void; id: string; prefix: string; url?: string; linkLabel: string; suffix: string }) { return <div className="flex items-start gap-3"><Checkbox id={id} checked={checked} onCheckedChange={(value) => setChecked(value === true)} /><Label htmlFor={id} className="cursor-pointer leading-5">{prefix}{url ? <a className="font-semibold underline" href={url} target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()}>{linkLabel}</a> : linkLabel}{suffix}</Label></div>; }
function LanguageSwitch({ lang, setLang }: { lang: Language; setLang: (language: Language) => void }) { return <div className="flex justify-center gap-2"><Button type="button" size="sm" onClick={() => setLang("es")} className={`border-0 bg-gradient-to-r from-red-600 via-yellow-300 to-red-600 font-bold text-slate-950 shadow-sm hover:opacity-90 ${lang === "es" ? "ring-2 ring-slate-900 ring-offset-2" : "opacity-70"}`}>ESPAÑOL</Button><Button type="button" size="sm" onClick={() => setLang("en")} className={`border-0 bg-gradient-to-r from-blue-900 via-white to-red-600 font-bold text-slate-900 shadow-sm hover:opacity-90 ${lang === "en" ? "ring-2 ring-slate-900 ring-offset-2" : "opacity-70"}`}>ENGLISH</Button></div>; }
function Field({ label, children, optional = false }: { label: string; children: React.ReactNode; optional?: boolean }) { return <div className="space-y-2"><Label>{label}{optional ? "" : " *"}</Label>{children}</div>; }
function CountrySelect({ value, lang, countries, onChange }: { value: string; lang: Language; countries: typeof COUNTRIES; onChange: (value: string) => void }) { return <Select value={value} onValueChange={onChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{countries.map((country) => <SelectItem key={country.code} value={country.code}>{lang === "es" ? country.name : country.nameEn}</SelectItem>)}</SelectContent></Select>; }
function CodeBox({ label, code, onCopy, copyLabel }: { label: string; code?: string | null; onCopy: (code?: string | null) => void; copyLabel: string }) { return <div className="rounded-lg border border-teal-200 bg-teal-50 p-4"><p className="font-medium">{label}</p><div className="mt-2 flex items-center justify-between"><code className="text-xl font-bold tracking-[0.2em]">{code || "—"}</code>{code && <Button variant="outline" size="sm" onClick={() => onCopy(code)}><Copy className="mr-2 h-4 w-4" />{copyLabel}</Button>}</div></div>; }

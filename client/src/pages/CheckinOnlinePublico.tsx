import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRoute } from "wouter";
import { CheckCircle2, Copy, Loader2, ShieldCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { COUNTRIES } from "@/lib/countries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type Language = "es" | "en";

export default function CheckinOnlinePublico() {
  const [, params] = useRoute("/checkin-online/:token");
  const token = params?.token || "";
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [lang, setLang] = useState<Language>("es");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [submitted, setSubmitted] = useState<null | { roomNumber: string; roomCode?: string | null; entranceCode?: string | null }>(null);
  const [form, setForm] = useState({
    firstName: "", lastName: "", documentNumber: "", documentSupport: "", documentType: "PAS" as "NIF" | "NIE" | "PAS" | "OTRO",
    gender: "Hombre" as "Hombre" | "Mujer" | "Otro", nationality: "ESP", birthDate: "", documentExpiry: "",
    street: "", addressExtra: "", postalCode: "", city: "", province: "", country: "ESP", phone: "", email: "",
  });

  const { data: invitation, isLoading, error } = trpc.checkin.online.getPublic.useQuery({ token }, { enabled: !!token, retry: false });
  const complete = trpc.checkin.online.completePublic.useMutation();
  const t = (es: string, en: string) => lang === "es" ? es : en;
  const termsUrl = lang === "es" ? invitation?.termsUrlEs : invitation?.termsUrlEn;
  const privacyUrl = lang === "es" ? invitation?.privacyUrlEs : invitation?.privacyUrlEn;
  const welcomeMessage = lang === "es" ? invitation?.welcomeMessageEs : invitation?.welcomeMessageEn;

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

  const pointFromEvent = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = signatureCanvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const point = "touches" in event ? event.touches[0] : event;
    return { x: (point.clientX - rect.left) * (canvas.width / rect.width), y: (point.clientY - rect.top) * (canvas.height / rect.height) };
  };
  const startDrawing = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const context = signatureCanvasRef.current?.getContext("2d");
    if (!context) return;
    const point = pointFromEvent(event);
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
    const point = pointFromEvent(event);
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
      const signature = signatureCanvasRef.current?.toDataURL("image/png") || "";
      const result = await complete.mutateAsync({ ...form, token, signature, acceptedTerms: true, acceptedPrivacy: true });
      setSubmitted(result);
    } catch (submissionError: any) {
      toast.error(submissionError.message || t("No se pudo completar el check-in", "Could not complete the check-in"));
    }
  };

  const copyCode = async (code?: string | null) => {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    toast.success(t("Código copiado", "Code copied"));
  };

  if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-slate-50"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (error || !invitation) return <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4"><Card className="max-w-md"><CardHeader><CardTitle>{t("Enlace no disponible", "Link unavailable")}</CardTitle><CardDescription>{error?.message || t("Este enlace no es válido o ha caducado.", "This link is not valid or has expired.")}</CardDescription></CardHeader></Card></div>;
  if (submitted) return <div className="min-h-screen bg-gradient-to-br from-teal-50 to-sky-100 p-4 sm:p-8"><Card className="mx-auto max-w-xl"><CardHeader className="text-center"><CheckCircle2 className="mx-auto h-16 w-16 text-teal-600" /><CardTitle className="mt-3 text-2xl">{t("¡Check-in completado!", "Check-in completed!")}</CardTitle><CardDescription>{t("Tus códigos de acceso también se han enviado a tu email.", "Your access codes have also been sent to your email.")}</CardDescription></CardHeader><CardContent className="space-y-4"><CodeBox label={t("1. Código de acceso al hostel", "1. Hostel entrance code")} code={submitted.entranceCode} onCopy={copyCode} copyLabel={t("Copiar", "Copy")} /><CodeBox label={t("2. Código de tu habitación", "2. Your room code")} code={submitted.roomCode} onCopy={copyCode} copyLabel={t("Copiar", "Copy")} /><p className="text-center text-sm text-muted-foreground">{t("Conserva este email y presenta tu documento original si se te solicita.", "Keep this email and present your original ID document if requested.")}</p></CardContent></Card></div>;

  return <div className="min-h-screen bg-slate-50 py-6 sm:py-10"><main className="mx-auto max-w-3xl px-4"><Card><CardHeader className="space-y-5"><div className="flex justify-center gap-2"><Button type="button" size="sm" onClick={() => setLang("es")} className={`border-0 bg-gradient-to-r from-red-600 via-yellow-300 to-red-600 font-bold text-slate-950 shadow-sm hover:opacity-90 ${lang === "es" ? "ring-2 ring-slate-900 ring-offset-2" : "opacity-70"}`}>ESPAÑOL</Button><Button type="button" size="sm" onClick={() => setLang("en")} className={`border-0 bg-gradient-to-r from-blue-900 via-white to-red-600 font-bold text-slate-900 shadow-sm hover:opacity-90 ${lang === "en" ? "ring-2 ring-slate-900 ring-offset-2" : "opacity-70"}`}>ENGLISH</Button></div><div className="text-center"><CardTitle className="text-2xl">{invitation.hostelName}</CardTitle><CardDescription>{t("Completa tu check-in online de forma segura", "Complete your online check-in securely")}</CardDescription></div>{welcomeMessage && <div className="rounded-md border border-primary/20 bg-primary/5 p-4 text-sm whitespace-pre-line">{welcomeMessage}</div>}<div className="rounded-md bg-muted p-3 text-sm"><strong>{t("Reserva:", "Booking:")}</strong> {invitation.reservationNumber || "—"} · <strong>{t("Llegada:", "Arrival:")}</strong> {invitation.checkInDate} · <strong>{t("Salida:", "Departure:")}</strong> {invitation.checkOutDate}</div></CardHeader><CardContent><form onSubmit={submit} className="space-y-7"><section className="space-y-4"><h2 className="font-semibold">{t("Datos personales", "Personal details")}</h2><div className="grid gap-4 sm:grid-cols-2"><Field label={t("Nombre", "First name")}><Input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></Field><Field label={t("Apellidos", "Last name")}><Input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></Field><Field label={t("Nacionalidad", "Nationality")}><CountrySelect value={form.nationality} onValueChange={(value) => setForm({ ...form, nationality: value })} /></Field><Field label={t("Sexo", "Gender")}><Select value={form.gender} onValueChange={(value: typeof form.gender) => setForm({ ...form, gender: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Hombre">{t("Hombre", "Male")}</SelectItem><SelectItem value="Mujer">{t("Mujer", "Female")}</SelectItem><SelectItem value="Otro">{t("Otro", "Other")}</SelectItem></SelectContent></Select></Field><Field label={t("Tipo de documento", "Document type")}><Select value={form.documentType} onValueChange={(value: typeof form.documentType) => setForm({ ...form, documentType: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="NIF">DNI/NIF</SelectItem><SelectItem value="NIE">NIE</SelectItem><SelectItem value="PAS">{t("Pasaporte", "Passport")}</SelectItem><SelectItem value="OTRO">{t("Otro", "Other")}</SelectItem></SelectContent></Select></Field><Field label={t("Número de documento", "Document number")}><Input required value={form.documentNumber} onChange={(e) => setForm({ ...form, documentNumber: e.target.value })} /></Field>{form.documentType === "NIF" && form.nationality === "ESP" && <Field label={t("Número de soporte (frontal del DNI)", "Support number (front of Spanish ID)")}><Input required value={form.documentSupport} onChange={(e) => setForm({ ...form, documentSupport: e.target.value })} /></Field>}<Field label={t("Fecha de nacimiento", "Date of birth")}><Input required type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} /></Field><Field label={t("Caducidad del documento", "Document expiry")} optional><Input type="date" value={form.documentExpiry} onChange={(e) => setForm({ ...form, documentExpiry: e.target.value })} /></Field><Field label={t("Teléfono", "Phone")}><Input required type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field><Field label="Email"><Input required readOnly className="bg-muted" value={form.email} /></Field></div></section><section className="space-y-4"><h2 className="font-semibold">{t("Dirección", "Address")}</h2><div className="grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><Field label={t("Dirección", "Street address")}><Input required value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} /></Field></div><div className="sm:col-span-2"><Field label={t("Complemento", "Address line 2")} optional><Input value={form.addressExtra} onChange={(e) => setForm({ ...form, addressExtra: e.target.value })} /></Field></div><Field label={t("Código postal", "Postal code")}><Input required value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} /></Field><Field label={t("Ciudad", "City")}><Input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field><Field label={t("Provincia", "Province")} optional><Input value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} /></Field><Field label={t("País", "Country")}><CountrySelect value={form.country} onValueChange={(value) => setForm({ ...form, country: value })} /></Field></div></section><section className="space-y-3"><h2 className="font-semibold">{t("Firma", "Signature")}</h2><p className="text-sm text-muted-foreground">{t("Firma dentro del recuadro con el dedo o el ratón.", "Sign inside the box using your finger or mouse.")}</p><canvas ref={signatureCanvasRef} width={900} height={260} className="h-40 w-full touch-none rounded-md border bg-white" onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={() => setIsDrawing(false)} onMouseLeave={() => setIsDrawing(false)} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={() => setIsDrawing(false)} /><Button type="button" variant="outline" size="sm" onClick={clearSignature}>{t("Borrar firma", "Clear signature")}</Button></section><section className="space-y-3 rounded-lg bg-muted/50 p-4"><div className="flex items-start gap-3"><Checkbox id="terms-online" checked={acceptedTerms} onCheckedChange={(value) => setAcceptedTerms(value === true)} /><Label htmlFor="terms-online" className="cursor-pointer leading-5">{t("Acepto las ", "I accept the ")}{termsUrl ? <a className="font-semibold underline" href={termsUrl} target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()}>{t("condiciones del establecimiento", "establishment terms")}</a> : t("condiciones del establecimiento", "establishment terms")}{t(" y confirmo que los datos facilitados son correctos.", " and confirm that the information provided is correct.")}</Label></div><div className="flex items-start gap-3"><Checkbox id="privacy-online" checked={acceptedPrivacy} onCheckedChange={(value) => setAcceptedPrivacy(value === true)} /><Label htmlFor="privacy-online" className="cursor-pointer leading-5">{t("Acepto la ", "I accept the ")}{privacyUrl ? <a className="font-semibold underline" href={privacyUrl} target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()}>{t("política de privacidad", "privacy policy")}</a> : t("política de privacidad", "privacy policy")}{t(" y el tratamiento de mis datos para el registro de huéspedes.", " and the processing of my data for guest registration.")}</Label></div></section><Button type="submit" className="w-full" disabled={complete.isPending}>{complete.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}{t("Completar check-in y recibir códigos", "Complete check-in and receive codes")}</Button></form></CardContent></Card></main></div>;
}

function Field({ label, children, optional = false }: { label: string; children: ReactNode; optional?: boolean }) { return <div className="space-y-2"><Label>{label}{optional ? "" : " *"}</Label>{children}</div>; }
function CountrySelect({ value, onValueChange }: { value: string; onValueChange: (value: string) => void }) { return <Select value={value} onValueChange={onValueChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{COUNTRIES.map((country, index) => <SelectItem key={`${country.code}-${country.name}-${index}`} value={country.code}>{country.name}</SelectItem>)}</SelectContent></Select>; }
function CodeBox({ label, code, onCopy, copyLabel }: { label: string; code?: string | null; onCopy: (code?: string | null) => void; copyLabel: string }) { if (!code) return null; return <div className="rounded-lg border border-teal-200 bg-teal-50 p-4"><p className="font-medium">{label}</p><div className="mt-2 flex items-center justify-between"><code className="text-xl font-bold tracking-[0.2em]">{code}</code><Button variant="outline" size="sm" onClick={() => onCopy(code)}><Copy className="mr-2 h-4 w-4" />{copyLabel}</Button></div></div>; }

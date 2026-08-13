import { useEffect, useRef, useState } from "react";
import { useRoute } from "wouter";
import { CheckCircle2, Copy, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { COUNTRIES } from "@/lib/countries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type Language = "es" | "en";

export default function CheckinOnlinePublico() {
  const [, params] = useRoute("/checkin-online/:token");
  const token = params?.token || "";
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [submitted, setSubmitted] = useState<null | { roomNumber: string; roomCode?: string | null; entranceCode?: string | null; checkInDate: string }>(null);
  const [lang, setLang] = useState<Language>("es");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [form, setForm] = useState({
    firstName: "", lastName: "", documentNumber: "", documentSupport: "", documentType: "PAS" as "NIF" | "NIE" | "PAS" | "OTRO",
    gender: "Hombre" as "Hombre" | "Mujer" | "Otro", nationality: "ESP", birthDate: "", documentExpiry: "",
    street: "", addressExtra: "", postalCode: "", city: "", province: "", country: "ESP", phone: "", email: "",
  });

  const { data: invitation, isLoading, error } = trpc.checkin.online.getPublic.useQuery({ token }, { enabled: !!token, retry: false });
  const complete = trpc.checkin.online.completePublic.useMutation();

  useEffect(() => {
    if (invitation) {
      setLang(invitation.language as Language);
      setForm((current) => ({ ...current, email: invitation.email }));
    }
  }, [invitation]);

  useEffect(() => {
    const canvas = signatureCanvasRef.current;
    const context = canvas?.getContext("2d");
    if (context) {
      context.strokeStyle = "#111827";
      context.lineWidth = 2;
      context.lineCap = "round";
      context.lineJoin = "round";
    }
  }, []);

  const t = (es: string, en: string) => lang === "es" ? es : en;
  const getPoint = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = signatureCanvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const point = "touches" in event ? event.touches[0] : event;
    return { x: (point.clientX - rect.left) * (canvas.width / rect.width), y: (point.clientY - rect.top) * (canvas.height / rect.height) };
  };
  const startDrawing = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const canvas = signatureCanvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const point = getPoint(event);
    context.beginPath(); context.moveTo(point.x, point.y);
    setIsDrawing(true); setHasSignature(true);
  };
  const draw = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    event.preventDefault();
    const context = signatureCanvasRef.current?.getContext("2d");
    if (!context) return;
    const point = getPoint(event); context.lineTo(point.x, point.y); context.stroke();
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
  if (submitted) return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-sky-100 p-4 sm:p-8"><Card className="mx-auto max-w-xl"><CardHeader className="text-center"><CheckCircle2 className="mx-auto h-16 w-16 text-teal-600" /><CardTitle className="mt-3 text-2xl">{t("¡Check-in completado!", "Check-in completed!")}</CardTitle><CardDescription>{t("Tus códigos de acceso también se han enviado a tu email.", "Your access codes have also been sent to your email.")}</CardDescription></CardHeader><CardContent className="space-y-4"><div className="rounded-lg bg-white p-4 text-center shadow-sm"><p className="text-sm text-muted-foreground">{t("Habitación", "Room")}</p><p className="text-2xl font-bold">{submitted.roomNumber}</p></div>{submitted.entranceCode && <div className="rounded-lg border border-teal-200 bg-teal-50 p-4"><p className="font-medium">{t("Código de entrada al hostel", "Hostel entrance code")}</p><div className="mt-2 flex items-center justify-between"><code className="text-xl font-bold tracking-[0.2em]">{submitted.entranceCode}</code><Button variant="outline" size="sm" onClick={() => copyCode(submitted.entranceCode)}><Copy className="mr-2 h-4 w-4" />{t("Copiar", "Copy")}</Button></div></div>}{submitted.roomCode && <div className="rounded-lg border border-teal-200 bg-teal-50 p-4"><p className="font-medium">{t("Código de tu habitación", "Your room code")}</p><div className="mt-2 flex items-center justify-between"><code className="text-xl font-bold tracking-[0.2em]">{submitted.roomCode}</code><Button variant="outline" size="sm" onClick={() => copyCode(submitted.roomCode)}><Copy className="mr-2 h-4 w-4" />{t("Copiar", "Copy")}</Button></div></div>}<p className="text-center text-sm text-muted-foreground">{t("Conserva este email y presenta tu documento original si se te solicita.", "Keep this email and present your original ID document if requested.")}</p></CardContent></Card></div>
  );

  return (
    <div className="min-h-screen bg-slate-50 py-6 sm:py-10"><main className="mx-auto max-w-3xl px-4"><Card><CardHeader><div className="flex items-start justify-between gap-4"><div><CardTitle className="text-2xl">The Spot Central Hostel</CardTitle><CardDescription>{t("Completa tu check-in online de forma segura", "Complete your online check-in securely")}</CardDescription></div><Button variant="outline" size="sm" onClick={() => setLang(lang === "es" ? "en" : "es")}>{lang === "es" ? "English" : "Español"}</Button></div><div className="mt-3 rounded-md bg-muted p-3 text-sm"><strong>{t("Reserva:", "Booking:")}</strong> {invitation.reservationNumber || "—"} · <strong>{t("Llegada:", "Arrival:")}</strong> {invitation.checkInDate} · <strong>{t("Salida:", "Departure:")}</strong> {invitation.checkOutDate}</div></CardHeader><CardContent><form onSubmit={submit} className="space-y-7"><section className="space-y-4"><h2 className="font-semibold">{t("Datos personales", "Personal details")}</h2><div className="grid gap-4 sm:grid-cols-2"><Field label={t("Nombre", "First name")}><Input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></Field><Field label={t("Apellidos", "Last name")}><Input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></Field><Field label={t("Nacionalidad", "Nationality")}><Select value={form.nationality} onValueChange={(value) => setForm({ ...form, nationality: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{COUNTRIES.map((country) => <SelectItem key={country.code} value={country.code}>{country.name}</SelectItem>)}</SelectContent></Select></Field><Field label={t("Sexo", "Gender")}><Select value={form.gender} onValueChange={(value: typeof form.gender) => setForm({ ...form, gender: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Hombre">{t("Hombre", "Male")}</SelectItem><SelectItem value="Mujer">{t("Mujer", "Female")}</SelectItem><SelectItem value="Otro">{t("Otro", "Other")}</SelectItem></SelectContent></Select></Field><Field label={t("Tipo de documento", "Document type")}><Select value={form.documentType} onValueChange={(value: typeof form.documentType) => setForm({ ...form, documentType: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="NIF">DNI/NIF</SelectItem><SelectItem value="NIE">NIE</SelectItem><SelectItem value="PAS">{t("Pasaporte", "Passport")}</SelectItem><SelectItem value="OTRO">{t("Otro", "Other")}</SelectItem></SelectContent></Select></Field><Field label={t("Número de documento", "Document number")}><Input required value={form.documentNumber} onChange={(e) => setForm({ ...form, documentNumber: e.target.value })} /></Field>{form.documentType === "NIF" && form.nationality === "ESP" && <Field label={t("Número de soporte (frontal del DNI)", "Support number (front of Spanish ID)")}><Input required value={form.documentSupport} onChange={(e) => setForm({ ...form, documentSupport: e.target.value })} /></Field>}<Field label={t("Fecha de nacimiento", "Date of birth")}><Input required type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} /></Field><Field label={t("Caducidad del documento", "Document expiry")}><Input type="date" value={form.documentExpiry} onChange={(e) => setForm({ ...form, documentExpiry: e.target.value })} /></Field><Field label={t("Teléfono", "Phone")}><Input required type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field><Field label="Email"><Input required readOnly className="bg-muted" value={form.email} /></Field></div></section><section className="space-y-4"><h2 className="font-semibold">{t("Dirección", "Address")}</h2><div className="grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><Field label={t("Dirección", "Street address")}><Input required value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} /></Field></div><div className="sm:col-span-2"><Field label={t("Complemento", "Address line 2")}><Input value={form.addressExtra} onChange={(e) => setForm({ ...form, addressExtra: e.target.value })} /></Field></div><Field label={t("Código postal", "Postal code")}><Input required value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} /></Field><Field label={t("Ciudad", "City")}><Input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field><Field label={t("Provincia", "Province")}><Input value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} /></Field><Field label={t("País", "Country")}><Select value={form.country} onValueChange={(value) => setForm({ ...form, country: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{COUNTRIES.map((country) => <SelectItem key={country.code} value={country.code}>{country.name}</SelectItem>)}</SelectContent></Select></Field></div></section><section className="space-y-3"><h2 className="font-semibold">{t("Firma", "Signature")}</h2><p className="text-sm text-muted-foreground">{t("Firma dentro del recuadro con el dedo o el ratón.", "Sign inside the box using your finger or mouse.")}</p><canvas ref={signatureCanvasRef} width={900} height={260} className="h-40 w-full touch-none rounded-md border bg-white" onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={() => setIsDrawing(false)} onMouseLeave={() => setIsDrawing(false)} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={() => setIsDrawing(false)} /><Button type="button" variant="outline" size="sm" onClick={clearSignature}>{t("Borrar firma", "Clear signature")}</Button></section><section className="space-y-3 rounded-lg bg-muted/50 p-4"><div className="flex items-start gap-3"><Checkbox id="terms-online" checked={acceptedTerms} onCheckedChange={(value) => setAcceptedTerms(value === true)} /><Label htmlFor="terms-online" className="cursor-pointer leading-5">{t("Acepto las condiciones del establecimiento y confirmo que los datos facilitados son correctos.", "I accept the establishment terms and confirm that the information provided is correct.")}</Label></div><div className="flex items-start gap-3"><Checkbox id="privacy-online" checked={acceptedPrivacy} onCheckedChange={(value) => setAcceptedPrivacy(value === true)} /><Label htmlFor="privacy-online" className="cursor-pointer leading-5">{t("Acepto la política de privacidad y el tratamiento de mis datos para el registro de huéspedes.", "I accept the privacy policy and the processing of my data for guest registration.")}</Label></div></section><Button type="submit" className="w-full" disabled={complete.isPending}>{complete.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}{t("Completar check-in y recibir códigos", "Complete check-in and receive codes")}</Button></form></CardContent></Card></main></div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label} *</Label>{children}</div>;
}

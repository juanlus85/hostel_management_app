import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, Camera, CheckCircle2, FileScan, Globe2, Loader2, Plus, Save, ShieldCheck, Signature, Trash2, UserRound, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { COUNTRIES } from "@/lib/countries";
import { mergeRecognizedDocumentFields } from "@shared/documentRecognition";
import { requiresDocumentSupport as requiresDocumentSupportForNationality } from "@shared/documentSupport";
import { isAllowedDocumentType } from "@shared/countries";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type Language = "es" | "en";
type DocumentSide = "front" | "back";
type GuestForm = {
  firstName: string; lastName: string; documentType: "NIF" | "NIE" | "CAR" | "ID" | "PAS" | "OTRO"; documentNumber: string; documentSupport: string;
  nationality: string; gender: "Hombre" | "Mujer" | "Otro"; birthDate: string; documentExpiry: string; street: string; addressExtra: string;
  postalCode: string; city: string; province: string; country: string; phone: string; email: string; acceptedTerms: boolean; acceptedPrivacy: boolean;
};

const blankGuest = (): GuestForm => ({ firstName: "", lastName: "", documentType: "PAS", documentNumber: "", documentSupport: "", nationality: "ESP", gender: "Hombre", birthDate: "", documentExpiry: "", street: "", addressExtra: "", postalCode: "", city: "", province: "", country: "ESP", phone: "", email: "", acceptedTerms: false, acceptedPrivacy: false });
const normalizeGuestDocumentSupport = (guest: GuestForm): GuestForm => {
  const documentType = isAllowedDocumentType(guest.nationality, guest.documentType) ? guest.documentType : "PAS";
  const normalizedGuest = { ...guest, documentType };
  return requiresDocumentSupportForNationality(documentType, normalizedGuest.nationality) ? normalizedGuest : { ...normalizedGuest, documentSupport: "" };
};

export default function TabletRegistroPolicia() {
  const [lang, setLang] = useState<Language>("es");
  const [guests, setGuests] = useState<GuestForm[]>([blankGuest()]);
  const [signed, setSigned] = useState<boolean[]>([false]);
  const [drawingIndex, setDrawingIndex] = useState<number | null>(null);
  const canvasRefs = useRef<Array<HTMLCanvasElement | null>>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraIndex, setCameraIndex] = useState<number | null>(null);
  const [cameraSide, setCameraSide] = useState<DocumentSide>("front");
  const [documentSides, setDocumentSides] = useState<Array<{ front: boolean; back: boolean }>>([{ front: false, back: false }]);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [completed, setCompleted] = useState<number | null>(null);
  const { data: legalSettings } = trpc.checkin.tablet.getLegalSettings.useQuery();
  const registerGroup = trpc.checkin.tablet.registerGroup.useMutation({
    onSuccess: (result) => {
      setCompleted(result.guestIds.length);
      setGuests([blankGuest()]);
      setSigned([false]);
      canvasRefs.current = [];
    },
    onError: (error) => toast.error(error.message || t(lang, "No se pudo guardar el registro", "The registration could not be saved")),
  });
  const scanDocument = trpc.checkin.tablet.scanDocument.useMutation();
  const termsUrl = lang === "es" ? legalSettings?.termsUrlEs : legalSettings?.termsUrlEn;
  const privacyUrl = lang === "es" ? legalSettings?.privacyUrlEs : legalSettings?.privacyUrlEn;
  const countries = useMemo(() => [...COUNTRIES].sort((a, b) => (lang === "es" ? a.name : a.nameEn).localeCompare(lang === "es" ? b.name : b.nameEn)), [lang]);

  useEffect(() => {
    if (cameraStream && videoRef.current) videoRef.current.srcObject = cameraStream;
  }, [cameraStream]);
  useEffect(() => () => cameraStream?.getTracks().forEach((track) => track.stop()), [cameraStream]);
  useEffect(() => {
    const lastCanvas = [...canvasRefs.current].filter(Boolean).at(-1);
    const guestCards = lastCanvas?.closest(".overflow-hidden")?.parentElement;
    if (!guestCards) return;
    const existing = guestCards.querySelector<HTMLButtonElement>("[data-tablet-add-guest-footer]");
    const button = existing || document.createElement("button");
    button.dataset.tabletAddGuestFooter = "true";
    button.type = "button";
    button.className = "flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#6fc6ce] bg-white px-5 py-4 text-sm font-semibold text-[#0d6570] transition hover:border-[#147c89] hover:bg-[#f0fbfc]";
    button.innerHTML = `<span aria-hidden="true" style="font-size:1.25rem;line-height:1">＋</span>${lang === "es" ? "Añadir otro huésped a esta reserva" : "Add another guest to this reservation"}`;
    button.onclick = () => {
      setGuests((current) => [...current, blankGuest()]);
      setSigned((current) => [...current, false]);
      setDocumentSides((current) => [...current, { front: false, back: false }]);
      window.setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }), 50);
    };
    if (!existing) guestCards.appendChild(button);
    return () => { button.onclick = null; };
  }, [guests.length, lang]);

  const updateGuest = (index: number, patch: Partial<GuestForm>) => setGuests((current) => current.map((guest, guestIndex) => guestIndex === index ? normalizeGuestDocumentSupport({ ...guest, ...patch }) : guest));
  const addGuest = () => { setGuests((current) => [...current, blankGuest()]); setSigned((current) => [...current, false]); setDocumentSides((current) => [...current, { front: false, back: false }]); };
  const removeGuest = (index: number) => { setGuests((current) => current.filter((_, guestIndex) => guestIndex !== index)); setSigned((current) => current.filter((_, guestIndex) => guestIndex !== index)); setDocumentSides((current) => current.filter((_, guestIndex) => guestIndex !== index)); canvasRefs.current.splice(index, 1); };
  const closeCamera = () => { cameraStream?.getTracks().forEach((track) => track.stop()); setCameraStream(null); setCameraIndex(null); };
  const openCamera = async (index: number) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      const side = documentSides[index]?.front ? "back" : "front";
      setCameraSide(side);
      setCameraIndex(index);
      setCameraStream(stream);
      toast.info(side === "front" ? t(lang, "Vas a capturar el anverso del documento.", "You are about to capture the front side of the document.") : t(lang, "Vas a capturar el reverso del documento.", "You are about to capture the reverse side of the document."));
    } catch {
      toast.error(t(lang, "No se pudo abrir la cámara. Comprueba los permisos del navegador.", "The camera could not be opened. Check browser permissions."));
    }
  };
  const scanImage = async (index: number, side: DocumentSide, imageData: string) => {
    try {
      const result = await scanDocument.mutateAsync({ imageData, contentType: "image/jpeg" });
      const fields = result.fields as Partial<GuestForm>;
      const documentType = ["NIF", "NIE", "CAR", "ID", "PAS", "OTRO"].includes(fields.documentType || "") ? fields.documentType as GuestForm["documentType"] : undefined;
      const gender = ["Hombre", "Mujer", "Otro"].includes(fields.gender || "") ? fields.gender as GuestForm["gender"] : undefined;
      setGuests((current) => current.map((guest, guestIndex) => guestIndex === index ? normalizeGuestDocumentSupport(mergeRecognizedDocumentFields(guest, { ...fields, documentType, gender })) : guest));
      setDocumentSides((current) => current.map((sides, guestIndex) => guestIndex === index ? { ...sides, [side]: true } : sides));
      toast.success(side === "front" ? t(lang, "Anverso procesado. Puedes escanear ahora el reverso para completar los datos.", "Front side processed. You can now scan the reverse side to complete the details.") : t(lang, "Reverso procesado. Revisa los datos antes de continuar.", "Reverse side processed. Review the details before continuing."));
    } catch (error: any) { toast.error(error.message || t(lang, "No se pudo leer el documento", "The document could not be read")); }
  };
  const captureDocument = async () => {
    if (cameraIndex === null || !videoRef.current || !videoRef.current.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    const imageData = canvas.toDataURL("image/jpeg", 0.9);
    const index = cameraIndex;
    const side = cameraSide;
    closeCamera();
    await scanImage(index, side, imageData);
  };
  const point = (canvas: HTMLCanvasElement, event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * (canvas.width / rect.width), y: (event.clientY - rect.top) * (canvas.height / rect.height) };
  };
  const startSignature = (index: number, event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget; const context = canvas.getContext("2d"); if (!context) return;
    const current = point(canvas, event); context.strokeStyle = "#0f172a"; context.lineWidth = 2.5; context.lineCap = "round"; context.beginPath(); context.moveTo(current.x, current.y);
    canvas.setPointerCapture(event.pointerId); setDrawingIndex(index); setSigned((currentSigned) => currentSigned.map((value, signedIndex) => signedIndex === index ? true : value));
  };
  const drawSignature = (index: number, event: React.PointerEvent<HTMLCanvasElement>) => {
    if (drawingIndex !== index) return; const context = event.currentTarget.getContext("2d"); if (!context) return;
    const current = point(event.currentTarget, event); context.lineTo(current.x, current.y); context.stroke();
  };
  const clearSignature = (index: number) => { const canvas = canvasRefs.current[index]; canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height); setSigned((current) => current.map((value, signedIndex) => signedIndex === index ? false : value)); };
  const submit = () => {
    if (!termsUrl || !privacyUrl) return toast.error(t(lang, "Faltan los enlaces legales. Pide a recepción que los configure antes de continuar.", "Legal links are missing. Ask reception to configure them before continuing."));
    if (signed.some((value) => !value)) return toast.error(t(lang, "Cada huésped debe firmar antes de continuar.", "Every guest must sign before continuing."));
    if (guests.some((guest) => !guest.acceptedTerms || !guest.acceptedPrivacy)) return toast.error(t(lang, "Cada huésped debe aceptar las condiciones y la privacidad.", "Every guest must accept the terms and privacy policy."));
    if (guests.some((guest) => requiresDocumentSupportForNationality(guest.documentType, guest.nationality) && !guest.documentSupport.trim())) return toast.error(t(lang, "El número de soporte es obligatorio para DNI/NIF y NIE europeo", "The support number is required for Spanish ID and European NIE"));
    const payload = guests.map((guest, index) => ({ ...guest, documentSupport: requiresDocumentSupportForNationality(guest.documentType, guest.nationality) ? guest.documentSupport : "", signature: canvasRefs.current[index]?.toDataURL("image/png") || "", acceptedTerms: true as const, acceptedPrivacy: true as const }));
    registerGroup.mutate({ language: lang, guests: payload });
  };

  if (completed !== null) return <SuccessScreen count={completed} lang={lang} restart={() => setCompleted(null)} />;
  return <main className="min-h-screen bg-[#f5f7f8] text-slate-900"><header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#113b59] text-white shadow-sm"><Building2 className="h-6 w-6" /></div><div><p className="font-serif text-lg font-bold leading-tight text-[#113b59]">The Spot Central Hostel</p><p className="text-xs tracking-[0.12em] text-slate-500">SEVILLA · GUEST REGISTRATION</p></div></div><LanguageSwitch lang={lang} setLang={setLang} /></div></header><section className="border-b bg-[radial-gradient(circle_at_top_left,_#dceef2,_#f8fafc_58%)]"><div className="mx-auto max-w-6xl px-5 py-10 sm:px-8"><p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-[#147c89]">{t(lang, "Registro obligatorio de viajeros", "Mandatory guest registration")}</p><h1 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">{t(lang, "Completa tus datos de forma segura", "Complete your details securely")}</h1><p className="mt-3 max-w-2xl text-base text-slate-600">{t(lang, "Cada huésped debe rellenar sus propios datos, leer las condiciones, aceptar la privacidad y firmar antes de enviar el registro.", "Each guest must complete their own details, read the terms, accept the privacy policy and sign before submitting the registration.")}</p></div></section><div className="mx-auto max-w-6xl px-5 py-7 sm:px-8"><div className="mb-6 rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-950"><ShieldCheck className="mr-2 inline h-4 w-4" /><strong>{t(lang, "Tu privacidad:", "Your privacy:")}</strong> {t(lang, "la foto del documento se utiliza únicamente para rellenar los campos automáticamente; no se guarda en esta aplicación ni en tu registro.", "the document photo is used only to pre-fill the form; it is not stored in this application or in your guest record.")}</div><div className="mb-5 flex items-end justify-between gap-4"><div><h2 className="text-xl font-bold">{t(lang, "Huéspedes", "Guests")} <span className="text-slate-400">({guests.length})</span></h2><p className="text-sm text-slate-500">{t(lang, "Puedes añadir a todas las personas de tu grupo.", "You can add every person in your group.")}</p></div><Button type="button" variant="outline" className="border-[#147c89] text-[#0c6773]" onClick={addGuest}><Plus className="mr-2 h-4 w-4" />{t(lang, "Añadir huésped", "Add guest")}</Button></div><div className="space-y-6">{guests.map((guest, index) => <GuestCard key={index} index={index} guest={guest} lang={lang} countries={countries} termsUrl={termsUrl} privacyUrl={privacyUrl} scanning={scanDocument.isPending && cameraIndex === index} signed={signed[index]} canRemove={guests.length > 1} update={(patch) => updateGuest(index, patch)} remove={() => removeGuest(index)} openCamera={() => openCamera(index)} signatureRef={(canvas) => { canvasRefs.current[index] = canvas; }} startSignature={(event) => startSignature(index, event)} drawSignature={(event) => drawSignature(index, event)} stopSignature={() => setDrawingIndex(null)} clearSignature={() => clearSignature(index)} />)}</div><div className="mt-7 flex justify-end"><Button size="lg" className="min-w-60 bg-[#147c89] hover:bg-[#0d6570]" disabled={registerGroup.isPending} onClick={submit}>{registerGroup.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}{t(lang, "Enviar registro", "Submit registration")}</Button></div></div>{cameraIndex !== null && <CameraPanel videoRef={videoRef} close={closeCamera} capture={captureDocument} lang={lang} />}</main>;
}

function GuestCard({ index, guest, lang, countries, termsUrl, privacyUrl, scanning, signed, canRemove, update, remove, openCamera, signatureRef, startSignature, drawSignature, stopSignature, clearSignature }: { index: number; guest: GuestForm; lang: Language; countries: typeof COUNTRIES; termsUrl?: string; privacyUrl?: string; scanning: boolean; signed: boolean; canRemove: boolean; update: (patch: Partial<GuestForm>) => void; remove: () => void; openCamera: () => void; signatureRef: (canvas: HTMLCanvasElement | null) => void; startSignature: (event: React.PointerEvent<HTMLCanvasElement>) => void; drawSignature: (event: React.PointerEvent<HTMLCanvasElement>) => void; stopSignature: () => void; clearSignature: () => void; }) {
  const requiresDocumentSupport = (documentType: string) => requiresDocumentSupportForNationality(documentType, guest.nationality);
  return <Card className="overflow-hidden border-slate-200 shadow-sm"><div className="flex items-center justify-between border-b bg-white px-5 py-4"><div className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e0f2f3] text-sm font-bold text-[#147c89]">{index + 1}</div><div><h3 className="font-bold">{t(lang, "Datos del huésped", "Guest details")}</h3><p className="text-xs text-slate-500">{index === 0 ? t(lang, "Huésped principal", "Main guest") : t(lang, "Acompañante", "Additional guest")}</p></div></div>{canRemove && <Button type="button" size="icon" variant="ghost" onClick={remove} aria-label={t(lang, "Eliminar huésped", "Remove guest")}><Trash2 className="h-4 w-4 text-rose-600" /></Button>}</div><CardContent className="space-y-7 p-5 sm:p-7"><div className="rounded-xl border border-dashed border-[#6fc6ce] bg-[#f0fbfc] p-4 sm:flex sm:items-center sm:justify-between"><div><p className="font-semibold text-[#0d6570]"><FileScan className="mr-2 inline h-5 w-5" />{t(lang, "¿Quieres ahorrar tiempo?", "Want to save time?")}</p><p className="mt-1 text-sm text-slate-600">{t(lang, "Escanea tu documento y revisa los datos antes de continuar.", "Scan your document and review the details before continuing.")}</p></div><Button type="button" className="mt-3 bg-[#147c89] hover:bg-[#0d6570] sm:mt-0" disabled={scanning} onClick={openCamera}>{scanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}{t(lang, "Escanear documento", "Scan document")}</Button></div><section><SectionTitle icon={<UserRound className="h-5 w-5" />} title={t(lang, "Identificación", "Identification")} /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Field label={t(lang, "Nombre", "First name")}><Input required value={guest.firstName} onChange={(event) => update({ firstName: event.target.value })} /></Field><Field label={t(lang, "Apellidos", "Last name")}><Input required value={guest.lastName} onChange={(event) => update({ lastName: event.target.value })} /></Field><Field label={t(lang, "Nacionalidad", "Country of nationality")}><CountrySelect value={guest.nationality} lang={lang} countries={countries} onChange={(value) => update({ nationality: value })} /></Field><Field label={t(lang, "Sexo", "Gender")}><Select value={guest.gender} onValueChange={(value) => update({ gender: value as GuestForm["gender"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Hombre">{t(lang, "Hombre", "Male")}</SelectItem><SelectItem value="Mujer">{t(lang, "Mujer", "Female")}</SelectItem><SelectItem value="Otro">{t(lang, "Otro", "Other")}</SelectItem></SelectContent></Select></Field><Field label={t(lang, "Tipo de documento", "Document type")}><Select value={guest.documentType} onValueChange={(value) => update({ documentType: value as GuestForm["documentType"], documentSupport: requiresDocumentSupport(value) ? guest.documentSupport : "" })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="NIF">DNI / NIF</SelectItem><SelectItem value="NIE">NIE</SelectItem><SelectItem value="PAS">{t(lang, "Pasaporte", "Passport")}</SelectItem><SelectItem value="OTRO">{t(lang, "Otro documento", "Other ID")}</SelectItem></SelectContent></Select></Field><Field label={t(lang, "Número de documento", "Document number")}><Input required value={guest.documentNumber} onChange={(event) => update({ documentNumber: event.target.value })} /></Field>{requiresDocumentSupport(guest.documentType) && <Field label={t(lang, "Número de soporte", "Support number")}><Input required value={guest.documentSupport} onChange={(event) => update({ documentSupport: event.target.value })} /></Field>}<Field label={t(lang, "Fecha de nacimiento", "Date of birth")}><Input required type="date" value={guest.birthDate} onChange={(event) => update({ birthDate: event.target.value })} /></Field><Field label={t(lang, "Caducidad", "Expiry date")} optional><Input type="date" value={guest.documentExpiry} onChange={(event) => update({ documentExpiry: event.target.value })} /></Field></div></section><section><SectionTitle icon={<Globe2 className="h-5 w-5" />} title={t(lang, "Dirección y contacto", "Address and contact")} /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><div className="sm:col-span-2 lg:col-span-3"><Field label={t(lang, "Dirección", "Street address")}><Input required value={guest.street} onChange={(event) => update({ street: event.target.value })} /></Field></div><Field label={t(lang, "Código postal", "Postal code")}><Input required value={guest.postalCode} onChange={(event) => update({ postalCode: event.target.value })} /></Field><Field label={t(lang, "Ciudad", "City")}><Input required value={guest.city} onChange={(event) => update({ city: event.target.value })} /></Field><Field label={t(lang, "Provincia", "Province")} optional><Input value={guest.province} onChange={(event) => update({ province: event.target.value })} /></Field><Field label={t(lang, "País", "Country")}><CountrySelect value={guest.country} lang={lang} countries={countries} onChange={(value) => update({ country: value })} /></Field><Field label={t(lang, "Teléfono", "Phone")}><Input required type="tel" value={guest.phone} onChange={(event) => update({ phone: event.target.value })} /></Field><Field label="Email"><Input required type="email" value={guest.email} onChange={(event) => update({ email: event.target.value })} /></Field></div></section><section><SectionTitle icon={<Signature className="h-5 w-5" />} title={t(lang, "Firma", "Signature")} /><p className="mb-3 text-sm text-slate-600">{t(lang, "Firma dentro del recuadro con el dedo o el ratón.", "Sign in the box using your finger or mouse.")}</p><canvas ref={signatureRef} width={900} height={240} className="h-36 w-full touch-none rounded-lg border border-slate-300 bg-white" onPointerDown={startSignature} onPointerMove={drawSignature} onPointerUp={stopSignature} onPointerLeave={stopSignature} /><div className="mt-2 flex items-center gap-3"><Button type="button" size="sm" variant="outline" onClick={clearSignature}>{t(lang, "Borrar firma", "Clear signature")}</Button>{signed && <span className="text-sm text-emerald-700"><CheckCircle2 className="mr-1 inline h-4 w-4" />{t(lang, "Firma añadida", "Signature added")}</span>}</div></section><section className="space-y-3 rounded-xl bg-slate-50 p-4"><label className="flex cursor-pointer items-start gap-3 text-sm leading-5"><Checkbox checked={guest.acceptedTerms} onCheckedChange={(value) => update({ acceptedTerms: value === true })} /><span>{t(lang, "He leído y acepto las ", "I have read and accept the ")}{termsUrl ? <a href={termsUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#0d6570] underline" onClick={(event) => event.stopPropagation()}>{t(lang, "condiciones del establecimiento", "establishment terms")}</a> : <strong>{t(lang, "condiciones del establecimiento", "establishment terms")}</strong>}{t(lang, ". Confirmo que los datos que he rellenado son correctos.", ". I confirm that the information I have provided is correct.")}</span></label><label className="flex cursor-pointer items-start gap-3 text-sm leading-5"><Checkbox checked={guest.acceptedPrivacy} onCheckedChange={(value) => update({ acceptedPrivacy: value === true })} /><span>{t(lang, "He leído y acepto la ", "I have read and accept the ")}{privacyUrl ? <a href={privacyUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#0d6570] underline" onClick={(event) => event.stopPropagation()}>{t(lang, "política de privacidad", "privacy policy")}</a> : <strong>{t(lang, "política de privacidad", "privacy policy")}</strong>}{t(lang, " y autorizo el tratamiento de mis datos para el registro obligatorio de viajeros.", " and authorise the processing of my data for the mandatory traveller registration.")}</span></label></section></CardContent></Card>;
}

function CameraPanel({ videoRef, close, capture, lang }: { videoRef: React.RefObject<HTMLVideoElement | null>; close: () => void; capture: () => void; lang: Language }) { return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"><div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b px-5 py-4"><div><p className="font-bold">{t(lang, "Escanear documento", "Scan document")}</p><p className="text-sm text-slate-500">{t(lang, "Coloca el documento dentro de la imagen", "Place the document inside the frame")}</p></div><Button variant="ghost" size="icon" onClick={close}><X className="h-5 w-5" /></Button></div><div className="bg-black"><video ref={videoRef} autoPlay playsInline className="max-h-[65vh] w-full object-contain" /></div><div className="flex justify-end gap-3 p-5"><Button variant="outline" onClick={close}>{t(lang, "Cancelar", "Cancel")}</Button><Button className="bg-[#147c89] hover:bg-[#0d6570]" onClick={capture}><Camera className="mr-2 h-4 w-4" />{t(lang, "Capturar", "Capture")}</Button></div></div></div>; }
function SuccessScreen({ count, lang, restart }: { count: number; lang: Language; restart: () => void }) { return <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#dceef2,_#f8fafc_65%)] p-5"><Card className="w-full max-w-lg border-0 shadow-xl"><CardContent className="p-8 text-center"><CheckCircle2 className="mx-auto h-16 w-16 text-emerald-600" /><h1 className="mt-5 text-2xl font-bold">{t(lang, "Registro completado", "Registration completed")}</h1><p className="mt-3 text-slate-600">{count === 1 ? t(lang, "Tus datos se han enviado correctamente.", "Your details have been submitted successfully.") : t(lang, `Se han enviado los datos de ${count} huéspedes.`, `Details for ${count} guests have been submitted.`)}</p><Button className="mt-7 bg-[#147c89] hover:bg-[#0d6570]" onClick={restart}>{t(lang, "Registrar otro grupo", "Register another group")}</Button></CardContent></Card></main>; }
function LanguageSwitch({ lang, setLang }: { lang: Language; setLang: (lang: Language) => void }) { return <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1"><button type="button" onClick={() => setLang("es")} className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${lang === "es" ? "bg-gradient-to-r from-red-600 via-yellow-300 to-red-600 text-slate-950 shadow-sm" : "text-slate-500"}`}>ESPAÑOL</button><button type="button" onClick={() => setLang("en")} className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${lang === "en" ? "bg-gradient-to-r from-blue-900 via-white to-red-600 text-slate-900 shadow-sm" : "text-slate-500"}`}>ENGLISH</button></div>; }
function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) { return <h4 className="mb-4 flex items-center gap-2 text-base font-bold text-[#113b59]">{icon}{title}</h4>; }
function Field({ label, children, optional = false }: { label: string; children: React.ReactNode; optional?: boolean }) { return <div className="space-y-1.5"><Label>{label}{optional ? "" : " *"}</Label>{children}</div>; }
function CountrySelect({ value, lang, countries, onChange }: { value: string; lang: Language; countries: typeof COUNTRIES; onChange: (value: string) => void }) { return <Select value={value} onValueChange={onChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{countries.map((country) => <SelectItem key={country.code} value={country.code}>{lang === "es" ? country.name : country.nameEn}</SelectItem>)}</SelectContent></Select>; }
function t(lang: Language, es: string, en: string) { return lang === "es" ? es : en; }

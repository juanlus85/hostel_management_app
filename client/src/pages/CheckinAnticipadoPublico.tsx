import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { COUNTRIES } from "@/lib/countries";
import { requiresDocumentSupport } from "@shared/documentSupport";
import { getAllowedDocumentTypes } from "@shared/countries";

export default function CheckinAnticipadoPublico() {
  const [lang, setLang] = useState<"es" | "en">("es");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  
  const [formData, setFormData] = useState({
    // Datos personales
    firstName: "",
    lastName: "",
    nationality: "ESP",
    documentType: "PAS",
    documentNumber: "",
    documentSupport: "", // Número de soporte para DNI español
    gender: "Hombre",
    birthDate: "",
    phone: "",
    email: "",
    
    // Dirección
    street: "",
    city: "",
    province: "",
    postalCode: "",
    country: "ESP",
    
    // Fecha de llegada
    checkInDate: "",
  });

  const createGuestMutation = trpc.checkin.guests.create.useMutation();

  const t = (es: string, en: string) => (lang === "es" ? es : en);
  const originalDocumentNotice = t(
    "Aunque completes este Pre-check-in para agilizar tu llegada, al llegar será obligatorio presentar en recepción el documento físico original de cada huésped. Comprobaremos y validaremos los datos facilitados. Sin presentar el documento físico original, la entrada será denegada conforme a la normativa aplicable.",
    "Although this Fast Check-in helps speed up your arrival, every guest must present the original physical document at reception. We will check and validate the information provided. Without the original physical document, admission will be refused in accordance with applicable legal requirements."
  );
  const allowedDocumentTypes = getAllowedDocumentTypes(formData.nationality);
  const documentLabel = (code: string) => ({
    NIF: t("DNI / NIF", "Spanish ID / NIF"),
    NIE: "NIE",
    CAR: t("Carnet de conducir", "Driving licence"),
    ID: t("Documento de identidad", "National ID"),
    PAS: t("Pasaporte", "Passport"),
  }[code] || code);

  // Inicializar canvas de firma
  useEffect(() => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Configurar canvas
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    setHasSignature(true);
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = signatureCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones
    if (!formData.firstName || !formData.lastName || !formData.documentNumber) {
      toast.error(t("Por favor completa todos los campos obligatorios", "Please complete all required fields"));
      return;
    }

    if (!formData.birthDate || !formData.phone || !formData.email) {
      toast.error(t("Por favor completa todos los campos obligatorios", "Please complete all required fields"));
      return;
    }

    if (!formData.street || !formData.city || !formData.country) {
      toast.error(t("Por favor completa la dirección completa", "Please complete the full address"));
      return;
    }

    // Validar número de soporte para DNI español
    if (requiresDocumentSupport(formData.documentType, formData.nationality) && !formData.documentSupport.trim()) {
      toast.error(t("El número de soporte es obligatorio para DNI/NIF y NIE", "Support number is required for Spanish ID and NIE"));
      return;
    }

    if (!termsAccepted) {
      toast.error(t("Debes aceptar las condiciones del establecimiento", "You must accept the establishment conditions"));
      return;
    }

    if (!hasSignature) {
      toast.error(t("La firma es obligatoria", "Signature is required"));
      return;
    }

    setIsSubmitting(true);

    try {
      // Obtener firma como base64
      const canvas = signatureCanvasRef.current;
      const signatureData = canvas?.toDataURL("image/png") || "";

      await createGuestMutation.mutateAsync({
        firstName: formData.firstName,
        lastName: formData.lastName,
        nationality: formData.nationality,
        documentType: formData.documentType,
        documentNumber: formData.documentNumber,
        documentSupport: requiresDocumentSupport(formData.documentType, formData.nationality) ? formData.documentSupport || undefined : undefined,
        gender: formData.gender as "Hombre" | "Mujer" | "Otro",
        birthDate: formData.birthDate,
        phone: formData.phone,
        email: formData.email,
        street: formData.street,
        city: formData.city,
        province: formData.province,
        postalCode: formData.postalCode,
        country: formData.country,
        signature: signatureData,
        checkinType: "anticipado",
        status: "pending",
        checkInDate: formData.checkInDate,
        // Campos opcionales que se completarán en recepción
        // Campos opcionales que se completarán en recepción
        // reservationNumber, checkInDate, checkOutDate, roomNumber se omiten
      });

      setIsSubmitted(true);
      toast.success(t("Pre-check-in completado correctamente", "Fast check-in completed successfully"));
    } catch (error: any) {
      toast.error(t(`Error: ${error.message}`, `Error: ${error.message}`));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto" />
            <h2 className="text-2xl font-bold text-green-900">
              {t("¡Pre-check-in completado!", "Fast Check-in completed!")}
            </h2>
            <div className="space-y-4 text-left">
              <p className="text-base font-semibold text-gray-800">
                {t(
                  "Gracias por facilitarnos tu información",
                  "Thank you for providing us with your information"
                )}
              </p>
              <p className="text-sm text-muted-foreground">
                {t(
                  "Tu información ayudará a agilizar tu llegada. Nuestro equipo de recepción ya tiene tus datos y podrá completar el registro de forma más rápida.",
                  "Your information will help speed up your arrival. Our reception team already has your details and can complete the registration more quickly."
                )}
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
                <p className="text-sm font-semibold text-amber-900 mb-2">
                  {t("Recordatorio Importante", "Important Reminder")}
                </p>
                <p className="text-sm text-amber-800">
                  {t(
                    "Aunque hayas completado el Pre-check-in, es obligatorio presentar el documento físico original de cada huésped en recepción. Comprobaremos y validaremos los datos facilitados; sin el documento original físico, la entrada será denegada conforme a la normativa aplicable.",
                    "Even after completing Fast Check-in, every guest must present the original physical document at reception. We will check and validate the information provided; without the original physical document, admission will be refused in accordance with applicable legal requirements."
                  )}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-6">
              {t(
                "Puedes cerrar esta ventana. ¡Te esperamos en el hostel!",
                "You can close this window. We look forward to seeing you at the hostel!"
              )}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <div className="mb-5 rounded-xl border-2 border-slate-300 bg-slate-50 p-2 shadow-sm">
              <p className="mb-2 text-center text-xs font-bold uppercase tracking-[0.16em] text-slate-700">Idioma / Language</p>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" size="lg" onClick={() => setLang("es")} className={`min-h-12 border-0 bg-gradient-to-r from-red-600 via-yellow-300 to-red-600 text-sm font-extrabold text-slate-950 shadow-sm hover:opacity-90 ${lang === "es" ? "ring-3 ring-slate-900 ring-offset-2" : "opacity-60"}`}>ES · ESPAÑOL</Button>
                <Button type="button" size="lg" onClick={() => setLang("en")} className={`min-h-12 border-0 bg-gradient-to-r from-blue-900 via-white to-red-600 text-sm font-extrabold text-slate-900 shadow-sm hover:opacity-90 ${lang === "en" ? "ring-3 ring-slate-900 ring-offset-2" : "opacity-60"}`}>EN · ENGLISH</Button>
              </div>
            </div>
            <div className="text-center">
              <CardTitle className="text-2xl">
                {t("Pre-check-in", "Fast Check-in")}
              </CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              {t(
                "Completa tus datos antes de llegar para agilizar tu registro en recepción",
                "Complete your information before arrival to make registration at reception faster"
              )}
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
                <p className="font-bold">{t("Documento físico original obligatorio", "Original physical document required")}</p>
                <p className="mt-1">{originalDocumentNotice}</p>
              </div>
              {/* Datos Personales */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">
                  {t("Datos Personales", "Personal Information")} *
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">{t("Nombre", "First Name")} *</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="lastName">{t("Apellidos", "Last Name")} *</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="nationality">{t("Nacionalidad", "Nationality")} *</Label>
                    <Select
                      value={formData.nationality}
                      onValueChange={(value) => setFormData({ ...formData, nationality: value, documentSupport: requiresDocumentSupport(formData.documentType, value) ? formData.documentSupport : "" })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map((country) => (
                          <SelectItem key={country.code} value={country.code}>
                            {lang === "es" ? country.nationality : country.nationalityEn}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="documentType">{t("Tipo de Documento", "Document Type")} *</Label>
                    <Select
                      value={formData.documentType}
                      onValueChange={(value) => setFormData({ ...formData, documentType: value, documentSupport: requiresDocumentSupport(value, formData.nationality) ? formData.documentSupport : "" })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {allowedDocumentTypes.map((document) => (
                          <SelectItem key={document.code} value={document.code}>{documentLabel(document.code)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="documentNumber">{t("Número de Documento", "Document Number")} *</Label>
                    <Input
                      id="documentNumber"
                      value={formData.documentNumber}
                      onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                      required
                    />
                  </div>

                  {/* Número de Soporte para DNI español */}
                  {requiresDocumentSupport(formData.documentType, formData.nationality) && (
                    <div>
                      <Label htmlFor="documentSupport">
                        {t("Número de Soporte", "Support Number")} *
                      </Label>
                      <Input
                        id="documentSupport"
                        value={formData.documentSupport}
                        onChange={(e) => setFormData({ ...formData, documentSupport: e.target.value })}
                        placeholder={t("Aparece en el frontal del DNI", "Appears on the front of the DNI")}
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("Número de 9 dígitos en el frontal del DNI", "9-digit number on the front of the DNI")}
                      </p>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="gender">{t("Sexo", "Gender")} *</Label>
                    <Select
                      value={formData.gender}
                      onValueChange={(value) => setFormData({ ...formData, gender: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Hombre">{t("Hombre", "Male")}</SelectItem>
                        <SelectItem value="Mujer">{t("Mujer", "Female")}</SelectItem>
                        <SelectItem value="Otro">{t("Otro", "Other")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="birthDate">{t("Fecha de Nacimiento", "Date of Birth")} *</Label>
                    <Input
                      id="birthDate"
                      type="date"
                      value={formData.birthDate}
                      onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">{t("Teléfono", "Phone")} *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Fecha de Llegada */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">
                  {t("Fecha de Llegada", "Arrival Date")} *
                </h3>
                <div>
                  <Label htmlFor="checkInDate">{t("Día de llegada al hostel", "Hostel arrival date")} *</Label>
                  <Input
                    id="checkInDate"
                    type="date"
                    value={formData.checkInDate}
                    onChange={(e) => setFormData({ ...formData, checkInDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Dirección */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">
                  {t("Dirección", "Address")} *
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="street">{t("Calle y Número", "Street and Number")} *</Label>
                    <Input
                      id="street"
                      value={formData.street}
                      onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                      placeholder={t("Calle Principal, 123", "Main Street, 123")}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="city">{t("Ciudad", "City")} *</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="province">{t("Provincia", "Province")}</Label>
                    <Input
                      id="province"
                      value={formData.province}
                      onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="postalCode">{t("Código Postal", "Postal Code")}</Label>
                    <Input
                      id="postalCode"
                      value={formData.postalCode}
                      onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="country">{t("País", "Country")} *</Label>
                    <Select
                      value={formData.country}
                      onValueChange={(value) => setFormData({ ...formData, country: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map((country) => (
                          <SelectItem key={country.code} value={country.code}>
                            {lang === "es" ? country.name : country.nameEn}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Condiciones y Firma */}
              <div className="space-y-4 border-t pt-6">
                <h3 className="text-lg font-semibold">
                  {t("Condiciones y Firma", "Terms & Signature")} *
                </h3>

                <div className="bg-muted p-4 rounded-lg space-y-3">
                  <p className="text-sm">
                    {t(
                      "Los huéspedes manifiestan que han leído, conocen y se comprometen a cumplir las normas y condiciones del establecimiento.",
                      "The guests state that they have read, know, undertake and agree to comply with the rules and conditions of the establishment."
                    )}
                  </p>
                  <p className="text-sm italic text-muted-foreground">
                    {t(
                      "Los huéspedes manifiestan que han leído, conocen y se comprometen a cumplir las normas y condiciones del establecimiento. Estas se encuentran a disposición del huésped, expuestas en la recepción del establecimiento.",
                      "The guests state that they have read, know, undertake and agree to comply with the rules and conditions of the establishment. These are available to the guests, displayed at the reception of the establishment."
                    )}
                  </p>
                </div>

                <div className="flex items-start gap-2">
                  <Checkbox
                    id="terms"
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                  />
                  <Label htmlFor="terms" className="text-sm cursor-pointer">
                    {t(
                      "Acepto las condiciones del establecimiento y la política de protección de datos",
                      "I accept the establishment conditions and privacy policy"
                    )} *
                  </Label>
                </div>

                <div>
                  <Label>{t("Firma", "Signature")} *</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    {t("Firme aquí / Sign here", "Firme aquí / Sign here")}
                  </p>
                  <div className="border-2 border-dashed rounded-lg p-2 bg-white">
                    <canvas
                      ref={signatureCanvasRef}
                      width={600}
                      height={200}
                      className="w-full touch-none cursor-crosshair"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearSignature}
                    className="mt-2"
                  >
                    {t("Borrar firma", "Clear signature")}
                  </Button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t("Enviando...", "Submitting...")}
                  </>
                ) : (
                  t("Completar Pre-check-in", "Complete Fast Check-in")
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

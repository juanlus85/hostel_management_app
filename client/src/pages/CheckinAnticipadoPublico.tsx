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
import { getCountriesSorted, getCountryName } from "../../../shared/countries";

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
    if (formData.documentType === "DNI" && formData.nationality === "ESP" && !formData.documentSupport) {
      toast.error(t("El número de soporte es obligatorio para DNI español", "Support number is required for Spanish DNI"));
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
        documentSupport: formData.documentSupport || undefined,
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
      toast.success(t("Check-in anticipado completado correctamente", "Early check-in completed successfully"));
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
              {t("¡Check-in Anticipado Completado!", "Early Check-in Completed!")}
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
                  "Tu información nos permitirá agilizar significativamente tu proceso de check-in a la llegada. Nuestro equipo de recepción ya tiene tus datos y podrá completar el registro de forma rápida y eficiente.",
                  "Your information will allow us to significantly speed up your check-in process upon arrival. Our reception team already has your details and will be able to complete the registration quickly and efficiently."
                )}
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
                <p className="text-sm font-semibold text-amber-900 mb-2">
                  {t("Recordatorio Importante", "Important Reminder")}
                </p>
                <p className="text-sm text-amber-800">
                  {t(
                    "Es obligatorio presentar el documento original (DNI, Pasaporte, etc.) a la llegada. Este será utilizado para verificar que los datos facilitados sean correctos y completar el registro oficial.",
                    "It is mandatory to present the original document (ID, Passport, etc.) upon arrival. This will be used to verify that the information provided is correct and to complete the official registration."
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
            <div className="flex justify-between items-center">
              <CardTitle className="text-2xl">
                {t("Check-in Anticipado", "Early Check-in")} / {t("Check-in Anticipado", "Early Check-in")}
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLang(lang === "es" ? "en" : "es")}
              >
                {lang === "es" ? "English" : "Español"}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {t(
                "Completa tus datos antes de llegar para agilizar el proceso de check-in",
                "Complete your information before arrival to speed up the check-in process"
              )}
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
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
                      onValueChange={(value) => setFormData({ ...formData, nationality: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getCountriesSorted(lang).map((country) => (
                          <SelectItem key={country.code} value={country.code}>
                            {getCountryName(country.code, lang)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="documentType">{t("Tipo de Documento", "Document Type")} *</Label>
                    <Select
                      value={formData.documentType}
                      onValueChange={(value) => setFormData({ ...formData, documentType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PAS">{t("Pasaporte", "Passport")}</SelectItem>
                        <SelectItem value="DNI">{t("DNI / ID", "DNI / ID")}</SelectItem>
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
                  {formData.documentType === "DNI" && formData.nationality === "ESP" && (
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
                        {getCountriesSorted(lang).map((country) => (
                          <SelectItem key={country.code} value={country.code}>
                            {getCountryName(country.code, lang)}
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
                  t("Completar Check-in Anticipado", "Complete Early Check-in")
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

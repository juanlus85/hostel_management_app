import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Loader2, Save } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ARRIVAL_TEMPLATE_TAGS } from "@shared/arrivalTemplate";

export default function ConfiguracionCheckin() {
  const { data: settings, isLoading } = trpc.checkin.settings.get.useQuery();
  const utils = trpc.useUtils();
  const [saving, setSaving] = useState(false);

  const updateSettings = trpc.checkin.settings.update.useMutation({
    onSuccess: async () => {
      await utils.checkin.settings.get.invalidate();
      alert("Configuración guardada correctamente");
    },
    onError: error => {
      alert(`Error: ${error.message}`);
    },
  });

  const [formData, setFormData] = useState({
    hostelName: "",
    hostelAddress: "",
    hostelPhone: "",
    hostelEmail: "",
    hostelRta: "",
    policeCode: "",
    municipioCode: "",
    wifiPassword: "",
    checkoutTime: "",
    defaultEntranceCode: "",
    termsConditionsEs: "",
    termsConditionsEn: "",
    termsUrlEs: "",
    termsUrlEn: "",
    privacyPolicyEs: "",
    privacyPolicyEn: "",
    privacyUrlEs: "",
    privacyUrlEn: "",
    welcomeMessageEs: "",
    welcomeMessageEn: "",
    reservationWelcomeEmailEs: "",
    reservationWelcomeEmailEn: "",
    arrivalMapUrl: "",
    arrivalIntroEs: "",
    arrivalIntroEn: "",
    keyInstructionsEs: "",
    keyInstructionsEn: "",
    commonAreasEs: "",
    commonAreasEn: "",
    houseRulesEs: "",
    houseRulesEn: "",
    smtpHost: "",
    smtpPort: 587,
    smtpUser: "",
    smtpPassword: "",
    smtpFromEmail: "",
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        hostelName: settings.hostelName || "",
        hostelAddress: settings.hostelAddress || "",
        hostelPhone: settings.hostelPhone || "",
        hostelEmail: settings.hostelEmail || "",
        hostelRta: settings.hostelRta || "",
        policeCode: settings.policeCode || "",
        municipioCode: settings.municipioCode || "",
        wifiPassword: settings.wifiPassword || "",
        checkoutTime: settings.checkoutTime || "",
        defaultEntranceCode: settings.defaultEntranceCode || "",
        termsConditionsEs: settings.termsConditionsEs || "",
        termsConditionsEn: settings.termsConditionsEn || "",
        termsUrlEs: settings.termsUrlEs || "",
        termsUrlEn: settings.termsUrlEn || "",
        privacyPolicyEs: settings.privacyPolicyEs || "",
        privacyPolicyEn: settings.privacyPolicyEn || "",
        privacyUrlEs: settings.privacyUrlEs || "",
        privacyUrlEn: settings.privacyUrlEn || "",
        welcomeMessageEs: settings.welcomeMessageEs || "",
        welcomeMessageEn: settings.welcomeMessageEn || "",
        reservationWelcomeEmailEs: settings.reservationWelcomeEmailEs || "",
        reservationWelcomeEmailEn: settings.reservationWelcomeEmailEn || "",
        arrivalMapUrl: settings.arrivalMapUrl || "",
        arrivalIntroEs: settings.arrivalIntroEs || "",
        arrivalIntroEn: settings.arrivalIntroEn || "",
        keyInstructionsEs: settings.keyInstructionsEs || "",
        keyInstructionsEn: settings.keyInstructionsEn || "",
        commonAreasEs: settings.commonAreasEs || "",
        commonAreasEn: settings.commonAreasEn || "",
        houseRulesEs: settings.houseRulesEs || "",
        houseRulesEn: settings.houseRulesEn || "",
        smtpHost: settings.smtpHost || "",
        smtpPort: settings.smtpPort || 587,
        smtpUser: settings.smtpUser || "",
        smtpPassword: settings.smtpPassword || "",
        smtpFromEmail: settings.smtpFromEmail || "",
      });
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSettings.mutateAsync(formData);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Configuración Check-in</h2>
        <p className="text-muted-foreground">
          Configuración del sistema de check-in de huéspedes
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="terminos">Términos</TabsTrigger>
            <TabsTrigger value="bienvenida">Bienvenida</TabsTrigger>
            <TabsTrigger value="smtp">SMTP</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="hostelName">Nombre del Hostel</Label>
                <Input
                  id="hostelName"
                  value={formData.hostelName}
                  onChange={e =>
                    setFormData({ ...formData, hostelName: e.target.value })
                  }
                  placeholder="The Spot Central Hostel"
                />
              </div>

              <div>
                <Label htmlFor="hostelRta">Número RTA</Label>
                <Input
                  id="hostelRta"
                  value={formData.hostelRta}
                  onChange={e =>
                    setFormData({ ...formData, hostelRta: e.target.value })
                  }
                  placeholder="H/SE/01189"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="hostelAddress">Dirección</Label>
              <Input
                id="hostelAddress"
                value={formData.hostelAddress}
                onChange={e =>
                  setFormData({ ...formData, hostelAddress: e.target.value })
                }
                placeholder="Calle Example, 123, Sevilla"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="hostelPhone">Teléfono</Label>
                <Input
                  id="hostelPhone"
                  value={formData.hostelPhone}
                  onChange={e =>
                    setFormData({ ...formData, hostelPhone: e.target.value })
                  }
                  placeholder="+34 954 000 000"
                />
              </div>

              <div>
                <Label htmlFor="hostelEmail">Email</Label>
                <Input
                  id="hostelEmail"
                  type="email"
                  value={formData.hostelEmail}
                  onChange={e =>
                    setFormData({ ...formData, hostelEmail: e.target.value })
                  }
                  placeholder="info@hostel.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="policeCode">
                  Código Establecimiento (Policía)
                </Label>
                <Input
                  id="policeCode"
                  value={formData.policeCode}
                  onChange={e =>
                    setFormData({ ...formData, policeCode: e.target.value })
                  }
                  placeholder="0000109745"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Para exportación XML Sistema Hospedajes
                </p>
              </div>

              <div>
                <Label htmlFor="municipioCode">Código Municipio INE *</Label>
                <Input
                  id="municipioCode"
                  value={formData.municipioCode}
                  onChange={e =>
                    setFormData({ ...formData, municipioCode: e.target.value })
                  }
                  placeholder="28079"
                  maxLength={5}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  5 dígitos del municipio (ej: 28079 = Madrid)
                </p>
              </div>

              <div>
                <Label htmlFor="wifiPassword">Contraseña WiFi</Label>
                <Input
                  id="wifiPassword"
                  value={formData.wifiPassword}
                  onChange={e =>
                    setFormData({ ...formData, wifiPassword: e.target.value })
                  }
                  placeholder="wifi123"
                />
              </div>

              <div>
                <Label htmlFor="checkoutTime">Hora de Check-out</Label>
                <Input
                  id="checkoutTime"
                  value={formData.checkoutTime}
                  onChange={e =>
                    setFormData({ ...formData, checkoutTime: e.target.value })
                  }
                  placeholder="11:00"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="defaultEntranceCode">
                Código Entrada por Defecto
              </Label>
              <Input
                id="defaultEntranceCode"
                value={formData.defaultEntranceCode}
                onChange={e =>
                  setFormData({
                    ...formData,
                    defaultEntranceCode: e.target.value,
                  })
                }
                placeholder="1234"
              />
            </div>
          </TabsContent>

          <TabsContent value="terminos" className="space-y-4 mt-6">
            <div>
              <Label htmlFor="termsEs">Términos y Condiciones (Español)</Label>
              <Textarea
                id="termsEs"
                value={formData.termsConditionsEs}
                onChange={e =>
                  setFormData({
                    ...formData,
                    termsConditionsEs: e.target.value,
                  })
                }
                placeholder="Los huéspedes manifiestan que han leído, conocen y se comprometen a cumplir las normas y condiciones del establecimiento..."
                rows={6}
              />
            </div>

            <div>
              <Label htmlFor="termsEn">Terms and Conditions (English)</Label>
              <Textarea
                id="termsEn"
                value={formData.termsConditionsEn}
                onChange={e =>
                  setFormData({
                    ...formData,
                    termsConditionsEn: e.target.value,
                  })
                }
                placeholder="The guests state that they have read, know, undertake and agree to comply with the rules and conditions of the establishment..."
                rows={6}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="termsUrlEs">URL de condiciones (Español)</Label>
                <Input
                  id="termsUrlEs"
                  type="url"
                  value={formData.termsUrlEs}
                  onChange={e =>
                    setFormData({ ...formData, termsUrlEs: e.target.value })
                  }
                  placeholder="https://tudominio.com/condiciones"
                />
              </div>
              <div>
                <Label htmlFor="termsUrlEn">Terms URL (English)</Label>
                <Input
                  id="termsUrlEn"
                  type="url"
                  value={formData.termsUrlEn}
                  onChange={e =>
                    setFormData({ ...formData, termsUrlEn: e.target.value })
                  }
                  placeholder="https://yourdomain.com/terms"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="privacyEs">
                Política de privacidad (Español)
              </Label>
              <Textarea
                id="privacyEs"
                value={formData.privacyPolicyEs}
                onChange={e =>
                  setFormData({ ...formData, privacyPolicyEs: e.target.value })
                }
                placeholder="Información sobre el tratamiento de datos personales..."
                rows={4}
              />
            </div>
            <div>
              <Label htmlFor="privacyEn">Privacy policy (English)</Label>
              <Textarea
                id="privacyEn"
                value={formData.privacyPolicyEn}
                onChange={e =>
                  setFormData({ ...formData, privacyPolicyEn: e.target.value })
                }
                placeholder="Information about the processing of personal data..."
                rows={4}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="privacyUrlEs">
                  URL de privacidad (Español)
                </Label>
                <Input
                  id="privacyUrlEs"
                  type="url"
                  value={formData.privacyUrlEs}
                  onChange={e =>
                    setFormData({ ...formData, privacyUrlEs: e.target.value })
                  }
                  placeholder="https://tudominio.com/privacidad"
                />
              </div>
              <div>
                <Label htmlFor="privacyUrlEn">Privacy URL (English)</Label>
                <Input
                  id="privacyUrlEn"
                  type="url"
                  value={formData.privacyUrlEn}
                  onChange={e =>
                    setFormData({ ...formData, privacyUrlEn: e.target.value })
                  }
                  placeholder="https://yourdomain.com/privacy"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="bienvenida" className="space-y-4 mt-6">
            <p className="text-sm text-muted-foreground">
              Este texto aparece al comienzo del enlace público de check-in
              online, según el idioma elegido por el huésped.
            </p>
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
              <p className="font-medium">Etiquetas dinámicas disponibles</p>
              <p className="mt-1 text-muted-foreground">
                Puedes incluirlas en los textos de bienvenida y guía de llegada.
                Se rellenan automáticamente con los datos de cada reserva.
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {ARRIVAL_TEMPLATE_TAGS.map(tag => (
                  <code
                    key={tag}
                    className="rounded bg-background px-1.5 py-0.5 text-xs"
                  >
                    {tag}
                  </code>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="welcomeEs">
                Instrucciones de bienvenida (Español)
              </Label>
              <Textarea
                id="welcomeEs"
                value={formData.welcomeMessageEs}
                onChange={e =>
                  setFormData({ ...formData, welcomeMessageEs: e.target.value })
                }
                placeholder="Te damos la bienvenida. Completa el formulario y recibirás tus códigos de acceso..."
                rows={6}
              />
            </div>
            <div>
              <Label htmlFor="welcomeEn">Welcome instructions (English)</Label>
              <Textarea
                id="welcomeEn"
                value={formData.welcomeMessageEn}
                onChange={e =>
                  setFormData({ ...formData, welcomeMessageEn: e.target.value })
                }
                placeholder="Welcome. Complete the form and you will receive your access codes..."
                rows={6}
              />
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              <p className="font-medium">
                Mensajes de bienvenida enviados desde Próximas reservas
              </p>
              <p className="mt-1 text-amber-900">
                Estas plantillas son distintas del mensaje que aparece dentro
                del formulario de Check-in Online. Puedes usar las etiquetas
                dinámicas anteriores; la recepción podrá personalizar el texto
                antes de cada envío.
              </p>
            </div>
            <div>
              <Label htmlFor="reservationWelcomeEmailEs">
                Plantilla de bienvenida por correo (Español)
              </Label>
              <Textarea
                id="reservationWelcomeEmailEs"
                value={formData.reservationWelcomeEmailEs}
                onChange={e =>
                  setFormData({
                    ...formData,
                    reservationWelcomeEmailEs: e.target.value,
                  })
                }
                placeholder="Hola {{NOMBRE_HUESPED}}, gracias por tu reserva en {{NOMBRE_HOSTEL}}. Te esperamos el {{FECHA_LLEGADA}}."
                rows={7}
              />
            </div>
            <div>
              <Label htmlFor="reservationWelcomeEmailEn">
                Welcome email template (English)
              </Label>
              <Textarea
                id="reservationWelcomeEmailEn"
                value={formData.reservationWelcomeEmailEn}
                onChange={e =>
                  setFormData({
                    ...formData,
                    reservationWelcomeEmailEn: e.target.value,
                  })
                }
                placeholder="Hello {{NOMBRE_HUESPED}}, thank you for your reservation at {{NOMBRE_HOSTEL}}. We look forward to welcoming you on {{FECHA_LLEGADA}}."
                rows={7}
              />
            </div>
            <div>
              <Label htmlFor="arrivalMapUrl">URL del mapa de llegada</Label>
              <Input
                id="arrivalMapUrl"
                type="url"
                value={formData.arrivalMapUrl}
                onChange={e =>
                  setFormData({ ...formData, arrivalMapUrl: e.target.value })
                }
                placeholder="https://mapa.thespotcentralhostel.com/"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Los siguientes textos se mostrarán al finalizar el Check-in Online
              y en el correo de confirmación. Los códigos, habitación, planta,
              Wi‑Fi y datos de contacto se añaden automáticamente.
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="arrivalIntroEs">
                  Guía de llegada (Español)
                </Label>
                <Textarea
                  id="arrivalIntroEs"
                  value={formData.arrivalIntroEs}
                  onChange={e =>
                    setFormData({ ...formData, arrivalIntroEs: e.target.value })
                  }
                  placeholder="La recepción no estará abierta presencialmente a tu llegada, pero puedes acceder en cualquier momento siguiendo estas instrucciones."
                  rows={5}
                />
              </div>
              <div>
                <Label htmlFor="arrivalIntroEn">Arrival guide (English)</Label>
                <Textarea
                  id="arrivalIntroEn"
                  value={formData.arrivalIntroEn}
                  onChange={e =>
                    setFormData({ ...formData, arrivalIntroEn: e.target.value })
                  }
                  placeholder="Reception may not be open in person at your arrival time, but you can access the hostel at any time with these instructions."
                  rows={5}
                />
              </div>
              <div>
                <Label htmlFor="keyInstructionsEs">
                  Recogida de llave (Español)
                </Label>
                <Textarea
                  id="keyInstructionsEs"
                  value={formData.keyInstructionsEs}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      keyInstructionsEs: e.target.value,
                    })
                  }
                  placeholder="Junto a la puerta encontrarás una caja con tu tarjeta de acceso."
                  rows={4}
                />
              </div>
              <div>
                <Label htmlFor="keyInstructionsEn">
                  Key collection (English)
                </Label>
                <Textarea
                  id="keyInstructionsEn"
                  value={formData.keyInstructionsEn}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      keyInstructionsEn: e.target.value,
                    })
                  }
                  placeholder="Next to the door you will find a box containing your room key card."
                  rows={4}
                />
              </div>
              <div>
                <Label htmlFor="commonAreasEs">Zonas comunes (Español)</Label>
                <Textarea
                  id="commonAreasEs"
                  value={formData.commonAreasEs}
                  onChange={e =>
                    setFormData({ ...formData, commonAreasEs: e.target.value })
                  }
                  placeholder="En la tercera planta encontrarás cocina, salón y terraza."
                  rows={4}
                />
              </div>
              <div>
                <Label htmlFor="commonAreasEn">Common areas (English)</Label>
                <Textarea
                  id="commonAreasEn"
                  value={formData.commonAreasEn}
                  onChange={e =>
                    setFormData({ ...formData, commonAreasEn: e.target.value })
                  }
                  placeholder="On the third floor you will find a kitchen, living room and rooftop terrace."
                  rows={4}
                />
              </div>
              <div>
                <Label htmlFor="houseRulesEs">Normas (Español)</Label>
                <Textarea
                  id="houseRulesEs"
                  value={formData.houseRulesEs}
                  onChange={e =>
                    setFormData({ ...formData, houseRulesEs: e.target.value })
                  }
                  placeholder="No está permitido fumar en el hostel salvo en la terraza."
                  rows={4}
                />
              </div>
              <div>
                <Label htmlFor="houseRulesEn">House rules (English)</Label>
                <Textarea
                  id="houseRulesEn"
                  value={formData.houseRulesEn}
                  onChange={e =>
                    setFormData({ ...formData, houseRulesEn: e.target.value })
                  }
                  placeholder="Smoking is not allowed inside the hostel, except on the rooftop terrace."
                  rows={4}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="smtp" className="space-y-4 mt-6">
            <p className="text-sm text-muted-foreground mb-4">
              Configuración del servidor SMTP para envío de correos electrónicos
              (check-in online, confirmaciones, etc.)
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="smtpHost">Servidor SMTP</Label>
                <Input
                  id="smtpHost"
                  value={formData.smtpHost}
                  onChange={e =>
                    setFormData({ ...formData, smtpHost: e.target.value })
                  }
                  placeholder="smtp.gmail.com"
                />
              </div>

              <div>
                <Label htmlFor="smtpPort">Puerto</Label>
                <Input
                  id="smtpPort"
                  type="number"
                  value={formData.smtpPort}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      smtpPort: parseInt(e.target.value) || 587,
                    })
                  }
                  placeholder="587"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="smtpUser">Usuario SMTP</Label>
                <Input
                  id="smtpUser"
                  value={formData.smtpUser}
                  onChange={e =>
                    setFormData({ ...formData, smtpUser: e.target.value })
                  }
                  placeholder="usuario@gmail.com"
                />
              </div>

              <div>
                <Label htmlFor="smtpPassword">Contraseña SMTP</Label>
                <Input
                  id="smtpPassword"
                  type="password"
                  value={formData.smtpPassword}
                  onChange={e =>
                    setFormData({ ...formData, smtpPassword: e.target.value })
                  }
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="smtpFromEmail">Email Remitente</Label>
              <Input
                id="smtpFromEmail"
                type="email"
                value={formData.smtpFromEmail}
                onChange={e =>
                  setFormData({ ...formData, smtpFromEmail: e.target.value })
                }
                placeholder="noreply@hostel.com"
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end mt-6">
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Guardar Configuración
              </>
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}

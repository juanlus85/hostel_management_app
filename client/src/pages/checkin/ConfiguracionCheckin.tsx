import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Loader2, Save } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ConfiguracionCheckin() {
  const { data: settings, isLoading } = trpc.checkin.settings.get.useQuery();
  const [saving, setSaving] = useState(false);

  const updateSettings = trpc.checkin.settings.update.useMutation({
    onSuccess: () => {
      alert("Configuración guardada correctamente");
    },
    onError: (error) => {
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
    wifiPassword: "",
    checkoutTime: "",
    defaultEntranceCode: "",
    termsConditionsEs: "",
    termsConditionsEn: "",
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
        wifiPassword: settings.wifiPassword || "",
        checkoutTime: settings.checkoutTime || "",
        defaultEntranceCode: settings.defaultEntranceCode || "",
        termsConditionsEs: settings.termsConditionsEs || "",
        termsConditionsEn: settings.termsConditionsEn || "",
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="terminos">Términos</TabsTrigger>
            <TabsTrigger value="smtp">SMTP</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="hostelName">Nombre del Hostel</Label>
                <Input
                  id="hostelName"
                  value={formData.hostelName}
                  onChange={(e) => setFormData({ ...formData, hostelName: e.target.value })}
                  placeholder="The Spot Central Hostel"
                />
              </div>

              <div>
                <Label htmlFor="hostelRta">Número RTA</Label>
                <Input
                  id="hostelRta"
                  value={formData.hostelRta}
                  onChange={(e) => setFormData({ ...formData, hostelRta: e.target.value })}
                  placeholder="H/SE/01189"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="hostelAddress">Dirección</Label>
              <Input
                id="hostelAddress"
                value={formData.hostelAddress}
                onChange={(e) => setFormData({ ...formData, hostelAddress: e.target.value })}
                placeholder="Calle Example, 123, Sevilla"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="hostelPhone">Teléfono</Label>
                <Input
                  id="hostelPhone"
                  value={formData.hostelPhone}
                  onChange={(e) => setFormData({ ...formData, hostelPhone: e.target.value })}
                  placeholder="+34 954 000 000"
                />
              </div>

              <div>
                <Label htmlFor="hostelEmail">Email</Label>
                <Input
                  id="hostelEmail"
                  type="email"
                  value={formData.hostelEmail}
                  onChange={(e) => setFormData({ ...formData, hostelEmail: e.target.value })}
                  placeholder="info@hostel.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="policeCode">Código Establecimiento (Policía)</Label>
                <Input
                  id="policeCode"
                  value={formData.policeCode}
                  onChange={(e) => setFormData({ ...formData, policeCode: e.target.value })}
                  placeholder="0000109745"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Para exportación XML Sistema Hospedajes
                </p>
              </div>

              <div>
                <Label htmlFor="wifiPassword">Contraseña WiFi</Label>
                <Input
                  id="wifiPassword"
                  value={formData.wifiPassword}
                  onChange={(e) => setFormData({ ...formData, wifiPassword: e.target.value })}
                  placeholder="wifi123"
                />
              </div>

              <div>
                <Label htmlFor="checkoutTime">Hora de Check-out</Label>
                <Input
                  id="checkoutTime"
                  value={formData.checkoutTime}
                  onChange={(e) => setFormData({ ...formData, checkoutTime: e.target.value })}
                  placeholder="11:00"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="defaultEntranceCode">Código Entrada por Defecto</Label>
              <Input
                id="defaultEntranceCode"
                value={formData.defaultEntranceCode}
                onChange={(e) => setFormData({ ...formData, defaultEntranceCode: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, termsConditionsEs: e.target.value })}
                placeholder="Los huéspedes manifiestan que han leído, conocen y se comprometen a cumplir las normas y condiciones del establecimiento..."
                rows={6}
              />
            </div>

            <div>
              <Label htmlFor="termsEn">Terms and Conditions (English)</Label>
              <Textarea
                id="termsEn"
                value={formData.termsConditionsEn}
                onChange={(e) => setFormData({ ...formData, termsConditionsEn: e.target.value })}
                placeholder="The guests state that they have read, know, undertake and agree to comply with the rules and conditions of the establishment..."
                rows={6}
              />
            </div>
          </TabsContent>

          <TabsContent value="smtp" className="space-y-4 mt-6">
            <p className="text-sm text-muted-foreground mb-4">
              Configuración del servidor SMTP para envío de correos electrónicos (check-in online, confirmaciones, etc.)
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="smtpHost">Servidor SMTP</Label>
                <Input
                  id="smtpHost"
                  value={formData.smtpHost}
                  onChange={(e) => setFormData({ ...formData, smtpHost: e.target.value })}
                  placeholder="smtp.gmail.com"
                />
              </div>

              <div>
                <Label htmlFor="smtpPort">Puerto</Label>
                <Input
                  id="smtpPort"
                  type="number"
                  value={formData.smtpPort}
                  onChange={(e) => setFormData({ ...formData, smtpPort: parseInt(e.target.value) || 587 })}
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
                  onChange={(e) => setFormData({ ...formData, smtpUser: e.target.value })}
                  placeholder="usuario@gmail.com"
                />
              </div>

              <div>
                <Label htmlFor="smtpPassword">Contraseña SMTP</Label>
                <Input
                  id="smtpPassword"
                  type="password"
                  value={formData.smtpPassword}
                  onChange={(e) => setFormData({ ...formData, smtpPassword: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, smtpFromEmail: e.target.value })}
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

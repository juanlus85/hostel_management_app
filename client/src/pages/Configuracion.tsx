import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings, Mail, Server, CheckCircle, XCircle, Loader2, Save, TestTube, Brain, Key } from "lucide-react";
import { toast } from "sonner";

export default function Configuracion() {
  const [smtpConfig, setSmtpConfig] = useState({
    host: "",
    port: 587,
    secure: false,
    user: "",
    password: "",
    fromEmail: "",
    fromName: "Hostel Management",
  });
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);

  const { data: savedConfig, isLoading } = trpc.settings.getSMTP.useQuery();
  const saveMutation = trpc.settings.saveSMTP.useMutation({
    onSuccess: () => {
      toast.success("Configuración SMTP guardada correctamente");
    },
    onError: (error) => {
      toast.error(`Error al guardar: ${error.message}`);
    },
  });
  const testMutation = trpc.settings.testSMTP.useMutation({
    onSuccess: (result) => {
      setTestResult(result);
      if (result.success) {
        toast.success("Conexión SMTP exitosa");
      } else {
        toast.error(`Error de conexión: ${result.error}`);
      }
      setIsTesting(false);
    },
    onError: (error) => {
      setTestResult({ success: false, error: error.message });
      toast.error(`Error: ${error.message}`);
      setIsTesting(false);
    },
  });

  useEffect(() => {
    if (savedConfig) {
      setSmtpConfig({
        host: savedConfig.host || "",
        port: savedConfig.port || 587,
        secure: savedConfig.secure || false,
        user: savedConfig.user || "",
        password: savedConfig.password || "",
        fromEmail: savedConfig.fromEmail || "",
        fromName: savedConfig.fromName || "Hostel Management",
      });
    }
  }, [savedConfig]);

  const handleSave = () => {
    saveMutation.mutate(smtpConfig);
  };

  const handleTest = () => {
    setIsTesting(true);
    setTestResult(null);
    testMutation.mutate(smtpConfig);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Settings className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>
          <p className="text-muted-foreground">Ajustes del sistema y notificaciones</p>
        </div>
      </div>

      {/* SMTP Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Configuración de Correo (SMTP)</CardTitle>
              <CardDescription>
                Configura el servidor de correo para enviar notificaciones a los empleados
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Server Settings */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="host">Servidor SMTP</Label>
              <div className="relative">
                <Server className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="host"
                  placeholder="smtp.gmail.com"
                  className="pl-9"
                  value={smtpConfig.host}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="port">Puerto</Label>
              <Input
                id="port"
                type="number"
                placeholder="587"
                value={smtpConfig.port}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, port: parseInt(e.target.value) || 587 })}
              />
            </div>
          </div>

          {/* SSL/TLS */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label>Usar SSL/TLS</Label>
              <p className="text-sm text-muted-foreground">
                Habilitar conexión segura (puerto 465 normalmente usa SSL)
              </p>
            </div>
            <Switch
              checked={smtpConfig.secure}
              onCheckedChange={(checked) => setSmtpConfig({ ...smtpConfig, secure: checked })}
            />
          </div>

          {/* Authentication */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="user">Usuario / Email</Label>
              <Input
                id="user"
                placeholder="tu@email.com"
                value={smtpConfig.user}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, user: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña / App Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={smtpConfig.password}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, password: e.target.value })}
              />
            </div>
          </div>

          {/* From Settings */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fromEmail">Email remitente</Label>
              <Input
                id="fromEmail"
                placeholder="notificaciones@tudominio.com"
                value={smtpConfig.fromEmail}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, fromEmail: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fromName">Nombre remitente</Label>
              <Input
                id="fromName"
                placeholder="Hostel Management"
                value={smtpConfig.fromName}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, fromName: e.target.value })}
              />
            </div>
          </div>

          {/* Test Result */}
          {testResult && (
            <div className={`flex items-center gap-2 p-4 rounded-lg ${testResult.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {testResult.success ? (
                <>
                  <CheckCircle className="h-5 w-5" />
                  <span>Conexión exitosa. El servidor SMTP está configurado correctamente.</span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5" />
                  <span>Error de conexión: {testResult.error}</span>
                </>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={isTesting || !smtpConfig.host || !smtpConfig.user}
            >
              {isTesting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <TestTube className="h-4 w-4 mr-2" />
              )}
              Probar conexión
            </Button>
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending || !smtpConfig.host || !smtpConfig.user}
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Guardar configuración
            </Button>
          </div>

          {/* Help Text */}
          <div className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
            <p className="font-medium mb-2">Configuración para Gmail:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Servidor: smtp.gmail.com</li>
              <li>Puerto: 587 (TLS) o 465 (SSL)</li>
              <li>Usar una "Contraseña de aplicación" en lugar de tu contraseña normal</li>
              <li>Habilitar "Acceso de aplicaciones menos seguras" o usar OAuth</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* OpenAI API Configuration */}
      <OpenAIConfig />
    </div>
  );
}

// Componente separado para OpenAI Config
function OpenAIConfig() {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);

  const { data: savedKey, isLoading } = trpc.settings.get.useQuery({ key: "openai_api_key" });
  const saveMutation = trpc.settings.upsert.useMutation({
    onSuccess: () => {
      toast.success("API Key de OpenAI guardada correctamente");
    },
    onError: (error) => {
      toast.error(`Error al guardar: ${error.message}`);
    },
  });
  const deleteMutation = trpc.settings.delete.useMutation({
    onSuccess: () => {
      setApiKey("");
      toast.success("API Key eliminada correctamente");
    },
    onError: (error) => {
      toast.error(`Error al eliminar: ${error.message}`);
    },
  });

  useEffect(() => {
    if (savedKey?.settingValue) {
      setApiKey(savedKey.settingValue);
    }
  }, [savedKey]);

  const handleSave = () => {
    if (!apiKey.trim()) {
      toast.error("Por favor ingresa una API Key válida");
      return;
    }
    saveMutation.mutate({
      key: "openai_api_key",
      value: apiKey,
      description: "OpenAI API Key para OCR y procesamiento de facturas"
    });
  };

  const handleDelete = () => {
    if (confirm("¿Estás seguro de eliminar la API Key de OpenAI?")) {
      deleteMutation.mutate({ key: "openai_api_key" });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>Configuración de OpenAI</CardTitle>
            <CardDescription>
              API Key para OCR automático de facturas y procesamiento de imágenes
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* API Key Input */}
        <div className="space-y-2">
          <Label htmlFor="openai-key" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            OpenAI API Key
          </Label>
          <div className="flex gap-2">
            <Input
              id="openai-key"
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-proj-..."
              className="font-mono text-sm"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowKey(!showKey)}
              type="button"
            >
              {showKey ? "👁️" : "👁️‍🗨️"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Obtén tu API Key en{" "}
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              platform.openai.com/api-keys
            </a>
          </p>
        </div>

        {/* Status */}
        {savedKey?.settingValue && (
          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-950/20 p-3 rounded-lg">
            <CheckCircle className="h-4 w-4" />
            <span>API Key configurada correctamente</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending || !apiKey.trim()}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Guardar API Key
          </Button>
          {savedKey?.settingValue && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Eliminar
            </Button>
          )}
        </div>

        {/* Help Text */}
        <div className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
          <p className="font-medium mb-2">¿Para qué se usa?</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Extracción automática de datos de facturas (OCR)</li>
            <li>Procesamiento de imágenes y documentos</li>
            <li>Análisis inteligente de contenido</li>
          </ul>
          <p className="mt-3 text-xs">
            <strong>Nota:</strong> La API Key se almacena de forma segura en tu base de datos.
            Solo los administradores pueden ver y modificar esta configuración.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

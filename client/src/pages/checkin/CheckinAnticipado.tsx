import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Info, ExternalLink, Copy, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export default function CheckinAnticipado() {
  const [publicUrl, setPublicUrl] = useState("");

  const generatePublicUrl = () => {
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/checkin-anticipado-publico`;
    setPublicUrl(url);
    toast.success("URL pública generada");
  };

  const copyUrl = () => {
    if (publicUrl) {
      navigator.clipboard.writeText(publicUrl);
      toast.success("URL copiada al portapapeles");
    }
  };

  const openPublicForm = () => {
    if (publicUrl) {
      window.open(publicUrl, '_blank');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-600" />
            Check-in Anticipado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">¿Qué es el Check-in Anticipado?</h3>
            <p className="text-sm text-blue-700 mb-3">
              Permite a los huéspedes completar sus datos personales antes de llegar al hostel, 
              agilizando el proceso de recepción. Los códigos de acceso NO se generan automáticamente, 
              deberás asignarlos manualmente desde la pestaña "Huéspedes".
            </p>
            <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
              <li>Formulario público sin necesidad de login</li>
              <li>Recopila datos personales, documentos y dirección</li>
              <li>Los huéspedes quedan en estado "Pendiente"</li>
              <li>Asigna habitación y códigos manualmente después</li>
            </ul>
          </div>

          <div className="space-y-4">
            <div>
              <Label>URL del Formulario Público</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Comparte este enlace con tus huéspedes para que completen el check-in anticipado
              </p>
              <div className="flex gap-2">
                <Button onClick={generatePublicUrl} variant="outline" className="flex-1">
                  Generar URL Pública
                </Button>
              </div>
            </div>

            {publicUrl && (
              <div className="space-y-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-green-900 mb-1">URL generada correctamente</p>
                    <code className="text-xs bg-white px-2 py-1 rounded border border-green-300 block overflow-x-auto">
                      {publicUrl}
                    </code>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={copyUrl} variant="outline" size="sm" className="flex-1">
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar URL
                  </Button>
                  <Button onClick={openPublicForm} variant="outline" size="sm" className="flex-1">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Abrir Formulario
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
              <Info className="w-4 h-4" />
              Flujo de trabajo
            </h4>
            <ol className="text-sm text-amber-700 space-y-2 list-decimal list-inside">
              <li>Comparte la URL pública con tus huéspedes (email, WhatsApp, web)</li>
              <li>Los huéspedes completan el formulario con sus datos</li>
              <li>Los registros aparecen en la pestaña "Huéspedes" con estado "Pendiente"</li>
              <li>Desde "Huéspedes", edita cada registro para asignar habitación y códigos</li>
              <li>Cambia el estado a "Completado" cuando asignes los códigos</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

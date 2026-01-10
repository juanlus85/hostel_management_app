import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { 
  ClipboardCheck, 
  Users, 
  Send, 
  Globe, 
  Key, 
  FileText, 
  Settings 
} from "lucide-react";
import CheckinPresencial from "./checkin/CheckinPresencial";
import GestionHuespedes from "./checkin/GestionHuespedes";
import ExportarPolicia from "./checkin/ExportarPolicia";
import ConfiguracionCheckin from "./checkin/ConfiguracionCheckin";
import CodigosAccesoReal from "./CodigosAcceso";

// Placeholder components (to be implemented in next phase)
const CheckinAnticipado = () => (
  <Card className="p-6">
    <h2 className="text-2xl font-bold mb-4">Check-in Anticipado</h2>
    <p className="text-muted-foreground">
      Generar link para que el huésped rellene el formulario antes de llegar.
      <br />
      <strong>NO se envían códigos de acceso</strong> (los da el recepcionista en persona).
    </p>
    <p className="text-sm text-muted-foreground mt-4">
      Funcionalidad en desarrollo - Próxima fase
    </p>
  </Card>
);

const CheckinOnline = () => (
  <Card className="p-6">
    <h2 className="text-2xl font-bold mb-4">Check-in Online</h2>
    <p className="text-muted-foreground">
      Generar link para check-in completamente online cuando recepción está cerrada.
      <br />
      <strong>SÍ se envían códigos de acceso automáticamente</strong> por email y en pantalla.
    </p>
    <p className="text-sm text-muted-foreground mt-4">
      Funcionalidad en desarrollo - Próxima fase
    </p>
  </Card>
);



export default function CheckinUnificado() {
  const [activeTab, setActiveTab] = useState("checkin");

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Sistema de Check-in</h1>
        <p className="text-muted-foreground">
          Gestión completa de check-ins de huéspedes
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-7 mb-6">
          <TabsTrigger value="checkin" className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Check-in</span>
          </TabsTrigger>
          <TabsTrigger value="huespedes" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Huéspedes</span>
          </TabsTrigger>
          <TabsTrigger value="anticipado" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Anticipado</span>
          </TabsTrigger>
          <TabsTrigger value="online" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">Online</span>
          </TabsTrigger>
          <TabsTrigger value="codigos" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            <span className="hidden sm:inline">Códigos</span>
          </TabsTrigger>
          <TabsTrigger value="policia" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Policía</span>
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Config</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="checkin">
          <CheckinPresencial />
        </TabsContent>

        <TabsContent value="huespedes">
          <GestionHuespedes />
        </TabsContent>

        <TabsContent value="anticipado">
          <CheckinAnticipado />
        </TabsContent>

        <TabsContent value="online">
          <CheckinOnline />
        </TabsContent>

        <TabsContent value="codigos">
          <CodigosAccesoReal />
        </TabsContent>

        <TabsContent value="policia">
          <ExportarPolicia />
        </TabsContent>

        <TabsContent value="config">
          <ConfiguracionCheckin />
        </TabsContent>
      </Tabs>
    </div>
  );
}

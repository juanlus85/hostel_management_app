import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ClipboardCheck, 
  Users, 
  Key, 
  FileText, 
  Settings 
} from "lucide-react";
import CheckinPresencial from "./checkin/CheckinPresencial";
import GestionHuespedes from "./checkin/GestionHuespedes";
import ExportarPolicia from "./checkin/ExportarPolicia";
import ConfiguracionCheckin from "./checkin/ConfiguracionCheckin";
import CodigosAccesoReal from "./CodigosAcceso";

export default function CheckinUnificado() {
  const [activeTab, setActiveTab] = useState("checkin");

  return (
    <div className="container mx-auto min-w-0 py-4 sm:py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Sistema de Check-in</h1>
        <p className="text-muted-foreground">
          Registro, huéspedes, códigos, policía y ajustes. Los mensajes se envían desde cada reserva.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="-mx-4 mb-5 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
        <TabsList className="flex h-auto min-w-max gap-1 p-1">
          <TabsTrigger value="checkin" className="min-h-10 shrink-0 gap-2 px-3">
            <ClipboardCheck className="h-4 w-4" />
            <span>Check-in</span>
          </TabsTrigger>
          <TabsTrigger value="huespedes" className="min-h-10 shrink-0 gap-2 px-3">
            <Users className="h-4 w-4" />
            <span>Huéspedes</span>
          </TabsTrigger>
          <TabsTrigger value="codigos" className="min-h-10 shrink-0 gap-2 px-3">
            <Key className="h-4 w-4" />
            <span>Códigos</span>
          </TabsTrigger>
          <TabsTrigger value="policia" className="min-h-10 shrink-0 gap-2 px-3">
            <FileText className="h-4 w-4" />
            <span>Policía</span>
          </TabsTrigger>
          <TabsTrigger value="config" className="min-h-10 shrink-0 gap-2 px-3">
            <Settings className="h-4 w-4" />
            <span>Config.</span>
          </TabsTrigger>
        </TabsList>
        </div>

        <TabsContent value="checkin">
          <CheckinPresencial />
        </TabsContent>

        <TabsContent value="huespedes">
          <GestionHuespedes />
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

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";

// Pages
import Home from "./pages/Home";
import Turnos from "./pages/Turnos";
import Caja from "./pages/Caja";
import Facturas from "./pages/Facturas";
import Inventario from "./pages/Inventario";
import Incidencias from "./pages/Incidencias";
import Tareas from "./pages/Tareas";
import Empleados from "./pages/Empleados";
import Proveedores from "./pages/Proveedores";
import CierreTrimestral from "./pages/CierreTrimestral";
import Configuracion from "./pages/Configuracion";
import Housekeeping from "./pages/Housekeeping";
import OtrosGastos from "./pages/OtrosGastos";
import ResumenSemanal from "./pages/ResumenSemanal";
import CajasF from "./pages/CajasF";
import CodigosAcceso from "./pages/CodigosAcceso";
import HistoricoCajas from "./pages/HistoricoCajas";
import PedidosUnificado from "./pages/PedidosUnificado";
import CheckinUnificado from "./pages/CheckinUnificado";
import CheckinAnticipadoPublico from "./pages/CheckinAnticipadoPublico";
import CheckinOnlinePublico from "./pages/CheckinOnlinePublico";
import TabletRegistroPolicia from "./pages/TabletRegistroPolicia";
import ImportacionesExternas from "./pages/ImportacionesExternas";

function Router() {
  return (
    <Switch>
      {/* Rutas públicas sin layout */}
      <Route path="/checkin-anticipado-publico" component={CheckinAnticipadoPublico} />
      <Route path="/checkin-online/:token" component={CheckinOnlinePublico} />
      
      {/* Rutas privadas con DashboardLayout */}
      <Route>
        {() => (
          <DashboardLayout>
            <Switch>
        <Route path="/" component={Home} />
        <Route path="/turnos" component={Turnos} />
        <Route path="/caja" component={Caja} />
        <Route path="/facturas" component={Facturas} />
        <Route path="/inventario" component={Inventario} />
        <Route path="/incidencias" component={Incidencias} />
        <Route path="/tareas" component={Tareas} />
        <Route path="/empleados" component={Empleados} />
        <Route path="/proveedores" component={Proveedores} />
        <Route path="/cierre-trimestral" component={CierreTrimestral} />
        <Route path="/configuracion" component={Configuracion} />
        <Route path="/housekeeping" component={Housekeeping} />
        <Route path="/otros-gastos" component={OtrosGastos} />
        <Route path="/resumen-semanal" component={ResumenSemanal} />
        <Route path="/cajas-f" component={CajasF} />
        <Route path="/codigos-acceso" component={CodigosAcceso} />
        <Route path="/historico-cajas" component={HistoricoCajas} />
        <Route path="/pedidos" component={PedidosUnificado} />
        <Route path="/checkin" component={CheckinUnificado} />
        <Route path="/tablet-registro" component={TabletRegistroPolicia} />
        <Route path="/importaciones-externas" component={ImportacionesExternas} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
            </Switch>
          </DashboardLayout>
        )}
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

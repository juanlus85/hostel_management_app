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

function Router() {
  return (
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
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
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

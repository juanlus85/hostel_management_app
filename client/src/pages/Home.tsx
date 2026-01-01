import { useAuth } from "@/_core/hooks/useAuth";
import { useBusinessContext } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  AlertTriangle, 
  Package, 
  Clock,
  Building2,
  Store,
  ArrowUpRight,
  ArrowDownRight,
  CalendarDays
} from "lucide-react";
import { useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type PeriodType = "week" | "month" | "quarter" | "year" | "custom";

// Helper para formatear fecha como YYYY-MM-DD sin conversión de timezone
function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function Home() {
  const { user } = useAuth();
  const { selectedBusiness } = useBusinessContext();
  const [period, setPeriod] = useState<PeriodType>("month");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  
  // Get date range based on selected period
  const dateRange = useMemo(() => {
    const now = new Date();
    let start: Date, end: Date;
    
    switch (period) {
      case "week":
        start = new Date(now);
        start.setDate(now.getDate() - now.getDay() + 1);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        break;
      case "month":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case "quarter":
        const currentQuarter = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), currentQuarter * 3, 1);
        end = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0);
        break;
      case "year":
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        break;
      case "custom":
        if (!customStartDate || !customEndDate) {
          // Default to current month if custom dates not set
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        } else {
          return {
            startDate: customStartDate,
            endDate: customEndDate,
          };
        }
        break;
    }
    
    return {
      startDate: formatDateLocal(start),
      endDate: formatDateLocal(end),
    };
  }, [period, customStartDate, customEndDate]);
  
  const periodLabel = {
    week: "esta semana",
    month: "este mes",
    quarter: "este trimestre",
    year: "este año",
    custom: "rango personalizado",
  }[period];

  const { data: businesses } = trpc.businesses.list.useQuery();
  
  const hostelId = businesses?.find(b => b.code === "hostel")?.id;
  const tiendaId = businesses?.find(b => b.code === "tienda")?.id;

  const { data: hostelStats } = trpc.dashboard.stats.useQuery(
    { businessId: hostelId!, ...dateRange },
    { enabled: !!hostelId && (selectedBusiness === "hostel" || selectedBusiness === "all") }
  );

  const { data: tiendaStats } = trpc.dashboard.stats.useQuery(
    { businessId: tiendaId!, ...dateRange },
    { enabled: !!tiendaId && (selectedBusiness === "tienda" || selectedBusiness === "all") }
  );

  const stats = useMemo(() => {
    if (selectedBusiness === "hostel") return hostelStats;
    if (selectedBusiness === "tienda") return tiendaStats;
    if (hostelStats && tiendaStats) {
      return {
        totalIncomeZ: (hostelStats.totalIncomeZ || 0) + (tiendaStats.totalIncomeZ || 0),
        otherIncome: (hostelStats.otherIncome || 0) + (tiendaStats.otherIncome || 0),
        totalIncome: hostelStats.totalIncome + tiendaStats.totalIncome,
        totalExpenses: hostelStats.totalExpenses + tiendaStats.totalExpenses,
        netResult: hostelStats.netResult + tiendaStats.netResult,
        totalDifference: hostelStats.totalDifference + tiendaStats.totalDifference,
        withdrawnCash: (hostelStats.withdrawnCash || 0) + (tiendaStats.withdrawnCash || 0),
        withdrawnCards: (hostelStats.withdrawnCards || 0) + (tiendaStats.withdrawnCards || 0),
        prepaidBooking: (hostelStats.prepaidBooking || 0) + (tiendaStats.prepaidBooking || 0),
        lowStockCount: hostelStats.lowStockCount + tiendaStats.lowStockCount,
        openIncidentsCount: hostelStats.openIncidentsCount + tiendaStats.openIncidentsCount,
        pendingOrdersCount: hostelStats.pendingOrdersCount + tiendaStats.pendingOrdersCount,
      };
    }
    return null;
  }, [selectedBusiness, hostelStats, tiendaStats]);

  const businessLabel = selectedBusiness === "hostel" ? "The Spot Hostel" : 
                        selectedBusiness === "tienda" ? "Sweet & Salty" : "Ambos negocios";
  const BusinessIcon = selectedBusiness === "hostel" ? Building2 : 
                       selectedBusiness === "tienda" ? Store : Building2;
  
  const isAdmin = user?.role === "admin";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <BusinessIcon className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          </div>
          <p className="text-muted-foreground">
            Bienvenido, {user?.name}. Resumen de {businessLabel} {periodLabel}.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <Select value={period} onValueChange={(v: PeriodType) => setPeriod(v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Esta semana</SelectItem>
              <SelectItem value="month">Este mes</SelectItem>
              <SelectItem value="quarter">Este trimestre</SelectItem>
              <SelectItem value="year">Este año</SelectItem>
              <SelectItem value="custom">Rango personalizado</SelectItem>
            </SelectContent>
          </Select>
          {period === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-1.5 border rounded-md text-sm"
              />
              <span className="text-sm text-muted-foreground">-</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-1.5 border rounded-md text-sm"
              />
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid - Solo visible para admin */}
      {isAdmin && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ingresos (Z)</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                €{stats?.totalIncomeZ?.toFixed(2) || "0.00"}
              </div>
              <p className="text-xs text-muted-foreground">
                Efectivo: €{stats?.withdrawnCash?.toFixed(2) || "0.00"} | Tarjetas: €{stats?.withdrawnCards?.toFixed(2) || "0.00"}
              </p>
            </CardContent>
          </Card>

          {/* Prepago Booking - Solo para Hostel y solo en vista de mes */}
          {selectedBusiness === "hostel" && period === "month" && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Prepago Booking</CardTitle>
                <TrendingDown className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  €{stats?.prepaidBooking?.toFixed(2) || "0.00"}
                </div>
                <p className="text-xs text-muted-foreground">Retirado este mes</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Otros Ingresos</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                €{stats?.otherIncome?.toFixed(2) || "0.00"}
              </div>
              <p className="text-xs text-muted-foreground">Otros ingresos</p>
            </CardContent>
          </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              €{stats?.totalExpenses?.toFixed(2) || "0.00"}
            </div>
            <p className="text-xs text-muted-foreground">Facturas + otros</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(stats?.netResult || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              €{stats?.netResult?.toFixed(2) || "0.00"}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              {(stats?.netResult || 0) >= 0 ? (
                <ArrowUpRight className="h-3 w-3 text-green-600 mr-1" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-red-600 mr-1" />
              )}
              Resultado neto
            </div>
          </CardContent>
        </Card>

        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Descuadre</CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${Math.abs(stats?.totalDifference || 0) > 5 ? 'text-orange-500' : 'text-foreground'}`}>
                €{stats?.totalDifference?.toFixed(2) || "0.00"}
              </div>
              <p className="text-xs text-muted-foreground">Acumulado en caja</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alerts Section */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className={stats?.lowStockCount ? "border-orange-200 bg-orange-50/50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock bajo</CardTitle>
            <Package className={`h-4 w-4 ${stats?.lowStockCount ? "text-orange-500" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.lowStockCount || 0}</div>
            <p className="text-xs text-muted-foreground">Productos por debajo del mínimo</p>
          </CardContent>
        </Card>

        <Card className={stats?.openIncidentsCount ? "border-red-200 bg-red-50/50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Incidencias abiertas</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${stats?.openIncidentsCount ? "text-red-500" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.openIncidentsCount || 0}</div>
            <p className="text-xs text-muted-foreground">Pendientes de resolver</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos pendientes</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingOrdersCount || 0}</div>
            <p className="text-xs text-muted-foreground">Por realizar o recibir</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones rápidas</CardTitle>
          <CardDescription>Accesos directos a las funciones más usadas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <a href="/caja" className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
              <div className="p-2 rounded-md bg-primary/10">
                <Wallet className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Abrir caja</p>
                <p className="text-xs text-muted-foreground">Iniciar turno</p>
              </div>
            </a>
            <a href="/facturas" className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
              <div className="p-2 rounded-md bg-secondary/10">
                <TrendingDown className="h-4 w-4 text-secondary" />
              </div>
              <div>
                <p className="font-medium text-sm">Registrar gasto</p>
                <p className="text-xs text-muted-foreground">Añadir factura</p>
              </div>
            </a>
            <a href="/incidencias" className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
              <div className="p-2 rounded-md bg-orange-500/10">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              </div>
              <div>
                <p className="font-medium text-sm">Nueva incidencia</p>
                <p className="text-xs text-muted-foreground">Reportar problema</p>
              </div>
            </a>
            <a href="/inventario" className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
              <div className="p-2 rounded-md bg-green-500/10">
                <Package className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <p className="font-medium text-sm">Ver inventario</p>
                <p className="text-xs text-muted-foreground">Stock actual</p>
              </div>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

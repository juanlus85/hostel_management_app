import { useAuth } from "@/_core/hooks/useAuth";
import { useBusinessContext } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  CalendarDays,
  Download,
  FileText,
  ReceiptText,
  CalendarRange
} from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { aggregateSupplierExpenses } from "@shared/supplierExpenses";
import { mergeDashboardTrends } from "@shared/dashboardTrend";
import { CategoryScale, Chart as ChartJS, Legend, LineElement, LinearScale, PointElement, Tooltip } from "chart.js";
import { Line } from "react-chartjs-2";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import { buildDashboardExportRows } from "@shared/dashboardExport";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

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
  const { selectedBusiness, setSelectedBusiness } = useBusinessContext();
  const [, setLocation] = useLocation();
  const [period, setPeriod] = useState<PeriodType>("month");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const isAdmin = user?.role === "admin";
  
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
  const provisionalExternalCash = trpc.dashboard.provisionalExternalCash.useQuery(undefined, {
    enabled: isAdmin,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: "always",
    staleTime: 0,
  });
  
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

  const { data: hostelSupplierExpenses } = trpc.dashboard.supplierExpenses.useQuery(
    { businessId: hostelId!, ...dateRange },
    { enabled: !!hostelId && user?.role === "admin" && (selectedBusiness === "hostel" || selectedBusiness === "all") }
  );
  const { data: tiendaSupplierExpenses } = trpc.dashboard.supplierExpenses.useQuery(
    { businessId: tiendaId!, ...dateRange },
    { enabled: !!tiendaId && user?.role === "admin" && (selectedBusiness === "tienda" || selectedBusiness === "all") }
  );
  const { data: hostelTrend } = trpc.dashboard.trend.useQuery(
    { businessId: hostelId!, ...dateRange },
    { enabled: !!hostelId && user?.role === "admin" && (selectedBusiness === "hostel" || selectedBusiness === "all") }
  );
  const { data: tiendaTrend } = trpc.dashboard.trend.useQuery(
    { businessId: tiendaId!, ...dateRange },
    { enabled: !!tiendaId && user?.role === "admin" && (selectedBusiness === "tienda" || selectedBusiness === "all") }
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
  
  const supplierExpenses = useMemo(() => {
    if (selectedBusiness === "hostel") return hostelSupplierExpenses || [];
    if (selectedBusiness === "tienda") return tiendaSupplierExpenses || [];
    return aggregateSupplierExpenses([
      ...(hostelSupplierExpenses || []).map((expense) => ({ supplier: expense.supplier, totalAmount: expense.total })),
      ...(tiendaSupplierExpenses || []).map((expense) => ({ supplier: expense.supplier, totalAmount: expense.total })),
    ]);
  }, [selectedBusiness, hostelSupplierExpenses, tiendaSupplierExpenses]);
  const trendRows = useMemo(() => {
    if (selectedBusiness === "hostel") return hostelTrend || [];
    if (selectedBusiness === "tienda") return tiendaTrend || [];
    return mergeDashboardTrends(hostelTrend || [], tiendaTrend || []);
  }, [selectedBusiness, hostelTrend, tiendaTrend]);
  const trendData = useMemo(() => ({
    labels: trendRows.map((row) => new Date(`${row.date}T00:00:00`).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })),
    datasets: [
      { label: "Ingresos", data: trendRows.map((row) => row.income), borderColor: "#16a34a", backgroundColor: "rgba(22,163,74,.12)", tension: .25 },
      { label: "Gastos", data: trendRows.map((row) => row.expenses), borderColor: "#dc2626", backgroundColor: "rgba(220,38,38,.12)", tension: .25 },
      { label: "Balance", data: trendRows.map((row) => row.balance), borderColor: "#2563eb", backgroundColor: "rgba(37,99,235,.12)", tension: .25 },
    ],
  }), [trendRows]);
  const handleExportDashboard = () => {
    try {
      const rows = buildDashboardExportRows({ businessLabel, periodLabel, startDate: dateRange.startDate, endDate: dateRange.endDate, stats: stats || {}, suppliers: supplierExpenses, trend: trendRows });
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet(rows);
      worksheet["!cols"] = [{ wch: 28 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];
      XLSX.utils.book_append_sheet(workbook, worksheet, "Dashboard");
      XLSX.writeFile(workbook, `DASHBOARD_${dateRange.startDate}_${dateRange.endDate}.xlsx`);
      toast.success("Informe XLSX exportado correctamente");
    } catch {
      toast.error("No se pudo exportar el informe XLSX");
    }
  };
  const handleExportDashboardPdf = () => {
    try {
      const doc = new jsPDF();
      let y = 18;
      doc.setFontSize(17); doc.text(`Informe de Dashboard · ${businessLabel}`, 14, y); y += 9;
      doc.setFontSize(10); doc.text(`Periodo: ${dateRange.startDate} — ${dateRange.endDate} (${periodLabel})`, 14, y); y += 12;
      doc.setFontSize(12); doc.text("Resumen financiero", 14, y); y += 7;
      doc.setFontSize(10);
      [["Ingresos", stats?.totalIncome || 0], ["Gastos", stats?.totalExpenses || 0], ["Balance", stats?.netResult || 0], ["Descuadre", stats?.totalDifference || 0]].forEach(([label, value]) => { doc.text(`${label}: €${Number(value).toFixed(2)}`, 14, y); y += 6; });
      y += 4; doc.setFontSize(12); doc.text("Gastos por proveedor", 14, y); y += 7; doc.setFontSize(10);
      (supplierExpenses.slice(0, 12)).forEach((supplier) => { if (y > 280) { doc.addPage(); y = 18; } doc.text(`${supplier.supplier} · ${supplier.invoiceCount} factura(s): €${supplier.total.toFixed(2)}`, 14, y); y += 6; });
      doc.save(`DASHBOARD_${dateRange.startDate}_${dateRange.endDate}.pdf`);
      toast.success("Informe PDF exportado correctamente");
    } catch { toast.error("No se pudo exportar el informe PDF"); }
  };
  const openQuickAction = (path: string, business?: "hostel" | "tienda" | "all") => {
    if (business) setSelectedBusiness(business);
    setLocation(path);
  };

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
        <div className="flex w-full items-center gap-2 flex-wrap sm:w-auto">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <Select value={period} onValueChange={(v: PeriodType) => setPeriod(v)}>
            <SelectTrigger className="w-full sm:w-[180px]">
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
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full px-3 py-1.5 border rounded-md text-sm sm:w-auto"
              />
              <span className="hidden text-sm text-muted-foreground sm:inline">-</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full px-3 py-1.5 border rounded-md text-sm sm:w-auto"
              />
            </div>
          )}
          {isAdmin && <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={handleExportDashboard}><Download className="mr-2 h-4 w-4" />Exportar XLSX</Button>}
          {isAdmin && <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={handleExportDashboardPdf}><FileText className="mr-2 h-4 w-4" />Exportar PDF</Button>}
        </div>
      </div>

      {/* Stats Grid - Solo visible para admin */}
      {isAdmin && <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-violet-200 bg-violet-50/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">X provisional Tienda</CardTitle><Store className="h-4 w-4 text-violet-700" /></CardHeader>
          <CardContent>{provisionalExternalCash.isLoading ? <div className="text-sm text-muted-foreground">Actualizando Loyverse…</div> : <><div className="text-2xl font-bold text-violet-700">€{Number(provisionalExternalCash.data?.tienda.total || 0).toFixed(2)}</div><p className="text-xs text-muted-foreground">Loyverse · jornada {provisionalExternalCash.data?.tienda.businessDate || "—"} · {Number(provisionalExternalCash.data?.tienda.receiptCount || 0)} recibos</p><p className="mt-1 text-xs font-medium text-violet-700">En curso desde las 07:00 · no guarda ni cierra caja</p></>}</CardContent>
        </Card>
        <Card className="border-cyan-200 bg-cyan-50/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">X provisional Hostel</CardTitle><Building2 className="h-4 w-4 text-cyan-700" /></CardHeader>
          <CardContent>{provisionalExternalCash.isLoading ? <div className="text-sm text-muted-foreground">Actualizando Cloudbeds…</div> : <><div className="text-2xl font-bold text-cyan-700">€{Number(provisionalExternalCash.data?.hostel.total || 0).toFixed(2)}</div><p className="text-xs text-muted-foreground">Cloudbeds · fecha de servicio {provisionalExternalCash.data?.hostel.serviceDate || "—"} · {provisionalExternalCash.data?.hostel.paymentCount || 0} pagos</p><p className="mt-1 text-xs font-medium text-cyan-700">En curso · no guarda ni cierra caja</p></>}</CardContent>
        </Card>
      </div>}
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
                {selectedBusiness === "hostel" && (
                  <> | Prepago Booking: €{stats?.prepaidBooking?.toFixed(2) || "0.00"}</>
                )}
              </p>
            </CardContent>
          </Card>

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

      {isAdmin && <Card>
        <CardHeader>
          <CardTitle>Gastos por proveedor</CardTitle>
          <CardDescription>Facturas registradas durante {periodLabel}, ordenadas de mayor a menor importe.</CardDescription>
        </CardHeader>
        <CardContent>
          {supplierExpenses.length ? <div className="divide-y rounded-md border">{supplierExpenses.slice(0, 8).map((expense) => <div key={expense.supplier} className="flex items-center justify-between gap-4 p-3"><div className="min-w-0"><p className="truncate font-medium">{expense.supplier}</p><p className="text-xs text-muted-foreground">{expense.invoiceCount} factura{expense.invoiceCount !== 1 ? "s" : ""}</p></div><p className="shrink-0 font-semibold text-red-600">€{expense.total.toFixed(2)}</p></div>)}</div> : <p className="py-4 text-sm text-muted-foreground">No hay facturas registradas para este periodo.</p>}
        </CardContent>
      </Card>}

      {isAdmin && <Card>
        <CardHeader>
          <CardTitle>Tendencia financiera</CardTitle>
          <CardDescription>Evolución diaria de ingresos, gastos y balance durante {periodLabel}.</CardDescription>
        </CardHeader>
        <CardContent>
          {trendRows.length ? <div className="h-72"><Line data={trendData} options={{ responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false }, plugins: { legend: { position: "bottom" } }, scales: { y: { ticks: { callback: (value) => `€${value}` } } } }} /></div> : <p className="py-4 text-sm text-muted-foreground">No hay movimientos registrados para mostrar una tendencia en este periodo.</p>}
        </CardContent>
      </Card>}

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
          <CardDescription>Operaciones frecuentes listas para abrir, con el negocio correcto ya seleccionado.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <button onClick={() => openQuickAction("/caja", "hostel")} className="group flex items-center gap-3 rounded-xl border border-cyan-100 bg-cyan-50/30 p-3 text-left transition-all hover:-translate-y-0.5 hover:border-cyan-300 hover:bg-cyan-50 hover:shadow-sm">
              <div className="rounded-lg bg-cyan-100 p-2.5"><Building2 className="h-4 w-4 text-cyan-700" /></div>
              <div><p className="text-sm font-semibold">Hacer caja Hostel</p><p className="text-xs text-muted-foreground">Día actual</p></div>
            </button>
            <button onClick={() => openQuickAction("/caja", "tienda")} className="group flex items-center gap-3 rounded-xl border border-violet-100 bg-violet-50/30 p-3 text-left transition-all hover:-translate-y-0.5 hover:border-violet-300 hover:bg-violet-50 hover:shadow-sm">
              <div className="rounded-lg bg-violet-100 p-2.5"><Store className="h-4 w-4 text-violet-700" /></div>
              <div><p className="text-sm font-semibold">Hacer caja Tienda</p><p className="text-xs text-muted-foreground">Día actual</p></div>
            </button>
            <button onClick={() => openQuickAction("/facturas?new=received", "all")} className="group flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/30 p-3 text-left transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-sm">
              <div className="rounded-lg bg-emerald-100 p-2.5"><ReceiptText className="h-4 w-4 text-emerald-700" /></div>
              <div><p className="text-sm font-semibold">Factura recibida</p><p className="text-xs text-muted-foreground">Registrar gasto</p></div>
            </button>
            <button onClick={() => openQuickAction("/facturas?new=issued", "all")} className="group flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50/30 p-3 text-left transition-all hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-50 hover:shadow-sm">
              <div className="rounded-lg bg-amber-100 p-2.5"><FileText className="h-4 w-4 text-amber-700" /></div>
              <div><p className="text-sm font-semibold">Factura emitida</p><p className="text-xs text-muted-foreground">Crear y adjuntar</p></div>
            </button>
            <button onClick={() => openQuickAction("/turnos?view=week")} className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-100 hover:shadow-sm">
              <div className="rounded-lg bg-slate-200 p-2.5"><CalendarRange className="h-4 w-4 text-slate-700" /></div>
              <div><p className="text-sm font-semibold">Turnos semanales</p><p className="text-xs text-muted-foreground">Ver planificación</p></div>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

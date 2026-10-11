import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, TrendingUp, Wallet, CreditCard, AlertTriangle, Package, CheckSquare, Calendar, ChevronLeft, ChevronRight, Plus, Pencil, Trash2, BarChart3, Store, Building2, Landmark, CircleDollarSign } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { Bar, Line } from 'react-chartjs-2';
import { buildAvailabilityHistory } from '@/lib/availabilityHistory';
import { buildWeeklyCashHistory, getRollingWeeklyCashRange } from "@shared/weeklyCashHistory";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Componente para fila de efectivo en sobres
function CashEnvelopeRow({ dayName, dayOfWeek, envelope, dailyWithdrawal, isAdmin, onSave }: {
  dayName: string;
  dayOfWeek: number;
  envelope: any;
  dailyWithdrawal: number;
  isAdmin: boolean;
  onSave: (dayOfWeek: number, expectedCash: string, actualCash: string) => void;
}) {
  // expectedCash se calcula automáticamente desde dailyWithdrawal
  const expectedCash = dailyWithdrawal.toFixed(2);
  const [actualCash, setActualCash] = useState(envelope?.actualCash || "0.00");
  
  useEffect(() => {
    setActualCash(envelope?.actualCash || "0.00");
  }, [envelope]);
  
  // Auto-guardar expectedCash cuando cambie dailyWithdrawal
  useEffect(() => {
    if (envelope && parseFloat(envelope.expectedCash) !== dailyWithdrawal) {
      onSave(dayOfWeek, expectedCash, actualCash);
    }
  }, [dailyWithdrawal]);
  
  const difference = parseFloat(actualCash) - parseFloat(expectedCash);

  return (
    <tr className="border-b hover:bg-muted/50">
      <td className="p-2 font-medium">{dayName}</td>
      <td className="p-2 text-right text-muted-foreground">
        €{parseFloat(expectedCash).toFixed(2)}
      </td>
      <td className="p-2 text-right">
        {isAdmin ? (
          <Input
            type="number"
            step="0.01"
            value={actualCash}
            onChange={(e) => setActualCash(e.target.value)}
            onBlur={() => onSave(dayOfWeek, expectedCash, actualCash)}
            className="w-24 text-right"
          />
        ) : (
          `€${parseFloat(actualCash).toFixed(2)}`
        )}
      </td>
      <td className={`p-2 text-right font-bold ${difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
        €{difference.toFixed(2)}
      </td>
      {isAdmin && <td className="p-2"></td>}
    </tr>
  );
}

// Componente para fila de fuente de disponibilidad
function AvailabilitySourceRow({ source, record, isAdmin, onSave, onDelete }: {
  source: any;
  record: any;
  isAdmin: boolean;
  onSave: (sourceId: number, amount: string) => void;
  onDelete: (id: number) => void;
}) {
  const [amount, setAmount] = useState(record?.amount || "0.00");
  
  useEffect(() => {
    setAmount(record?.amount || "0.00");
  }, [record]);

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex-1">
        <p className="font-medium">{source.name}</p>
        <p className="text-xs text-muted-foreground capitalize">{source.type.replace('_', ' ')}</p>
      </div>
      <div className="flex items-center gap-2">
        {isAdmin ? (
          <Input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onBlur={() => onSave(source.id, amount)}
            className="w-32 text-right"
            placeholder="0.00"
          />
        ) : (
          <span className="text-lg font-semibold">€{parseFloat(amount).toFixed(2)}</span>
        )}
        {isAdmin && source.displayOrder > 8 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(source.id)}
          >
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button>
        )}
      </div>
    </div>
  );
}

export default function ResumenSemanal() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  
  const [selectedWeek, setSelectedWeek] = useState(0); // 0 = esta semana, -1 = semana pasada, etc.
  const [cashHistoryWeeks, setCashHistoryWeeks] = useState<4 | 12 | 52>(4);

  // Calcular rango de fechas de la semana seleccionada
  const weekRange = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDay();
    const diff = currentDay === 0 ? -6 : 1 - currentDay; // Lunes como inicio de semana
    
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff + (selectedWeek * 7));
    monday.setHours(0, 0, 0, 0);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    
    // Calcular lunes siguiente (para título de Disponibilidad)
    const nextMonday = new Date(monday);
    nextMonday.setDate(monday.getDate() + 7);
    
    // Formatear fechas en formato YYYY-MM-DD sin conversión a UTC
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    return {
      startDate: formatDate(monday),
      endDate: formatDate(sunday),
      label: `${monday.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} - ${sunday.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}`,
      nextMondayLabel: `Lunes ${nextMonday.getDate()}`
    };
  }, [selectedWeek]);

  const { data: businesses } = trpc.businesses.list.useQuery();
  const hostelId = businesses?.find(b => b.code === "hostel")?.id;
  const tiendaId = businesses?.find(b => b.code === "tienda")?.id;
  const cashHistoryRange = useMemo(() => getRollingWeeklyCashRange(cashHistoryWeeks), [cashHistoryWeeks]);

  const { data: hostelCashClosings } = trpc.cashClosings.list.useQuery(
    { businessId: hostelId!, startDate: cashHistoryRange.startDate, endDate: cashHistoryRange.endDate },
    { enabled: !!hostelId && !!cashHistoryRange.startDate && !!cashHistoryRange.endDate }
  );
  const { data: tiendaCashClosings } = trpc.cashClosings.list.useQuery(
    { businessId: tiendaId!, startDate: cashHistoryRange.startDate, endDate: cashHistoryRange.endDate },
    { enabled: !!tiendaId && !!cashHistoryRange.startDate && !!cashHistoryRange.endDate }
  );

  const hostelWeeklyCash = useMemo(
    () => buildWeeklyCashHistory(hostelCashClosings || [], cashHistoryWeeks),
    [hostelCashClosings, cashHistoryWeeks]
  );
  const tiendaWeeklyCash = useMemo(
    () => buildWeeklyCashHistory(tiendaCashClosings || [], cashHistoryWeeks),
    [tiendaCashClosings, cashHistoryWeeks]
  );
  const recentWeeklyCash = useMemo(() => {
    const hostelByWeek = new Map(hostelWeeklyCash.map((week) => [week.weekStart, week]));
    return tiendaWeeklyCash.slice(-4).map((tiendaWeek) => ({
      weekStart: tiendaWeek.weekStart,
      label: tiendaWeek.label,
      tooltipLabel: tiendaWeek.tooltipLabel,
      hostel: hostelByWeek.get(tiendaWeek.weekStart)?.total || 0,
      tienda: tiendaWeek.total,
      isCurrent: tiendaWeek.isCurrent,
    }));
  }, [hostelWeeklyCash, tiendaWeeklyCash]);

  // Obtener stats de ambos negocios
  const { data: hostelStats, isLoading: hostelLoading } = trpc.dashboard.stats.useQuery(
    { businessId: hostelId!, startDate: weekRange.startDate, endDate: weekRange.endDate },
    { enabled: !!hostelId }
  );

  const { data: tiendaStats, isLoading: tiendaLoading } = trpc.dashboard.stats.useQuery(
    { businessId: tiendaId!, startDate: weekRange.startDate, endDate: weekRange.endDate },
    { enabled: !!tiendaId }
  );

  // Obtener incidencias abiertas
  const { data: hostelIncidents } = trpc.incidents.list.useQuery(
    { businessId: hostelId!, status: "open" },
    { enabled: !!hostelId }
  );

  const { data: tiendaIncidents } = trpc.incidents.list.useQuery(
    { businessId: tiendaId!, status: "open" },
    { enabled: !!tiendaId }
  );

  // Obtener productos con stock bajo
  const { data: hostelLowStock } = trpc.inventory.lowStock.useQuery(
    { businessId: hostelId! },
    { enabled: !!hostelId }
  );

  const { data: tiendaLowStock } = trpc.inventory.lowStock.useQuery(
    { businessId: tiendaId! },
    { enabled: !!tiendaId }
  );

  // Obtener tareas pendientes
  const { data: hostelTasks } = trpc.tasks.list.useQuery(
    { businessId: hostelId!, status: "pending" },
    { enabled: !!hostelId }
  );

  const { data: tiendaTasks } = trpc.tasks.list.useQuery(
    { businessId: tiendaId!, status: "pending" },
    { enabled: !!tiendaId }
  );

  // Obtener retiros diarios
  const { data: hostelDailyWithdrawals } = trpc.dashboard.dailyWithdrawals.useQuery(
    { businessId: hostelId!, startDate: weekRange.startDate, endDate: weekRange.endDate },
    { enabled: !!hostelId }
  );

  const { data: tiendaDailyWithdrawals } = trpc.dashboard.dailyWithdrawals.useQuery(
    { businessId: tiendaId!, startDate: weekRange.startDate, endDate: weekRange.endDate },
    { enabled: !!tiendaId }
  );

  // Nuevas queries para control semanal
  const { data: cashEnvelopes, refetch: refetchCashEnvelopes } = trpc.weeklySummary.getCashEnvelopes.useQuery(
    { weekStart: weekRange.startDate }
  );

  const { data: availabilitySources, refetch: refetchSources } = trpc.weeklySummary.listSources.useQuery();

  const { data: availabilityRecords, refetch: refetchRecords } = trpc.weeklySummary.getAvailabilityRecords.useQuery(
    { weekStart: weekRange.startDate }
  );

  const { data: allAvailabilityRecords } = trpc.weeklySummary.getAllAvailabilityRecords.useQuery();

  const upsertCashEnvelopeMutation = trpc.weeklySummary.upsertCashEnvelope.useMutation({
    onSuccess: () => {
      refetchCashEnvelopes();
      toast.success("Datos guardados correctamente");
    },
    onError: (error: any) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const upsertAvailabilityRecordMutation = trpc.weeklySummary.upsertAvailabilityRecord.useMutation({
    onSuccess: () => {
      refetchRecords();
      toast.success("Disponibilidad guardada correctamente");
    },
    onError: (error: any) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const createSourceMutation = trpc.weeklySummary.createSource.useMutation({
    onSuccess: () => {
      refetchSources();
      setIsAddingSource(false);
      setNewSourceName("");
      toast.success("Fuente creada correctamente");
    },
    onError: (error: any) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const deleteSourceMutation = trpc.weeklySummary.deleteSource.useMutation({
    onSuccess: () => {
      refetchSources();
      toast.success("Fuente eliminada correctamente");
    },
    onError: (error: any) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const [isAddingSource, setIsAddingSource] = useState(false);
  const [newSourceName, setNewSourceName] = useState("");
  const [newSourceType, setNewSourceType] = useState<"bank" | "cash_register" | "safe">("bank");

  const isLoading = hostelLoading || tiendaLoading;

  // Calcular totales combinados
  const totals = useMemo(() => {
    if (!hostelStats || !tiendaStats) return null;
    
    return {
      withdrawnCash: (hostelStats.withdrawnCash || 0) + (tiendaStats.withdrawnCash || 0),
      withdrawnCards: (hostelStats.withdrawnCards || 0) + (tiendaStats.withdrawnCards || 0),
      hostelIncome: hostelStats.totalIncome || 0,
      tiendaIncome: tiendaStats.totalIncome || 0,
      hostelExpenses: hostelStats.totalExpenses || 0,
      tiendaExpenses: tiendaStats.totalExpenses || 0,
      hostelBalance: hostelStats.netResult || 0,
      tiendaBalance: tiendaStats.netResult || 0,
      totalBalance: (hostelStats.netResult || 0) + (tiendaStats.netResult || 0),
    };
  }, [hostelStats, tiendaStats]);

  const allIncidents = [...(hostelIncidents || []), ...(tiendaIncidents || [])];
  const allLowStock = [...(hostelLowStock || []), ...(tiendaLowStock || [])];
  const allTasks = [...(hostelTasks || []), ...(tiendaTasks || [])];

  // Calcular total disponible de la semana
  const totalAvailability = useMemo(() => {
    if (!availabilityRecords || !availabilitySources) return 0;
    return availabilityRecords.reduce((sum, record) => {
      return sum + parseFloat(record.amount || "0");
    }, 0);
  }, [availabilityRecords, availabilitySources]);

  // Calcular desfase total de efectivo en sobres
  const totalCashDifference = useMemo(() => {
    if (!cashEnvelopes) return 0;
    return cashEnvelopes.reduce((sum, envelope) => {
      return sum + parseFloat(envelope.difference || "0");
    }, 0);
  }, [cashEnvelopes]);

  const handleSaveCashEnvelope = (dayOfWeek: number, expectedCash: string, actualCash: string) => {
    const expected = parseFloat(expectedCash) || 0;
    const actual = parseFloat(actualCash) || 0;
    const difference = actual - expected;

    upsertCashEnvelopeMutation.mutate({
      weekStart: weekRange.startDate,
      dayOfWeek,
      expectedCash: expected.toFixed(2),
      actualCash: actual.toFixed(2),
      difference: difference.toFixed(2),
    });
  };

  const handleSaveAvailability = (sourceId: number, amount: string) => {
    upsertAvailabilityRecordMutation.mutate({
      weekStart: weekRange.startDate,
      sourceId,
      amount: parseFloat(amount || "0").toFixed(2),
    });
  };

  const handleCreateSource = () => {
    if (!newSourceName.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    createSourceMutation.mutate({
      name: newSourceName.trim(),
      type: newSourceType,
      displayOrder: (availabilitySources?.length || 0) + 1,
    });
  };

  const handleDeleteSource = (id: number) => {
    if (confirm("¿Estás seguro de eliminar esta fuente?")) {
      deleteSourceMutation.mutate({ id });
    }
  };

  const weeklyCashChartOptions = useMemo<ChartOptions<"bar">>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (context) => context[0]?.raw && typeof context[0].raw === "number"
            ? context[0]?.label || ""
            : context[0]?.label || "",
          label: (context) => `Caja cerrada: €${Number(context.parsed.y || 0).toFixed(2)}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { callback: (value) => `€${value}` },
        grid: { color: "rgba(148, 163, 184, 0.14)" },
      },
      x: {
        grid: { display: false },
        ticks: { autoSkip: true, maxTicksLimit: 12, maxRotation: 0 },
      },
    },
  }), []);

  const hostelCashChartData = useMemo(() => ({
    labels: hostelWeeklyCash.map((week) => week.label),
    datasets: [{
      label: "Caja Hostel",
      data: hostelWeeklyCash.map((week) => week.total),
      backgroundColor: hostelWeeklyCash.map((week) => week.isCurrent ? "#0891b2" : "rgba(8, 145, 178, 0.58)"),
      borderRadius: 7,
      borderSkipped: false,
    }],
  }), [hostelWeeklyCash]);
  const tiendaCashChartData = useMemo(() => ({
    labels: tiendaWeeklyCash.map((week) => week.label),
    datasets: [{
      label: "Caja Tienda",
      data: tiendaWeeklyCash.map((week) => week.total),
      backgroundColor: tiendaWeeklyCash.map((week) => week.isCurrent ? "#7c3aed" : "rgba(124, 58, 237, 0.58)"),
      borderRadius: 7,
      borderSkipped: false,
    }],
  }), [tiendaWeeklyCash]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Resumen Semanal</h1>
          <p className="text-muted-foreground">Control completo de la semana</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSelectedWeek(selectedWeek - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 min-w-[200px] justify-center">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{weekRange.label}</span>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSelectedWeek(selectedWeek + 1)}
            disabled={selectedWeek >= 0}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Tabs key={weekRange.startDate} defaultValue="resumen" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
            <TabsTrigger value="resumen">Resumen</TabsTrigger>
            <TabsTrigger value="sobres">Efectivo en Sobres</TabsTrigger>
            <TabsTrigger value="disponibilidad">Disponibilidad</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>

          {/* TAB 1: RESUMEN GENERAL */}
          <TabsContent value="resumen" className="space-y-4">
            <Card className="overflow-hidden border-slate-200 shadow-sm">
              <CardHeader className="border-b bg-gradient-to-r from-slate-50 via-cyan-50/70 to-violet-50/70 pb-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Landmark className="h-5 w-5 text-primary" />
                      Cajas semanales
                    </CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">Ventas Z cerradas, con Hostel y Tienda siempre separados.</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 rounded-lg bg-background/80 p-1 shadow-sm ring-1 ring-slate-200">
                    {([4, 12, 52] as const).map((weeks) => (
                      <Button
                        key={weeks}
                        size="sm"
                        variant={cashHistoryWeeks === weeks ? "default" : "ghost"}
                        onClick={() => setCashHistoryWeeks(weeks)}
                        className="px-3"
                      >
                        {weeks === 52 ? "1 año" : `${weeks} sem.`}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="grid gap-5 xl:grid-cols-2">
                  <div className="rounded-xl border border-cyan-100 bg-cyan-50/30 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-cyan-700" /><h3 className="font-semibold text-cyan-950">The Spot Hostel</h3></div>
                      <span className="rounded-full bg-cyan-100 px-2.5 py-1 text-xs font-medium text-cyan-800">Caja Hostel</span>
                    </div>
                    <div className="h-64"><Bar data={hostelCashChartData} options={weeklyCashChartOptions} /></div>
                  </div>
                  <div className="rounded-xl border border-violet-100 bg-violet-50/30 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2"><Store className="h-4 w-4 text-violet-700" /><h3 className="font-semibold text-violet-950">Sweet & Salty</h3></div>
                      <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-800">Caja Tienda</span>
                    </div>
                    <div className="h-64"><Bar data={tiendaCashChartData} options={weeklyCashChartOptions} /></div>
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex items-center gap-2"><CircleDollarSign className="h-5 w-5 text-primary" /><h3 className="font-semibold">Últimas 4 semanas, incluida la actual</h3></div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {recentWeeklyCash.map((week) => (
                      <div key={week.weekStart} className={`rounded-xl border p-4 ${week.isCurrent ? "border-primary/30 bg-primary/5 shadow-sm" : "bg-background"}`}>
                        <div className="mb-3 flex items-start justify-between gap-2">
                          <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Semana</p><p className="text-sm font-semibold">{week.label}</p></div>
                          {week.isCurrent && <span className="rounded-full bg-primary px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">Actual</span>}
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2 text-sm"><span className="flex items-center gap-1.5 text-muted-foreground"><Building2 className="h-3.5 w-3.5 text-cyan-700" />Hostel</span><span className="font-semibold text-cyan-800">€{week.hostel.toFixed(2)}</span></div>
                          <div className="flex items-center justify-between gap-2 text-sm"><span className="flex items-center gap-1.5 text-muted-foreground"><Store className="h-3.5 w-3.5 text-violet-700" />Tienda</span><span className="font-semibold text-violet-800">€{week.tienda.toFixed(2)}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dinero retirado */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Dinero Retirado (Efectivo)</CardTitle>
                  <Wallet className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    €{totals?.withdrawnCash.toFixed(2) || "0.00"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Hostel: €{hostelStats?.withdrawnCash?.toFixed(2) || "0.00"} | Tienda: €{tiendaStats?.withdrawnCash?.toFixed(2) || "0.00"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Dinero Retirado (Tarjeta)</CardTitle>
                  <CreditCard className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    €{totals?.withdrawnCards.toFixed(2) || "0.00"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Hostel: €{hostelStats?.withdrawnCards?.toFixed(2) || "0.00"} | Tienda: €{tiendaStats?.withdrawnCards?.toFixed(2) || "0.00"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Ingresos y Gastos por negocio */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>The Spot Hostel</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Ingresos</span>
                    <span className="text-lg font-semibold text-green-600">€{totals?.hostelIncome.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Gastos</span>
                    <span className="text-lg font-semibold text-red-600">€{totals?.hostelExpenses.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-sm font-medium">Balance</span>
                    <span className={`text-xl font-bold ${(totals?.hostelBalance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      €{totals?.hostelBalance.toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Sweet & Salty</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Ingresos</span>
                    <span className="text-lg font-semibold text-green-600">€{totals?.tiendaIncome.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Gastos</span>
                    <span className="text-lg font-semibold text-red-600">€{totals?.tiendaExpenses.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-sm font-medium">Balance</span>
                    <span className={`text-xl font-bold ${(totals?.tiendaBalance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      €{totals?.tiendaBalance.toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Balance Total */}
            <Card className="bg-primary/5">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-medium">Balance Total Semanal</CardTitle>
                <TrendingUp className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${(totals?.totalBalance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  €{totals?.totalBalance.toFixed(2) || "0.00"}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Ingresos totales: €{((totals?.hostelIncome || 0) + (totals?.tiendaIncome || 0)).toFixed(2)} | 
                  Gastos totales: €{((totals?.hostelExpenses || 0) + (totals?.tiendaExpenses || 0)).toFixed(2)}
                </p>
              </CardContent>
            </Card>

            {/* Desglose Diario de Retiros */}
            <Card>
              <CardHeader>
                <CardTitle>Retiros Diarios</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map((dayName, dayIndex) => {
                    const monday = new Date(weekRange.startDate);
                    const currentDate = new Date(monday);
                    currentDate.setDate(monday.getDate() + dayIndex);
                    const year = currentDate.getFullYear();
                    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                    const day = String(currentDate.getDate()).padStart(2, '0');
                    const dateStr = `${year}-${month}-${day}`;
                    
                    const hostelDay = hostelDailyWithdrawals?.find(d => d.date === dateStr);
                    const tiendaDay = tiendaDailyWithdrawals?.find(d => d.date === dateStr);
                    
                    const totalCash = (parseFloat(hostelDay?.cashWithdrawn || '0') + parseFloat(tiendaDay?.cashWithdrawn || '0'));
                    const totalCards = (parseFloat(hostelDay?.cardWithdrawn || '0') + parseFloat(tiendaDay?.cardWithdrawn || '0'));
                    
                    return (
                      <div key={dayName} className="flex justify-between items-center py-2 border-b last:border-0">
                        <span className="text-sm font-medium">{dayName}</span>
                        <div className="flex gap-4 text-sm">
                          <span className="text-green-600">Efectivo: €{totalCash.toFixed(2)}</span>
                          <span className="text-blue-600">Tarjeta: €{totalCards.toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Alertas y Pendientes */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Incidencias Abiertas</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{allIncidents.length}</div>
                  {allIncidents.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {allIncidents.slice(0, 3).map((incident) => (
                        <div key={incident.id} className="text-xs p-2 bg-orange-50 rounded border-l-2 border-orange-500">
                          <p className="font-medium">{incident.title}</p>
                          <p className="text-muted-foreground">{incident.priority}</p>
                        </div>
                      ))}
                      {allIncidents.length > 3 && (
                        <p className="text-xs text-muted-foreground">+{allIncidents.length - 3} más...</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
                  <Package className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{allLowStock.length}</div>
                  {allLowStock.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {allLowStock.slice(0, 3).map((item) => (
                        <div key={item.id} className="text-xs p-2 bg-red-50 rounded border-l-2 border-red-500">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-muted-foreground">Stock: {item.currentStock} {item.unit}</p>
                        </div>
                      ))}
                      {allLowStock.length > 3 && (
                        <p className="text-xs text-muted-foreground">+{allLowStock.length - 3} más...</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tareas Pendientes</CardTitle>
                  <CheckSquare className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{allTasks.length}</div>
                  {allTasks.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {allTasks.slice(0, 3).map((task) => (
                        <div key={task.id} className="text-xs p-2 bg-blue-50 rounded border-l-2 border-blue-500">
                          <p className="font-medium">{task.title}</p>
                          <p className="text-muted-foreground">{task.priority}</p>
                        </div>
                      ))}
                      {allTasks.length > 3 && (
                        <p className="text-xs text-muted-foreground">+{allTasks.length - 3} más...</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 2: EFECTIVO EN SOBRES */}
          <TabsContent value="sobres" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Control de Efectivo en Sobres (Diario)</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Compara lo que debería haber vs lo que había cada día. Desfase total: 
                  <span className={`ml-2 font-bold ${totalCashDifference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    €{totalCashDifference.toFixed(2)}
                  </span>
                </p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Día</th>
                        <th className="text-right p-2">Debería Haber</th>
                        <th className="text-right p-2">Había</th>
                        <th className="text-right p-2">Desfase</th>
                        {isAdmin && <th className="text-right p-2">Acciones</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map((dayName, dayIndex) => {
                        // Calcular fecha del día
                        const monday = new Date(weekRange.startDate);
                        const currentDate = new Date(monday);
                        currentDate.setDate(monday.getDate() + dayIndex);
                        const year = currentDate.getFullYear();
                        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                        const day = String(currentDate.getDate()).padStart(2, '0');
                        const dateStr = `${year}-${month}-${day}`;
                        
                        // Obtener retiros del día
                        const hostelDay = hostelDailyWithdrawals?.find(d => d.date === dateStr);
                        const tiendaDay = tiendaDailyWithdrawals?.find(d => d.date === dateStr);
                        const dailyWithdrawal = (parseFloat(hostelDay?.cashWithdrawn || '0') + parseFloat(tiendaDay?.cashWithdrawn || '0'));
                        
                        return (
                          <CashEnvelopeRow
                            key={dayName}
                            dayName={dayName}
                            dayOfWeek={dayIndex + 1}
                            envelope={cashEnvelopes?.find(e => e.dayOfWeek === dayIndex + 1)}
                            dailyWithdrawal={dailyWithdrawal}
                            isAdmin={isAdmin}
                            onSave={handleSaveCashEnvelope}
                          />
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: DISPONIBILIDAD */}
          <TabsContent value="disponibilidad" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Disponibilidad Semanal a {weekRange.nextMondayLabel}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Total disponible: 
                      <span className="ml-2 font-bold text-primary text-lg">
                        €{totalAvailability.toFixed(2)}
                      </span>
                    </p>
                  </div>
                  {isAdmin && (
                    <Button onClick={() => setIsAddingSource(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Nueva Fuente
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {availabilitySources?.map((source) => (
                    <AvailabilitySourceRow
                      key={source.id}
                      source={source}
                      record={availabilityRecords?.find(r => r.sourceId === source.id)}
                      isAdmin={isAdmin}
                      onSave={handleSaveAvailability}
                      onDelete={handleDeleteSource}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: HISTÓRICO */}
          <TabsContent value="historico" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Histórico de Disponibilidad Total
                </CardTitle>
                <p className="text-sm text-muted-foreground">Evolución de la disponibilidad total por semana</p>
              </CardHeader>
              <CardContent>
                {(() => {
                  // Agrupar datos por año y semana
                  // El lunes almacenado en la base de datos es el identificador único de cada semana.
                  // Así, semanas diferentes no se mezclan en etiquetas genéricas como S1 o S2.
                  const { allWeeks, yearsWithData } = buildAvailabilityHistory(allAvailabilityRecords || []);
                  
                  // Colores para cada año
                  const colors = [
                    { border: 'rgb(59, 130, 246)', bg: 'rgba(59, 130, 246, 0.1)' }, // Azul
                    { border: 'rgb(34, 197, 94)', bg: 'rgba(34, 197, 94, 0.1)' }, // Verde
                    { border: 'rgb(249, 115, 22)', bg: 'rgba(249, 115, 22, 0.1)' }, // Naranja
                    { border: 'rgb(168, 85, 247)', bg: 'rgba(168, 85, 247, 0.1)' }, // Púrpura
                    { border: 'rgb(236, 72, 153)', bg: 'rgba(236, 72, 153, 0.1)' }, // Rosa
                  ];
                  
                  // Crear datasets por año
                  const datasets = yearsWithData.map((year, index) => {
                    const color = colors[index % colors.length];
                    
                    return {
                      label: String(year),
                      data: allWeeks.map(week => week.totals[year] ?? null),
                      borderColor: color.border,
                      backgroundColor: color.bg,
                      pointRadius: 6,
                      pointHoverRadius: 8,
                      tension: 0.3,
                      fill: false,
                      spanGaps: false,
                    };
                  });
                  
                  const chartData = {
                    labels: allWeeks.map(week => week.label),
                    datasets
                  };
                  
                  const options: ChartOptions<'line'> = {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'top' as const,
                      },
                      tooltip: {
                        callbacks: {
                          title: function(context) {
                            return `Semana del ${context[0]?.label || ''}`;
                          },
                          label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                              label += ': ';
                            }
                            if (context.parsed.y !== null) {
                              label += '€' + context.parsed.y.toFixed(2);
                            }
                            return label;
                          }
                        }
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          callback: function(value) {
                            return '€' + value;
                          }
                        }
                      },
                      x: {
                        ticks: {
                          autoSkip: true,
                          maxTicksLimit: 16,
                          maxRotation: 60,
                          minRotation: 45,
                        }
                      }
                    }
                  };
                  
                  return (
                    <div className="h-[400px]">
                      {datasets.length > 0 ? (
                        <Line data={chartData} options={options} />
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          <p>No hay datos históricos disponibles. Registra la disponibilidad semanal para ver el gráfico.</p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Dialog para agregar nueva fuente */}
      <Dialog open={isAddingSource} onOpenChange={setIsAddingSource}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Fuente de Disponibilidad</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="sourceName">Nombre</Label>
              <Input
                id="sourceName"
                value={newSourceName}
                onChange={(e) => setNewSourceName(e.target.value)}
                placeholder="Ej: Cuenta Revolut"
              />
            </div>
            <div>
              <Label htmlFor="sourceType">Tipo</Label>
              <Select value={newSourceType} onValueChange={(value: any) => setNewSourceType(value)}>
                <SelectTrigger id="sourceType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">Banco</SelectItem>
                  <SelectItem value="safe">Caja Fuerte</SelectItem>
                  <SelectItem value="cash_register">Caja Registradora</SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddingSource(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateSource} disabled={createSourceMutation.isPending}>
                {createSourceMutation.isPending ? "Creando..." : "Crear"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

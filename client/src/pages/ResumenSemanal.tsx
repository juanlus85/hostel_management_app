import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, TrendingUp, Wallet, CreditCard, AlertTriangle, Package, CheckSquare, Calendar, ChevronLeft, ChevronRight, Plus, Pencil, Trash2, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
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
        <Tabs defaultValue="resumen" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="resumen">Resumen</TabsTrigger>
            <TabsTrigger value="sobres">Efectivo en Sobres</TabsTrigger>
            <TabsTrigger value="disponibilidad">Disponibilidad</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>

          {/* TAB 1: RESUMEN GENERAL */}
          <TabsContent value="resumen" className="space-y-4">
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
                  const dataByYear: Record<number, { week: string; total: number }[]> = {};
                  
                  allAvailabilityRecords?.forEach(record => {
                    const weekDate = new Date(record.weekStart);
                    const year = weekDate.getFullYear();
                    const weekNumber = Math.ceil((weekDate.getDate() + 6 - weekDate.getDay()) / 7);
                    const weekLabel = `S${weekNumber}`;
                    
                    if (!dataByYear[year]) {
                      dataByYear[year] = [];
                    }
                    
                    // Buscar si ya existe esta semana
                    const existingWeek = dataByYear[year].find(w => w.week === weekLabel);
                    if (existingWeek) {
                      existingWeek.total += parseFloat(record.amount);
                    } else {
                      dataByYear[year].push({
                        week: weekLabel,
                        total: parseFloat(record.amount)
                      });
                    }
                  });
                  
                  // Obtener todas las semanas únicas
                  const allWeeks = Array.from(
                    new Set(
                      Object.values(dataByYear).flatMap(weeks => weeks.map(w => w.week))
                    )
                  ).sort((a, b) => {
                    const numA = parseInt(a.replace('S', ''));
                    const numB = parseInt(b.replace('S', ''));
                    return numA - numB;
                  });
                  
                  // Colores para cada año
                  const colors = [
                    { border: 'rgb(59, 130, 246)', bg: 'rgba(59, 130, 246, 0.1)' }, // Azul
                    { border: 'rgb(34, 197, 94)', bg: 'rgba(34, 197, 94, 0.1)' }, // Verde
                    { border: 'rgb(249, 115, 22)', bg: 'rgba(249, 115, 22, 0.1)' }, // Naranja
                    { border: 'rgb(168, 85, 247)', bg: 'rgba(168, 85, 247, 0.1)' }, // Púrpura
                    { border: 'rgb(236, 72, 153)', bg: 'rgba(236, 72, 153, 0.1)' }, // Rosa
                  ];
                  
                  // Crear datasets por año
                  const datasets = Object.keys(dataByYear).sort().map((year, index) => {
                    const yearData = dataByYear[parseInt(year)];
                    const color = colors[index % colors.length];
                    
                    return {
                      label: year,
                      data: allWeeks.map(week => {
                        const weekData = yearData.find(w => w.week === week);
                        return weekData ? weekData.total : null;
                      }),
                      borderColor: color.border,
                      backgroundColor: color.bg,
                      pointRadius: 6,
                      pointHoverRadius: 8,
                      tension: 0.3,
                      fill: false
                    };
                  });
                  
                  const chartData = {
                    labels: allWeeks,
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

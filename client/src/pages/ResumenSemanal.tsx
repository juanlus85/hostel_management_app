import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, TrendingUp, TrendingDown, Wallet, CreditCard, AlertTriangle, Package, CheckSquare, Calendar } from "lucide-react";

export default function ResumenSemanal() {
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
      label: `${monday.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} - ${sunday.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}`
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Resumen Semanal</h1>
          <p className="text-muted-foreground">Vista consolidada de ambos negocios</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedWeek.toString()} onValueChange={(v) => setSelectedWeek(parseInt(v))}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Esta semana</SelectItem>
              <SelectItem value="-1">Semana pasada</SelectItem>
              <SelectItem value="-2">Hace 2 semanas</SelectItem>
              <SelectItem value="-3">Hace 3 semanas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{weekRange.label}</p>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
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
                  // Calcular la fecha real para este día de la semana
                  const monday = new Date(weekRange.startDate);
                  const currentDate = new Date(monday);
                  currentDate.setDate(monday.getDate() + dayIndex);
                  // Formatear sin conversión a UTC
                  const year = currentDate.getFullYear();
                  const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                  const day = String(currentDate.getDate()).padStart(2, '0');
                  const dateStr = `${year}-${month}-${day}`;
                  
                  // Buscar retiros de Hostel para esta fecha
                  const hostelDay = hostelDailyWithdrawals?.find(d => d.date === dateStr);
                  const tiendaDay = tiendaDailyWithdrawals?.find(d => d.date === dateStr);
                  
                  // Sumar retiros de ambos negocios
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
        </>
      )}
    </div>
  );
}

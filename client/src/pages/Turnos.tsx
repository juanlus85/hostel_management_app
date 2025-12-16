import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Calendar, Clock, Plus, Play, Square, ChevronLeft, ChevronRight, Edit2, Trash2, CalendarDays, CalendarRange, Wand2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const DAYS_FULL = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const COLORS = [
  "bg-blue-100 text-blue-800 border-blue-200",
  "bg-pink-100 text-pink-800 border-pink-200",
  "bg-green-100 text-green-800 border-green-200",
  "bg-yellow-100 text-yellow-800 border-yellow-200",
  "bg-purple-100 text-purple-800 border-purple-200",
  "bg-orange-100 text-orange-800 border-orange-200",
];

export default function Turnos() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<any>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState("");
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("18:00");
  
  // Edit form
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editDate, setEditDate] = useState("");
  
  // Generate shifts dialog
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);

  const utils = trpc.useUtils();

  // Get month range for monthly view
  const monthRange = useMemo(() => {
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    return {
      start,
      end,
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  }, [currentDate]);

  // Get week range
  const weekRange = useMemo(() => {
    const start = new Date(currentDate);
    start.setDate(currentDate.getDate() - currentDate.getDay() + 1);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return {
      start,
      end,
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  }, [currentDate]);

  // Get days of the week
  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekRange.start);
      day.setDate(weekRange.start.getDate() + i);
      days.push(day);
    }
    return days;
  }, [weekRange]);

  // Get days of the month for calendar view
  const monthDays = useMemo(() => {
    const days: (Date | null)[] = [];
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    // Add empty days for the start of the week
    const startDayOfWeek = (firstDay.getDay() + 6) % 7; // Monday = 0
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), d));
    }
    
    return days;
  }, [currentDate]);

  const { data: users } = trpc.users.list.useQuery();
  
  // Always load shifts for the entire month to ensure both views have complete data
  // This prevents discrepancies between weekly and monthly views
  const { data: shifts, isLoading } = trpc.shifts.list.useQuery({
    startDate: monthRange.startDate,
    endDate: monthRange.endDate,
  });

  const createShift = trpc.shifts.create.useMutation({
    onSuccess: () => {
      toast.success("Turno creado correctamente");
      utils.shifts.list.invalidate();
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Error al crear turno: " + error.message);
    },
  });

  const updateShift = trpc.shifts.update.useMutation({
    onSuccess: () => {
      toast.success("Turno actualizado");
      utils.shifts.list.invalidate();
      setIsEditDialogOpen(false);
      setSelectedShift(null);
    },
    onError: (error) => {
      toast.error("Error: " + error.message);
    },
  });

  const clockIn = trpc.shifts.clockIn.useMutation({
    onSuccess: () => {
      toast.success("Entrada registrada");
      utils.shifts.list.invalidate();
    },
  });

  const clockOut = trpc.shifts.clockOut.useMutation({
    onSuccess: () => {
      toast.success("Salida registrada");
      utils.shifts.list.invalidate();
    },
  });

  const deleteShift = trpc.shifts.delete.useMutation({
    onSuccess: () => {
      toast.success("Turno eliminado");
      utils.shifts.list.invalidate();
    },
  });

  const generateFromTemplates = trpc.shifts.generateFromTemplates.useMutation({
    onSuccess: (result) => {
      toast.success(`Turnos generados: ${result.created} creados, ${result.skipped} ya existían`);
      utils.shifts.list.invalidate();
      setIsGenerateDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Error al generar turnos: " + error.message);
    },
  });

  const resetForm = () => {
    setSelectedUserId("");
    setSelectedDate("");
    setStartTime("10:00");
    setEndTime("18:00");
  };

  const handleCreateShift = () => {
    if (!selectedUserId || !selectedDate) {
      toast.error("Selecciona empleado y fecha");
      return;
    }
    createShift.mutate({
      userId: parseInt(selectedUserId),
      scheduledDate: selectedDate,
      scheduledStart: startTime,
      scheduledEnd: endTime,
    });
  };

  const openEditDialog = (shift: any) => {
    setSelectedShift(shift);
    setEditStartTime(shift.scheduledStart);
    setEditEndTime(shift.scheduledEnd);
    setEditDate(shift.scheduledDate);
    setIsEditDialogOpen(true);
  };

  const handleUpdateShift = () => {
    if (!selectedShift) return;
    updateShift.mutate({
      id: selectedShift.id,
      scheduledDate: editDate,
      scheduledStart: editStartTime,
      scheduledEnd: editEndTime,
    });
  };

  const handleDeleteShift = (id: number) => {
    if (confirm("¿Seguro que quieres eliminar este turno?")) {
      deleteShift.mutate({ id });
    }
  };

  const navigateWeek = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + direction * 7);
    setCurrentDate(newDate);
  };

  const navigateMonth = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  // Quick add shift by clicking on a day
  const handleDayClick = (day: Date, userId?: number) => {
    if (!isAdmin) return;
    setSelectedDate(day.toISOString().split('T')[0]);
    if (userId) setSelectedUserId(userId.toString());
    setIsDialogOpen(true);
  };

  // Group shifts by user
  const shiftsByUser = useMemo(() => {
    if (!shifts || !users) return new Map();
    const map = new Map<number, typeof shifts>();
    users.forEach(u => map.set(u.id, []));
    shifts.forEach(s => {
      const userShifts = map.get(s.userId) || [];
      userShifts.push(s);
      map.set(s.userId, userShifts);
    });
    return map;
  }, [shifts, users]);

  // Group shifts by date (for month view)
  const shiftsByDate = useMemo(() => {
    if (!shifts) return new Map();
    const map = new Map<string, typeof shifts>();
    shifts.forEach(s => {
      const dateShifts = map.get(s.scheduledDate) || [];
      dateShifts.push(s);
      map.set(s.scheduledDate, dateShifts);
    });
    return map;
  }, [shifts]);

  // Get user color
  const getUserColor = (userId: number) => {
    const index = (users?.findIndex(u => u.id === userId) || 0) % COLORS.length;
    return COLORS[index];
  };

  // Get user name
  const getUserName = (userId: number) => {
    const u = users?.find(u => u.id === userId);
    return u?.name?.split(' ')[0] || 'Sin nombre';
  };

  // Get my shifts for today
  const myTodayShifts = useMemo(() => {
    if (!shifts || !user) return [];
    const today = new Date().toISOString().split('T')[0];
    return shifts.filter(s => s.userId === user.id && s.scheduledDate === today);
  }, [shifts, user]);

  const formatWeekRange = () => {
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    return `${weekRange.start.toLocaleDateString('es-ES', options)} - ${weekRange.end.toLocaleDateString('es-ES', options)}, ${weekRange.start.getFullYear()}`;
  };

  const formatMonth = () => {
    return currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            Turnos
          </h1>
          <p className="text-muted-foreground">Gestión de horarios y calendario de empleados</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Wand2 className="h-4 w-4 mr-2" />
                  Generar mes
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Generar turnos del mes</DialogTitle>
                  <DialogDescription>
                    Genera automáticamente los turnos de {currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })} basados en los horarios habituales configurados en cada empleado.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Se crearán turnos para todos los empleados que tengan horarios habituales configurados. Los turnos que ya existan no se duplicarán.
                  </p>
                  <p className="text-sm">
                    <strong>Mes:</strong> {currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsGenerateDialogOpen(false)}>Cancelar</Button>
                  <Button 
                    onClick={() => generateFromTemplates.mutate({ year: currentDate.getFullYear(), month: currentDate.getMonth() + 1 })}
                    disabled={generateFromTemplates.isPending}
                  >
                    {generateFromTemplates.isPending ? "Generando..." : "Generar turnos"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo turno
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear nuevo turno</DialogTitle>
                <DialogDescription>Asigna un turno a un empleado</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Empleado</Label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar empleado" />
                    </SelectTrigger>
                    <SelectContent>
                      {users?.map(u => (
                        <SelectItem key={u.id} value={u.id.toString()}>
                          {u.name || u.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Fecha</Label>
                  <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Hora entrada</Label>
                    <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Hora salida</Label>
                    <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreateShift} disabled={createShift.isPending}>
                  {createShift.isPending ? "Creando..." : "Crear turno"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        )}
      </div>

      {/* My Today's Shifts */}
      {myTodayShifts.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Mis turnos de hoy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {myTodayShifts.map((shift: any) => (
                <div key={shift.id} className="flex items-center justify-between p-3 rounded-lg bg-background border">
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{shift.scheduledStart} - {shift.scheduledEnd}</p>
                      <p className="text-sm text-muted-foreground">
                        Estado: {shift.status === "scheduled" ? "Programado" : 
                                shift.status === "in_progress" ? "En curso" : 
                                shift.status === "completed" ? "Completado" : "Cancelado"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {shift.status === "scheduled" && (
                      <Button size="sm" onClick={() => clockIn.mutate({ id: shift.id })}>
                        <Play className="h-4 w-4 mr-1" />
                        Fichar entrada
                      </Button>
                    )}
                    {shift.status === "in_progress" && (
                      <Button size="sm" variant="secondary" onClick={() => clockOut.mutate({ id: shift.id })}>
                        <Square className="h-4 w-4 mr-1" />
                        Fichar salida
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* View Mode Tabs */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "week" | "month")}>
        <TabsList>
          <TabsTrigger value="week" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Semanal
          </TabsTrigger>
          <TabsTrigger value="month" className="flex items-center gap-2">
            <CalendarRange className="h-4 w-4" />
            Mensual
          </TabsTrigger>
        </TabsList>

        {/* Weekly View */}
        <TabsContent value="week">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>Calendario semanal</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => navigateWeek(-1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium min-w-[180px] text-center">{formatWeekRange()}</span>
                  <Button variant="outline" size="icon" onClick={() => navigateWeek(1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <div className="min-w-[700px]">
                  {/* Header */}
                  <div className="grid grid-cols-8 gap-1 mb-2">
                    <div className="p-2 text-sm font-medium text-muted-foreground">Empleado</div>
                    {weekDays.map((day, i) => {
                      const isToday = day.toDateString() === new Date().toDateString();
                      return (
                        <div key={i} className={`p-2 text-center rounded-lg ${isToday ? 'bg-primary/10' : ''}`}>
                          <div className="text-xs text-muted-foreground">{DAYS[i]}</div>
                          <div className={`text-sm font-medium ${isToday ? 'text-primary' : ''}`}>{day.getDate()}</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Rows */}
                  {users?.map(u => {
                    const userShifts = shiftsByUser.get(u.id) || [];
                    const colorClass = getUserColor(u.id);
                    return (
                      <div key={u.id} className="grid grid-cols-8 gap-1 border-t py-2">
                        <div className="p-2 flex items-center">
                          <span className={`text-sm font-medium px-2 py-1 rounded ${colorClass} border`}>
                            {u.name?.split(' ')[0] || 'Sin nombre'}
                          </span>
                        </div>
                        {weekDays.map((day, i) => {
                          const dateStr = day.toISOString().split('T')[0];
                          const dayShifts = userShifts.filter((s: any) => s.scheduledDate === dateStr);
                          return (
                            <div 
                              key={i} 
                              className={`p-1 min-h-[60px] rounded ${isAdmin ? 'cursor-pointer hover:bg-muted/50' : ''}`}
                              onClick={() => dayShifts.length === 0 && handleDayClick(day, u.id)}
                            >
                              {dayShifts.map((shift: any) => (
                                <div 
                                  key={shift.id} 
                                  className={`text-xs p-1.5 rounded mb-1 ${colorClass} border cursor-pointer hover:opacity-80 group relative`}
                                  onClick={(e) => { e.stopPropagation(); if (isAdmin) openEditDialog(shift); }}
                                >
                                  <div className="font-medium">{shift.scheduledStart}</div>
                                  <div>{shift.scheduledEnd}</div>
                                  {isAdmin && (
                                    <button 
                                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={(e) => { e.stopPropagation(); handleDeleteShift(shift.id); }}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monthly View */}
        <TabsContent value="month">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="capitalize">{formatMonth()}</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => navigateMonth(-1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => navigateMonth(1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1">
                {/* Header */}
                {DAYS.map(day => (
                  <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                    {day}
                  </div>
                ))}
                
                {/* Days */}
                {monthDays.map((day, i) => {
                  if (!day) {
                    return <div key={`empty-${i}`} className="p-2 min-h-[100px]" />;
                  }
                  const dateStr = day.toISOString().split('T')[0];
                  const dayShifts = shiftsByDate.get(dateStr) || [];
                  const isToday = day.toDateString() === new Date().toDateString();
                  
                  return (
                    <div 
                      key={dateStr} 
                      className={`p-2 min-h-[100px] border rounded-lg ${isToday ? 'bg-primary/5 border-primary/20' : ''} ${isAdmin ? 'cursor-pointer hover:bg-muted/30' : ''}`}
                      onClick={() => handleDayClick(day)}
                    >
                      <div className={`text-sm font-medium mb-1 ${isToday ? 'text-primary' : ''}`}>
                        {day.getDate()}
                      </div>
                      <div className="space-y-1">
                        {dayShifts.slice(0, 3).map((shift: any) => (
                          <div 
                            key={shift.id}
                            className={`text-xs px-1 py-0.5 rounded truncate ${getUserColor(shift.userId)}`}
                            onClick={(e) => { e.stopPropagation(); if (isAdmin) openEditDialog(shift); }}
                          >
                            {getUserName(shift.userId)} {shift.scheduledStart} - {shift.scheduledEnd}
                          </div>
                        ))}
                        {dayShifts.length > 3 && (
                          <div className="text-xs text-muted-foreground">+{dayShifts.length - 3} más</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Hours Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen de horas</CardTitle>
          <CardDescription>Horas programadas {viewMode === "week" ? "esta semana" : "este mes"} por empleado</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {users?.map(u => {
              const allUserShifts = shiftsByUser.get(u.id) || [];
              // Filter shifts based on current view mode
              const userShifts = viewMode === "week" 
                ? allUserShifts.filter((s: any) => s.scheduledDate >= weekRange.startDate && s.scheduledDate <= weekRange.endDate)
                : allUserShifts;
              const totalHours = userShifts.reduce((sum: number, s: any) => {
                const [startH, startM] = s.scheduledStart.split(':').map(Number);
                const [endH, endM] = s.scheduledEnd.split(':').map(Number);
                let hours = (endH + endM/60) - (startH + startM/60);
                // Handle shifts that cross midnight (e.g., 17:00 to 02:00)
                if (hours < 0) hours += 24;
                return sum + hours;
              }, 0);
              const colorClass = getUserColor(u.id);
              return (
                <div key={u.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-medium px-2 py-1 rounded ${colorClass} border`}>
                      {u.name?.split(' ')[0] || 'Sin nombre'}
                    </span>
                    <span className="text-sm text-muted-foreground">{u.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold">{totalHours.toFixed(1)}h</span>
                    <span className="text-sm text-muted-foreground ml-2">programadas</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Edit Shift Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar turno</DialogTitle>
            <DialogDescription>
              {selectedShift && users?.find(u => u.id === selectedShift.userId)?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Fecha</Label>
              <Input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Hora entrada</Label>
                <Input type="time" value={editStartTime} onChange={e => setEditStartTime(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Hora salida</Label>
                <Input type="time" value={editEndTime} onChange={e => setEditEndTime(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdateShift} disabled={updateShift.isPending}>
              {updateShift.isPending ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

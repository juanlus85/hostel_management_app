import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { canBeScheduled } from "@shared/shiftEligibility";
import { canRescheduleShift } from "@shared/shiftDragDrop";
import { totalReportHours } from "@shared/hoursReport";
import { Calendar, Clock, Plus, Play, Square, ChevronLeft, ChevronRight, Edit2, Trash2, CalendarDays, CalendarRange, Wand2, GripVertical, FileText } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";

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
  const [draggedShiftId, setDraggedShiftId] = useState<number | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  
  // Generate shifts dialog
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [isHoursReportDialogOpen, setIsHoursReportDialogOpen] = useState(false);
  const [hoursReportMode, setHoursReportMode] = useState<"all" | "employee">("all");
  const [hoursReportUserId, setHoursReportUserId] = useState("");
  const initialReportDate = new Date();
  const [hoursReportStart, setHoursReportStart] = useState(`${initialReportDate.getFullYear()}-${String(initialReportDate.getMonth() + 1).padStart(2, "0")}-01`);
  const [hoursReportEnd, setHoursReportEnd] = useState(`${initialReportDate.getFullYear()}-${String(initialReportDate.getMonth() + 1).padStart(2, "0")}-${String(new Date(initialReportDate.getFullYear(), initialReportDate.getMonth() + 1, 0).getDate()).padStart(2, "0")}`);

  const utils = trpc.useUtils();

  // Get month range for monthly view
  const monthRange = useMemo(() => {
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    // Usar formato local para evitar desplazamiento de días por UTC
    const startDate = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
    const endDate = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
    return {
      start,
      end,
      startDate,
      endDate,
    };
  }, [currentDate]);

  // Get week range
  const weekRange = useMemo(() => {
    const start = new Date(currentDate);
    start.setDate(currentDate.getDate() - currentDate.getDay() + 1);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    // Usar formato local para evitar desplazamiento de días por UTC
    const startDate = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
    const endDate = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
    return {
      start,
      end,
      startDate,
      endDate,
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
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // Add empty days for the start of the week
    const startDayOfWeek = (firstDay.getDay() + 6) % 7; // Monday = 0
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month (1 to daysInMonth inclusive)
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(new Date(year, month, d));
    }
    
    return days;
  }, [currentDate]);

  const { data: users } = trpc.users.list.useQuery();
  const shiftUsers = (users || []).filter((user) => canBeScheduled(user.role));
  
  // Load shifts based on current view mode
  // Weekly view: load only the current week (including days from next/prev month)
  // Monthly view: load the entire month
  const queryRange = viewMode === "week" ? weekRange : monthRange;
  const { data: shifts, isLoading } = trpc.shifts.list.useQuery({
    startDate: queryRange.startDate,
    endDate: queryRange.endDate,
  });
  const { data: reportShifts } = trpc.shifts.list.useQuery({ startDate: hoursReportStart, endDate: hoursReportEnd }, { enabled: isAdmin && isHoursReportDialogOpen });

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

  const handleShiftDrop = (event: React.DragEvent<HTMLDivElement>, targetDate: string) => {
    event.preventDefault();
    setDragOverDate(null);
    const shiftId = Number(event.dataTransfer.getData("text/plain"));
    const shift = shifts?.find((item) => item.id === shiftId);
    if (!shift || !canRescheduleShift(shift.status, shift.scheduledDate, targetDate)) {
      if (shift && shift.status !== "scheduled") toast.error("Solo se pueden reprogramar turnos programados");
      return;
    }
    updateShift.mutate({ id: shiftId, scheduledDate: targetDate });
  };

  const startShiftDrag = (event: React.DragEvent<HTMLDivElement>, shift: any) => {
    if (!isAdmin || shift.status !== "scheduled") return;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(shift.id));
    setDraggedShiftId(shift.id);
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
    // Usar formato local para evitar desplazamiento de días por UTC
    const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    setSelectedDate(dateStr);
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

  // Get user color (returns Tailwind classes for predefined colors or null for custom colors)
  const getUserColor = (userId: number) => {
    const user = shiftUsers.find(u => u.id === userId);
    // If user has custom color, return null (we'll use inline styles)
    if (user?.color) return null;
    // Fallback to predefined Tailwind colors
    const index = (shiftUsers.findIndex(u => u.id === userId) || 0) % COLORS.length;
    return COLORS[index];
  };

  // Get user custom color hex
  const getUserColorHex = (userId: number) => {
    const user = shiftUsers.find(u => u.id === userId);
    return user?.color || null;
  };

  // Get user name
  const getUserName = (userId: number) => {
    const u = shiftUsers.find(u => u.id === userId);
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

  const exportHoursPdf = () => {
    if (hoursReportMode === "employee" && !hoursReportUserId) { toast.error("Selecciona un trabajador"); return; }
    const selectedShifts = (reportShifts || []).filter((shift) => hoursReportMode === "all" || shift.userId === Number(hoursReportUserId));
    const reportUsers = hoursReportMode === "all" ? shiftUsers : shiftUsers.filter((worker) => worker.id === Number(hoursReportUserId));
    const doc = new jsPDF();
    let y = 18;
    doc.setFontSize(16); doc.text("Extracto de horas · The Spot Central Hostel", 14, y); y += 8;
    doc.setFontSize(10); doc.text(`Periodo: ${hoursReportStart} — ${hoursReportEnd}`, 14, y); y += 10;
    reportUsers.forEach((worker) => {
      const workerShifts = selectedShifts.filter((shift) => shift.userId === worker.id);
      if (y > 270) { doc.addPage(); y = 18; }
      doc.setFontSize(12); doc.text(`${worker.name || worker.email || "Trabajador"} · ${totalReportHours(workerShifts).toFixed(2)} horas`, 14, y); y += 6;
      doc.setFontSize(9);
      if (!workerShifts.length) { doc.text("Sin turnos en este periodo", 18, y); y += 6; }
      workerShifts.filter((shift) => shift.status !== "cancelled").forEach((shift) => { if (y > 280) { doc.addPage(); y = 18; } doc.text(`${shift.scheduledDate}   ${shift.scheduledStart} - ${shift.scheduledEnd}`, 18, y); y += 5; });
      y += 5;
    });
    doc.save(`HORAS_${hoursReportStart}_${hoursReportEnd}${hoursReportMode === "employee" ? `_${hoursReportUserId}` : "_TODOS"}.pdf`);
    toast.success("Extracto de horas descargado en PDF");
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
          {isAdmin && <p className="mt-1 text-xs text-muted-foreground">Arrastra un turno programado a otro día para reprogramarlo.</p>}
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Dialog open={isHoursReportDialogOpen} onOpenChange={setIsHoursReportDialogOpen}>
              <DialogTrigger asChild><Button variant="outline"><FileText className="mr-2 h-4 w-4" />Horas PDF</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Extracto de horas</DialogTitle><DialogDescription>Descarga las horas de todos los trabajadores de un mes o las de un trabajador para el rango de meses que indiques.</DialogDescription></DialogHeader>
                <div className="grid gap-4 py-3">
                  <div className="grid gap-2"><Label>Informe</Label><Select value={hoursReportMode} onValueChange={(value) => setHoursReportMode(value as "all" | "employee")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos los trabajadores</SelectItem><SelectItem value="employee">Un trabajador</SelectItem></SelectContent></Select></div>
                  {hoursReportMode === "employee" && <div className="grid gap-2"><Label>Trabajador</Label><Select value={hoursReportUserId} onValueChange={setHoursReportUserId}><SelectTrigger><SelectValue placeholder="Seleccionar trabajador" /></SelectTrigger><SelectContent>{shiftUsers.map((worker) => <SelectItem key={worker.id} value={String(worker.id)}>{worker.name || worker.email}</SelectItem>)}</SelectContent></Select></div>}
                  <div className="grid grid-cols-2 gap-4"><div className="grid gap-2"><Label>Desde</Label><Input type="date" value={hoursReportStart} onChange={(event) => setHoursReportStart(event.target.value)} /></div><div className="grid gap-2"><Label>Hasta</Label><Input type="date" value={hoursReportEnd} onChange={(event) => setHoursReportEnd(event.target.value)} /></div></div>
                </div>
                <DialogFooter><Button variant="outline" onClick={() => setIsHoursReportDialogOpen(false)}>Cancelar</Button><Button onClick={exportHoursPdf}><FileText className="mr-2 h-4 w-4" />Descargar PDF</Button></DialogFooter>
              </DialogContent>
            </Dialog>
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
                      {shiftUsers.map(u => (
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
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle>Calendario semanal</CardTitle>
                <div className="flex w-full items-center justify-between gap-2 sm:w-auto">
                  <Button variant="outline" size="icon" onClick={() => navigateWeek(-1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs font-medium text-center sm:min-w-[180px] sm:text-sm">{formatWeekRange()}</span>
                  <Button variant="outline" size="icon" onClick={() => navigateWeek(1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <div className="min-w-[640px] sm:min-w-[700px]">
                  {/* Header */}
                  <div className="grid grid-cols-8 gap-1 mb-2">
                    <div className="p-1 text-xs font-medium text-muted-foreground sm:p-2 sm:text-sm">Empleado</div>
                    {weekDays.map((day, i) => {
                      const isToday = day.toDateString() === new Date().toDateString();
                      return (
                        <div key={i} className={`p-1 text-center rounded-lg sm:p-2 ${isToday ? 'bg-primary/10' : ''}`}>
                          <div className="text-xs text-muted-foreground">{DAYS[i]}</div>
                          <div className={`text-sm font-medium ${isToday ? 'text-primary' : ''}`}>{day.getDate()}</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Rows */}
                  {shiftUsers.map(u => {
                    const userShifts = shiftsByUser.get(u.id) || [];
                    const colorClass = getUserColor(u.id);
                    const customColor = getUserColorHex(u.id);
                    return (
                      <div key={u.id} className="grid grid-cols-8 gap-1 border-t py-1 sm:py-2">
                        <div className="p-1 sm:p-2 flex items-center">
                          <span 
                            className={`text-xs font-medium px-1 py-1 rounded border sm:px-2 sm:text-sm ${colorClass || ''}`}
                            style={customColor ? {
                              backgroundColor: `${customColor}15`,
                              color: customColor,
                              borderColor: `${customColor}50`
                            } : {}}
                          >
                            {u.name?.split(' ')[0] || 'Sin nombre'}
                          </span>
                        </div>
                        {weekDays.map((day, i) => {
                          // Usar formato local para evitar desplazamiento de días por UTC
                          const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
                          const dayShifts = userShifts.filter((s: any) => s.scheduledDate === dateStr);
                          return (
                            <div 
                              key={i} 
                              className={`p-1 min-h-[60px] rounded transition-colors ${isAdmin ? 'cursor-pointer hover:bg-muted/50' : ''} ${dragOverDate === dateStr ? 'bg-primary/10 ring-2 ring-primary/40' : ''}`}
                              onClick={() => dayShifts.length === 0 && handleDayClick(day, u.id)}
                              onDragOver={(event) => { if (isAdmin) { event.preventDefault(); event.dataTransfer.dropEffect = "move"; setDragOverDate(dateStr); } }}
                              onDragLeave={() => setDragOverDate(null)}
                              onDrop={(event) => isAdmin && handleShiftDrop(event, dateStr)}
                            >
                              {dayShifts.map((shift: any) => (
                                <div 
                                  key={shift.id} 
                                  draggable={isAdmin && shift.status === "scheduled"}
                                  className={`text-xs p-1.5 rounded mb-1 border cursor-pointer hover:opacity-80 group relative ${isAdmin && shift.status === "scheduled" ? 'cursor-grab active:cursor-grabbing' : ''} ${draggedShiftId === shift.id ? 'opacity-40' : ''} ${colorClass || ''}`}
                                  style={customColor ? {
                                    backgroundColor: `${customColor}15`,
                                    color: customColor,
                                    borderColor: `${customColor}50`
                                  } : {}}
                                  onDragStart={(event) => startShiftDrag(event, shift)}
                                  onDragEnd={() => { setDraggedShiftId(null); setDragOverDate(null); }}
                                  onClick={(e) => { e.stopPropagation(); if (isAdmin) openEditDialog(shift); }}
                                >
                                  <div className="flex items-center gap-0.5 font-medium">{isAdmin && shift.status === "scheduled" && <GripVertical className="h-3 w-3 opacity-50" />}{shift.scheduledStart}</div>
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
              <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                <div className="min-w-[600px] sm:min-w-0">
                  <div className="grid grid-cols-7 gap-1">
                    {/* Header */}
                    {DAYS.map(day => (
                      <div key={day} className="p-1 sm:p-2 text-center text-xs sm:text-sm font-medium text-muted-foreground">
                        {day}
                      </div>
                    ))}
                    {/* Days */}
                    {monthDays.map((day, i) => {
                      if (!day) {
                        return <div key={`empty-${i}`} className="p-1 sm:p-2 min-h-[80px] sm:min-h-[100px]" />;
                      }
                      // Usar formato local en lugar de UTC para evitar desplazamiento de días
                      const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
                      const dayShifts = shiftsByDate.get(dateStr) || [];
                      const isToday = day.toDateString() === new Date().toDateString();
                      
                      return (
                        <div 
                          key={dateStr} 
                          className={`p-1 sm:p-2 min-h-[80px] sm:min-h-[100px] border rounded-lg transition-colors ${isToday ? 'bg-primary/5 border-primary/20' : ''} ${isAdmin ? 'cursor-pointer hover:bg-muted/30' : ''} ${dragOverDate === dateStr ? 'bg-primary/10 ring-2 ring-primary/40' : ''}`}
                          onClick={() => handleDayClick(day)}
                          onDragOver={(event) => { if (isAdmin) { event.preventDefault(); event.dataTransfer.dropEffect = "move"; setDragOverDate(dateStr); } }}
                          onDragLeave={() => setDragOverDate(null)}
                          onDrop={(event) => isAdmin && handleShiftDrop(event, dateStr)}
                        >
                          <div className={`text-xs sm:text-sm font-medium mb-1 ${isToday ? 'text-primary' : ''}`}>
                            {day.getDate()}
                          </div>
                          <div className="space-y-1">
                            {dayShifts.slice(0, 3).map((shift: any) => {
                              const shiftColorClass = getUserColor(shift.userId);
                              const shiftCustomColor = getUserColorHex(shift.userId);
                              return (
                                <div 
                                  key={shift.id}
                                  draggable={isAdmin && shift.status === "scheduled"}
                                  className={`text-[10px] sm:text-xs px-1 py-0.5 rounded truncate group relative cursor-pointer hover:opacity-80 ${isAdmin && shift.status === "scheduled" ? 'cursor-grab active:cursor-grabbing' : ''} ${draggedShiftId === shift.id ? 'opacity-40' : ''} ${shiftColorClass || ''}`}
                                  style={shiftCustomColor ? {
                                    backgroundColor: `${shiftCustomColor}15`,
                                    color: shiftCustomColor,
                                    borderColor: `${shiftCustomColor}50`
                                  } : {}}
                                  onDragStart={(event) => startShiftDrag(event, shift)}
                                  onDragEnd={() => { setDraggedShiftId(null); setDragOverDate(null); }}
                                  onClick={(e) => { e.stopPropagation(); if (isAdmin) openEditDialog(shift); }}
                                >
                                <span className="hidden sm:inline">{getUserName(shift.userId)} </span>
                                <span className="sm:hidden">{getUserName(shift.userId).split(' ')[0]} </span>
                                {shift.scheduledStart} - {shift.scheduledEnd}
                                {isAdmin && (
                                  <button 
                                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                    onClick={(e) => { e.stopPropagation(); handleDeleteShift(shift.id); }}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                              );
                            })}
                            {dayShifts.length > 3 && (
                              <div className="text-[10px] sm:text-xs text-muted-foreground">+{dayShifts.length - 3} más</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
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
            {shiftUsers.map(u => {
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
              const customColor = getUserColorHex(u.id);
              return (
                <div key={u.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <span 
                      className={`text-sm font-medium px-2 py-1 rounded border ${colorClass || ''}`}
                      style={customColor ? {
                        backgroundColor: `${customColor}15`,
                        color: customColor,
                        borderColor: `${customColor}50`
                      } : {}}
                    >
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
              {selectedShift && shiftUsers.find(u => u.id === selectedShift.userId)?.name}
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

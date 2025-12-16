import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Calendar, Clock, Plus, Play, Square, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState("");
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("18:00");

  const utils = trpc.useUtils();

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

  const { data: users } = trpc.users.list.useQuery();
  const { data: shifts, isLoading } = trpc.shifts.list.useQuery({
    startDate: weekRange.startDate,
    endDate: weekRange.endDate,
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

  const navigateWeek = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + direction * 7);
    setCurrentDate(newDate);
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

  // Get user color
  const getUserColor = (userId: number) => {
    const index = (users?.findIndex(u => u.id === userId) || 0) % COLORS.length;
    return COLORS[index];
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

      {/* Calendar */}
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
                        <div key={i} className="p-1 min-h-[60px]">
                          {dayShifts.map((shift: any) => (
                            <div 
                              key={shift.id} 
                              className={`text-xs p-1.5 rounded mb-1 ${colorClass} border cursor-pointer hover:opacity-80`}
                              title={`${shift.scheduledStart} - ${shift.scheduledEnd}`}
                            >
                              <div className="font-medium">{shift.scheduledStart}</div>
                              <div>{shift.scheduledEnd}</div>
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

      {/* Hours Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen de horas</CardTitle>
          <CardDescription>Horas programadas esta semana por empleado</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {users?.map(u => {
              const userShifts = shiftsByUser.get(u.id) || [];
              const totalHours = userShifts.reduce((sum: number, s: any) => {
                const [startH, startM] = s.scheduledStart.split(':').map(Number);
                const [endH, endM] = s.scheduledEnd.split(':').map(Number);
                const hours = (endH + endM/60) - (startH + startM/60);
                return sum + (hours > 0 ? hours : 0);
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
    </div>
  );
}

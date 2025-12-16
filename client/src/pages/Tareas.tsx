import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { CheckSquare, Plus, Clock, User, Calendar } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const PRIORITIES = [
  { value: "low", label: "Baja", color: "bg-blue-100 text-blue-800" },
  { value: "medium", label: "Media", color: "bg-yellow-100 text-yellow-800" },
  { value: "high", label: "Alta", color: "bg-orange-100 text-orange-800" },
  { value: "urgent", label: "Urgente", color: "bg-red-100 text-red-800" },
];

export default function Tareas() {
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [dueDate, setDueDate] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "completed">("pending");

  const utils = trpc.useUtils();

  const { data: users } = trpc.users.list.useQuery();
  const { data: tasks, isLoading } = trpc.tasks.list.useQuery({});

  const createTask = trpc.tasks.create.useMutation({
    onSuccess: () => {
      toast.success("Tarea creada");
      utils.tasks.list.invalidate();
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => toast.error("Error: " + error.message),
  });

  const updateTask = trpc.tasks.update.useMutation({
    onSuccess: () => {
      toast.success("Tarea actualizada");
      utils.tasks.list.invalidate();
    },
    onError: (error) => toast.error("Error: " + error.message),
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setAssignedTo("");
    setDueDate("");
  };

  const handleCreateTask = () => {
    if (!title) {
      toast.error("El título es obligatorio");
      return;
    }
    createTask.mutate({
      title,
      description,
      priority,
      assignedTo: assignedTo ? parseInt(assignedTo) : undefined,
      dueDate: dueDate || undefined,
    });
  };

  const toggleTaskStatus = (id: number, currentStatus: string) => {
    const newStatus = currentStatus === "completed" ? "pending" : "completed";
    updateTask.mutate({ id, status: newStatus });
  };

  // Filter tasks
  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    if (filterStatus === "all") return tasks;
    return tasks.filter(task => task.status === filterStatus);
  }, [tasks, filterStatus]);

  // Group by date
  const tasksByDate = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const groups: { overdue: typeof filteredTasks; today: typeof filteredTasks; upcoming: typeof filteredTasks; noDue: typeof filteredTasks } = {
      overdue: [],
      today: [],
      upcoming: [],
      noDue: [],
    };
    
    filteredTasks.forEach(task => {
      if (!task.dueDate) {
        groups.noDue.push(task);
      } else if (task.dueDate < today && task.status !== "completed") {
        groups.overdue.push(task);
      } else if (task.dueDate === today) {
        groups.today.push(task);
      } else {
        groups.upcoming.push(task);
      }
    });
    
    return groups;
  }, [filteredTasks]);

  // Count stats
  const stats = useMemo(() => {
    if (!tasks) return { total: 0, pending: 0, completed: 0, overdue: 0 };
    const today = new Date().toISOString().split('T')[0];
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === "pending").length,
      completed: tasks.filter(t => t.status === "completed").length,
      overdue: tasks.filter(t => t.dueDate && t.dueDate < today && t.status !== "completed").length,
    };
  }, [tasks]);

  const getPriorityBadge = (p: string) => {
    const priority = PRIORITIES.find(pr => pr.value === p);
    return priority ? <Badge className={priority.color}>{priority.label}</Badge> : null;
  };

  const getUserName = (userId: number | null) => {
    if (!userId) return null;
    const u = users?.find(u => u.id === userId);
    return u?.name?.split(' ')[0] || 'Sin asignar';
  };

  const renderTaskGroup = (title: string, tasks: typeof filteredTasks, isOverdue = false) => {
    if (tasks.length === 0) return null;
    return (
      <div className="mb-6">
        <h3 className={`text-sm font-medium mb-3 ${isOverdue ? 'text-red-600' : 'text-muted-foreground'}`}>
          {title} ({tasks.length})
        </h3>
        <div className="space-y-2">
          {tasks.map(task => (
            <div 
              key={task.id} 
              className={`flex items-start gap-3 p-3 rounded-lg border ${task.status === "completed" ? 'bg-muted/50' : ''} ${isOverdue ? 'border-red-200' : ''}`}
            >
              <Checkbox 
                checked={task.status === "completed"}
                onCheckedChange={() => toggleTaskStatus(task.id, task.status)}
                className="mt-1"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={`font-medium ${task.status === "completed" ? 'line-through text-muted-foreground' : ''}`}>
                    {task.title}
                  </p>
                  {getPriorityBadge(task.priority)}
                </div>
                {task.description && (
                  <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                )}
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  {task.assignedTo && (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {getUserName(task.assignedTo)}
                    </span>
                  )}
                  {task.dueDate && (
                    <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-600' : ''}`}>
                      <Calendar className="h-3 w-3" />
                      {new Date(task.dueDate + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CheckSquare className="h-6 w-6 text-primary" />
            Tareas
          </h1>
          <p className="text-muted-foreground">Gestión de tareas y pendientes</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva tarea
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear tarea</DialogTitle>
              <DialogDescription>Añade una nueva tarea o pendiente</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Título *</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="¿Qué hay que hacer?" />
              </div>
              <div className="grid gap-2">
                <Label>Descripción</Label>
                <Textarea 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  placeholder="Detalles adicionales..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Prioridad</Label>
                  <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map(p => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Asignar a</Label>
                  <Select value={assignedTo} onValueChange={setAssignedTo}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sin asignar" />
                    </SelectTrigger>
                    <SelectContent>
                      {users?.map(u => (
                        <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Fecha límite</Label>
                <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateTask} disabled={createTask.isPending}>
                {createTask.isPending ? "Creando..." : "Crear tarea"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card className={`cursor-pointer ${filterStatus === "all" ? 'ring-2 ring-primary' : ''}`} onClick={() => setFilterStatus("all")}>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer ${filterStatus === "pending" ? 'ring-2 ring-primary' : ''}`} onClick={() => setFilterStatus("pending")}>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Pendientes</p>
            <p className="text-2xl font-bold text-orange-500">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer ${filterStatus === "completed" ? 'ring-2 ring-primary' : ''}`} onClick={() => setFilterStatus("completed")}>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Completadas</p>
            <p className="text-2xl font-bold text-green-500">{stats.completed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Vencidas</p>
            <p className="text-2xl font-bold text-red-500">{stats.overdue}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tasks List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de tareas</CardTitle>
          <CardDescription>
            {filterStatus === "all" ? "Todas las tareas" : filterStatus === "pending" ? "Tareas pendientes" : "Tareas completadas"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredTasks.length > 0 ? (
            <>
              {renderTaskGroup("Vencidas", tasksByDate.overdue, true)}
              {renderTaskGroup("Hoy", tasksByDate.today)}
              {renderTaskGroup("Próximas", tasksByDate.upcoming)}
              {renderTaskGroup("Sin fecha", tasksByDate.noDue)}
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CheckSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No hay tareas {filterStatus !== "all" ? (filterStatus === "pending" ? "pendientes" : "completadas") : ""}</p>
              <Button variant="link" onClick={() => setIsDialogOpen(true)}>
                Crear nueva tarea
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

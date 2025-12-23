import { useAuth } from "@/_core/hooks/useAuth";
import { useBusinessContext } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, Plus, CheckCircle, Clock, XCircle, Building2, Store } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const PRIORITIES = [
  { value: "low", label: "Baja", color: "bg-blue-100 text-blue-800" },
  { value: "medium", label: "Media", color: "bg-yellow-100 text-yellow-800" },
  { value: "high", label: "Alta", color: "bg-orange-100 text-orange-800" },
  { value: "urgent", label: "Urgente", color: "bg-red-100 text-red-800" },
];

const STATUSES = [
  { value: "open", label: "Abierta", icon: AlertTriangle, color: "text-orange-500" },
  { value: "in_progress", label: "En progreso", icon: Clock, color: "text-blue-500" },
  { value: "resolved", label: "Resuelta", icon: CheckCircle, color: "text-green-500" },
  { value: "closed", label: "Cerrada", icon: XCircle, color: "text-gray-500" },
];

export default function Incidencias() {
  const { user } = useAuth();
  const { selectedBusiness } = useBusinessContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [filterStatus, setFilterStatus] = useState("all");
  const [editingIncident, setEditingIncident] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [editNotes, setEditNotes] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingIncident, setDeletingIncident] = useState<any>(null);

  const utils = trpc.useUtils();

  const { data: businesses } = trpc.businesses.list.useQuery();
  const hostelBusiness = businesses?.find(b => b.code === "hostel");
  const tiendaBusiness = businesses?.find(b => b.code === "tienda");
  
  const currentBusinessId = useMemo(() => {
    if (selectedBusiness === "all") return hostelBusiness?.id;
    return businesses?.find(b => b.code === selectedBusiness)?.id;
  }, [businesses, selectedBusiness, hostelBusiness]);

  // Queries - obtener datos según selección global
  const { data: incidentsHostel } = trpc.incidents.list.useQuery(
    { businessId: hostelBusiness?.id! },
    { enabled: !!hostelBusiness && (selectedBusiness === "hostel" || selectedBusiness === "all") }
  );
  
  const { data: incidentsTienda } = trpc.incidents.list.useQuery(
    { businessId: tiendaBusiness?.id! },
    { enabled: !!tiendaBusiness && (selectedBusiness === "tienda" || selectedBusiness === "all") }
  );
  
  // Combinar datos según selección
  const incidents = selectedBusiness === "all" 
    ? [...(incidentsHostel || []), ...(incidentsTienda || [])].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    : selectedBusiness === "hostel" 
    ? incidentsHostel || []
    : incidentsTienda || [];
  
  const isLoading = !businesses;

  const createIncident = trpc.incidents.create.useMutation({
    onSuccess: () => {
      toast.success("Incidencia registrada");
      utils.incidents.list.invalidate();
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => toast.error("Error: " + error.message),
  });

  const updateIncident = trpc.incidents.update.useMutation({
    onSuccess: () => {
      toast.success("Incidencia actualizada");
      utils.incidents.list.invalidate();
    },
    onError: (error) => toast.error("Error: " + error.message),
  });

  const deleteIncident = trpc.incidents.delete.useMutation({
    onSuccess: () => {
      toast.success("Incidencia eliminada");
      utils.incidents.list.invalidate();
      setIsDeleteDialogOpen(false);
      setDeletingIncident(null);
    },
    onError: (error) => toast.error("Error: " + error.message),
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPriority("medium");
  };

  const handleCreateIncident = () => {
    if (!currentBusinessId) {
      toast.error("Selecciona un negocio");
      return;
    }
    if (!title.trim()) {
      toast.error("El título es obligatorio");
      return;
    }
    createIncident.mutate({
      businessId: currentBusinessId,
      title: title.trim(),
      description,
      priority,
    });
  };

  const handleStatusChange = (id: number, status: string) => {
    updateIncident.mutate({ id, status: status as any });
  };

  const openEditDialog = (incident: any) => {
    setEditingIncident(incident);
    setEditTitle(incident.title);
    setEditDescription(incident.description || "");
    setEditPriority(incident.priority);
    setEditNotes(incident.notes || "");
    setIsEditDialogOpen(true);
  };

  const handleUpdateIncident = () => {
    if (!editingIncident || !editTitle) {
      toast.error("El título es obligatorio");
      return;
    }
    updateIncident.mutate({
      id: editingIncident.id,
      title: editTitle,
      description: editDescription,
      priority: editPriority,
      notes: editNotes,
    });
    setIsEditDialogOpen(false);
    setEditingIncident(null);
  };

  const openDeleteDialog = (incident: any) => {
    setDeletingIncident(incident);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteIncident = () => {
    if (!deletingIncident) return;
    deleteIncident.mutate({ id: deletingIncident.id });
  };

  // Filter incidents
  const filteredIncidents = useMemo(() => {
    if (!incidents) return [];
    if (filterStatus === "all") return incidents;
    return incidents.filter(inc => inc.status === filterStatus);
  }, [incidents, filterStatus]);

  // Count by status
  const statusCounts = useMemo(() => {
    if (!incidents) return { open: 0, in_progress: 0, resolved: 0, closed: 0 };
    return incidents.reduce((acc, inc) => {
      acc[inc.status as keyof typeof acc]++;
      return acc;
    }, { open: 0, in_progress: 0, resolved: 0, closed: 0 });
  }, [incidents]);

  const businessLabel = selectedBusiness === "hostel" ? "Hostel" : selectedBusiness === "tienda" ? "Tienda" : "Ambos";
  const BusinessIcon = selectedBusiness === "hostel" ? Building2 : Store;

  const getPriorityBadge = (p: string) => {
    const priority = PRIORITIES.find(pr => pr.value === p);
    return priority ? <Badge className={priority.color}>{priority.label}</Badge> : null;
  };

  const getStatusInfo = (s: string) => {
    return STATUSES.find(st => st.value === s);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-primary" />
            Incidencias - {businessLabel}
          </h1>
          <p className="text-muted-foreground">Registro y seguimiento de problemas</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva incidencia
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reportar incidencia</DialogTitle>
              <DialogDescription>Describe el problema encontrado</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Título *</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Resumen breve del problema" />
              </div>
              <div className="grid gap-2">
                <Label>Descripción</Label>
                <Textarea 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  placeholder="Describe el problema con detalle..."
                  rows={4}
                />
              </div>
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
            </div>
            <DialogFooter>
              {!currentBusinessId && (
                <p className="text-sm text-muted-foreground mr-auto">Selecciona un negocio para continuar</p>
              )}
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateIncident} disabled={createIncident.isPending || !currentBusinessId}>
                {createIncident.isPending ? "Guardando..." : "Reportar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Status Summary */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {STATUSES.map(status => {
          const count = statusCounts[status.value as keyof typeof statusCounts];
          const Icon = status.icon;
          return (
            <Card 
              key={status.value} 
              className={`cursor-pointer transition-colors ${filterStatus === status.value ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setFilterStatus(filterStatus === status.value ? "all" : status.value)}
            >
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{status.label}</p>
                    <p className="text-2xl font-bold">{count}</p>
                  </div>
                  <Icon className={`h-8 w-8 ${status.color}`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Incidents List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Incidencias</CardTitle>
              <CardDescription>
                {filterStatus === "all" ? "Todas las incidencias" : `Filtrado por: ${STATUSES.find(s => s.value === filterStatus)?.label}`}
              </CardDescription>
            </div>
            {filterStatus !== "all" && (
              <Button variant="ghost" size="sm" onClick={() => setFilterStatus("all")}>
                Ver todas
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {filteredIncidents.length > 0 ? (
            <div className="space-y-3">
              {filteredIncidents.map(incident => {
                const statusInfo = getStatusInfo(incident.status);
                const StatusIcon = statusInfo?.icon || AlertTriangle;
                return (
                  <div key={incident.id} className="p-4 rounded-lg border hover:bg-muted/50">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <StatusIcon className={`h-5 w-5 mt-0.5 ${statusInfo?.color}`} />
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium">{incident.title}</p>
                            {getPriorityBadge(incident.priority)}
                          </div>
                          {incident.description && (
                            <p className="text-sm text-muted-foreground mb-2">{incident.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Reportado el {new Date(incident.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(incident)}>Editar</Button>
                        <Select 
                          value={incident.status} 
                          onValueChange={(v) => handleStatusChange(incident.id, v)}
                        >
                          <SelectTrigger className="w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUSES.map(s => (
                              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => openDeleteDialog(incident)}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No hay incidencias {filterStatus !== "all" ? `con estado "${STATUSES.find(s => s.value === filterStatus)?.label}"` : ""}</p>
              <Button variant="link" onClick={() => setIsDialogOpen(true)}>
                Reportar incidencia
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar incidencia</DialogTitle>
            <DialogDescription>Modifica los datos de la incidencia</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Título *</Label>
              <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Resumen breve del problema" />
            </div>
            <div className="grid gap-2">
              <Label>Descripción</Label>
              <Textarea 
                value={editDescription} 
                onChange={e => setEditDescription(e.target.value)} 
                placeholder="Describe el problema con detalle..."
                rows={4}
              />
            </div>
            <div className="grid gap-2">
              <Label>Prioridad</Label>
              <Select value={editPriority} onValueChange={(v: any) => setEditPriority(v)}>
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
              <Label>Notas</Label>
              <Textarea 
                value={editNotes} 
                onChange={e => setEditNotes(e.target.value)} 
                placeholder="Notas adicionales..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdateIncident} disabled={updateIncident.isPending}>
              {updateIncident.isPending ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar incidencia</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres eliminar esta incidencia?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              <strong>{deletingIncident?.title}</strong>
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Esta acción no se puede deshacer.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancelar</Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteIncident} 
              disabled={deleteIncident.isPending}
            >
              {deleteIncident.isPending ? "Eliminando..." : "Eliminar incidencia"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Users, Shield, User, Clock, Mail, Plus, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export default function Empleados() {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isRoleDialog, setIsRoleDialog] = useState(false);
  const [newRole, setNewRole] = useState<"user" | "admin">("user");
  
  // Create employee form
  const [isCreateDialog, setIsCreateDialog] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newEmployeeRole, setNewEmployeeRole] = useState<"user" | "admin">("user");

  const utils = trpc.useUtils();

  const { data: users, isLoading } = trpc.users.list.useQuery();
  const { data: shifts } = trpc.shifts.list.useQuery({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const createEmployee = trpc.employees.create.useMutation({
    onSuccess: () => {
      toast.success("Empleado creado correctamente");
      utils.users.list.invalidate();
      setIsCreateDialog(false);
      resetCreateForm();
    },
    onError: (error: any) => toast.error("Error: " + error.message),
  });

  const updateUserRole = trpc.users.update.useMutation({
    onSuccess: () => {
      toast.success("Rol actualizado");
      utils.users.list.invalidate();
      setIsRoleDialog(false);
      setSelectedUser(null);
    },
    onError: (error: any) => toast.error("Error: " + error.message),
  });

  const resetCreateForm = () => {
    setNewName("");
    setNewEmail("");
    setNewEmployeeRole("user");
  };

  const handleCreateEmployee = () => {
    if (!newName.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    if (!newEmail.trim()) {
      toast.error("El email es obligatorio");
      return;
    }
    createEmployee.mutate({
      name: newName.trim(),
      email: newEmail.trim(),
      role: newEmployeeRole,
    });
  };

  const handleRoleChange = () => {
    if (!selectedUser) return;
    updateUserRole.mutate({ id: selectedUser.id, role: newRole });
  };

  const openRoleDialog = (user: any) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setIsRoleDialog(true);
  };

  // Calculate hours worked per user in last 30 days
  const hoursWorked = useMemo(() => {
    if (!shifts) return new Map<number, number>();
    const map = new Map<number, number>();
    shifts.forEach(shift => {
      if (shift.status === "completed" && shift.actualStart && shift.actualEnd) {
        const start = new Date(shift.actualStart).getTime();
        const end = new Date(shift.actualEnd).getTime();
        const hours = (end - start) / (1000 * 60 * 60);
        map.set(shift.userId, (map.get(shift.userId) || 0) + hours);
      }
    });
    return map;
  }, [shifts]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Empleados
          </h1>
          <p className="text-muted-foreground">Gestión de usuarios y permisos</p>
        </div>
        {isAdmin && (
          <Dialog open={isCreateDialog} onOpenChange={setIsCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Nuevo empleado
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear nuevo empleado</DialogTitle>
                <DialogDescription>
                  Añade un nuevo empleado al sistema. Podrá iniciar sesión con su email.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Nombre completo *</Label>
                  <Input 
                    value={newName} 
                    onChange={e => setNewName(e.target.value)} 
                    placeholder="Ej: Ana García"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Email *</Label>
                  <Input 
                    type="email"
                    value={newEmail} 
                    onChange={e => setNewEmail(e.target.value)} 
                    placeholder="ana@ejemplo.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    El empleado usará este email para iniciar sesión
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label>Rol</Label>
                  <Select value={newEmployeeRole} onValueChange={(v: "user" | "admin") => setNewEmployeeRole(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Empleado</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {newEmployeeRole === "admin" 
                      ? "Acceso completo: gestión de empleados, turnos, caja y configuración" 
                      : "Acceso básico: fichaje, registro de caja e incidencias"}
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialog(false)}>Cancelar</Button>
                <Button onClick={handleCreateEmployee} disabled={createEmployee.isPending}>
                  {createEmployee.isPending ? "Creando..." : "Crear empleado"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total empleados</p>
                <p className="text-2xl font-bold">{users?.length || 0}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Administradores</p>
                <p className="text-2xl font-bold">{users?.filter(u => u.role === "admin").length || 0}</p>
              </div>
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Empleados</p>
                <p className="text-2xl font-bold">{users?.filter(u => u.role === "user").length || 0}</p>
              </div>
              <User className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de empleados</CardTitle>
          <CardDescription>Usuarios registrados en el sistema</CardDescription>
        </CardHeader>
        <CardContent>
          {users && users.length > 0 ? (
            <div className="space-y-3">
              {users.map(user => {
                const hours = hoursWorked.get(user.id) || 0;
                const isCurrentUser = user.id === currentUser?.id;
                return (
                  <div key={user.id} className={`flex items-center justify-between p-4 rounded-lg border ${isCurrentUser ? 'bg-primary/5 border-primary/20' : ''}`}>
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-full ${user.role === "admin" ? 'bg-primary/10' : 'bg-muted'}`}>
                        {user.role === "admin" ? (
                          <Shield className="h-5 w-5 text-primary" />
                        ) : (
                          <User className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{user.name || 'Sin nombre'}</p>
                          {isCurrentUser && <Badge variant="outline">Tú</Badge>}
                          <Badge className={user.role === "admin" ? "bg-primary" : "bg-muted text-muted-foreground"}>
                            {user.role === "admin" ? "Admin" : "Empleado"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          {user.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {user.email}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {hours.toFixed(1)}h últimos 30 días
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Último acceso: {new Date(user.lastSignedIn).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    {isAdmin && !isCurrentUser && (
                      <Button variant="outline" size="sm" onClick={() => openRoleDialog(user)}>
                        Cambiar rol
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No hay empleados registrados</p>
              <p className="text-sm">Usa el botón "Nuevo empleado" para añadir empleados</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role Change Dialog */}
      <Dialog open={isRoleDialog} onOpenChange={setIsRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar rol de usuario</DialogTitle>
            <DialogDescription>
              Cambia el rol de {selectedUser?.name || 'este usuario'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={newRole} onValueChange={(v: "user" | "admin") => setNewRole(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Empleado</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground mt-2">
              {newRole === "admin" 
                ? "Los administradores pueden gestionar empleados, turnos y configuración." 
                : "Los empleados pueden registrar turnos, caja e incidencias."}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRoleDialog(false)}>Cancelar</Button>
            <Button onClick={handleRoleChange} disabled={updateUserRole.isPending}>
              {updateUserRole.isPending ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

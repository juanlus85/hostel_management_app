import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { Users, Shield, User, Clock, Mail, UserPlus, Calendar, Settings, Edit, Trash2 } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";

const DAYS_OF_WEEK = [
  { key: "monday", label: "Lunes" },
  { key: "tuesday", label: "Martes" },
  { key: "wednesday", label: "Miércoles" },
  { key: "thursday", label: "Jueves" },
  { key: "friday", label: "Viernes" },
  { key: "saturday", label: "Sábado" },
  { key: "sunday", label: "Domingo" },
];

type ScheduleTemplate = {
  [key: string]: { start: string; end: string } | null;
};

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
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newEmployeeRole, setNewEmployeeRole] = useState<"user" | "admin">("user");
  
  // Change password dialog
  const [isPasswordDialog, setIsPasswordDialog] = useState(false);
  const [passwordUser, setPasswordUser] = useState<any>(null);
  const [newUserPassword, setNewUserPassword] = useState("");

  // Edit employee dialog
  const [isEditDialog, setIsEditDialog] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editColor, setEditColor] = useState("#3b82f6");
  
  // Delete confirmation dialog
  const [isDeleteDialog, setIsDeleteDialog] = useState(false);
  const [deleteUser, setDeleteUser] = useState<any>(null);

  // Schedule template dialog
  const [isScheduleDialog, setIsScheduleDialog] = useState(false);
  const [scheduleUser, setScheduleUser] = useState<any>(null);
  const [scheduleTemplate, setScheduleTemplate] = useState<ScheduleTemplate>({
    monday: null,
    tuesday: null,
    wednesday: null,
    thursday: null,
    friday: null,
    saturday: null,
    sunday: null,
  });

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

  const updateScheduleTemplate = trpc.users.update.useMutation({
    onSuccess: () => {
      toast.success("Horario habitual guardado");
      utils.users.list.invalidate();
      setIsScheduleDialog(false);
      setScheduleUser(null);
    },
    onError: (error: any) => toast.error("Error: " + error.message),
  });

  const resetCreateForm = () => {
    setNewName("");
    setNewEmail("");
    setNewUsername("");
    setNewPassword("");
    setNewEmployeeRole("user");
  };

  const handleCreateEmployee = () => {
    if (!newName.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    if (!newUsername.trim()) {
      toast.error("El usuario es obligatorio");
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      toast.error("La contraseña debe tener al menos 4 caracteres");
      return;
    }
    createEmployee.mutate({
      name: newName.trim(),
      email: newEmail.trim() || undefined,
      username: newUsername.trim(),
      password: newPassword,
      role: newEmployeeRole,
    });
  };
  
  const updatePassword = trpc.employees.updatePassword.useMutation({
    onSuccess: () => {
      toast.success("Contraseña actualizada");
      setIsPasswordDialog(false);
      setPasswordUser(null);
      setNewUserPassword("");
    },
    onError: (error: any) => toast.error("Error: " + error.message),
  });
  
  const handleUpdatePassword = () => {
    if (!passwordUser) return;
    if (!newUserPassword || newUserPassword.length < 4) {
      toast.error("La contraseña debe tener al menos 4 caracteres");
      return;
    }
    updatePassword.mutate({ userId: passwordUser.id, newPassword: newUserPassword });
  };
  
  const openPasswordDialog = (user: any) => {
    setPasswordUser(user);
    setNewUserPassword("");
    setIsPasswordDialog(true);
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

  const openScheduleDialog = (user: any) => {
    setScheduleUser(user);
    // Parse existing schedule template or use defaults
    try {
      const existing = user.scheduleTemplate ? JSON.parse(user.scheduleTemplate) : {};
      setScheduleTemplate({
        monday: existing.monday || null,
        tuesday: existing.tuesday || null,
        wednesday: existing.wednesday || null,
        thursday: existing.thursday || null,
        friday: existing.friday || null,
        saturday: existing.saturday || null,
        sunday: existing.sunday || null,
      });
    } catch {
      setScheduleTemplate({
        monday: null,
        tuesday: null,
        wednesday: null,
        thursday: null,
        friday: null,
        saturday: null,
        sunday: null,
      });
    }
    setIsScheduleDialog(true);
  };

  const toggleDay = (dayKey: string, enabled: boolean) => {
    setScheduleTemplate(prev => ({
      ...prev,
      [dayKey]: enabled ? { start: "10:00", end: "18:00" } : null,
    }));
  };

  const updateDayTime = (dayKey: string, field: "start" | "end", value: string) => {
    setScheduleTemplate(prev => ({
      ...prev,
      [dayKey]: prev[dayKey] ? { ...prev[dayKey]!, [field]: value } : { start: "10:00", end: "18:00", [field]: value },
    }));
  };

  const handleSaveSchedule = () => {
    if (!scheduleUser) return;
    updateScheduleTemplate.mutate({
      id: scheduleUser.id,
      scheduleTemplate: JSON.stringify(scheduleTemplate),
    });
  };

  // Edit employee functions
  const updateEmployee = trpc.users.update.useMutation({
    onSuccess: () => {
      toast.success("Empleado actualizado");
      utils.users.list.invalidate();
      setIsEditDialog(false);
      setEditUser(null);
    },
    onError: (error: any) => toast.error("Error: " + error.message),
  });

  const openEditDialog = (user: any) => {
    setEditUser(user);
    setEditName(user.name || "");
    setEditEmail(user.email || "");
    setEditUsername(user.username || "");
    setEditColor(user.color || "#3b82f6");
    setIsEditDialog(true);
  };

  const handleEditEmployee = () => {
    if (!editUser) return;
    if (!editName.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    updateEmployee.mutate({
      id: editUser.id,
      name: editName.trim(),
      email: editEmail.trim() || undefined,
      color: editColor,
    });
  };

  // Delete employee functions
  const deleteEmployee = trpc.users.delete.useMutation({
    onSuccess: () => {
      toast.success("Empleado eliminado");
      utils.users.list.invalidate();
      setIsDeleteDialog(false);
      setDeleteUser(null);
    },
    onError: (error: any) => toast.error("Error: " + error.message),
  });

  const openDeleteDialog = (user: any) => {
    setDeleteUser(user);
    setIsDeleteDialog(true);
  };

  const handleDeleteEmployee = () => {
    if (!deleteUser) return;
    deleteEmployee.mutate({ userId: deleteUser.id });
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

  // Count configured days for each user
  const getConfiguredDays = (user: any) => {
    try {
      const template = user.scheduleTemplate ? JSON.parse(user.scheduleTemplate) : {};
      return Object.values(template).filter(Boolean).length;
    } catch {
      return 0;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Empleados
          </h1>
          <p className="text-muted-foreground">Gestión de usuarios, permisos y horarios habituales</p>
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
                  Añade un nuevo empleado al sistema con sus credenciales de acceso.
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Usuario *</Label>
                    <Input 
                      value={newUsername} 
                      onChange={e => setNewUsername(e.target.value)} 
                      placeholder="ana.garcia"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Contraseña *</Label>
                    <Input 
                      type="password"
                      value={newPassword} 
                      onChange={e => setNewPassword(e.target.value)} 
                      placeholder="Mín. 4 caracteres"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Email (opcional)</Label>
                  <Input 
                    type="email"
                    value={newEmail} 
                    onChange={e => setNewEmail(e.target.value)} 
                    placeholder="ana@ejemplo.com"
                  />
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
                <p className="text-sm text-muted-foreground">Con horario configurado</p>
                <p className="text-2xl font-bold">{users?.filter(u => getConfiguredDays(u) > 0).length || 0}</p>
              </div>
              <Calendar className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de empleados</CardTitle>
          <CardDescription>Usuarios registrados en el sistema. Configura sus horarios habituales para generar turnos automáticamente.</CardDescription>
        </CardHeader>
        <CardContent>
          {users && users.length > 0 ? (
            <div className="space-y-3">
              {users.map(user => {
                const hours = hoursWorked.get(user.id) || 0;
                const isCurrentUser = user.id === currentUser?.id;
                const configuredDays = getConfiguredDays(user);
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
                          {configuredDays > 0 && (
                            <Badge variant="outline" className="text-green-600 border-green-200">
                              <Calendar className="h-3 w-3 mr-1" />
                              {configuredDays} días
                            </Badge>
                          )}
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
                    {isAdmin && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(user)}>
                          <Edit className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openScheduleDialog(user)}>
                          <Settings className="h-4 w-4 mr-1" />
                          Horario
                        </Button>
                        {user.username && (
                          <Button variant="outline" size="sm" onClick={() => openPasswordDialog(user)}>
                            Contraseña
                          </Button>
                        )}
                        {!isCurrentUser && (
                          <>
                            <Button variant="outline" size="sm" onClick={() => openRoleDialog(user)}>
                              Cambiar rol
                            </Button>
                            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => openDeleteDialog(user)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
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

      {/* Schedule Template Dialog */}
      <Dialog open={isScheduleDialog} onOpenChange={setIsScheduleDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Horario habitual de {scheduleUser?.name?.split(' ')[0]}</DialogTitle>
            <DialogDescription>
              Configura los turnos habituales. Se usarán para generar automáticamente los turnos del mes.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3 max-h-[400px] overflow-y-auto">
            {DAYS_OF_WEEK.map(day => {
              const daySchedule = scheduleTemplate[day.key];
              const isEnabled = daySchedule !== null;
              return (
                <div key={day.key} className={`p-3 rounded-lg border ${isEnabled ? 'bg-primary/5 border-primary/20' : 'bg-muted/30'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="font-medium">{day.label}</Label>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={(checked) => toggleDay(day.key, checked)}
                    />
                  </div>
                  {isEnabled && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Entrada</Label>
                        <Input
                          type="time"
                          value={daySchedule?.start || "10:00"}
                          onChange={(e) => updateDayTime(day.key, "start", e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Salida</Label>
                        <Input
                          type="time"
                          value={daySchedule?.end || "18:00"}
                          onChange={(e) => updateDayTime(day.key, "end", e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsScheduleDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveSchedule} disabled={updateScheduleTemplate.isPending}>
              {updateScheduleTemplate.isPending ? "Guardando..." : "Guardar horario"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog open={isEditDialog} onOpenChange={setIsEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar empleado</DialogTitle>
            <DialogDescription>
              Modifica los datos de {editUser?.name || 'este empleado'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Nombre completo *</Label>
              <Input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder="Nombre del empleado"
              />
            </div>
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={editEmail}
                onChange={e => setEditEmail(e.target.value)}
                placeholder="email@ejemplo.com"
              />
            </div>
            {editUser?.username && (
              <div className="grid gap-2">
                <Label>Usuario</Label>
                <Input
                  value={editUsername}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">El nombre de usuario no se puede cambiar</p>
              </div>
            )}
            <div className="grid gap-2">
              <Label>Color en calendario</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={editColor}
                  onChange={e => setEditColor(e.target.value)}
                  className="w-12 h-10 rounded cursor-pointer border border-border"
                />
                <Input
                  value={editColor}
                  onChange={e => setEditColor(e.target.value)}
                  placeholder="#3b82f6"
                  className="w-28"
                />
                <div 
                  className="flex-1 h-10 rounded flex items-center justify-center text-white text-sm font-medium"
                  style={{ backgroundColor: editColor }}
                >
                  Vista previa
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Este color se usará para identificar al empleado en el calendario de turnos</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialog(false)}>Cancelar</Button>
            <Button onClick={handleEditEmployee} disabled={updateEmployee.isPending}>
              {updateEmployee.isPending ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Employee Dialog */}
      <Dialog open={isDeleteDialog} onOpenChange={setIsDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar empleado</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres eliminar a {deleteUser?.name || 'este empleado'}?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Esta acción desactivará la cuenta del empleado. No podrá acceder al sistema pero sus datos históricos se conservarán.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialog(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteEmployee} disabled={deleteEmployee.isPending}>
              {deleteEmployee.isPending ? "Eliminando..." : "Eliminar empleado"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Change Dialog */}
      <Dialog open={isPasswordDialog} onOpenChange={setIsPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar contraseña</DialogTitle>
            <DialogDescription>
              Establece una nueva contraseña para {passwordUser?.name || 'este usuario'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="grid gap-2">
              <Label>Nueva contraseña</Label>
              <Input
                type="password"
                value={newUserPassword}
                onChange={e => setNewUserPassword(e.target.value)}
                placeholder="Mínimo 4 caracteres"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPasswordDialog(false)}>Cancelar</Button>
            <Button onClick={handleUpdatePassword} disabled={updatePassword.isPending}>
              {updatePassword.isPending ? "Guardando..." : "Guardar contraseña"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

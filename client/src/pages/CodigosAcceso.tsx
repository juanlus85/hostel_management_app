import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Key } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

export default function CodigosAcceso() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  
  const { data: codes, refetch } = trpc.accessCodes.list.useQuery();
  const createMutation = trpc.accessCodes.create.useMutation({
    onSuccess: () => {
      toast.success("Código creado correctamente");
      refetch();
      setIsCreateOpen(false);
      setNewCode({
        roomNumber: "",
        roomCode: "",
        roomType: "",
        floor: "",
        floorLevel: "",
        entranceCode: "1469",
      });
    },
    onError: (error) => {
      toast.error(`Error al crear código: ${error.message}`);
    },
  });

  const updateMutation = trpc.accessCodes.update.useMutation({
    onSuccess: () => {
      toast.success("Código actualizado correctamente");
      refetch();
      setEditingCode(null);
    },
    onError: (error) => {
      toast.error(`Error al actualizar código: ${error.message}`);
    },
  });

  const deleteMutation = trpc.accessCodes.delete.useMutation({
    onSuccess: () => {
      toast.success("Código eliminado correctamente");
      refetch();
    },
    onError: (error) => {
      toast.error(`Error al eliminar código: ${error.message}`);
    },
  });

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<any>(null);
  const [newCode, setNewCode] = useState({
    roomNumber: "",
    roomCode: "",
    roomType: "",
    floor: "",
    floorLevel: "",
    entranceCode: "1469",
  });

  const handleCreate = () => {
    if (!newCode.roomNumber || !newCode.roomCode || !newCode.roomType || !newCode.floor || !newCode.floorLevel) {
      toast.error("Completa todos los campos obligatorios");
      return;
    }
    createMutation.mutate(newCode);
  };

  const handleUpdate = () => {
    if (!editingCode) return;
    updateMutation.mutate({
      id: editingCode.id,
      roomNumber: editingCode.roomNumber,
      roomCode: editingCode.roomCode,
      roomType: editingCode.roomType,
      floor: editingCode.floor,
      floorLevel: editingCode.floorLevel,
      entranceCode: editingCode.entranceCode,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("¿Estás seguro de eliminar este código?")) {
      deleteMutation.mutate({ id });
    }
  };

  // Código de entrada del hostel (único)
  const entranceCode = codes?.find(c => c.entranceCode)?.entranceCode || "1469";

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Key className="h-8 w-8" />
            Códigos de Acceso
          </h1>
          <p className="text-muted-foreground mt-1">
            Códigos de habitaciones y entrada al hostel
          </p>
        </div>
        {isAdmin && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Código
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Crear Nuevo Código</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Número Habitación *</Label>
                  <Input
                    value={newCode.roomNumber}
                    onChange={(e) => setNewCode({ ...newCode, roomNumber: e.target.value })}
                    placeholder="4"
                  />
                </div>
                <div>
                  <Label>Código Habitación *</Label>
                  <Input
                    value={newCode.roomCode}
                    onChange={(e) => setNewCode({ ...newCode, roomCode: e.target.value })}
                    placeholder="1215"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Tipo de Habitación (Español) *</Label>
                  <Input
                    value={newCode.roomType}
                    onChange={(e) => setNewCode({ ...newCode, roomType: e.target.value })}
                    placeholder="Habitación Doble con 2 camas y baño compartido"
                  />
                </div>
                <div>
                  <Label>Planta *</Label>
                  <Input
                    value={newCode.floor}
                    onChange={(e) => setNewCode({ ...newCode, floor: e.target.value })}
                    placeholder="Planta Baja"
                  />
                </div>
                <div>
                  <Label>Floor *</Label>
                  <Input
                    value={newCode.floorLevel}
                    onChange={(e) => setNewCode({ ...newCode, floorLevel: e.target.value })}
                    placeholder="Ground Floor"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Código Entrada Hostel</Label>
                  <Input
                    value={newCode.entranceCode}
                    onChange={(e) => setNewCode({ ...newCode, entranceCode: e.target.value })}
                    placeholder="1469"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creando..." : "Crear"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Código de Entrada */}
      <Card className="bg-primary/5 border-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Código Entrada Hostel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-primary">{entranceCode}</div>
        </CardContent>
      </Card>

      {/* Tabla de Habitaciones */}
      <Card>
        <CardHeader>
          <CardTitle>Habitaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Número</th>
                  <th className="text-left p-2">Código</th>
                  <th className="text-left p-2">Tipo de Habitación</th>
                  <th className="text-left p-2">Planta</th>
                  <th className="text-left p-2">Floor</th>
                  {isAdmin && <th className="text-right p-2">Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {codes?.map((code) => (
                  <tr key={code.id} className="border-b hover:bg-muted/50">
                    <td className="p-2 font-medium">{code.roomNumber}</td>
                    <td className="p-2">{code.roomCode}</td>
                    <td className="p-2">{code.roomType}</td>
                    <td className="p-2">{code.floor}</td>
                    <td className="p-2">{code.floorLevel}</td>
                    {isAdmin && (
                      <td className="p-2 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingCode(code)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(code.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Edición */}
      {editingCode && (
        <Dialog open={!!editingCode} onOpenChange={() => setEditingCode(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Código</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Número Habitación</Label>
                <Input
                  value={editingCode.roomNumber}
                  onChange={(e) => setEditingCode({ ...editingCode, roomNumber: e.target.value })}
                />
              </div>
              <div>
                <Label>Código Habitación</Label>
                <Input
                  value={editingCode.roomCode}
                  onChange={(e) => setEditingCode({ ...editingCode, roomCode: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label>Tipo de Habitación (Español)</Label>
                <Input
                  value={editingCode.roomType}
                  onChange={(e) => setEditingCode({ ...editingCode, roomType: e.target.value })}
                />
              </div>
              <div>
                <Label>Planta</Label>
                <Input
                  value={editingCode.floor}
                  onChange={(e) => setEditingCode({ ...editingCode, floor: e.target.value })}
                />
              </div>
              <div>
                <Label>Floor</Label>
                <Input
                  value={editingCode.floorLevel}
                  onChange={(e) => setEditingCode({ ...editingCode, floorLevel: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label>Código Entrada Hostel</Label>
                <Input
                  value={editingCode.entranceCode || ""}
                  onChange={(e) => setEditingCode({ ...editingCode, entranceCode: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingCode(null)}>
                Cancelar
              </Button>
              <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

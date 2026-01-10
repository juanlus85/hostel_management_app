import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Loader2, ExternalLink, Eye, Trash2, CheckCircle2, Edit2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function CheckinAnticipado() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGuest, setSelectedGuest] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [editingGuest, setEditingGuest] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Obtener check-ins pendientes y filtrar anticipados en frontend
  const { data: allPendingGuests, isLoading, refetch } = trpc.checkin.guests.search.useQuery({
    status: "pending",
  });

  // Filtrar solo los de tipo anticipado
  const pendingGuests = allPendingGuests?.filter(g => g.checkinType === 'anticipado') || [];

  const deleteGuest = trpc.checkin.guests.delete.useMutation({
    onSuccess: () => {
      toast.success("Check-in anticipado eliminado");
      refetch();
    },
  });

  const completeCheckin = trpc.checkin.guests.update.useMutation({
    onSuccess: () => {
      toast.success("Check-in marcado como completado. Ahora aparece en Huéspedes.");
      refetch();
      setShowDetails(false);
    },
  });

  const filteredGuests = pendingGuests?.filter(g =>
    `${g.firstName} ${g.lastName} ${g.documentNumber}`.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleViewDetails = (guest: any) => {
    setSelectedGuest(guest);
    setShowDetails(true);
  };

  const handleComplete = () => {
    if (!selectedGuest) return;
    if (confirm("¿Marcar este check-in como completado? Se moverá a la pestaña Huéspedes.")) {
      completeCheckin.mutate({
        id: selectedGuest.id,
        status: "completed",
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("¿Eliminar este check-in anticipado?")) {
      deleteGuest.mutate({ id });
    }
  };

  const handleEdit = (guest: any) => {
    setEditingGuest({ ...guest });
    setShowEditModal(true);
    setShowDetails(false);
  };

  const publicUrl = `${window.location.origin}/checkin-anticipado-publico`;

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Check-in Anticipado</h2>
        <p className="text-muted-foreground">
          Gestiona los check-ins anticipados pendientes. Los completados aparecen en Huéspedes.
        </p>
      </div>

      {/* URL Pública */}
      <div className="mb-6 p-4 bg-muted rounded-lg">
        <Label className="text-sm font-medium mb-2 block">URL Pública para Huéspedes</Label>
        <div className="flex gap-2">
          <Input value={publicUrl} readOnly className="flex-1" />
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              navigator.clipboard.writeText(publicUrl);
              toast.success("URL copiada al portapapeles");
            }}
            title="Copiar URL"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Comparte este enlace con tus huéspedes para que completen sus datos antes de llegar
        </p>
      </div>

      {/* Búsqueda */}
      <div className="mb-4">
        <Input
          placeholder="Buscar por nombre o documento..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Lista de Pendientes */}
      {filteredGuests.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No hay check-ins anticipados pendientes</p>
          <p className="text-sm mt-2">Los check-ins completados aparecen en la pestaña Huéspedes</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Nombre</th>
                <th className="text-left p-2">Documento</th>
                <th className="text-left p-2">Nacionalidad</th>
                <th className="text-left p-2">Fecha Registro</th>
                <th className="text-left p-2">Estado</th>
                <th className="text-right p-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredGuests.map((guest) => (
                <tr key={guest.id} className="border-b hover:bg-muted/50">
                  <td className="p-2">{guest.firstName} {guest.lastName}</td>
                  <td className="p-2">{guest.documentNumber}</td>
                  <td className="p-2">{guest.nationality}</td>
                  <td className="p-2">
                    {guest.createdAt ? new Date(guest.createdAt).toLocaleDateString() : '-'}
                  </td>
                  <td className="p-2">
                    <Badge variant="secondary">Pendiente</Badge>
                  </td>
                  <td className="p-2">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleViewDetails(guest)}
                        title="Ver detalles"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(guest)}
                        title="Editar"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(guest.id!)}
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Detalles */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles del Check-in Anticipado</DialogTitle>
          </DialogHeader>

          {selectedGuest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Nombre</Label>
                  <p>{selectedGuest.firstName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Apellidos</Label>
                  <p>{selectedGuest.lastName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Documento</Label>
                  <p>{selectedGuest.documentNumber}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Nacionalidad</Label>
                  <p>{selectedGuest.nationality}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Teléfono</Label>
                  <p>{selectedGuest.phone || '-'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                  <p>{selectedGuest.email || '-'}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Dirección</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Calle</Label>
                    <p>{selectedGuest.address || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Ciudad</Label>
                    <p>{selectedGuest.city || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Provincia</Label>
                    <p>{selectedGuest.province || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">País</Label>
                    <p>{selectedGuest.country || '-'}</p>
                  </div>
                </div>
              </div>

              {selectedGuest.signature && (
                <div className="border-t pt-4">
                  <Label className="text-sm font-medium text-muted-foreground mb-2 block">Firma</Label>
                  <img src={selectedGuest.signature} alt="Firma" className="border rounded max-w-full h-32 object-contain" />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowDetails(false)}>
                  Cerrar
                </Button>
                <Button onClick={handleComplete}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Marcar como Completado
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

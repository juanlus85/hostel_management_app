import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Loader2, Search, Eye, Edit, Trash2, Download, FileText } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLocation } from "wouter";

export default function GestionHuespedes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedGuest, setSelectedGuest] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [, setLocation] = useLocation();

  const { data: guests, isLoading, refetch } = trpc.checkin.guests.search.useQuery({
    search: searchTerm || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const deleteGuest = trpc.checkin.guests.delete.useMutation({
    onSuccess: () => {
      alert("Huésped eliminado correctamente");
      refetch();
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const handleDelete = async (id: number, name: string) => {
    if (confirm(`¿Estás seguro de eliminar a ${name}?`)) {
      await deleteGuest.mutateAsync({ id });
    }
  };

  const handleViewDetails = (guest: any) => {
    setSelectedGuest(guest);
    setIsDetailsOpen(true);
  };

  const handleEdit = (guestId: number) => {
    setLocation(`/checkin/editar/${guestId}`);
  };

  const handleDownloadPDF = async (guest: any) => {
    try {
      // Generar PDF con datos del huésped
      const content = `
FICHA DE REGISTRO DE VIAJERO

=================================
DATOS PERSONALES
=================================
Nombre: ${guest.firstName} ${guest.lastName}
Documento: ${guest.documentType} ${guest.documentNumber}
Nacionalidad: ${guest.nationality}
Fecha de Nacimiento: ${guest.birthDate || "-"}
Género: ${guest.gender}
Teléfono: ${guest.phone || "-"}
Email: ${guest.email || "-"}

=================================
DATOS DE RESERVA
=================================
Número de Reserva: ${guest.reservationNumber || "-"}
Habitación: ${guest.roomNumber || "-"}
Check-in: ${guest.checkInDate ? new Date(guest.checkInDate).toLocaleString() : "-"}
Check-out: ${guest.checkOutDate ? new Date(guest.checkOutDate).toLocaleString() : "-"}
Estado: ${guest.status || "pending"}

=================================
DIRECCIÓN
=================================
Calle: ${guest.street || "-"}
Ciudad: ${guest.city || "-"}
Provincia: ${guest.province || "-"}
Código Postal: ${guest.postalCode || "-"}
País: ${guest.country || "-"}

=================================
INFORMACIÓN DE PAGO
=================================
Tipo de Pago: ${guest.paymentType || "-"}
Cantidad Abonada: ${guest.amountPaid || "0"}€
Cantidad Pendiente: ${guest.amountPending || "0"}€
Titular: ${guest.paymentHolder || "-"}
Método: ${guest.paymentMethod || "-"}

=================================
Firma del Huésped
=================================
${guest.signature ? "[Firma capturada]" : "[Sin firma]"}

Generado: ${new Date().toLocaleString()}
      `;

      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ficha_${guest.firstName}_${guest.lastName}_${guest.documentNumber}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert("PDF generado correctamente (formato texto)");
    } catch (error) {
      alert("Error al generar PDF");
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: "default",
      pending: "secondary",
      online: "outline",
      cancelled: "destructive",
    };
    
    const labels: Record<string, string> = {
      completed: "Completado",
      pending: "Pendiente",
      online: "Online",
      cancelled: "Cancelado",
    };

    return (
      <Badge variant={variants[status] || "default"}>
        {labels[status] || status}
      </Badge>
    );
  };

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Gestión de Huéspedes</h2>
        <p className="text-muted-foreground">Búsqueda y gestión de registros</p>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <Label htmlFor="search">Buscar</Label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Nombre, documento, reserva..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div>
          <Label htmlFor="startDate">Desde</Label>
          <Input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        
        <div>
          <Label htmlFor="endDate">Hasta</Label>
          <Input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      {/* Tabla de Huéspedes */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !guests || guests.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No se encontraron huéspedes
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Reserva</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>Habitación</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {guests.map((guest) => (
                <TableRow key={guest.id}>
                  <TableCell className="font-medium">
                    {guest.firstName} {guest.lastName}
                  </TableCell>
                  <TableCell>{guest.documentNumber}</TableCell>
                  <TableCell>{guest.reservationNumber || "-"}</TableCell>
                  <TableCell>
                    {guest.checkInDate ? new Date(guest.checkInDate).toLocaleDateString() : "-"}
                  </TableCell>
                  <TableCell>{guest.roomNumber || "-"}</TableCell>
                  <TableCell>{getStatusBadge(guest.status || "pending")}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Ver detalles"
                        onClick={() => handleViewDetails(guest)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Editar"
                        onClick={() => handleEdit(guest.id!)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Descargar PDF"
                        onClick={() => handleDownloadPDF(guest)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Eliminar"
                        onClick={() => handleDelete(guest.id!, `${guest.firstName} ${guest.lastName}`)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Modal de Detalles */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles del Huésped</DialogTitle>
            <DialogDescription>
              Información completa del registro de check-in
            </DialogDescription>
          </DialogHeader>
          
          {selectedGuest && (
            <div className="space-y-6">
              {/* Datos Personales */}
              <div>
                <h3 className="font-semibold text-lg mb-3">Datos Personales</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Nombre:</span>
                    <p className="font-medium">{selectedGuest.firstName} {selectedGuest.lastName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Documento:</span>
                    <p className="font-medium">{selectedGuest.documentType} {selectedGuest.documentNumber}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Nacionalidad:</span>
                    <p className="font-medium">{selectedGuest.nationality}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Género:</span>
                    <p className="font-medium">{selectedGuest.gender}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Teléfono:</span>
                    <p className="font-medium">{selectedGuest.phone || "-"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email:</span>
                    <p className="font-medium">{selectedGuest.email || "-"}</p>
                  </div>
                </div>
              </div>

              {/* Datos de Reserva */}
              <div>
                <h3 className="font-semibold text-lg mb-3">Datos de Reserva</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Número de Reserva:</span>
                    <p className="font-medium">{selectedGuest.reservationNumber || "-"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Habitación:</span>
                    <p className="font-medium">{selectedGuest.roomNumber || "-"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Check-in:</span>
                    <p className="font-medium">
                      {selectedGuest.checkInDate ? new Date(selectedGuest.checkInDate).toLocaleString() : "-"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Check-out:</span>
                    <p className="font-medium">
                      {selectedGuest.checkOutDate ? new Date(selectedGuest.checkOutDate).toLocaleString() : "-"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Estado:</span>
                    <div>{getStatusBadge(selectedGuest.status || "pending")}</div>
                  </div>
                </div>
              </div>

              {/* Dirección */}
              <div>
                <h3 className="font-semibold text-lg mb-3">Dirección</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Calle:</span>
                    <p className="font-medium">{selectedGuest.street || "-"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ciudad:</span>
                    <p className="font-medium">{selectedGuest.city || "-"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Provincia:</span>
                    <p className="font-medium">{selectedGuest.province || "-"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Código Postal:</span>
                    <p className="font-medium">{selectedGuest.postalCode || "-"}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">País:</span>
                    <p className="font-medium">{selectedGuest.country || "-"}</p>
                  </div>
                </div>
              </div>

              {/* Información de Pago */}
              <div>
                <h3 className="font-semibold text-lg mb-3">Información de Pago</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Tipo de Pago:</span>
                    <p className="font-medium">{selectedGuest.paymentType || "-"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Titular:</span>
                    <p className="font-medium">{selectedGuest.paymentHolder || "-"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Cantidad Abonada:</span>
                    <p className="font-medium">{selectedGuest.amountPaid || "0"}€</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Cantidad Pendiente:</span>
                    <p className="font-medium">{selectedGuest.amountPending || "0"}€</p>
                  </div>
                </div>
              </div>

              {/* Firma */}
              {selectedGuest.signature && (
                <div>
                  <h3 className="font-semibold text-lg mb-3">Firma del Huésped</h3>
                  <div className="border rounded-lg p-4 bg-muted/20">
                    <img 
                      src={selectedGuest.signature} 
                      alt="Firma" 
                      className="max-w-full h-auto"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

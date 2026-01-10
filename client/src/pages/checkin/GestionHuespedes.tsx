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
    // TODO: Implementar modal de edición
    alert('Funcionalidad de edición en desarrollo. Por ahora puedes eliminar y crear un nuevo registro.');
  };

  const handleDownloadPDF = async (guest: any) => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      let y = 20;
      const lineHeight = 7;
      const leftMargin = 20;
      
      // Título
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('FICHA DE REGISTRO DE VIAJERO', leftMargin, y);
      y += lineHeight * 2;
      
      // Datos Personales
      doc.setFontSize(14);
      doc.text('DATOS PERSONALES', leftMargin, y);
      y += lineHeight;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Nombre: ${guest.firstName} ${guest.lastName}`, leftMargin, y);
      y += lineHeight;
      doc.text(`Documento: ${guest.documentType} ${guest.documentNumber}`, leftMargin, y);
      y += lineHeight;
      doc.text(`Nacionalidad: ${guest.nationality}`, leftMargin, y);
      y += lineHeight;
      doc.text(`Fecha de Nacimiento: ${guest.birthDate || "-"}`, leftMargin, y);
      y += lineHeight;
      doc.text(`Género: ${guest.gender}`, leftMargin, y);
      y += lineHeight;
      doc.text(`Teléfono: ${guest.phone || "-"}`, leftMargin, y);
      y += lineHeight;
      doc.text(`Email: ${guest.email || "-"}`, leftMargin, y);
      y += lineHeight * 2;
      
      // Datos de Reserva
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('DATOS DE RESERVA', leftMargin, y);
      y += lineHeight;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Número de Reserva: ${guest.reservationNumber || "-"}`, leftMargin, y);
      y += lineHeight;
      doc.text(`Habitación: ${guest.roomNumber || "-"}`, leftMargin, y);
      y += lineHeight;
      doc.text(`Check-in: ${guest.checkInDate ? new Date(guest.checkInDate).toLocaleString() : "-"}`, leftMargin, y);
      y += lineHeight;
      doc.text(`Check-out: ${guest.checkOutDate ? new Date(guest.checkOutDate).toLocaleString() : "-"}`, leftMargin, y);
      y += lineHeight;
      doc.text(`Estado: ${guest.status === 'completed' ? 'Completado' : guest.status}`, leftMargin, y);
      y += lineHeight * 2;
      
      // Dirección
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('DIRECCIÓN', leftMargin, y);
      y += lineHeight;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Calle: ${guest.street || "-"}`, leftMargin, y);
      y += lineHeight;
      doc.text(`Ciudad: ${guest.city || "-"}`, leftMargin, y);
      y += lineHeight;
      doc.text(`Provincia: ${guest.province || "-"}`, leftMargin, y);
      y += lineHeight;
      doc.text(`Código Postal: ${guest.postalCode || "-"}`, leftMargin, y);
      y += lineHeight;
      doc.text(`País: ${guest.country || "-"}`, leftMargin, y);
      y += lineHeight * 2;
      
      // Información de Pago
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('INFORMACIÓN DE PAGO', leftMargin, y);
      y += lineHeight;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Tipo de Pago: ${guest.paymentType || "-"}`, leftMargin, y);
      y += lineHeight;
      doc.text(`Cantidad Abonada: ${guest.amountPaid || "0"}€`, leftMargin, y);
      y += lineHeight;
      doc.text(`Cantidad Pendiente: ${guest.amountPending || "0"}€`, leftMargin, y);
      y += lineHeight;
      doc.text(`Titular: ${guest.paymentHolder || "-"}`, leftMargin, y);
      y += lineHeight;
      doc.text(`Método: ${guest.paymentMethod || "-"}`, leftMargin, y);
      y += lineHeight * 2;
      
      // Firma
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('FIRMA DEL HUÉSPED', leftMargin, y);
      y += lineHeight;
      
      if (guest.signature) {
        try {
          // Añadir imagen de firma (base64)
          doc.addImage(guest.signature, 'PNG', leftMargin, y, 80, 30);
          y += 35;
        } catch (e) {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'italic');
          doc.text('[Firma capturada]', leftMargin, y);
          y += lineHeight;
        }
      } else {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.text('[Sin firma]', leftMargin, y);
        y += lineHeight;
      }
      
      y += lineHeight;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generado: ${new Date().toLocaleString()}`, leftMargin, y);
      
      // Descargar PDF
      doc.save(`ficha_${guest.firstName}_${guest.lastName}_${guest.documentNumber}.pdf`);
      
      alert("PDF generado correctamente");
    } catch (error) {
      console.error('Error al generar PDF:', error);
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

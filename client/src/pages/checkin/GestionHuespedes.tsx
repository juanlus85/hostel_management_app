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
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<any>(null);
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

  const updateGuest = trpc.checkin.guests.update.useMutation({
    onSuccess: () => {
      alert("Huésped actualizado correctamente");
      setIsEditOpen(false);
      setEditingGuest(null);
      refetch();
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const handleEdit = (guest: any) => {
    setEditingGuest(guest);
    setIsEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingGuest) return;
    await updateGuest.mutateAsync({
      id: editingGuest.id,
      firstName: editingGuest.firstName,
      lastName: editingGuest.lastName,
      documentNumber: editingGuest.documentNumber,
      documentType: editingGuest.documentType,
      nationality: editingGuest.nationality,
      birthDate: editingGuest.birthDate,
      gender: editingGuest.gender,
      phone: editingGuest.phone,
      email: editingGuest.email,
      street: editingGuest.street,
      city: editingGuest.city,
      province: editingGuest.province,
      postalCode: editingGuest.postalCode,
      country: editingGuest.country,
      reservationNumber: editingGuest.reservationNumber,
      roomNumber: editingGuest.roomNumber,
      checkInDate: editingGuest.checkInDate,
      checkOutDate: editingGuest.checkOutDate,
      paymentType: editingGuest.paymentType,
      amountPaid: editingGuest.amountPaid,
      amountPending: editingGuest.amountPending,
      paymentHolder: editingGuest.paymentHolder,
      paymentMethod: editingGuest.paymentMethod,
    });
  };

  const handleDownloadPDF = async (guest: any) => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      const lineHeight = 6;
      const leftMargin = 15;
      const rightColumnX = 110;
      const pageWidth = 210; // A4 width in mm
      
      // Título centrado
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('FICHA DE REGISTRO DE VIAJERO', pageWidth / 2, 15, { align: 'center' });
      
      // COLUMNA IZQUIERDA
      let yLeft = 25;
      
      // Datos Personales
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('DATOS PERSONALES', leftMargin, yLeft);
      yLeft += lineHeight;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Nombre: ${guest.firstName} ${guest.lastName}`, leftMargin, yLeft);
      yLeft += lineHeight;
      doc.text(`Documento: ${guest.documentType} ${guest.documentNumber}`, leftMargin, yLeft);
      yLeft += lineHeight;
      if (guest.documentSupport) {
        doc.text(`Soporte: ${guest.documentSupport}`, leftMargin, yLeft);
        yLeft += lineHeight;
      }
      doc.text(`Nacionalidad: ${guest.nationality}`, leftMargin, yLeft);
      yLeft += lineHeight;
      doc.text(`Nacimiento: ${guest.birthDate || "-"}`, leftMargin, yLeft);
      yLeft += lineHeight;
      doc.text(`Género: ${guest.gender}`, leftMargin, yLeft);
      yLeft += lineHeight;
      doc.text(`Teléfono: ${guest.phone || "-"}`, leftMargin, yLeft);
      yLeft += lineHeight;
      doc.text(`Email: ${guest.email || "-"}`, leftMargin, yLeft);
      yLeft += lineHeight + 2;
      
      // Dirección
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('DIRECCIÓN', leftMargin, yLeft);
      yLeft += lineHeight;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Calle: ${guest.street || "-"}`, leftMargin, yLeft);
      yLeft += lineHeight;
      doc.text(`Ciudad: ${guest.city || "-"}`, leftMargin, yLeft);
      yLeft += lineHeight;
      doc.text(`Provincia: ${guest.province || "-"}`, leftMargin, yLeft);
      yLeft += lineHeight;
      doc.text(`CP: ${guest.postalCode || "-"} | País: ${guest.country || "-"}`, leftMargin, yLeft);
      yLeft += lineHeight + 2;
      
      // COLUMNA DERECHA
      let yRight = 25;
      
      // Datos de Reserva
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('DATOS DE RESERVA', rightColumnX, yRight);
      yRight += lineHeight;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Nº Reserva: ${guest.reservationNumber || "-"}`, rightColumnX, yRight);
      yRight += lineHeight;
      doc.text(`Habitación: ${guest.roomNumber || "-"}`, rightColumnX, yRight);
      yRight += lineHeight;
      doc.text(`Tipo: ${guest.roomType || "-"}`, rightColumnX, yRight);
      yRight += lineHeight;
      doc.text(`Check-in: ${guest.checkInDate ? new Date(guest.checkInDate).toLocaleDateString() : "-"}`, rightColumnX, yRight);
      yRight += lineHeight;
      doc.text(`Check-out: ${guest.checkOutDate ? new Date(guest.checkOutDate).toLocaleDateString() : "-"}`, rightColumnX, yRight);
      yRight += lineHeight;
      doc.text(`Nº Habitaciones: ${guest.numberOfRooms || "1"}`, rightColumnX, yRight);
      yRight += lineHeight;
      doc.text(`Alojamiento: ${guest.accommodationType || "-"}`, rightColumnX, yRight);
      yRight += lineHeight;
      doc.text(`Origen: ${guest.reservationOrigin || "-"}`, rightColumnX, yRight);
      yRight += lineHeight + 2;
      
      // Información de Pago
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('INFORMACIÓN DE PAGO', rightColumnX, yRight);
      yRight += lineHeight;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Tipo: ${guest.paymentType || "-"}`, rightColumnX, yRight);
      yRight += lineHeight;
      doc.text(`Fecha: ${guest.paymentDate || "-"}`, rightColumnX, yRight);
      yRight += lineHeight;
      doc.text(`Abonado: ${guest.amountPaid || "0"}€`, rightColumnX, yRight);
      yRight += lineHeight;
      doc.text(`Pendiente: ${guest.amountPending || "0"}€`, rightColumnX, yRight);
      yRight += lineHeight;
      doc.text(`Titular: ${guest.paymentHolder || "-"}`, rightColumnX, yRight);
      yRight += lineHeight;
      doc.text(`Método: ${guest.paymentMethod || "-"}`, rightColumnX, yRight);
      yRight += lineHeight + 2;
      
      // Usar la posición más baja de las dos columnas
      let y = Math.max(yLeft, yRight);
      
      // Declaración de Aceptación de Condiciones (compacta)
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('ACEPTACIÓN DE CONDICIONES', leftMargin, y);
      y += lineHeight;
      
      // Checkbox marcado
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.rect(leftMargin, y - 2.5, 3, 3);
      doc.line(leftMargin + 0.5, y - 1, leftMargin + 1.5, y - 0.5);
      doc.line(leftMargin + 1.5, y - 0.5, leftMargin + 3, y - 2.5);
      
      // Texto de aceptación (compacto)
      doc.text('El huésped acepta las normas del establecimiento y la política de protección de datos.', leftMargin + 5, y);
      y += lineHeight;
      
      // Fecha de aceptación (compacta)
      const checkInDateTime = guest.checkInDate ? new Date(guest.checkInDate) : new Date();
      const acceptanceDate = checkInDateTime.toLocaleDateString('es-ES');
      doc.setFont('helvetica', 'italic');
      doc.text(`Firmado el ${acceptanceDate}`, leftMargin, y);
      y += lineHeight + 2;
      
      // Firma (más pequeña)
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('FIRMA DEL HUÉSPED', leftMargin, y);
      y += lineHeight;
      
      if (guest.signature) {
        try {
          // Añadir imagen de firma (más pequeña para que quepa)
          doc.addImage(guest.signature, 'PNG', leftMargin, y, 60, 20);
          y += 22;
        } catch (e) {
          doc.setFontSize(8);
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
                        onClick={() => handleEdit(guest)}
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

      {/* Modal de Edición */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Huésped</DialogTitle>
            <DialogDescription>
              Modifica los datos del huésped. Los campos marcados con * son obligatorios.
            </DialogDescription>
          </DialogHeader>
          {editingGuest && (
            <div className="grid gap-6 py-4">
              {/* Datos Personales */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Datos Personales</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-firstName">Nombre *</Label>
                    <Input
                      id="edit-firstName"
                      value={editingGuest.firstName || ""}
                      onChange={(e) => setEditingGuest({...editingGuest, firstName: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-lastName">Apellidos *</Label>
                    <Input
                      id="edit-lastName"
                      value={editingGuest.lastName || ""}
                      onChange={(e) => setEditingGuest({...editingGuest, lastName: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-documentType">Tipo de Documento</Label>
                    <Input
                      id="edit-documentType"
                      value={editingGuest.documentType || ""}
                      onChange={(e) => setEditingGuest({...editingGuest, documentType: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-documentNumber">Número de Documento *</Label>
                    <Input
                      id="edit-documentNumber"
                      value={editingGuest.documentNumber || ""}
                      onChange={(e) => setEditingGuest({...editingGuest, documentNumber: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-nationality">Nacionalidad</Label>
                    <Input
                      id="edit-nationality"
                      value={editingGuest.nationality || ""}
                      onChange={(e) => setEditingGuest({...editingGuest, nationality: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-birthDate">Fecha de Nacimiento</Label>
                    <Input
                      id="edit-birthDate"
                      type="date"
                      value={editingGuest.birthDate ? editingGuest.birthDate.split('T')[0] : ""}
                      onChange={(e) => setEditingGuest({...editingGuest, birthDate: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-phone">Teléfono</Label>
                    <Input
                      id="edit-phone"
                      type="tel"
                      value={editingGuest.phone || ""}
                      onChange={(e) => setEditingGuest({...editingGuest, phone: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-email">Email</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={editingGuest.email || ""}
                      onChange={(e) => setEditingGuest({...editingGuest, email: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              {/* Dirección */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Dirección</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-street">Calle</Label>
                    <Input
                      id="edit-street"
                      value={editingGuest.street || ""}
                      onChange={(e) => setEditingGuest({...editingGuest, street: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-city">Ciudad</Label>
                    <Input
                      id="edit-city"
                      value={editingGuest.city || ""}
                      onChange={(e) => setEditingGuest({...editingGuest, city: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-province">Provincia</Label>
                    <Input
                      id="edit-province"
                      value={editingGuest.province || ""}
                      onChange={(e) => setEditingGuest({...editingGuest, province: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-postalCode">Código Postal</Label>
                    <Input
                      id="edit-postalCode"
                      value={editingGuest.postalCode || ""}
                      onChange={(e) => setEditingGuest({...editingGuest, postalCode: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-country">País</Label>
                    <Input
                      id="edit-country"
                      value={editingGuest.country || ""}
                      onChange={(e) => setEditingGuest({...editingGuest, country: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              {/* Datos de Reserva */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Datos de Reserva</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-reservationNumber">Número de Reserva</Label>
                    <Input
                      id="edit-reservationNumber"
                      value={editingGuest.reservationNumber || ""}
                      onChange={(e) => setEditingGuest({...editingGuest, reservationNumber: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-roomNumber">Habitación</Label>
                    <Input
                      id="edit-roomNumber"
                      value={editingGuest.roomNumber || ""}
                      onChange={(e) => setEditingGuest({...editingGuest, roomNumber: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-checkInDate">Check-in</Label>
                    <Input
                      id="edit-checkInDate"
                      type="datetime-local"
                      value={editingGuest.checkInDate ? new Date(editingGuest.checkInDate).toISOString().slice(0, 16) : ""}
                      onChange={(e) => setEditingGuest({...editingGuest, checkInDate: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-checkOutDate">Check-out</Label>
                    <Input
                      id="edit-checkOutDate"
                      type="datetime-local"
                      value={editingGuest.checkOutDate ? new Date(editingGuest.checkOutDate).toISOString().slice(0, 16) : ""}
                      onChange={(e) => setEditingGuest({...editingGuest, checkOutDate: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              {/* Información de Pago */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Información de Pago</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-paymentType">Tipo de Pago</Label>
                    <Input
                      id="edit-paymentType"
                      value={editingGuest.paymentType || ""}
                      onChange={(e) => setEditingGuest({...editingGuest, paymentType: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-paymentHolder">Titular</Label>
                    <Input
                      id="edit-paymentHolder"
                      value={editingGuest.paymentHolder || ""}
                      onChange={(e) => setEditingGuest({...editingGuest, paymentHolder: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-amountPaid">Cantidad Abonada (€)</Label>
                    <Input
                      id="edit-amountPaid"
                      type="number"
                      value={editingGuest.amountPaid || ""}
                      onChange={(e) => setEditingGuest({...editingGuest, amountPaid: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-amountPending">Cantidad Pendiente (€)</Label>
                    <Input
                      id="edit-amountPending"
                      type="number"
                      value={editingGuest.amountPending || ""}
                      onChange={(e) => setEditingGuest({...editingGuest, amountPending: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-paymentMethod">Método de Pago</Label>
                    <Input
                      id="edit-paymentMethod"
                      value={editingGuest.paymentMethod || ""}
                      onChange={(e) => setEditingGuest({...editingGuest, paymentMethod: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              {/* Botones */}
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveEdit} disabled={updateGuest.isPending}>
                  {updateGuest.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Guardar Cambios
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

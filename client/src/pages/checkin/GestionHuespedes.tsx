import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Loader2, Search, Eye, Edit, Trash2, Download, ClipboardCheck } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import CheckinPresencial from "./CheckinPresencial";
import { getGuestListPeriodRange, type GuestListPeriod } from "@shared/guestListPeriod";

export default function GestionHuespedes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [period, setPeriod] = useState<GuestListPeriod>("week");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [selectedGuestIds, setSelectedGuestIds] = useState<number[]>([]);
  const [selectedGuest, setSelectedGuest] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCheckinOpen, setIsCheckinOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<any>(null);
  const periodRange = useMemo(() => getGuestListPeriodRange(period), [period]);
  const guestQuery = useMemo(
    () => ({
      search: searchTerm || undefined,
      startDate: period === "custom" ? customStartDate || undefined : periodRange.startDate,
      endDate: period === "custom" ? customEndDate || undefined : periodRange.endDate,
      status: periodRange.status,
    }),
    [customEndDate, customStartDate, period, periodRange, searchTerm]
  );
  const { data: guests, isLoading, isError, error, refetch } = trpc.checkin.guests.search.useQuery(guestQuery);
  const selectedGuestIdSet = useMemo(() => new Set(selectedGuestIds), [selectedGuestIds]);

  useEffect(() => {
    const visibleIds = new Set((guests || []).map(guest => guest.id));
    setSelectedGuestIds(ids => ids.filter(id => visibleIds.has(id)));
  }, [guests]);

  const deleteGuest = trpc.checkin.guests.delete.useMutation({
    onSuccess: () => {
      alert("Huésped eliminado correctamente");
      refetch();
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const deleteGuests = trpc.checkin.guests.deleteMany.useMutation({
    onSuccess: result => {
      alert(`${result.deletedCount} huésped(es) eliminado(s) correctamente`);
      setSelectedGuestIds([]);
      refetch();
    },
    onError: error => {
      alert(`Error: ${error.message}`);
    },
  });

  const handleDelete = async (id: number, name: string) => {
    if (confirm(`¿Estás seguro de eliminar a ${name}?`)) {
      await deleteGuest.mutateAsync({ id });
    }
  };

  const toggleSelectedGuest = (id: number, checked: boolean) => {
    setSelectedGuestIds(ids =>
      checked ? Array.from(new Set(ids.concat(id))) : ids.filter(selectedId => selectedId !== id)
    );
  };

  const toggleAllVisibleGuests = (checked: boolean) => {
    setSelectedGuestIds(checked ? (guests || []).map(guest => guest.id) : []);
  };

  const handleDeleteSelected = () => {
    if (selectedGuestIds.length === 0) return;
    if (confirm(`¿Eliminar los ${selectedGuestIds.length} huéspedes seleccionados? Esta acción no se puede deshacer.`)) {
      deleteGuests.mutate({ ids: selectedGuestIds });
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
    <Card className="min-w-0 p-4 sm:p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Gestión de Huéspedes</h2>
        <p className="text-muted-foreground">Búsqueda y gestión de registros</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
          <Label htmlFor="guest-period">Período</Label>
          <Select value={period} onValueChange={value => setPeriod(value as GuestListPeriod)}>
            <SelectTrigger id="guest-period"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Última semana · completados</SelectItem>
              <SelectItem value="month">Último mes · completados</SelectItem>
              <SelectItem value="all">Todos los huéspedes</SelectItem>
              <SelectItem value="custom">Intervalo personalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {period === "custom" && <>
          <div>
            <Label htmlFor="startDate">Desde</Label>
            <Input id="startDate" type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="endDate">Hasta</Label>
            <Input id="endDate" type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} />
          </div>
        </>}
      </div>

      <div className="my-5 flex flex-col gap-3 rounded-lg border bg-muted/25 p-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {selectedGuestIds.length > 0
            ? `${selectedGuestIds.length} huésped(es) seleccionado(s)`
            : period === "week"
              ? "Por defecto: Check-ins completados en los últimos 7 días."
              : "Selecciona registros para eliminarlos juntos."}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => toggleAllVisibleGuests(true)} disabled={!guests?.length}>
            Seleccionar visibles
          </Button>
          <Button size="sm" variant="outline" onClick={() => setSelectedGuestIds([])} disabled={selectedGuestIds.length === 0}>
            Quitar selección
          </Button>
          <Button size="sm" variant="destructive" onClick={handleDeleteSelected} disabled={selectedGuestIds.length === 0 || deleteGuests.isPending}>
            <Trash2 className="mr-2 h-4 w-4" />Eliminar seleccionados
          </Button>
        </div>
      </div>

      {/* Tabla de Huéspedes */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-5 text-center text-sm text-rose-900">
          <p className="font-semibold">No se ha podido cargar la lista de huéspedes</p>
          <p className="mt-1">{error.message}</p>
          <Button className="mt-3" size="sm" variant="outline" onClick={() => refetch()}>Reintentar</Button>
        </div>
      ) : !guests || guests.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No se encontraron huéspedes
        </div>
      ) : (
        <>
        <div className="space-y-3 md:hidden">
          {guests.map((guest) => (
            <article key={guest.id} className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 gap-3">
                  <Checkbox
                    className="mt-1"
                    checked={selectedGuestIdSet.has(guest.id)}
                    onCheckedChange={checked => toggleSelectedGuest(guest.id, checked === true)}
                    aria-label={`Seleccionar a ${guest.firstName} ${guest.lastName}`}
                  />
                  <div className="min-w-0"><h3 className="truncate font-semibold">{guest.firstName} {guest.lastName}</h3><p className="mt-1 truncate text-sm text-muted-foreground">{guest.documentNumber || "Sin documento"} · Hab. {guest.roomNumber || "—"}</p></div>
                </div>
                <div className="shrink-0">{getStatusBadge(guest.status || "pending")}</div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground"><p>Reserva: <span className="font-medium text-foreground">{guest.reservationNumber || "—"}</span></p><p>Entrada: <span className="font-medium text-foreground">{guest.checkInDate ? new Date(guest.checkInDate).toLocaleDateString() : "—"}</span></p></div>
              <div className="mt-3 grid grid-cols-2 gap-2"><Button variant="outline" size="sm" onClick={() => handleViewDetails(guest)}><Eye className="mr-1 h-4 w-4" />Ver</Button><Button variant="outline" size="sm" onClick={() => handleEdit(guest)}><Edit className="mr-1 h-4 w-4" />Editar</Button><Button variant="outline" size="sm" onClick={() => handleDownloadPDF(guest)}><Download className="mr-1 h-4 w-4" />PDF</Button><Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(guest.id!, `${guest.firstName} ${guest.lastName}`)}><Trash2 className="mr-1 h-4 w-4" />Eliminar</Button></div>
            </article>
          ))}
        </div>
        <div className="hidden overflow-x-auto rounded-lg border md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={guests.length > 0 && guests.every(guest => selectedGuestIdSet.has(guest.id))}
                    onCheckedChange={checked => toggleAllVisibleGuests(checked === true)}
                    aria-label="Seleccionar todos los huéspedes visibles"
                  />
                </TableHead>
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
                  <TableCell>
                    <Checkbox
                      checked={selectedGuestIdSet.has(guest.id)}
                      onCheckedChange={checked => toggleSelectedGuest(guest.id, checked === true)}
                      aria-label={`Seleccionar a ${guest.firstName} ${guest.lastName}`}
                    />
                  </TableCell>
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
        </>
      )}

      {/* Modal de Detalles */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] overflow-y-auto p-4 sm:max-h-[80vh] sm:max-w-2xl sm:p-6">
          <DialogHeader>
            <DialogTitle>Detalles del Huésped</DialogTitle>
            <DialogDescription>
              Información completa del registro de check-in
            </DialogDescription>
          </DialogHeader>
          
          {selectedGuest && (
            <div className="space-y-6">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-medium text-emerald-950">Finaliza el registro en recepción</p>
                <p className="mt-1 text-xs text-emerald-800">Los datos disponibles se cargarán para completar, revisar y firmar el Check-in.</p>
                <Button
                  className="mt-3"
                  onClick={() => {
                    setIsDetailsOpen(false);
                    setIsCheckinOpen(true);
                  }}
                >
                  <ClipboardCheck className="mr-2 h-4 w-4" />
                  Realizar Check-in
                </Button>
              </div>

              {/* Datos Personales */}
              <div>
                <h3 className="font-semibold text-lg mb-3">Datos Personales</h3>
                <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
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
                <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
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
                <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
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
                <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
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

      <Dialog open={isCheckinOpen} onOpenChange={setIsCheckinOpen}>
        <DialogContent className="!inset-0 !h-[100dvh] !max-h-[100dvh] !w-[100dvw] !max-w-none !translate-x-0 !translate-y-0 overflow-x-hidden overflow-y-auto rounded-none p-0 sm:!inset-y-[3vh] sm:!left-1/2 sm:!right-auto sm:!h-[94vh] sm:!max-h-[94vh] sm:!w-[min(96vw,1180px)] sm:!max-w-[1180px] sm:!-translate-x-1/2 sm:rounded-xl sm:p-6">
          <DialogHeader className="sticky top-0 z-20 border-b bg-background px-4 py-4 pr-12 text-left shadow-sm sm:static sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:pr-0 sm:shadow-none">
            <DialogTitle>Realizar Check-in</DialogTitle>
            <DialogDescription>
              Revisa los datos ya recibidos, completa los campos necesarios y guarda el registro definitivo.
            </DialogDescription>
          </DialogHeader>
          {selectedGuest && (
            <CheckinPresencial
              key={selectedGuest.id}
              initialGuest={selectedGuest}
              onCompleted={() => {
                setIsCheckinOpen(false);
                setIsDetailsOpen(false);
                refetch();
              }}
            />
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
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

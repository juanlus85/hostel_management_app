import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { COUNTRIES } from "@/lib/countries";

interface EditGuestModalProps {
  guest: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function EditGuestModal({ guest, open, onOpenChange, onSuccess }: EditGuestModalProps) {
  const [formData, setFormData] = useState({
    // Datos personales
    firstName: "",
    lastName: "",
    nationality: "ESP",
    documentType: "PAS",
    documentNumber: "",
    documentSupport: "",
    gender: "male",
    birthDate: "",
    phone: "",
    email: "",
    
    // Dirección
    street: "",
    city: "",
    province: "",
    postalCode: "",
    country: "ESP",
    
    // Datos de reserva
    reservationNumber: "",
    checkInDate: "",
    checkOutDate: "",
    roomNumber: "",
    
    // Información de pago
    paymentType: "cash",
    paymentHolder: "",
    amountPaid: "0",
    amountPending: "0",
    paymentMethod: "cash",
  });

  const updateGuestMutation = trpc.checkin.guests.update.useMutation({
    onSuccess: () => {
      toast.success("Huésped actualizado correctamente");
      onSuccess();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  // Cargar datos del huésped cuando se abre el modal
  useEffect(() => {
    if (guest && open) {
      setFormData({
        firstName: guest.firstName || "",
        lastName: guest.lastName || "",
        nationality: guest.nationality || "ESP",
        documentType: guest.documentType || "PAS",
        documentNumber: guest.documentNumber || "",
        documentSupport: guest.documentSupport || "",
        gender: guest.gender || "male",
        birthDate: guest.birthDate || "",
        phone: guest.phone || "",
        email: guest.email || "",
        street: guest.street || "",
        city: guest.city || "",
        province: guest.province || "",
        postalCode: guest.postalCode || "",
        country: guest.country || "ESP",
        reservationNumber: guest.reservationNumber || "",
        checkInDate: guest.checkInDate || "",
        checkOutDate: guest.checkOutDate || "",
        roomNumber: guest.roomNumber || "",
        paymentType: guest.paymentType || "cash",
        paymentHolder: guest.paymentHolder || "",
        amountPaid: guest.amountPaid?.toString() || "0",
        amountPending: guest.amountPending?.toString() || "0",
        paymentMethod: guest.paymentMethod || "cash",
      });
    }
  }, [guest, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!guest?.id) return;

    const updateData: any = {
      id: guest.id,
      firstName: formData.firstName,
      lastName: formData.lastName,
      nationality: formData.nationality,
      documentType: formData.documentType,
      documentNumber: formData.documentNumber,
      documentSupport: formData.documentSupport || undefined,
      gender: formData.gender as "male" | "female" | "other",
      birthDate: formData.birthDate,
      phone: formData.phone,
      email: formData.email,
      street: formData.street,
      city: formData.city,
      province: formData.province,
      postalCode: formData.postalCode,
      country: formData.country,
      reservationNumber: formData.reservationNumber || undefined,
      checkInDate: formData.checkInDate || undefined,
      checkOutDate: formData.checkOutDate || undefined,
      roomNumber: formData.roomNumber || undefined,
      paymentType: formData.paymentType || undefined,
      paymentHolder: formData.paymentHolder || undefined,
      amountPaid: formData.amountPaid || undefined,
      amountPending: formData.amountPending || undefined,
      paymentMethod: formData.paymentMethod || undefined,
      status: "completed", // Marcar como completado al guardar todos los datos
    };

    await updateGuestMutation.mutateAsync(updateData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Check-in</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Datos Personales */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Datos Personales</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">Nombre *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName">Apellidos *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="nationality">Nacionalidad *</Label>
                <Select value={formData.nationality} onValueChange={(v) => setFormData({ ...formData, nationality: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="documentType">Tipo de Documento *</Label>
                <Select value={formData.documentType} onValueChange={(v) => setFormData({ ...formData, documentType: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PAS">Pasaporte</SelectItem>
                    <SelectItem value="DNI">DNI</SelectItem>
                    <SelectItem value="NIE">NIE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="documentNumber">Número de Documento *</Label>
                <Input
                  id="documentNumber"
                  value={formData.documentNumber}
                  onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                  required
                />
              </div>
              {formData.documentType === "DNI" && (
                <div>
                  <Label htmlFor="documentSupport">Número de Soporte DNI</Label>
                  <Input
                    id="documentSupport"
                    value={formData.documentSupport}
                    onChange={(e) => setFormData({ ...formData, documentSupport: e.target.value })}
                  />
                </div>
              )}
              <div>
                <Label htmlFor="gender">Sexo *</Label>
                <Select value={formData.gender} onValueChange={(v) => setFormData({ ...formData, gender: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Hombre</SelectItem>
                    <SelectItem value="female">Mujer</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="birthDate">Fecha de Nacimiento *</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Dirección */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Dirección</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="street">Calle y Número *</Label>
                <Input
                  id="street"
                  value={formData.street}
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="city">Ciudad *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="province">Provincia</Label>
                <Input
                  id="province"
                  value={formData.province}
                  onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="postalCode">Código Postal</Label>
                <Input
                  id="postalCode"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="country">País *</Label>
                <Select value={formData.country} onValueChange={(v) => setFormData({ ...formData, country: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Datos de Reserva */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Datos de Reserva</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="reservationNumber">Número de Reserva</Label>
                <Input
                  id="reservationNumber"
                  value={formData.reservationNumber}
                  onChange={(e) => setFormData({ ...formData, reservationNumber: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="roomNumber">Habitación</Label>
                <Input
                  id="roomNumber"
                  value={formData.roomNumber}
                  onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="checkInDate">Fecha Check-in</Label>
                <Input
                  id="checkInDate"
                  type="date"
                  value={formData.checkInDate}
                  onChange={(e) => setFormData({ ...formData, checkInDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="checkOutDate">Fecha Check-out</Label>
                <Input
                  id="checkOutDate"
                  type="date"
                  value={formData.checkOutDate}
                  onChange={(e) => setFormData({ ...formData, checkOutDate: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Información de Pago */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Información de Pago</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="paymentType">Tipo de Pago</Label>
                <Select value={formData.paymentType} onValueChange={(v) => setFormData({ ...formData, paymentType: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Efectivo</SelectItem>
                    <SelectItem value="card">Tarjeta</SelectItem>
                    <SelectItem value="transfer">Transferencia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="paymentHolder">Titular del Pago</Label>
                <Input
                  id="paymentHolder"
                  value={formData.paymentHolder}
                  onChange={(e) => setFormData({ ...formData, paymentHolder: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="amountPaid">Cantidad Abonada (€)</Label>
                <Input
                  id="amountPaid"
                  type="number"
                  step="0.01"
                  value={formData.amountPaid}
                  onChange={(e) => setFormData({ ...formData, amountPaid: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="amountPending">Cantidad Pendiente (€)</Label>
                <Input
                  id="amountPending"
                  type="number"
                  step="0.01"
                  value={formData.amountPending}
                  onChange={(e) => setFormData({ ...formData, amountPending: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateGuestMutation.isPending}>
              {updateGuestMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Cambios
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

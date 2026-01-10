import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
// Toast functionality to be added
import { Loader2, Save } from "lucide-react";

export default function CheckinPresencial() {
  const toast = ({ title, description, variant }: any) => {
    alert(`${title}: ${description}`);
  };
  const [loading, setLoading] = useState(false);
  
  const createGuest = trpc.checkin.guests.create.useMutation({
    onSuccess: () => {
      alert("Check-in completado: El huésped ha sido registrado correctamente");
      // Reset form
      setFormData(initialFormData);
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const initialFormData = {
    firstName: "",
    lastName: "",
    documentNumber: "",
    documentType: "Passport",
    gender: "male" as "male" | "female" | "other",
    nationality: "",
    birthDate: "",
    phone: "",
    email: "",
    checkInDate: new Date().toISOString().split('T')[0],
    checkOutDate: "",
    reservationNumber: "",
    roomNumber: "",
    roomType: "",
    numberOfGuests: 1,
    acceptedTerms: false,
  };

  const [formData, setFormData] = useState(initialFormData);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.acceptedTerms) {
      alert("Error: Debe aceptar los términos y condiciones");
      return;
    }

    setLoading(true);
    try {
      await createGuest.mutateAsync({
        ...formData,
        status: "completed",
        checkinType: "presencial",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Check-in Presencial</h2>
        <p className="text-muted-foreground">Registro de huéspedes en recepción</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Datos del Huésped */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Datos del Huésped</h3>
          
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="documentType">Tipo Documento</Label>
              <Select
                value={formData.documentType}
                onValueChange={(value) => setFormData({ ...formData, documentType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Passport">Pasaporte</SelectItem>
                  <SelectItem value="ID Card">DNI/NIE</SelectItem>
                  <SelectItem value="Driver License">Licencia de Conducir</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="documentNumber">Número Documento *</Label>
              <Input
                id="documentNumber"
                value={formData.documentNumber}
                onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="birthDate">Fecha Nacimiento</Label>
              <Input
                id="birthDate"
                type="date"
                value={formData.birthDate}
                onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="gender">Género</Label>
              <Select
                value={formData.gender}
                onValueChange={(value: "male" | "female" | "other") => setFormData({ ...formData, gender: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Masculino</SelectItem>
                  <SelectItem value="female">Femenino</SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="nationality">Nacionalidad</Label>
              <Input
                id="nationality"
                value={formData.nationality}
                onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                placeholder="España, Francia, etc."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+34 600 000 000"
              />
            </div>
            
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@ejemplo.com"
              />
            </div>
          </div>
        </div>

        {/* Información de Reserva */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Información de Reserva</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="reservationNumber">Número Reserva</Label>
              <Input
                id="reservationNumber"
                value={formData.reservationNumber}
                onChange={(e) => setFormData({ ...formData, reservationNumber: e.target.value })}
                placeholder="BKG-12345"
              />
            </div>
            
            <div>
              <Label htmlFor="checkInDate">Fecha Entrada *</Label>
              <Input
                id="checkInDate"
                type="date"
                value={formData.checkInDate}
                onChange={(e) => setFormData({ ...formData, checkInDate: e.target.value })}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="checkOutDate">Fecha Salida</Label>
              <Input
                id="checkOutDate"
                type="date"
                value={formData.checkOutDate}
                onChange={(e) => setFormData({ ...formData, checkOutDate: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="roomNumber">Número Habitación</Label>
              <Input
                id="roomNumber"
                value={formData.roomNumber}
                onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                placeholder="101"
              />
            </div>
            
            <div>
              <Label htmlFor="roomType">Tipo Habitación</Label>
              <Input
                id="roomType"
                value={formData.roomType}
                onChange={(e) => setFormData({ ...formData, roomType: e.target.value })}
                placeholder="Individual, Doble, etc."
              />
            </div>
            
            <div>
              <Label htmlFor="numberOfGuests">Número de Huéspedes</Label>
              <Input
                id="numberOfGuests"
                type="number"
                min="1"
                value={formData.numberOfGuests}
                onChange={(e) => setFormData({ ...formData, numberOfGuests: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>
        </div>

        {/* Términos y Condiciones */}
        <div className="flex items-start space-x-2">
          <Checkbox
            id="terms"
            checked={formData.acceptedTerms}
            onCheckedChange={(checked) => setFormData({ ...formData, acceptedTerms: checked as boolean })}
          />
          <label
            htmlFor="terms"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Acepto las condiciones del alojamiento y la política de protección de datos *
          </label>
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setFormData(initialFormData)}
            disabled={loading}
          >
            Limpiar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Guardar Check-in
              </>
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}

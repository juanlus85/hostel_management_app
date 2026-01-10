import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Loader2, Home } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function CheckinAnticipadoPublico() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    // Datos de reserva
    reservationNumber: "",
    checkInDate: "",
    checkOutDate: "",
    
    // Datos personales
    firstName: "",
    lastName: "",
    nationality: "ESP",
    documentType: "PAS",
    documentNumber: "",
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
  });

  const createGuestMutation = trpc.checkin.guests.create.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones básicas
    if (!formData.firstName || !formData.lastName || !formData.documentNumber) {
      toast.error("Por favor completa todos los campos obligatorios");
      return;
    }

    if (!formData.email) {
      toast.error("El email es obligatorio para recibir confirmación");
      return;
    }

    setIsSubmitting(true);

    try {
      await createGuestMutation.mutateAsync({
        reservationNumber: formData.reservationNumber || "SIN-REF",
        firstName: formData.firstName,
        lastName: formData.lastName,
        nationality: formData.nationality,
        documentType: formData.documentType,
        documentNumber: formData.documentNumber,
        gender: formData.gender as "male" | "female" | "other",
        birthDate: formData.birthDate || undefined,
        phone: formData.phone || undefined,
        email: formData.email,
        street: formData.street || undefined,
        city: formData.city || undefined,
        province: formData.province || undefined,
        postalCode: formData.postalCode || undefined,
        country: formData.country,
        checkInDate: formData.checkInDate || new Date().toISOString().split('T')[0],
        checkOutDate: formData.checkOutDate || new Date(Date.now() + 86400000).toISOString().split('T')[0],
        status: "pending",
        checkinType: "anticipado" as "anticipado",
      });

      setIsSubmitted(true);
      toast.success("¡Datos enviados correctamente!");
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Error al enviar los datos");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <CheckCircle2 className="w-16 h-16 mx-auto text-green-500" />
            <h2 className="text-2xl font-bold text-slate-800">¡Gracias!</h2>
            <p className="text-slate-600">
              Tus datos han sido enviados correctamente. Recibirás un email de confirmación 
              con los códigos de acceso antes de tu llegada.
            </p>
            <p className="text-sm text-slate-500">
              Te esperamos en el hostel 😊
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <div className="flex items-center gap-3">
              <Home className="w-8 h-8" />
              <div>
                <CardTitle className="text-2xl">Check-in Anticipado</CardTitle>
                <p className="text-blue-100 text-sm mt-1">
                  Completa tus datos antes de llegar y ahorra tiempo en recepción
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Datos de Reserva */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-800 border-b pb-2">
                  Información de Reserva
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="reservationNumber">Número de Reserva (opcional)</Label>
                    <Input
                      id="reservationNumber"
                      value={formData.reservationNumber}
                      onChange={(e) => setFormData({ ...formData, reservationNumber: e.target.value })}
                      placeholder="Ej: BK12345"
                    />
                  </div>
                  <div>
                    <Label htmlFor="checkInDate">Fecha de Llegada</Label>
                    <Input
                      id="checkInDate"
                      type="date"
                      value={formData.checkInDate}
                      onChange={(e) => setFormData({ ...formData, checkInDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="checkOutDate">Fecha de Salida</Label>
                    <Input
                      id="checkOutDate"
                      type="date"
                      value={formData.checkOutDate}
                      onChange={(e) => setFormData({ ...formData, checkOutDate: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Datos Personales */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-800 border-b pb-2">
                  Datos Personales *
                </h3>
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
                    <Select value={formData.nationality} onValueChange={(value) => setFormData({ ...formData, nationality: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ESP">España</SelectItem>
                        <SelectItem value="FRA">Francia</SelectItem>
                        <SelectItem value="ITA">Italia</SelectItem>
                        <SelectItem value="DEU">Alemania</SelectItem>
                        <SelectItem value="GBR">Reino Unido</SelectItem>
                        <SelectItem value="USA">Estados Unidos</SelectItem>
                        <SelectItem value="PRT">Portugal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="documentType">Tipo de Documento *</Label>
                    <Select value={formData.documentType} onValueChange={(value) => setFormData({ ...formData, documentType: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DNI">DNI</SelectItem>
                        <SelectItem value="NIE">NIE</SelectItem>
                        <SelectItem value="PAS">Pasaporte</SelectItem>
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
                  <div>
                    <Label htmlFor="gender">Sexo *</Label>
                    <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
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
                      placeholder="+34 600 000 000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      placeholder="tu@email.com"
                    />
                  </div>
                </div>
              </div>

              {/* Dirección */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-800 border-b pb-2">
                  Dirección
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="street">Calle y Número</Label>
                    <Input
                      id="street"
                      value={formData.street}
                      onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                      placeholder="Calle Principal, 123"
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">Ciudad</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
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
                    <Label htmlFor="country">País</Label>
                    <Select value={formData.country} onValueChange={(value) => setFormData({ ...formData, country: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ESP">España</SelectItem>
                        <SelectItem value="FRA">Francia</SelectItem>
                        <SelectItem value="ITA">Italia</SelectItem>
                        <SelectItem value="DEU">Alemania</SelectItem>
                        <SelectItem value="GBR">Reino Unido</SelectItem>
                        <SelectItem value="USA">Estados Unidos</SelectItem>
                        <SelectItem value="PRT">Portugal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Enviar Datos"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

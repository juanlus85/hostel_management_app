import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Loader2, Download, AlertCircle, CheckCircle2, Trash2, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

export default function ExportarPolicia() {
  // Inicializar con el primer y último día del mes actual
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  const [startDate, setStartDate] = useState(firstDay.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(lastDay.toISOString().split('T')[0]);
  const [selectedGuests, setSelectedGuests] = useState<number[]>([]);

  const { data: settings } = trpc.checkin.settings.get.useQuery();
  const { data: guests, isLoading, refetch } = trpc.checkin.guests.search.useQuery({
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    status: "completed", // Solo mostrar check-ins completados
  });
    const cleanupMutation = trpc.checkin.cleanupOldGuests.useMutation({
    onSuccess: (data) => {
      alert(`Limpieza completada. ${data.deletedCount} huésped(es) eliminado(s).`);
      refetch();
    },
  });

  const deleteGuestMutation = trpc.checkin.guests.delete.useMutation({
    onSuccess: () => {
      refetch();
    },
  });
  
  const handleCleanup = () => {
    if (!confirm('¿Estás seguro de que quieres eliminar los huéspedes con más de 3 días desde su check-in?\n\nLos PDFs generados se conservarán en la carpeta Registros.')) {
      return;
    }
    cleanupMutation.mutate();
  };

  const handleExport = () => {
    try {
      if (!settings?.policeCode) {
        alert("Error: Debe configurar el código de establecimiento en Configuración");
        return;
      }

      if (!startDate || !endDate) {
        alert("Error: Debe seleccionar las fechas de inicio y fin");
        return;
      }

      if (!guests || guests.length === 0) {
        alert("No hay huéspedes para exportar en el rango de fechas seleccionado");
        return;
      }

      const guestsToExport = selectedGuests.length > 0
        ? guests.filter(g => selectedGuests.includes(g.id!))
        : guests;

      if (guestsToExport.length === 0) {
        alert("Debe seleccionar al menos un huésped");
        return;
      }

      // Generate XML
      const xml = generatePoliceXML(guestsToExport, settings.policeCode);
      
      // Download file
      const blob = new Blob([xml], { type: "application/xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const filename = `hospedajes_${startDate.replace(/-/g, '')}_${endDate.replace(/-/g, '')}.xml`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);

      alert(`Archivo XML generado correctamente con ${guestsToExport.length} huésped(es)`);
    } catch (error) {
      console.error('Error al generar XML:', error);
      alert(`Error al generar el archivo XML: ${error}`);
    }
  };

  const generatePoliceXML = (guests: any[], policeCode: string) => {
    const now = new Date();
    const timezone = '+01:00'; // Timezone de España
    
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<ns2:peticion xmlns:ns2="http://www.neg.hospedajes.mir.es/altaParteHospedaje">\n';
    xml += '  <solicitud>\n';
    xml += `    <codigoEstablecimiento>${escapeXml(policeCode)}</codigoEstablecimiento>\n`;

    guests.forEach((guest, index) => {
      if (!guest.firstName || !guest.lastName || !guest.documentNumber) {
        return; // Skip incomplete guests
      }

      xml += '    <comunicacion>\n';
      xml += '      <contrato>\n';
      xml += `        <referencia>${escapeXml(guest.reservationNumber || 'SIN-REF')}</referencia>\n`;
      
      // Fechas del contrato
      const checkInDate = guest.checkInDate ? new Date(guest.checkInDate) : now;
      const checkOutDate = guest.checkOutDate ? new Date(guest.checkOutDate) : new Date(checkInDate.getTime() + 86400000);
      
      xml += `        <fechaContrato>${checkInDate.toISOString().split('T')[0]}${timezone}</fechaContrato>\n`;
      xml += `        <fechaEntrada>${checkInDate.toISOString().replace('Z', timezone)}</fechaEntrada>\n`;
      xml += `        <fechaSalida>${checkOutDate.toISOString().replace('Z', timezone)}</fechaSalida>\n`;
      xml += `        <numPersonas>1</numPersonas>\n`;
      xml += `        <numHabitaciones>1</numHabitaciones>\n`;
      xml += `        <internet>${guest.hasInternet !== false ? 'true' : 'false'}</internet>\n`;
      
      // Información de pago
      xml += '        <pago>\n';
      
      // Mapear tipo de pago al formato oficial
      let tipoPago = 'EFECT';
      if (guest.paymentType) {
        const paymentMap: Record<string, string> = {
          'Efectivo': 'EFECT',
          'Tarjeta': 'TARJT',
          'Transferencia': 'TRANS',
          'Plataforma': 'PLATF',
          'Móvil': 'MOVIL',
          'Destino': 'DESTI',
        };
        tipoPago = paymentMap[guest.paymentType] || 'OTRO';
      }
      
      xml += `          <tipoPago>${tipoPago}</tipoPago>\n`;
      xml += `          <fechaPago>${checkInDate.toISOString().split('T')[0]}${timezone}</fechaPago>\n`;
      xml += `          <medioPago>${escapeXml(guest.paymentMethod || 'No especificado')}</medioPago>\n`;
      xml += `          <titular>${escapeXml(guest.paymentHolder || guest.firstName + ' ' + guest.lastName)}</titular>\n`;
      
      // Caducidad de tarjeta (solo si es pago con tarjeta)
      if (tipoPago === 'TARJT') {
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 2);
        const month = String(futureDate.getMonth() + 1).padStart(2, '0');
        const year = futureDate.getFullYear();
        xml += `          <caducidadTarjeta>${month}/${year}</caducidadTarjeta>\n`;
      }
      
      xml += '        </pago>\n';
      xml += '      </contrato>\n';
      
      // Datos de la persona
      xml += '      <persona>\n';
      xml += '        <rol>VI</rol>\n';
      xml += `        <nombre>${escapeXml(guest.firstName)}</nombre>\n`;
      
      // Dividir apellidos
      const apellidos = guest.lastName.trim().split(/\s+/);
      xml += `        <apellido1>${escapeXml(apellidos[0] || '')}</apellido1>\n`;
      if (apellidos.length > 1) {
        xml += `        <apellido2>${escapeXml(apellidos.slice(1).join(' '))}</apellido2>\n`;
      }
      
      // Documento
      const docType = guest.documentType === 'DNI' ? 'NIF' : guest.documentType || 'PAS';
      xml += `        <tipoDocumento>${docType}</tipoDocumento>\n`;
      xml += `        <numeroDocumento>${escapeXml(guest.documentNumber)}</numeroDocumento>\n`;
      
      if (guest.supportNumber) {
        xml += `        <soporteDocumento>${escapeXml(guest.supportNumber)}</soporteDocumento>\n`;
      }
      
      // Fecha de nacimiento
      if (guest.birthDate) {
        xml += `        <fechaNacimiento>${guest.birthDate}${timezone}</fechaNacimiento>\n`;
      }
      
      // Nacionalidad (código ISO alfa-3)
      if (guest.nationality) {
        xml += `        <nacionalidad>${escapeXml(guest.nationality)}</nacionalidad>\n`;
      }
      
      // Sexo
      if (guest.gender) {
        const genderCode = guest.gender === 'Hombre' ? 'H' : guest.gender === 'Mujer' ? 'M' : 'O';
        xml += `        <sexo>${genderCode}</sexo>\n`;
      }
      
      // Dirección
      xml += '        <direccion>\n';
      xml += `          <direccion>${escapeXml(guest.street || 'No especificada')}</direccion>\n`;
      
      if (guest.addressExtra) {
        xml += `          <direccionComplementaria>${escapeXml(guest.addressExtra)}</direccionComplementaria>\n`;
      }
      
      // Código de municipio o nombre según el país
      if (guest.country === 'ESP') {
        // Para España, usar código postal del huésped (primeros 5 dígitos = código municipio INE)
        const codigoMunicipio = guest.postalCode ? guest.postalCode.slice(0, 5).padStart(5, '0') : '00000';
        xml += `          <codigoMunicipio>${codigoMunicipio}</codigoMunicipio>\n`;
      } else {
        // Para otros países, usar nombre de municipio
        xml += `          <nombreMunicipio>${escapeXml(guest.city || 'No especificado')}</nombreMunicipio>\n`;
      }
      
      if (guest.postalCode) {
        xml += `          <codigoPostal>${escapeXml(guest.postalCode)}</codigoPostal>\n`;
      }
      
      xml += `          <pais>${escapeXml(guest.country || 'ESP')}</pais>\n`;
      xml += '        </direccion>\n';
      
      // Datos de contacto
      if (guest.phone) {
        xml += `        <telefono>${escapeXml(guest.phone)}</telefono>\n`;
      }
      
      if (guest.email) {
        xml += `        <correo>${escapeXml(guest.email)}</correo>\n`;
      }
      
      // Parentesco (PM = Persona Mayor, por defecto)
      xml += `        <parentesco>${guest.relationship || 'PM'}</parentesco>\n`;
      
      xml += '      </persona>\n';
      xml += '    </comunicacion>\n';
    });

    xml += '  </solicitud>\n';
    xml += '</ns2:peticion>\n';

    return xml;
  };

  const escapeXml = (str: string) => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  const toggleGuest = (id: number) => {
    setSelectedGuests(prev =>
      prev.includes(id)
        ? prev.filter(gId => gId !== id)
        : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (!guests) return;
    
    if (selectedGuests.length === guests.length) {
      setSelectedGuests([]);
    } else {
      setSelectedGuests(guests.map(g => g.id!));
    }
  };

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Exportar para Policía</h2>
        <p className="text-muted-foreground">
          Genera el archivo XML según el formato del Sistema de Hospedajes
        </p>
      </div>

      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Formato XML - Partes de Viajeros</strong>
          <br />
          Este archivo se genera según las especificaciones del Real Decreto 933/2021 para el alta masiva de comunicaciones en el Sistema de Hospedajes del Ministerio del Interior.
        </AlertDescription>
      </Alert>

      {/* Configuración */}
      <div className="mb-6 p-4 bg-muted rounded-lg">
        <h3 className="font-semibold mb-2">Código de Establecimiento</h3>
        {settings?.policeCode ? (
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span>Usando código configurado: <strong>{settings.policeCode}</strong></span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>No configurado. Ve a Configuración para establecerlo.</span>
          </div>
        )}
      </div>

      {/* Filtros de Fecha */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <Label htmlFor="startDate">Fecha desde *</Label>
          <Input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>
        
        <div>
          <Label htmlFor="endDate">Fecha hasta *</Label>
          <Input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>
      </div>

      {/* Lista de Huéspedes */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !guests || guests.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No se encontraron huéspedes en el rango de fechas seleccionado
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">
              Huéspedes a Exportar ({selectedGuests.length > 0 ? selectedGuests.length : guests.length} de {guests.length})
            </h3>
            <Button variant="outline" size="sm" onClick={toggleAll}>
              {selectedGuests.length === guests.length ? "Deseleccionar todo" : "Seleccionar todo"}
            </Button>
          </div>

          <div className="space-y-2 mb-6 max-h-96 overflow-y-auto border rounded-lg p-4">
            {guests.map((guest) => {
              const isComplete = guest.firstName && guest.lastName && guest.documentNumber;
              const isSelected = selectedGuests.length === 0 || selectedGuests.includes(guest.id!);
              
              return (
                <div
                  key={guest.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleGuest(guest.id!)}
                    />
                    <div className="flex-1">
                      <div className="font-medium">
                        {guest.firstName} {guest.lastName}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {guest.documentNumber} • {guest.reservationNumber || "Sin reserva"} • 
                        {guest.checkInDate ? ` ${new Date(guest.checkInDate).toLocaleDateString()}` : " Sin fecha"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isComplete ? (
                      <Badge variant="default">Completo</Badge>
                    ) : (
                      <Badge variant="destructive">Faltan datos</Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm(`¿Eliminar a ${guest.firstName} ${guest.lastName}?`)) {
                          deleteGuestMutation.mutate({ id: guest.id! });
                        }
                      }}
                      disabled={deleteGuestMutation.isPending}
                    >
                      <X className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between items-center">
            <Button
              onClick={handleCleanup}
              disabled={cleanupMutation.isPending}
              variant="destructive"
              size="lg"
            >
              {cleanupMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Limpiar Registros Antiguos (+3 días)
            </Button>
            
            <Button
              onClick={handleExport}
              disabled={!settings?.policeCode || !startDate || !endDate}
              size="lg"
            >
              <Download className="mr-2 h-4 w-4" />
              Descargar XML ({selectedGuests.length > 0 ? selectedGuests.length : guests.length} huésped{(selectedGuests.length > 0 ? selectedGuests.length : guests.length) !== 1 ? 'es' : ''})
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}

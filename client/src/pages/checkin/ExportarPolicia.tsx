import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Loader2, Download, AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

export default function ExportarPolicia() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedGuests, setSelectedGuests] = useState<number[]>([]);

  const { data: settings } = trpc.checkin.settings.get.useQuery();
  const { data: guests, isLoading } = trpc.checkin.guests.search.useQuery({
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const handleExport = () => {
    if (!settings?.policeCode) {
      alert("Error: Debe configurar el código de establecimiento en Configuración");
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
    const blob = new Blob([xml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hospedajes_${startDate}_${endDate}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert(`Archivo XML generado correctamente con ${guestsToExport.length} huésped(es)`);
  };

  const generatePoliceXML = (guests: any[], policeCode: string) => {
    const now = new Date().toISOString().split('T')[0];
    
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<PARTES_VIAJEROS>\n';
    xml += `  <CODIGO_ESTABLECIMIENTO>${policeCode}</CODIGO_ESTABLECIMIENTO>\n`;
    xml += `  <FECHA_GENERACION>${now}</FECHA_GENERACION>\n`;
    xml += '  <VIAJEROS>\n';

    guests.forEach((guest, index) => {
      if (!guest.firstName || !guest.lastName || !guest.documentNumber) {
        return; // Skip incomplete guests
      }

      xml += '    <VIAJERO>\n';
      xml += `      <ORDEN>${index + 1}</ORDEN>\n`;
      
      // Datos personales
      xml += `      <NOMBRE>${escapeXml(guest.firstName)}</NOMBRE>\n`;
      xml += `      <PRIMER_APELLIDO>${escapeXml(guest.lastName.split(' ')[0] || guest.lastName)}</PRIMER_APELLIDO>\n`;
      if (guest.lastName.split(' ').length > 1) {
        xml += `      <SEGUNDO_APELLIDO>${escapeXml(guest.lastName.split(' ').slice(1).join(' '))}</SEGUNDO_APELLIDO>\n`;
      }
      
      // Documento
      const docType = guest.documentType === 'DNI' ? 'NIF' : guest.documentType || 'PAS';
      xml += `      <TIPO_DOCUMENTO>${docType}</TIPO_DOCUMENTO>\n`;
      xml += `      <NUMERO_DOCUMENTO>${escapeXml(guest.documentNumber)}</NUMERO_DOCUMENTO>\n`;
      
      if (guest.supportNumber && docType === 'NIF') {
        xml += `      <SOPORTE_DOCUMENTO>${escapeXml(guest.supportNumber)}</SOPORTE_DOCUMENTO>\n`;
      }
      
      // Datos demográficos
      if (guest.birthDate) {
        xml += `      <FECHA_NACIMIENTO>${guest.birthDate}</FECHA_NACIMIENTO>\n`;
      }
      
      if (guest.nationality) {
        xml += `      <NACIONALIDAD>${escapeXml(guest.nationality)}</NACIONALIDAD>\n`;
      }
      
      if (guest.gender) {
        const genderCode = guest.gender === 'male' ? 'H' : guest.gender === 'female' ? 'M' : 'O';
        xml += `      <SEXO>${genderCode}</SEXO>\n`;
      }
      
      // Fechas de estancia
      if (guest.checkInDate) {
        xml += `      <FECHA_ENTRADA>${guest.checkInDate}</FECHA_ENTRADA>\n`;
      }
      
      if (guest.checkOutDate) {
        xml += `      <FECHA_SALIDA>${guest.checkOutDate}</FECHA_SALIDA>\n`;
      }
      
      // Dirección
      if (guest.street) {
        xml += `      <DIRECCION>${escapeXml(guest.street)}</DIRECCION>\n`;
      }
      
      if (guest.city) {
        xml += `      <MUNICIPIO>${escapeXml(guest.city)}</MUNICIPIO>\n`;
      }
      
      if (guest.province) {
        xml += `      <PROVINCIA>${escapeXml(guest.province)}</PROVINCIA>\n`;
      }
      
      if (guest.postalCode) {
        xml += `      <CODIGO_POSTAL>${escapeXml(guest.postalCode)}</CODIGO_POSTAL>\n`;
      }
      
      if (guest.country) {
        xml += `      <PAIS>${escapeXml(guest.country)}</PAIS>\n`;
      }
      
      // Datos de contacto
      if (guest.phone) {
        xml += `      <TELEFONO>${escapeXml(guest.phone)}</TELEFONO>\n`;
      }
      
      if (guest.email) {
        xml += `      <EMAIL>${escapeXml(guest.email)}</EMAIL>\n`;
      }
      
      // Parentesco (si aplica)
      if (guest.relationship) {
        xml += `      <PARENTESCO>${escapeXml(guest.relationship)}</PARENTESCO>\n`;
      }
      
      xml += '    </VIAJERO>\n';
    });

    xml += '  </VIAJEROS>\n';
    xml += '</PARTES_VIAJEROS>\n';

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
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleGuest(guest.id!)}
                    />
                    <div>
                      <div className="font-medium">
                        {guest.firstName} {guest.lastName}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {guest.documentNumber} • {guest.reservationNumber || "Sin reserva"} • 
                        {guest.checkInDate ? ` ${new Date(guest.checkInDate).toLocaleDateString()}` : " Sin fecha"}
                      </div>
                    </div>
                  </div>
                  {isComplete ? (
                    <Badge variant="default">Completo</Badge>
                  ) : (
                    <Badge variant="destructive">Faltan datos</Badge>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-end">
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

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { COUNTRIES, getAllowedDocumentTypes } from "@/../../shared/countries";
import { requiresDocumentSupport } from "@shared/documentSupport";
import { calculateAge, isMinor, latestAllowedBirthDate } from "@shared/guestAge";

export type GuestFormData = {
  firstName: string;
  lastName: string;
  documentNumber: string;
  documentType: string;
  supportNumber: string;
  gender: string;
  nationality: string;
  nationalityOther: string;
  birthDate: string;
  phone: string;
  email: string;
  relationship?: string;
};

const relationshipOptions = [
  { value: "HJ", label: "Hijo/a" },
  { value: "NI", label: "Nieto/a" },
  { value: "SB", label: "Sobrino/a" },
  { value: "PM", label: "Persona mayor responsable" },
  { value: "AB", label: "Abuelo/a" },
  { value: "HR", label: "Hermano/a" },
  { value: "TU", label: "Tutor/a" },
  { value: "OT", label: "Otro" },
] as const;

type GuestFormFieldsProps = {
  guest: GuestFormData;
  index: number;
  removable: boolean;
  onChange: (field: keyof GuestFormData, value: string) => void;
  onRemove: () => void;
};

export function GuestFormFields({ guest, index, removable, onChange, onRemove }: GuestFormFieldsProps) {
  const allowedDocs = getAllowedDocumentTypes(guest.nationality);
  const isSpanish = guest.nationality === "ESP";
  const country = COUNTRIES.find(item => item.code === guest.nationality);
  const isEU = country?.isEU || false;
  const age = calculateAge(guest.birthDate);
  const guestIsMinor = isMinor(guest.birthDate);
  const latestBirthDate = latestAllowedBirthDate();

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">Huésped {index + 1} {index === 0 && "(Principal)"}</h2>
        {removable && <Button variant="destructive" size="sm" onClick={onRemove}><Trash2 className="mr-2 h-4 w-4" />Eliminar</Button>}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div><Label htmlFor={`firstName-${index}`}>Nombre *</Label><Input id={`firstName-${index}`} value={guest.firstName} onChange={event => onChange("firstName", event.target.value)} /></div>
        <div><Label htmlFor={`lastName-${index}`}>Apellidos *</Label><Input id={`lastName-${index}`} value={guest.lastName} onChange={event => onChange("lastName", event.target.value)} /></div>
        <div>
          <Label htmlFor={`nationality-${index}`}>Nacionalidad *</Label>
          <Select value={guest.nationality} onValueChange={value => onChange("nationality", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
            {COUNTRIES.map(item => <SelectItem key={`${index}-nationality-${item.code}`} value={item.code}>{item.name}</SelectItem>)}
            <SelectItem value="OTRO">Otro (especificar)</SelectItem>
          </SelectContent></Select>
        </div>
        {guest.nationality === "OTRO" && <div><Label htmlFor={`nationalityOther-${index}`}>Especificar País *</Label><Input id={`nationalityOther-${index}`} value={guest.nationalityOther} onChange={event => onChange("nationalityOther", event.target.value)} placeholder="Nombre del país" /></div>}
        <div>
          <Label htmlFor={`documentType-${index}`}>Tipo de Documento *</Label>
          <Select value={guest.documentType} onValueChange={value => onChange("documentType", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{allowedDocs.map(doc => <SelectItem key={doc.code} value={doc.code}>{doc.label}</SelectItem>)}</SelectContent></Select>
          <p className="mt-1 text-xs text-muted-foreground">{isSpanish && "Españoles: DNI/NIF, NIE, carnet de conducir o Pasaporte"}{isEU && !isSpanish && "Europeos: NIE o Pasaporte"}{!isEU && !isSpanish && "No europeos: Solo Pasaporte"}</p>
        </div>
        <div><Label htmlFor={`documentNumber-${index}`}>Número de Documento *</Label><Input id={`documentNumber-${index}`} value={guest.documentNumber} onChange={event => onChange("documentNumber", event.target.value)} /></div>
        {requiresDocumentSupport(guest.documentType, guest.nationality) && <div><Label htmlFor={`supportNumber-${index}`}>Número de Soporte *</Label><Input id={`supportNumber-${index}`} value={guest.supportNumber} onChange={event => onChange("supportNumber", event.target.value)} placeholder="Número de soporte del documento" /></div>}
        <div>
          <Label htmlFor={`gender-${index}`}>Sexo *</Label>
          <Select value={guest.gender} onValueChange={value => onChange("gender", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Hombre">Hombre</SelectItem><SelectItem value="Mujer">Mujer</SelectItem><SelectItem value="Otro">Otro</SelectItem></SelectContent></Select>
        </div>
        <div><Label htmlFor={`birthDate-${index}`}>Fecha de Nacimiento *</Label><Input id={`birthDate-${index}`} type="date" min="1900-01-01" max={latestBirthDate} value={guest.birthDate} onChange={event => onChange("birthDate", event.target.value)} />{age !== null && <p className={`mt-1 text-xs ${guestIsMinor ? "font-medium text-amber-700" : "text-muted-foreground"}`}>{age} años{guestIsMinor ? " · Menor de edad" : ""}</p>}<p className="mt-1 text-xs text-muted-foreground">El año admite cuatro cifras. No se admiten nacimientos de hace menos de un año.</p></div>
        {guestIsMinor && <div><Label htmlFor={`relationship-${index}`}>Parentesco del menor *</Label><Select value={guest.relationship || undefined} onValueChange={value => onChange("relationship", value)}><SelectTrigger id={`relationship-${index}`}><SelectValue placeholder="Seleccionar parentesco" /></SelectTrigger><SelectContent>{relationshipOptions.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select><p className="mt-1 text-xs text-muted-foreground">Obligatorio para el parte de viajeros de un menor.</p></div>}
        <div><Label htmlFor={`phone-${index}`}>Teléfono</Label><Input id={`phone-${index}`} type="tel" value={guest.phone} onChange={event => onChange("phone", event.target.value)} /></div>
        <div><Label htmlFor={`email-${index}`}>Email</Label><Input id={`email-${index}`} type="email" value={guest.email} onChange={event => onChange("email", event.target.value)} /></div>
      </div>
    </Card>
  );
}

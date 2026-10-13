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
  language?: "es" | "en";
  onChange: (field: keyof GuestFormData, value: string) => void;
  onRemove: () => void;
};

export function GuestFormFields({ guest, index, removable, language = "es", onChange, onRemove }: GuestFormFieldsProps) {
  const allowedDocs = getAllowedDocumentTypes(guest.nationality);
  const isSpanish = guest.nationality === "ESP";
  const country = COUNTRIES.find(item => item.code === guest.nationality);
  const isEU = country?.isEU || false;
  const age = calculateAge(guest.birthDate);
  const guestIsMinor = isMinor(guest.birthDate);
  const latestBirthDate = latestAllowedBirthDate();
  const t = language === "en" ? {
    guest: "Guest", main: "(Main)", remove: "Remove", firstName: "First name", lastName: "Last name", nationality: "Nationality", country: "Specify country", documentType: "Document type", documentNumber: "Document number", supportNumber: "Support number", gender: "Gender", birthDate: "Date of birth", relationship: "Relationship to the minor", phone: "Telephone", email: "Email", countryPlaceholder: "Country name", supportPlaceholder: "Document support number", relationshipPlaceholder: "Select relationship", years: "years", minor: "Minor", ageHint: "Use a four-digit year. Dates of birth less than one year ago are not accepted.", minorHint: "Required for the traveller report of a minor.", spanishDocs: "Spanish citizens: DNI/NIF, NIE, driving licence or Passport", europeanDocs: "Europeans: NIE or Passport", foreignDocs: "Non-Europeans: Passport only", other: "Other (specify)", male: "Male", female: "Female",
  } : {
    guest: "Huésped", main: "(Principal)", remove: "Eliminar", firstName: "Nombre", lastName: "Apellidos", nationality: "Nacionalidad", country: "Especificar país", documentType: "Tipo de documento", documentNumber: "Número de documento", supportNumber: "Número de soporte", gender: "Sexo", birthDate: "Fecha de nacimiento", relationship: "Parentesco del menor", phone: "Teléfono", email: "Email", countryPlaceholder: "Nombre del país", supportPlaceholder: "Número de soporte del documento", relationshipPlaceholder: "Seleccionar parentesco", years: "años", minor: "Menor de edad", ageHint: "El año admite cuatro cifras. No se admiten nacimientos de hace menos de un año.", minorHint: "Obligatorio para el parte de viajeros de un menor.", spanishDocs: "Españoles: DNI/NIF, NIE, carnet de conducir o Pasaporte", europeanDocs: "Europeos: NIE o Pasaporte", foreignDocs: "No europeos: solo Pasaporte", other: "Otro (especificar)", male: "Hombre", female: "Mujer",
  };

  return (
    <Card className="min-w-0 p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="min-w-0 text-xl font-bold">{t.guest} {index + 1} {index === 0 && t.main}</h2>
        {removable && <Button variant="destructive" size="sm" onClick={onRemove}><Trash2 className="mr-2 h-4 w-4" />{t.remove}</Button>}
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 [&>div]:min-w-0 md:grid-cols-2">
        <div><Label htmlFor={`firstName-${index}`}>{t.firstName} *</Label><Input id={`firstName-${index}`} value={guest.firstName} onChange={event => onChange("firstName", event.target.value)} /></div>
        <div><Label htmlFor={`lastName-${index}`}>{t.lastName} *</Label><Input id={`lastName-${index}`} value={guest.lastName} onChange={event => onChange("lastName", event.target.value)} /></div>
        <div>
          <Label htmlFor={`nationality-${index}`}>{t.nationality} *</Label>
          <Select value={guest.nationality} onValueChange={value => onChange("nationality", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
            {COUNTRIES.map(item => <SelectItem key={`${index}-nationality-${item.code}`} value={item.code}>{item.name}</SelectItem>)}
            <SelectItem value="OTRO">{t.other}</SelectItem>
          </SelectContent></Select>
        </div>
        {guest.nationality === "OTRO" && <div><Label htmlFor={`nationalityOther-${index}`}>{t.country} *</Label><Input id={`nationalityOther-${index}`} value={guest.nationalityOther} onChange={event => onChange("nationalityOther", event.target.value)} placeholder={t.countryPlaceholder} /></div>}
        <div>
          <Label htmlFor={`documentType-${index}`}>{t.documentType} *</Label>
          <Select value={guest.documentType} onValueChange={value => onChange("documentType", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{allowedDocs.map(doc => <SelectItem key={doc.code} value={doc.code}>{doc.label}</SelectItem>)}</SelectContent></Select>
          <p className="mt-1 text-xs text-muted-foreground">{isSpanish && t.spanishDocs}{isEU && !isSpanish && t.europeanDocs}{!isEU && !isSpanish && t.foreignDocs}</p>
        </div>
        <div><Label htmlFor={`documentNumber-${index}`}>{t.documentNumber} *</Label><Input id={`documentNumber-${index}`} value={guest.documentNumber} onChange={event => onChange("documentNumber", event.target.value)} /></div>
        {requiresDocumentSupport(guest.documentType, guest.nationality) && <div><Label htmlFor={`supportNumber-${index}`}>{t.supportNumber} *</Label><Input id={`supportNumber-${index}`} value={guest.supportNumber} onChange={event => onChange("supportNumber", event.target.value)} placeholder={t.supportPlaceholder} /></div>}
        <div>
          <Label htmlFor={`gender-${index}`}>{t.gender} *</Label>
          <Select value={guest.gender} onValueChange={value => onChange("gender", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Hombre">{t.male}</SelectItem><SelectItem value="Mujer">{t.female}</SelectItem><SelectItem value="Otro">{t.other}</SelectItem></SelectContent></Select>
        </div>
        <div><Label htmlFor={`birthDate-${index}`}>{t.birthDate} *</Label><Input id={`birthDate-${index}`} type="date" min="1900-01-01" max={latestBirthDate} value={guest.birthDate} onChange={event => onChange("birthDate", event.target.value)} />{age !== null && <p className={`mt-1 text-xs ${guestIsMinor ? "font-medium text-amber-700" : "text-muted-foreground"}`}>{age} {t.years}{guestIsMinor ? ` · ${t.minor}` : ""}</p>}<p className="mt-1 text-xs text-muted-foreground">{t.ageHint}</p></div>
        {guestIsMinor && <div><Label htmlFor={`relationship-${index}`}>{t.relationship} *</Label><Select value={guest.relationship || undefined} onValueChange={value => onChange("relationship", value)}><SelectTrigger id={`relationship-${index}`}><SelectValue placeholder={t.relationshipPlaceholder} /></SelectTrigger><SelectContent>{relationshipOptions.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select><p className="mt-1 text-xs text-muted-foreground">{t.minorHint}</p></div>}
        <div><Label htmlFor={`phone-${index}`}>{t.phone}</Label><Input id={`phone-${index}`} type="tel" value={guest.phone} onChange={event => onChange("phone", event.target.value)} /></div>
        <div><Label htmlFor={`email-${index}`}>{t.email}</Label><Input id={`email-${index}`} type="email" value={guest.email} onChange={event => onChange("email", event.target.value)} /></div>
      </div>
    </Card>
  );
}

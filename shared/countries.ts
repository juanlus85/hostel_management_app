// Códigos ISO alpha-3 de países más comunes para SES.Hospedajes
// Fuente: ISO 3166-1 alpha-3

export const COUNTRIES = [
  { code: "ESP", name: "España", isEU: true },
  { code: "FRA", name: "Francia", isEU: true },
  { code: "DEU", name: "Alemania", isEU: true },
  { code: "ITA", name: "Italia", isEU: true },
  { code: "PRT", name: "Portugal", isEU: true },
  { code: "NLD", name: "Países Bajos", isEU: true },
  { code: "BEL", name: "Bélgica", isEU: true },
  { code: "POL", name: "Polonia", isEU: true },
  { code: "AUT", name: "Austria", isEU: true },
  { code: "SWE", name: "Suecia", isEU: true },
  { code: "DNK", name: "Dinamarca", isEU: true },
  { code: "FIN", name: "Finlandia", isEU: true },
  { code: "IRL", name: "Irlanda", isEU: true },
  { code: "GRC", name: "Grecia", isEU: true },
  { code: "CZE", name: "República Checa", isEU: true },
  { code: "ROU", name: "Rumanía", isEU: true },
  { code: "HUN", name: "Hungría", isEU: true },
  { code: "BGR", name: "Bulgaria", isEU: true },
  { code: "HRV", name: "Croacia", isEU: true },
  { code: "SVK", name: "Eslovaquia", isEU: true },
  { code: "SVN", name: "Eslovenia", isEU: true },
  { code: "EST", name: "Estonia", isEU: true },
  { code: "LVA", name: "Letonia", isEU: true },
  { code: "LTU", name: "Lituania", isEU: true },
  { code: "LUX", name: "Luxemburgo", isEU: true },
  { code: "MLT", name: "Malta", isEU: true },
  { code: "CYP", name: "Chipre", isEU: true },
  
  // Países no europeos más comunes
  { code: "USA", name: "Estados Unidos", isEU: false },
  { code: "GBR", name: "Reino Unido", isEU: false },
  { code: "CHN", name: "China", isEU: false },
  { code: "JPN", name: "Japón", isEU: false },
  { code: "KOR", name: "Corea del Sur", isEU: false },
  { code: "BRA", name: "Brasil", isEU: false },
  { code: "ARG", name: "Argentina", isEU: false },
  { code: "MEX", name: "México", isEU: false },
  { code: "CAN", name: "Canadá", isEU: false },
  { code: "AUS", name: "Australia", isEU: false },
  { code: "NZL", name: "Nueva Zelanda", isEU: false },
  { code: "IND", name: "India", isEU: false },
  { code: "RUS", name: "Rusia", isEU: false },
  { code: "CHE", name: "Suiza", isEU: false },
  { code: "NOR", name: "Noruega", isEU: false },
  { code: "ISL", name: "Islandia", isEU: false },
  { code: "TUR", name: "Turquía", isEU: false },
  { code: "MAR", name: "Marruecos", isEU: false },
  { code: "EGY", name: "Egipto", isEU: false },
  { code: "ZAF", name: "Sudáfrica", isEU: false },
  { code: "CHL", name: "Chile", isEU: false },
  { code: "COL", name: "Colombia", isEU: false },
  { code: "PER", name: "Perú", isEU: false },
  { code: "VEN", name: "Venezuela", isEU: false },
  { code: "URY", name: "Uruguay", isEU: false },
  { code: "ECU", name: "Ecuador", isEU: false },
  { code: "BOL", name: "Bolivia", isEU: false },
  { code: "PRY", name: "Paraguay", isEU: false },
  { code: "CUB", name: "Cuba", isEU: false },
  { code: "DOM", name: "República Dominicana", isEU: false },
  { code: "PAN", name: "Panamá", isEU: false },
  { code: "CRI", name: "Costa Rica", isEU: false },
  { code: "GTM", name: "Guatemala", isEU: false },
  { code: "HND", name: "Honduras", isEU: false },
  { code: "NIC", name: "Nicaragua", isEU: false },
  { code: "SLV", name: "El Salvador", isEU: false },
  { code: "PHL", name: "Filipinas", isEU: false },
  { code: "THA", name: "Tailandia", isEU: false },
  { code: "VNM", name: "Vietnam", isEU: false },
  { code: "IDN", name: "Indonesia", isEU: false },
  { code: "MYS", name: "Malasia", isEU: false },
  { code: "SGP", name: "Singapur", isEU: false },
  { code: "PAK", name: "Pakistán", isEU: false },
  { code: "BGD", name: "Bangladesh", isEU: false },
  { code: "LKA", name: "Sri Lanka", isEU: false },
  { code: "NPL", name: "Nepal", isEU: false },
  { code: "IRN", name: "Irán", isEU: false },
  { code: "IRQ", name: "Irak", isEU: false },
  { code: "SAU", name: "Arabia Saudita", isEU: false },
  { code: "ARE", name: "Emiratos Árabes Unidos", isEU: false },
  { code: "ISR", name: "Israel", isEU: false },
  { code: "JOR", name: "Jordania", isEU: false },
  { code: "LBN", name: "Líbano", isEU: false },
  { code: "SYR", name: "Siria", isEU: false },
  { code: "DZA", name: "Argelia", isEU: false },
  { code: "TUN", name: "Túnez", isEU: false },
  { code: "LBY", name: "Libia", isEU: false },
  { code: "NGA", name: "Nigeria", isEU: false },
  { code: "KEN", name: "Kenia", isEU: false },
  { code: "ETH", name: "Etiopía", isEU: false },
  { code: "GHA", name: "Ghana", isEU: false },
  { code: "SEN", name: "Senegal", isEU: false },
  { code: "CIV", name: "Costa de Marfil", isEU: false },
  { code: "CMR", name: "Camerún", isEU: false },
  { code: "UGA", name: "Uganda", isEU: false },
  { code: "TZA", name: "Tanzania", isEU: false },
  { code: "ZWE", name: "Zimbabue", isEU: false },
  { code: "MOZ", name: "Mozambique", isEU: false },
  { code: "AGO", name: "Angola", isEU: false },
];

// Tipos de documento según normativa policial
export const DOCUMENT_TYPES = [
  { code: "NIF", label: "DNI (NIF)", allowedFor: ["ESP"] },
  { code: "NIE", label: "NIE", allowedFor: "EU" }, // Solo europeos
  { code: "CAR", label: "Carnet de conducir", allowedFor: ["ESP"] },
  { code: "PAS", label: "Pasaporte", allowedFor: "ALL" },
  { code: "OTRO", label: "Otro", allowedFor: "ALL" },
];

// Tipos de pago oficiales
export const PAYMENT_TYPES = [
  { code: "EFECT", label: "Efectivo" },
  { code: "TARJT", label: "Tarjeta de crédito" },
  { code: "PLATF", label: "Plataforma de pago" },
  { code: "TRANS", label: "Transferencia" },
  { code: "MOVIL", label: "Pago por móvil" },
  { code: "TREG", label: "Tarjeta regalo" },
  { code: "DESTI", label: "Pago en destino" },
  { code: "OTRO", label: "Otros medios de pago" },
];

// Códigos de sexo oficiales
export const GENDER_CODES = [
  { code: "H", label: "Hombre" },
  { code: "M", label: "Mujer" },
  { code: "O", label: "Otro" },
];

/**
 * Obtiene los tipos de documento permitidos según la nacionalidad
 */
export function getAllowedDocumentTypes(nationalityCode: string): typeof DOCUMENT_TYPES {
  const country = COUNTRIES.find(c => c.code === nationalityCode);
  
  if (!country) {
    // Si no se encuentra el país, solo permitir pasaporte
    return DOCUMENT_TYPES.filter(d => d.code === "PAS");
  }
  
  if (nationalityCode === "ESP") {
    // Españoles: DNI/NIF, NIE, carnet de conducir y pasaporte.
    return DOCUMENT_TYPES.filter(d => d.code === "NIF" || d.code === "NIE" || d.code === "CAR" || d.code === "PAS" || d.code === "OTRO");
  }
  
  if (country.isEU) {
    // Europeos: NIE, PAS
    return DOCUMENT_TYPES.filter(d => d.code === "NIE" || d.code === "PAS" || d.code === "OTRO");
  }
  
  // No europeos: solo PAS
  return DOCUMENT_TYPES.filter(d => d.code === "PAS" || d.code === "OTRO");
}

// Lista de países con códigos ISO 3166-1 alpha-3
// Fuente: ISO 3166-1 alpha-3

export const COUNTRIES = [
  { code: "ESP", nameES: "España", nameEN: "Spain", isEU: true },
  { code: "FRA", nameES: "Francia", nameEN: "France", isEU: true },
  { code: "DEU", nameES: "Alemania", nameEN: "Germany", isEU: true },
  { code: "ITA", nameES: "Italia", nameEN: "Italy", isEU: true },
  { code: "GBR", nameES: "Reino Unido", nameEN: "United Kingdom", isEU: true },
  { code: "PRT", nameES: "Portugal", nameEN: "Portugal", isEU: true },
  { code: "NLD", nameES: "Países Bajos", nameEN: "Netherlands", isEU: true },
  { code: "BEL", nameES: "Bélgica", nameEN: "Belgium", isEU: true },
  { code: "POL", nameES: "Polonia", nameEN: "Poland", isEU: true },
  { code: "AUT", nameES: "Austria", nameEN: "Austria", isEU: true },
  { code: "SWE", nameES: "Suecia", nameEN: "Sweden", isEU: true },
  { code: "DNK", nameES: "Dinamarca", nameEN: "Denmark", isEU: true },
  { code: "FIN", nameES: "Finlandia", nameEN: "Finland", isEU: true },
  { code: "IRL", nameES: "Irlanda", nameEN: "Ireland", isEU: true },
  { code: "GRC", nameES: "Grecia", nameEN: "Greece", isEU: true },
  { code: "CZE", nameES: "República Checa", nameEN: "Czech Republic", isEU: true },
  { code: "ROU", nameES: "Rumanía", nameEN: "Romania", isEU: true },
  { code: "HUN", nameES: "Hungría", nameEN: "Hungary", isEU: true },
  { code: "BGR", nameES: "Bulgaria", nameEN: "Bulgaria", isEU: true },
  { code: "HRV", nameES: "Croacia", nameEN: "Croatia", isEU: true },
  { code: "SVK", nameES: "Eslovaquia", nameEN: "Slovakia", isEU: true },
  { code: "SVN", nameES: "Eslovenia", nameEN: "Slovenia", isEU: true },
  { code: "EST", nameES: "Estonia", nameEN: "Estonia", isEU: true },
  { code: "LVA", nameES: "Letonia", nameEN: "Latvia", isEU: true },
  { code: "LTU", nameES: "Lituania", nameEN: "Lithuania", isEU: true },
  { code: "LUX", nameES: "Luxemburgo", nameEN: "Luxembourg", isEU: true },
  { code: "MLT", nameES: "Malta", nameEN: "Malta", isEU: true },
  { code: "CYP", nameES: "Chipre", nameEN: "Cyprus", isEU: true },
  
  // Países no europeos más comunes
  { code: "USA", nameES: "Estados Unidos", nameEN: "United States", isEU: false },
  { code: "CHN", nameES: "China", nameEN: "China", isEU: false },
  { code: "JPN", nameES: "Japón", nameEN: "Japan", isEU: false },
  { code: "KOR", nameES: "Corea del Sur", nameEN: "South Korea", isEU: false },
  { code: "BRA", nameES: "Brasil", nameEN: "Brazil", isEU: false },
  { code: "ARG", nameES: "Argentina", nameEN: "Argentina", isEU: false },
  { code: "MEX", nameES: "México", nameEN: "Mexico", isEU: false },
  { code: "CAN", nameES: "Canadá", nameEN: "Canada", isEU: false },
  { code: "AUS", nameES: "Australia", nameEN: "Australia", isEU: false },
  { code: "NZL", nameES: "Nueva Zelanda", nameEN: "New Zealand", isEU: false },
  { code: "IND", nameES: "India", nameEN: "India", isEU: false },
  { code: "RUS", nameES: "Rusia", nameEN: "Russia", isEU: false },
  { code: "CHE", nameES: "Suiza", nameEN: "Switzerland", isEU: false },
  { code: "NOR", nameES: "Noruega", nameEN: "Norway", isEU: false },
  { code: "ISL", nameES: "Islandia", nameEN: "Iceland", isEU: false },
  { code: "TUR", nameES: "Turquía", nameEN: "Turkey", isEU: false },
  { code: "MAR", nameES: "Marruecos", nameEN: "Morocco", isEU: false },
  { code: "EGY", nameES: "Egipto", nameEN: "Egypt", isEU: false },
  { code: "ZAF", nameES: "Sudáfrica", nameEN: "South Africa", isEU: false },
  { code: "CHL", nameES: "Chile", nameEN: "Chile", isEU: false },
  { code: "COL", nameES: "Colombia", nameEN: "Colombia", isEU: false },
  { code: "PER", nameES: "Perú", nameEN: "Peru", isEU: false },
  { code: "VEN", nameES: "Venezuela", nameEN: "Venezuela", isEU: false },
  { code: "URY", nameES: "Uruguay", nameEN: "Uruguay", isEU: false },
  { code: "ECU", nameES: "Ecuador", nameEN: "Ecuador", isEU: false },
  { code: "BOL", nameES: "Bolivia", nameEN: "Bolivia", isEU: false },
  { code: "PRY", nameES: "Paraguay", nameEN: "Paraguay", isEU: false },
  { code: "CUB", nameES: "Cuba", nameEN: "Cuba", isEU: false },
  { code: "DOM", nameES: "República Dominicana", nameEN: "Dominican Republic", isEU: false },
  { code: "PAN", nameES: "Panamá", nameEN: "Panama", isEU: false },
  { code: "CRI", nameES: "Costa Rica", nameEN: "Costa Rica", isEU: false },
  { code: "GTM", nameES: "Guatemala", nameEN: "Guatemala", isEU: false },
  { code: "HND", nameES: "Honduras", nameEN: "Honduras", isEU: false },
  { code: "NIC", nameES: "Nicaragua", nameEN: "Nicaragua", isEU: false },
  { code: "SLV", nameES: "El Salvador", nameEN: "El Salvador", isEU: false },
  { code: "PHL", nameES: "Filipinas", nameEN: "Philippines", isEU: false },
  { code: "THA", nameES: "Tailandia", nameEN: "Thailand", isEU: false },
  { code: "VNM", nameES: "Vietnam", nameEN: "Vietnam", isEU: false },
  { code: "IDN", nameES: "Indonesia", nameEN: "Indonesia", isEU: false },
  { code: "MYS", nameES: "Malasia", nameEN: "Malaysia", isEU: false },
  { code: "SGP", nameES: "Singapur", nameEN: "Singapore", isEU: false },
  { code: "PAK", nameES: "Pakistán", nameEN: "Pakistan", isEU: false },
  { code: "BGD", nameES: "Bangladesh", nameEN: "Bangladesh", isEU: false },
  { code: "LKA", nameES: "Sri Lanka", nameEN: "Sri Lanka", isEU: false },
  { code: "NPL", nameES: "Nepal", nameEN: "Nepal", isEU: false },
  { code: "IRN", nameES: "Irán", nameEN: "Iran", isEU: false },
  { code: "IRQ", nameES: "Irak", nameEN: "Iraq", isEU: false },
  { code: "SAU", nameES: "Arabia Saudita", nameEN: "Saudi Arabia", isEU: false },
  { code: "ARE", nameES: "Emiratos Árabes Unidos", nameEN: "United Arab Emirates", isEU: false },
  { code: "ISR", nameES: "Israel", nameEN: "Israel", isEU: false },
  { code: "JOR", nameES: "Jordania", nameEN: "Jordan", isEU: false },
  { code: "LBN", nameES: "Líbano", nameEN: "Lebanon", isEU: false },
  { code: "SYR", nameES: "Siria", nameEN: "Syria", isEU: false },
  { code: "DZA", nameES: "Argelia", nameEN: "Algeria", isEU: false },
  { code: "TUN", nameES: "Túnez", nameEN: "Tunisia", isEU: false },
  { code: "LBY", nameES: "Libia", nameEN: "Libya", isEU: false },
  { code: "NGA", nameES: "Nigeria", nameEN: "Nigeria", isEU: false },
  { code: "KEN", nameES: "Kenia", nameEN: "Kenya", isEU: false },
  { code: "ETH", nameES: "Etiopía", nameEN: "Ethiopia", isEU: false },
  { code: "GHA", nameES: "Ghana", nameEN: "Ghana", isEU: false },
  { code: "SEN", nameES: "Senegal", nameEN: "Senegal", isEU: false },
  { code: "CIV", nameES: "Costa de Marfil", nameEN: "Ivory Coast", isEU: false },
  { code: "CMR", nameES: "Camerún", nameEN: "Cameroon", isEU: false },
  { code: "UGA", nameES: "Uganda", nameEN: "Uganda", isEU: false },
  { code: "TZA", nameES: "Tanzania", nameEN: "Tanzania", isEU: false },
  { code: "ZWE", nameES: "Zimbabue", nameEN: "Zimbabwe", isEU: false },
  { code: "MOZ", nameES: "Mozambique", nameEN: "Mozambique", isEU: false },
  { code: "AGO", nameES: "Angola", nameEN: "Angola", isEU: false },
];

/**
 * Obtiene la lista de países ordenada alfabéticamente según el idioma
 */
export function getCountriesSorted(language: 'es' | 'en' = 'es') {
  const nameKey = language === 'es' ? 'nameES' : 'nameEN';
  return [...COUNTRIES].sort((a, b) => 
    a[nameKey].localeCompare(b[nameKey], language)
  );
}

/**
 * Obtiene el nombre del país según el idioma
 */
export function getCountryName(code: string, language: 'es' | 'en' = 'es'): string {
  const country = COUNTRIES.find(c => c.code === code);
  if (!country) return code;
  return language === 'es' ? country.nameES : country.nameEN;
}

// Tipos de documento según normativa policial
export const DOCUMENT_TYPES = [
  { code: "NIF", label: "DNI (NIF)", allowedFor: ["ESP"] },
  { code: "NIE", label: "NIE", allowedFor: "EU" }, // Solo europeos
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
    // Españoles: NIF, PAS
    return DOCUMENT_TYPES.filter(d => d.code === "NIF" || d.code === "PAS" || d.code === "OTRO");
  }
  
  if (country.isEU) {
    // Europeos: NIE, PAS
    return DOCUMENT_TYPES.filter(d => d.code === "NIE" || d.code === "PAS" || d.code === "OTRO");
  }
  
  // No europeos: solo PAS
  return DOCUMENT_TYPES.filter(d => d.code === "PAS" || d.code === "OTRO");
}

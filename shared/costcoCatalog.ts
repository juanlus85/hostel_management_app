export type CostcoCatalogItem = {
  id: string;
  name: string;
  costcoCode: string;
  cost: string;
};

// El ID es propio de cada fila: Costco puede repetir un código en distintos formatos.
export const COSTCO_CATALOG: CostcoCatalogItem[] = [
  {
    id: "costco-01",
    name: "Kinder Bueno, 10x43g",
    costcoCode: "128873",
    cost: "7.79",
  },
  {
    id: "costco-02",
    name: "Kinder Bueno White, 10x39g",
    costcoCode: "8523271",
    cost: "7.79",
  },
  {
    id: "costco-03",
    name: "kit kat chocolatinas 830g 20unid",
    costcoCode: "8545032",
    cost: "11.49",
  },
  {
    id: "costco-04",
    name: "Twix 20 x 50g",
    costcoCode: "8560971",
    cost: "11.79",
  },
  {
    id: "costco-05",
    name: "Juver Disfruta Pack de Zumos Variados 200ml",
    costcoCode: "8561740",
    cost: "6.79",
  },
  {
    id: "costco-06",
    name: "Bifrutas tropical, 18x200ml",
    costcoCode: "1008215",
    cost: "5.99",
  },
  {
    id: "costco-07",
    name: "Aquarade Bebida Refrescante Aromatizada Sabor a Limón Zero Azúcar",
    costcoCode: "1000345",
    cost: "6.99",
  },
  {
    id: "costco-08",
    name: "KS Agua mineral embotellada, 40 x 50cl",
    costcoCode: "1138180",
    cost: "4.99",
  },
  {
    id: "costco-09",
    name: "KS Agua  Embotellada, 12 x 1.5L",
    costcoCode: "1224834",
    cost: "2.79",
  },
  {
    id: "costco-10",
    name: "Sierra Cazorla Agua con gas, 20x50cl",
    costcoCode: "8548405",
    cost: "10.99",
  },
  {
    id: "costco-11",
    name: "Vichy Catalán Agua con Gas, 6X1,2L",
    costcoCode: "8589819",
    cost: "7.49",
  },
  {
    id: "costco-12",
    name: "Cruzcampo Cerveza Pilsen, 6x1L",
    costcoCode: "1003150",
    cost: "7.79",
  },
  {
    id: "costco-13",
    name: "Cruzcampo Cerveza Pilsen, 24 x 25cl",
    costcoCode: "1003142",
    cost: "6.79",
  },
  {
    id: "costco-14",
    name: "Cruzcampo Cerveza, 24 x 33 Cl LATA",
    costcoCode: "1007658",
    cost: "9.59",
  },
  {
    id: "costco-15",
    name: "Envío y Manipulación",
    costcoCode: "8515370",
    cost: "10.00",
  },
  {
    id: "costco-16",
    name: "Kirkland Signature Palomitas de Maíz para Microondas, Sabor Mantequilla de Cine",
    costcoCode: "1360921",
    cost: "17.99",
  },
  {
    id: "costco-17",
    name: "Pascual BiFrutas Bebida de Zumo de Fruta y Leche Desnatada, Sabor Original Tropical",
    costcoCode: "1008215",
    cost: "4.49",
  },
  {
    id: "costco-18",
    name: "ITALPIZZA Pizza Soppressata al Horno de Leña con Pimiento y Cebolla",
    costcoCode: "1896294",
    cost: "8.49",
  },
  {
    id: "costco-19",
    name: "Surtido Cookies",
    costcoCode: "93952",
    cost: "8.99",
  },
  {
    id: "costco-20",
    name: "Red Bull Bebida Energética Sin Azúcar",
    costcoCode: "1010226",
    cost: "24.99",
  },
  {
    id: "costco-21",
    name: "Red Bull Bebida Energética",
    costcoCode: "8531682",
    cost: "24.99",
  },
  { id: "costco-22", name: "Dipladenia", costcoCode: "8589063", cost: "14.99" },
  {
    id: "costco-23",
    name: "Aquadeus Agua con Gas 50cl",
    costcoCode: "8593185",
    cost: "3.99",
  },
  {
    id: "costco-24",
    name: "Estrella Galicia 24x25cl",
    costcoCode: "8594190",
    cost: "9.99",
  },
  {
    id: "costco-25",
    name: "Papel Higienico Kirkland",
    costcoCode: "1128517",
    cost: "19.99",
  },
  {
    id: "costco-26",
    name: "KH-7 Quitagrasas",
    costcoCode: "8589808",
    cost: "9.99",
  },
  {
    id: "costco-27",
    name: "ColaCao Energy Bebida Energética de Chocolate",
    costcoCode: "8512808",
    cost: "8.79",
  },
  {
    id: "costco-28",
    name: "Starbucks Doubleshot Espresso + Milk",
    costcoCode: "1013483",
    cost: "15.99",
  },
  { id: "costco-29", name: "Nutella", costcoCode: "8560796", cost: "5.99" },
  { id: "costco-30", name: "Mr.Browniw", costcoCode: "8563864", cost: "6.99" },
  { id: "costco-31", name: "Cillit Bang", costcoCode: "8589837", cost: "9.99" },
];

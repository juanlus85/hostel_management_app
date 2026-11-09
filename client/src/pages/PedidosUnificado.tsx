import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InventarioProductos from "./InventarioProductos";
import PedidosGenerales from "./PedidosGenerales";
import PedidosBocatas from "./PedidosBocatas";
import ArticulosCostco from "./ArticulosCostco";
import PedidosCostco from "./PedidosCostco";

const TAB_IDS = [
  "inventario",
  "generales",
  "bocatas",
  "articulos-costco",
  "pedidos-costco",
];

export default function PedidosUnificado() {
  const [tab, setTab] = useState(() => {
    const requested = new URLSearchParams(window.location.search).get("tab");
    return requested && TAB_IDS.includes(requested) ? requested : "inventario";
  });
  const changeTab = (value: string) => {
    setTab(value);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", value);
    window.history.replaceState(null, "", url);
  };
  return (
    <div className="min-w-0 p-3 sm:p-6">
      <h1 className="mb-5 text-2xl font-bold sm:text-3xl">
        Sistema de Pedidos
      </h1>
      <Tabs value={tab} onValueChange={changeTab} className="min-w-0 w-full">
        <div className="max-w-full overflow-x-auto pb-1">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:flex sm:h-11 sm:w-max sm:justify-start">
            <TabsTrigger value="inventario" className="min-h-10 px-3">
              Inventario
            </TabsTrigger>
            <TabsTrigger value="generales" className="min-h-10 px-3">
              Pedidos Generales
            </TabsTrigger>
            <TabsTrigger value="bocatas" className="min-h-10 px-3">
              Bocatas
            </TabsTrigger>
            <TabsTrigger value="articulos-costco" className="min-h-10 px-3">
              Artículos Costco
            </TabsTrigger>
            <TabsTrigger
              value="pedidos-costco"
              className="col-span-2 min-h-10 px-3 sm:col-auto"
            >
              Pedidos Costco
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="inventario" className="mt-4 min-w-0">
          <InventarioProductos />
        </TabsContent>
        <TabsContent value="generales" className="mt-4 min-w-0">
          <PedidosGenerales />
        </TabsContent>
        <TabsContent value="bocatas" className="mt-4 min-w-0">
          <PedidosBocatas />
        </TabsContent>
        <TabsContent value="articulos-costco" className="mt-4 min-w-0">
          <ArticulosCostco />
        </TabsContent>
        <TabsContent value="pedidos-costco" className="mt-4 min-w-0">
          <PedidosCostco />
        </TabsContent>
      </Tabs>
    </div>
  );
}

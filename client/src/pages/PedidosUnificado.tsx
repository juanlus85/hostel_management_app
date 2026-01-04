import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import InventarioProductos from './InventarioProductos';
import PedidosGenerales from './PedidosGenerales';
import PedidosBocatas from './PedidosBocatas';

export default function PedidosUnificado() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Sistema de Pedidos</h1>
      
      <Tabs defaultValue="inventario" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="inventario">Inventario</TabsTrigger>
          <TabsTrigger value="generales">Pedidos Generales</TabsTrigger>
          <TabsTrigger value="bocatas">Bocatas</TabsTrigger>
        </TabsList>
        
        <TabsContent value="inventario" className="mt-6">
          <InventarioProductos />
        </TabsContent>
        
        <TabsContent value="generales" className="mt-6">
          <PedidosGenerales />
        </TabsContent>
        
        <TabsContent value="bocatas" className="mt-6">
          <PedidosBocatas />
        </TabsContent>
      </Tabs>
    </div>
  );
}

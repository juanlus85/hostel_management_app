import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, Save } from 'lucide-react';
import { toast } from 'sonner';

type ProductRow = {
  name: string;
  currentStock: number;
  toOrder: number;
};

const INITIAL_PRODUCTS: ProductRow[] = [
  { name: 'Burguer', currentStock: 0, toOrder: 0 },
  { name: 'Mojo', currentStock: 0, toOrder: 0 },
  { name: 'Serranito', currentStock: 0, toOrder: 0 },
  { name: 'Lomo W', currentStock: 0, toOrder: 0 },
  { name: 'Frankfurt', currentStock: 0, toOrder: 0 },
  { name: 'Tortilla', currentStock: 0, toOrder: 0 },
  { name: 'Empanado', currentStock: 0, toOrder: 0 },
  { name: 'BBQ', currentStock: 0, toOrder: 0 },
  { name: 'Pollo Bacon', currentStock: 0, toOrder: 0 },
  { name: 'Carbonara', currentStock: 0, toOrder: 0 },
  { name: 'York', currentStock: 0, toOrder: 0 },
  { name: 'Serrano', currentStock: 0, toOrder: 0 },
  { name: 'Piripi', currentStock: 0, toOrder: 0 },
  { name: 'Tosta Barbacoa', currentStock: 0, toOrder: 0 },
  { name: 'Tosta Carbonara', currentStock: 0, toOrder: 0 },
  { name: 'Tosta Pollo Bacon', currentStock: 0, toOrder: 0 },
  { name: 'Tosta Rulo Cabra', currentStock: 0, toOrder: 0 },
  { name: 'Tosta 3 Quesos', currentStock: 0, toOrder: 0 },
  { name: 'Tosta York', currentStock: 0, toOrder: 0 },
  { name: 'Bocapizza York', currentStock: 0, toOrder: 0 },
  { name: 'Bocapizza Bacon', currentStock: 0, toOrder: 0 },
  { name: 'Bocapizza BBQ', currentStock: 0, toOrder: 0 },
  { name: 'Bocapizza 4Q', currentStock: 0, toOrder: 0 },
  { name: 'Bocapizza Atun', currentStock: 0, toOrder: 0 },
];

export default function PedidosBocatas() {
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [products, setProducts] = useState<ProductRow[]>(INITIAL_PRODUCTS);

  const createMutation = trpc.chefOrders.create.useMutation();
  const { data: latestOrder } = trpc.chefOrders.getLatest.useQuery();

  const updateStock = (index: number, value: string) => {
    const newProducts = [...products];
    newProducts[index].currentStock = parseInt(value) || 0;
    setProducts(newProducts);
  };

  const updateToOrder = (index: number, value: string) => {
    const newProducts = [...products];
    newProducts[index].toOrder = parseInt(value) || 0;
    setProducts(newProducts);
  };

  const calculateTotal = (product: ProductRow) => {
    return product.currentStock + product.toOrder;
  };

  const handleSave = async () => {
    // Mapear productos a formato del backend
    const data: any = { orderDate };
    
    // Este es un placeholder - necesitarías mapear cada producto a su campo correspondiente
    // Por ahora solo guardamos los datos básicos
    
    try {
      await createMutation.mutateAsync(data);
      toast.success('Pedido guardado correctamente');
    } catch (error) {
      toast.error('Error al guardar pedido');
    }
  };

  const handleCopy = () => {
    const lines = products
      .filter(p => p.toOrder > 0)
      .map(p => {
        return `${p.name}: Hay ${p.currentStock} | Pedir ${p.toOrder} | Total ${calculateTotal(p)}`;
      });

    const text = `
PEDIDO BOCATAS DEL CHEF
Fecha: ${orderDate}

${lines.join('\n')}

Total productos a pedir: ${products.filter(p => p.toOrder > 0).length}
Total cajas a pedir: ${products.reduce((sum, p) => sum + p.toOrder, 0)}
    `.trim();

    navigator.clipboard.writeText(text);
    toast.success('Pedido copiado al portapapeles');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Pedidos Bocatas del Chef</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCopy}>
            <Copy className="mr-2 h-4 w-4" />
            Copiar
          </Button>
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Guardar
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fecha del pedido</CardTitle>
        </CardHeader>
        <CardContent>
          <Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} className="max-w-xs" />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-blue-100 border-b-2 border-blue-300">
                <tr>
                  <th className="text-left p-3 font-semibold">Producto</th>
                  <th className="text-center p-3 font-semibold w-32">Hay</th>
                  <th className="text-center p-3 font-semibold w-32">Pedir</th>
                  <th className="text-center p-3 font-semibold w-32 bg-blue-200">Total</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product, index) => {
                  const total = calculateTotal(product);
                  const hasOrder = product.toOrder > 0;
                  
                  return (
                    <tr 
                      key={product.name} 
                      className={`border-b hover:bg-blue-50 ${hasOrder ? 'bg-blue-50' : ''}`}
                    >
                      <td className="p-3 font-medium">{product.name}</td>
                      <td className="p-2 text-center">
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={product.currentStock || ''}
                          onChange={(e) => updateStock(index, e.target.value)}
                          className="text-center"
                          placeholder="0"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={product.toOrder || ''}
                          onChange={(e) => updateToOrder(index, e.target.value)}
                          className="text-center font-semibold"
                          placeholder="0"
                        />
                      </td>
                      <td className="p-3 text-center bg-blue-50">
                        <span className={`font-bold text-lg ${hasOrder ? 'text-blue-600' : 'text-gray-600'}`}>
                          {total}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-blue-100 border-t-2 border-blue-300">
                <tr>
                  <td className="p-3 font-bold">TOTAL CAJAS A PEDIR</td>
                  <td className="p-3 text-center font-bold">
                    {products.reduce((sum, p) => sum + p.currentStock, 0)}
                  </td>
                  <td className="p-3 text-center font-bold text-blue-600 text-lg">
                    {products.reduce((sum, p) => sum + p.toOrder, 0)}
                  </td>
                  <td className="p-3 text-center font-bold text-lg bg-blue-200">
                    {products.reduce((sum, p) => sum + calculateTotal(p), 0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {latestOrder && (
        <Card>
          <CardHeader>
            <CardTitle>Último pedido guardado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Fecha: {latestOrder.orderDate} · Guardado el {new Date(latestOrder.createdAt).toLocaleString('es-ES')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

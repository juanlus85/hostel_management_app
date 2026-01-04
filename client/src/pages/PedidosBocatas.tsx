import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, Save } from 'lucide-react';
import { toast } from 'sonner';

type ProductGroup = {
  title: string;
  unitsPerBox: number;
  products: string[];
};

const PRODUCT_GROUPS: ProductGroup[] = [
  {
    title: 'Bocatas',
    unitsPerBox: 6,
    products: [
      'Burguer',
      'Lomo al Mojo',
      'Serranito',
      'Lomo W',
      'Frankfurt',
      'Tortilla',
      'Empanado',
      'BBQ',
      'Pollo Bacon',
      'Carbonara',
      'York',
      'Serrano',
      'Piripi',
    ],
  },
  {
    title: 'Tostas',
    unitsPerBox: 6,
    products: [
      'Tosta Barbacoa',
      'Tosta Carbonara',
      'Tosta Pollo Bacon',
      'Tosta Rulo Cabra',
      'Tosta 3 Quesos',
      'Tosta York',
    ],
  },
  {
    title: 'Bocapizzas',
    unitsPerBox: 16,
    products: [
      'Bocapizza York',
      'Bocapizza Bacon',
      'Bocapizza BBQ',
      'Bocapizza 4Q',
      'Bocapizza Atun',
    ],
  },
];

type ProductData = {
  name: string;
  boxesToOrder: number;
  currentUnits: number;
};

export default function PedidosBocatas() {
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Inicializar productos
  const initialProducts: ProductData[] = PRODUCT_GROUPS.flatMap(group =>
    group.products.map(name => ({
      name,
      boxesToOrder: 0,
      currentUnits: 0,
    }))
  );
  
  const [products, setProducts] = useState<ProductData[]>(initialProducts);

  const createMutation = trpc.chefOrders.create.useMutation();
  const { data: latestOrder } = trpc.chefOrders.getLatest.useQuery();

  const updateBoxes = (index: number, value: string) => {
    const newProducts = [...products];
    newProducts[index].boxesToOrder = parseInt(value) || 0;
    setProducts(newProducts);
  };

  const updateUnits = (index: number, value: string) => {
    const newProducts = [...products];
    newProducts[index].currentUnits = parseInt(value) || 0;
    setProducts(newProducts);
  };

  const calculateTotal = (product: ProductData, unitsPerBox: number) => {
    return (product.boxesToOrder * unitsPerBox) + product.currentUnits;
  };

  const getTotalBoxes = () => {
    return products.reduce((sum, p) => sum + p.boxesToOrder, 0);
  };

  const formatTotalBoxes = (total: number) => {
    if (total < 25) return total.toString();
    const fullSets = Math.floor(total / 25);
    const remainder = total % 25;
    if (remainder === 0) {
      return fullSets === 1 ? '25' : `${fullSets * 25}`;
    }
    return `${total} (${fullSets * 25}+${remainder})`;
  };

  const handleSave = async () => {
    try {
      await createMutation.mutateAsync({ orderDate });
      toast.success('Pedido guardado correctamente');
    } catch (error) {
      toast.error('Error al guardar pedido');
    }
  };

  const handleCopy = () => {
    let text = `PEDIDO BOCATAS DEL CHEF\nFecha: ${orderDate}\n\n`;
    
    PRODUCT_GROUPS.forEach(group => {
      const groupProducts = products.filter(p => group.products.includes(p.name));
      const hasOrders = groupProducts.some(p => p.boxesToOrder > 0);
      
      if (hasOrders) {
        text += `${group.title} (${group.unitsPerBox} unidades por caja):\n`;
        groupProducts.forEach(p => {
          if (p.boxesToOrder > 0) {
            text += `  ${p.name}: ${p.boxesToOrder} cajas\n`;
          }
        });
        text += '\n';
      }
    });
    
    const totalBoxes = getTotalBoxes();
    text += `Total Cajas a Pedir: ${formatTotalBoxes(totalBoxes)}`;

    navigator.clipboard.writeText(text);
    toast.success('Pedido copiado al portapapeles');
  };

  let productIndex = 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Pedidos Bocatas del Chef</h2>
          <p className="text-sm text-muted-foreground">Gestión especializada con cálculos automáticos</p>
        </div>
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

      {PRODUCT_GROUPS.map((group, groupIndex) => {
        const startIndex = productIndex;
        const groupProducts = products.slice(startIndex, startIndex + group.products.length);
        productIndex += group.products.length;

        return (
          <Card key={groupIndex}>
            <CardHeader className="bg-blue-50">
              <CardTitle className="text-lg">{group.title}</CardTitle>
              <p className="text-sm text-muted-foreground">{group.unitsPerBox} unidades por caja</p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-blue-100 border-b-2 border-blue-300">
                    <tr>
                      <th className="text-left p-3 font-semibold">Artículo</th>
                      <th className="text-center p-3 font-semibold w-32">Pedir (Cajas)</th>
                      <th className="text-center p-3 font-semibold w-32">Hay (Unidades)</th>
                      <th className="text-center p-3 font-semibold w-32 bg-blue-200">Total (Unidades)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupProducts.map((product, idx) => {
                      const actualIndex = startIndex + idx;
                      const total = calculateTotal(product, group.unitsPerBox);
                      const hasOrder = product.boxesToOrder > 0;

                      return (
                        <tr 
                          key={actualIndex} 
                          className={`border-b hover:bg-blue-50 ${hasOrder ? 'bg-blue-50' : ''}`}
                        >
                          <td className="p-3 font-medium">{product.name}</td>
                          <td className="p-2 text-center">
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              value={product.boxesToOrder || ''}
                              onChange={(e) => updateBoxes(actualIndex, e.target.value)}
                              className="text-center font-semibold"
                              placeholder="0"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              value={product.currentUnits || ''}
                              onChange={(e) => updateUnits(actualIndex, e.target.value)}
                              className="text-center"
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
                </table>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <Card className="bg-blue-50 border-blue-300">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold">Total Cajas a Pedir</h3>
            <div className="text-3xl font-bold text-blue-600">
              {formatTotalBoxes(getTotalBoxes())}
            </div>
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

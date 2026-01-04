import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, Save } from 'lucide-react';
import { toast } from 'sonner';

type ProductType = {
  name: string;
  unitsPerBox: number;
};

const PRODUCTS: ProductType[] = [
  { name: 'Burguer', unitsPerBox: 6 },
  { name: 'Mojo', unitsPerBox: 6 },
  { name: 'Serranito', unitsPerBox: 6 },
  { name: 'Lomo W', unitsPerBox: 6 },
  { name: 'Frankfurt', unitsPerBox: 6 },
  { name: 'Tortilla', unitsPerBox: 6 },
  { name: 'Empanado', unitsPerBox: 6 },
  { name: 'BBQ', unitsPerBox: 6 },
  { name: 'Pollo Bacon', unitsPerBox: 6 },
  { name: 'Carbonara', unitsPerBox: 6 },
  { name: 'York', unitsPerBox: 6 },
  { name: 'Serrano', unitsPerBox: 6 },
  { name: 'Piripi', unitsPerBox: 6 },
  { name: 'Tosta Barbacoa', unitsPerBox: 6 },
  { name: 'Tosta Carbonara', unitsPerBox: 6 },
  { name: 'Tosta Pollo', unitsPerBox: 6 },
  { name: 'Tosta Rulo Cabra', unitsPerBox: 6 },
  { name: 'Tosta 3 Quesos', unitsPerBox: 6 },
  { name: 'Tosta York', unitsPerBox: 6 },
  { name: 'Bocapizza York', unitsPerBox: 16 },
  { name: 'Bocapizza Bacon', unitsPerBox: 16 },
  { name: 'Bocapizza BBQ', unitsPerBox: 16 },
  { name: 'Bocapizza 4Q', unitsPerBox: 16 },
  { name: 'Bocapizza Atun', unitsPerBox: 16 },
];

export default function PedidosBocatas() {
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [quantities, setQuantities] = useState<Record<string, { boxes: number; units: number }>>({});

  const createMutation = trpc.chefOrders.create.useMutation();
  const { data: latestOrder } = trpc.chefOrders.getLatest.useQuery();

  const calculateTotal = (product: ProductType) => {
    const q = quantities[product.name] || { boxes: 0, units: 0 };
    return q.boxes * product.unitsPerBox + q.units;
  };

  const formatBoxes = (product: ProductType) => {
    const q = quantities[product.name] || { boxes: 0, units: 0 };
    if (q.boxes === 0) return '';
    return `(${q.boxes}×${product.unitsPerBox})`;
  };

  const handleSave = async () => {
    const data: any = { orderDate };
    
    PRODUCTS.forEach(product => {
      const q = quantities[product.name] || { boxes: 0, units: 0 };
      const fieldName = product.name.toLowerCase().replace(/\s+/g, '');
      data[`${fieldName}Boxes`] = q.boxes;
      data[`${fieldName}Units`] = q.units;
    });

    try {
      await createMutation.mutateAsync(data);
      toast.success('Pedido guardado correctamente');
      setQuantities({});
    } catch (error) {
      toast.error('Error al guardar pedido');
    }
  };

  const handleCopy = () => {
    const lines = PRODUCTS
      .filter(p => calculateTotal(p) > 0)
      .map(p => {
        const total = calculateTotal(p);
        const boxes = formatBoxes(p);
        return `${p.name}: ${total} ${boxes}`;
      });

    const text = `
PEDIDO BOCATAS DEL CHEF
Fecha: ${orderDate}

${lines.join('\n')}

Total productos: ${lines.length}
    `.trim();

    navigator.clipboard.writeText(text);
    toast.success('Pedido copiado al portapapeles');
  };

  const setQuantity = (productName: string, field: 'boxes' | 'units', value: string) => {
    const numValue = parseInt(value) || 0;
    setQuantities(prev => ({
      ...prev,
      [productName]: {
        ...prev[productName],
        [field]: numValue,
      },
    }));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Pedidos Bocatas del Chef</h1>
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {PRODUCTS.map((product) => {
          const q = quantities[product.name] || { boxes: 0, units: 0 };
          const total = calculateTotal(product);
          
          return (
            <Card key={product.name}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  {product.name}
                  <span className="text-sm font-normal text-muted-foreground">
                    {product.unitsPerBox} uds/caja
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Cajas</Label>
                    <Input
                      type="number"
                      min="0"
                      value={q.boxes || ''}
                      onChange={(e) => setQuantity(product.name, 'boxes', e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Unidades sueltas</Label>
                    <Input
                      type="number"
                      min="0"
                      value={q.units || ''}
                      onChange={(e) => setQuantity(product.name, 'units', e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>
                {total > 0 && (
                  <div className="p-2 bg-primary/10 rounded text-center">
                    <span className="font-semibold text-primary">
                      Total: {total} unidades
                    </span>
                    {q.boxes > 0 && (
                      <span className="text-xs text-muted-foreground ml-2">
                        ({q.boxes}×{product.unitsPerBox}{q.units > 0 ? `+${q.units}` : ''})
                      </span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

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

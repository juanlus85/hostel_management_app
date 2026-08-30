import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Save, RotateCcw, RefreshCw, Minus, Plus } from "lucide-react";
import { toast } from "sonner";

type ProductGroup = {
  title: string;
  unitsPerBox: number;
  products: string[];
};

const PRODUCT_GROUPS: ProductGroup[] = [
  {
    title: "Bocatas",
    unitsPerBox: 6,
    products: [
      "Burguer",
      "Lomo al Mojo",
      "Serranito",
      "Lomo W",
      "Frankfurt",
      "Tortilla",
      "Empanado",
      "BBQ",
      "Pollo Bacon",
      "Carbonara",
      "York",
      "Serrano",
      "Piripi",
    ],
  },
  {
    title: "Tostas",
    unitsPerBox: 6,
    products: [
      "Tosta Barbacoa",
      "Tosta Carbonara",
      "Tosta Pollo Bacon",
      "Tosta Rulo Cabra",
      "Tosta 3 Quesos",
      "Tosta York",
    ],
  },
  {
    title: "Bocapizzas",
    unitsPerBox: 16,
    products: [
      "Bocapizza York",
      "Bocapizza Bacon",
      "Bocapizza BBQ",
      "Bocapizza 4Q",
      "Bocapizza Atun",
    ],
  },
];

type ProductData = {
  name: string;
  boxesToOrder: number;
  currentUnits: number;
  loyverseProductHandle?: string;
};

const STORAGE_KEY = "bocatas_pedido_draft";

export default function PedidosBocatas() {
  const [orderDate, setOrderDate] = useState(
    new Date().toISOString().split("T")[0]
  );

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
  const { data: loyverseProducts = [], refetch: refetchLoyverseProducts } =
    trpc.inventoryProducts.list.useQuery();
  const { data: loyverseBindings = [] } =
    trpc.inventoryProducts.loyverseBindings.useQuery();
  const setLoyverseBinding =
    trpc.inventoryProducts.setLoyverseBinding.useMutation();
  const syncLoyverseMutation = trpc.inventoryProducts.syncLoyverse.useMutation({
    onSuccess: result => {
      toast.success(`Stock actualizado: ${result.total} productos de Loyverse`);
      refetchLoyverseProducts();
    },
    onError: error => toast.error(error.message),
  });

  useEffect(() => {
    if (!loyverseBindings.length) return;
    setProducts(current =>
      current.map(product => {
        const binding = loyverseBindings.find(
          item => item.templateKey === `chef:${product.name}`
        );
        return binding
          ? {
              ...product,
              loyverseProductHandle: binding.loyverseProductHandle || undefined,
            }
          : product;
      })
    );
  }, [loyverseBindings]);

  // Cargar datos del localStorage al montar el componente
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.products && Array.isArray(parsed.products)) {
          setProducts(parsed.products);
        }
        if (parsed.orderDate) {
          setOrderDate(parsed.orderDate);
        }
      } catch (error) {
        console.error("Error loading saved order:", error);
      }
    }
  }, []);

  // Guardar en localStorage cada vez que cambian los productos o la fecha
  useEffect(() => {
    const dataToSave = {
      products,
      orderDate,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  }, [products, orderDate]);

  const updateBoxes = (index: number, value: string) => {
    const newProducts = [...products];
    newProducts[index].boxesToOrder = parseInt(value) || 0;
    setProducts(newProducts);
  };

  const adjustBoxes = (index: number, amount: number) => {
    setProducts(current =>
      current.map((product, productIndex) =>
        productIndex === index
          ? { ...product, boxesToOrder: Math.max(0, product.boxesToOrder + amount) }
          : product
      )
    );
  };

  const resetBoxesToOrder = () => {
    setProducts(current =>
      current.map(product => ({ ...product, boxesToOrder: 0 }))
    );
    toast.success("Unidades a pedir reiniciadas");
  };

  const updateUnits = (index: number, value: string) => {
    const newProducts = [...products];
    newProducts[index].currentUnits = parseInt(value) || 0;
    setProducts(newProducts);
  };

  const setLinkedProduct = (index: number, handle: string) => {
    const product = products[index];
    const loyverseProductHandle = handle === "__none__" ? undefined : handle;
    setProducts(current =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, loyverseProductHandle } : item
      )
    );
    setLoyverseBinding.mutate(
      {
        templateKey: `chef:${product.name}`,
        loyverseProductHandle: loyverseProductHandle || null,
      },
      { onError: error => toast.error(error.message) }
    );
  };

  const calculateTotal = (product: ProductData, unitsPerBox: number) => {
    return product.boxesToOrder * unitsPerBox + product.currentUnits;
  };

  const getTotalBoxes = () => {
    return products.reduce((sum, p) => sum + p.boxesToOrder, 0);
  };

  const formatTotalBoxes = (total: number) => {
    if (total <= 25) return total.toString();
    const fullSets = Math.floor(total / 25);
    const remainder = total % 25;
    if (remainder === 0) {
      return fullSets === 1 ? "25" : `${fullSets * 25}`;
    }
    return `${total} (${fullSets * 25}+${remainder})`;
  };

  const handleReset = () => {
    if (!confirm("¿Borrar el pedido actual y empezar de cero?")) return;
    setProducts(initialProducts);
    setOrderDate(new Date().toISOString().split("T")[0]);
    localStorage.removeItem(STORAGE_KEY);
    toast.success("Pedido reiniciado");
  };

  const handleSave = async () => {
    try {
      await createMutation.mutateAsync({ orderDate });
      toast.success("Pedido guardado correctamente");
    } catch (error) {
      toast.error("Error al guardar pedido");
    }
  };

  const handleCopy = () => {
    let text = `PEDIDO BOCATAS DEL CHEF\nFecha: ${orderDate}\n\n`;

    PRODUCT_GROUPS.forEach(group => {
      const groupProducts = products.filter(p =>
        group.products.includes(p.name)
      );
      const hasOrders = groupProducts.some(p => p.boxesToOrder > 0);

      if (hasOrders) {
        text += `${group.title} (${group.unitsPerBox} unidades por caja):\n`;
        groupProducts.forEach(p => {
          if (p.boxesToOrder > 0) {
            text += `  ${p.name}: ${p.boxesToOrder} cajas\n`;
          }
        });
        text += "\n";
      }
    });

    const totalBoxes = getTotalBoxes();
    text += `Total Cajas a Pedir: ${formatTotalBoxes(totalBoxes)}`;

    navigator.clipboard.writeText(text);
    toast.success("Pedido copiado al portapapeles");
  };

  let productIndex = 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Pedidos Bocatas del Chef</h2>
          <p className="text-sm text-muted-foreground">
            Gestión especializada con cálculos automáticos y guardado automático
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => syncLoyverseMutation.mutate()}
            disabled={syncLoyverseMutation.isPending}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${syncLoyverseMutation.isPending ? "animate-spin" : ""}`}
            />
            Actualizar stock
          </Button>
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reiniciar
          </Button>
          <Button variant="outline" onClick={resetBoxesToOrder}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reiniciar a pedir
          </Button>
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
          <Input
            type="date"
            value={orderDate}
            onChange={e => setOrderDate(e.target.value)}
            className="max-w-xs"
          />
        </CardContent>
      </Card>

      {PRODUCT_GROUPS.map((group, groupIndex) => {
        const startIndex = productIndex;
        const groupProducts = products.slice(
          startIndex,
          startIndex + group.products.length
        );
        productIndex += group.products.length;

        return (
          <Card key={groupIndex}>
            <CardHeader className="bg-blue-50">
              <CardTitle className="text-lg">{group.title}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {group.unitsPerBox} unidades por caja
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-blue-100 border-b-2 border-blue-300">
                    <tr>
                      <th className="text-left p-3 font-semibold">Artículo</th>
                      <th className="text-left p-3 font-semibold min-w-56">
                        Producto en Loyverse
                      </th>
                      <th className="text-center p-3 font-semibold w-32">
                        Pedir (Cajas)
                      </th>
                      <th className="text-center p-3 font-semibold w-32">
                        Hay (Unidades)
                      </th>
                      <th className="text-center p-3 font-semibold w-32 bg-blue-200">
                        Total (Unidades)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupProducts.map((product, idx) => {
                      const actualIndex = startIndex + idx;
                      const linkedProduct = loyverseProducts.find(
                        item => item.handle === product.loyverseProductHandle
                      );
                      const currentUnits = linkedProduct
                        ? Number(linkedProduct.inStock) || 0
                        : product.currentUnits;
                      const total =
                        product.boxesToOrder * group.unitsPerBox + currentUnits;
                      const hasOrder = product.boxesToOrder > 0;

                      return (
                        <tr
                          key={actualIndex}
                          className={`border-b hover:bg-blue-50 ${hasOrder ? "bg-blue-50" : ""}`}
                        >
                          <td className="p-3 font-medium">{product.name}</td>
                          <td className="p-2">
                            <Select
                              value={
                                product.loyverseProductHandle || "__none__"
                              }
                              onValueChange={value =>
                                setLinkedProduct(actualIndex, value)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar producto" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">
                                  Sin vincular
                                </SelectItem>
                                {loyverseProducts
                                  .filter(item =>
                                    item.handle?.startsWith("lv_") || item.handle?.startsWith("loyverse:")
                                  )
                                  .map(item => (
                                    <SelectItem
                                      key={item.handle}
                                      value={item.handle!}
                                    >
                                      {item.name} · Stock: {item.inStock}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-2 text-center">
                            <div className="flex items-center gap-1">
                              <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => adjustBoxes(actualIndex, -1)} disabled={product.boxesToOrder === 0} aria-label={`Quitar una caja de ${product.name}`}><Minus className="h-4 w-4" /></Button>
                              <Input
                                type="number"
                                min="0"
                                step="1"
                                value={product.boxesToOrder || ""}
                                onChange={e =>
                                  updateBoxes(actualIndex, e.target.value)
                                }
                                className="min-w-14 text-center font-semibold"
                                placeholder="0"
                              />
                              <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => adjustBoxes(actualIndex, 1)} aria-label={`Añadir una caja de ${product.name}`}><Plus className="h-4 w-4" /></Button>
                            </div>
                          </td>
                          <td className="p-2 text-center">
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              value={currentUnits || ""}
                              onChange={e =>
                                updateUnits(actualIndex, e.target.value)
                              }
                              disabled={Boolean(linkedProduct)}
                              className="text-center"
                              placeholder="0"
                            />
                          </td>
                          <td className="p-3 text-center bg-blue-50">
                            <span
                              className={`font-bold text-lg ${hasOrder ? "text-blue-600" : "text-gray-600"}`}
                            >
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
              Fecha: {latestOrder.orderDate} · Guardado el{" "}
              {new Date(latestOrder.createdAt).toLocaleString("es-ES")}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

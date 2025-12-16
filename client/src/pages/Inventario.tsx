import { useBusinessContext } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Package, Plus, AlertTriangle, Search, ArrowUp, ArrowDown, Edit2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const CATEGORIES = ["Bebidas", "Alimentación", "Limpieza", "Papelería", "Otros"];
const SUPPLIERS = ["Coca Cola", "Frigo/Helados", "Cerbedam", "Matutano/Pepsi", "Reyes", "Ramirex", "Sarigabo", "Risi", "Cruzcampo", "Hielo", "Carrefour", "Distribuidor mayorista", "Otros"];

export default function Inventario() {
  const { selectedBusiness } = useBusinessContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAdjustDialog, setIsAdjustDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [supplier, setSupplier] = useState("");
  const [currentStock, setCurrentStock] = useState("");
  const [minimumStock, setMinimumStock] = useState("");
  const [unit, setUnit] = useState("unidad");
  const [adjustType, setAdjustType] = useState<"in" | "out" | "adjustment">("in");
  const [adjustQuantity, setAdjustQuantity] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");

  const utils = trpc.useUtils();

  const { data: businesses } = trpc.businesses.list.useQuery();
  const currentBusinessId = useMemo(() => {
    if (selectedBusiness === "all") return businesses?.[0]?.id;
    return businesses?.find(b => b.code === selectedBusiness)?.id;
  }, [businesses, selectedBusiness]);

  const { data: inventory, isLoading } = trpc.inventory.list.useQuery(
    { businessId: currentBusinessId! },
    { enabled: !!currentBusinessId }
  );

  const { data: lowStockItems } = trpc.inventory.lowStock.useQuery(
    { businessId: currentBusinessId! },
    { enabled: !!currentBusinessId }
  );

  const createItem = trpc.inventory.create.useMutation({
    onSuccess: () => {
      toast.success("Producto añadido");
      utils.inventory.list.invalidate();
      utils.inventory.lowStock.invalidate();
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => toast.error("Error: " + error.message),
  });

  const adjustStock = trpc.inventory.adjustStock.useMutation({
    onSuccess: () => {
      toast.success("Stock actualizado");
      utils.inventory.list.invalidate();
      utils.inventory.lowStock.invalidate();
      setIsAdjustDialog(false);
      setSelectedItem(null);
      setAdjustQuantity("");
      setAdjustReason("");
    },
    onError: (error) => toast.error("Error: " + error.message),
  });

  const resetForm = () => {
    setName("");
    setCategory("");
    setSupplier("");
    setCurrentStock("");
    setMinimumStock("");
    setUnit("unidad");
  };

  const handleCreateItem = () => {
    if (!currentBusinessId || !name) {
      toast.error("El nombre es obligatorio");
      return;
    }
    createItem.mutate({
      businessId: currentBusinessId,
      name,
      category,
      supplier,
      currentStock: currentStock || "0",
      minimumStock: minimumStock || "0",
      unit,
    });
  };

  const handleAdjustStock = () => {
    if (!selectedItem || !adjustQuantity) return;
    adjustStock.mutate({
      itemId: selectedItem.id,
      quantity: parseFloat(adjustQuantity),
      type: adjustType,
      reason: adjustReason,
    });
  };

  const openAdjustDialog = (item: any, type: "in" | "out") => {
    setSelectedItem(item);
    setAdjustType(type);
    setIsAdjustDialog(true);
  };

  // Filter and search
  const filteredInventory = useMemo(() => {
    if (!inventory) return [];
    return inventory.filter(item => {
      const matchesSearch = !searchTerm || 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.supplier?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === "all" || item.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [inventory, searchTerm, filterCategory]);

  // Group by category
  const inventoryByCategory = useMemo(() => {
    const groups: Record<string, typeof filteredInventory> = {};
    filteredInventory.forEach(item => {
      const cat = item.category || "Sin categoría";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }, [filteredInventory]);

  const businessLabel = selectedBusiness === "hostel" ? "Hostel" : selectedBusiness === "tienda" ? "Tienda" : "Ambos";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            Inventario - {businessLabel}
          </h1>
          <p className="text-muted-foreground">Control de stock y productos</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo producto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Añadir producto</DialogTitle>
              <DialogDescription>Registra un nuevo producto en el inventario</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Nombre del producto *</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Agua Grande 1.5L" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Categoría</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Proveedor</Label>
                  <Select value={supplier} onValueChange={setSupplier}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPLIERS.map(sup => (
                        <SelectItem key={sup} value={sup}>{sup}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label>Stock actual</Label>
                  <Input type="number" value={currentStock} onChange={e => setCurrentStock(e.target.value)} placeholder="0" />
                </div>
                <div className="grid gap-2">
                  <Label>Stock mínimo</Label>
                  <Input type="number" value={minimumStock} onChange={e => setMinimumStock(e.target.value)} placeholder="0" />
                </div>
                <div className="grid gap-2">
                  <Label>Unidad</Label>
                  <Input value={unit} onChange={e => setUnit(e.target.value)} placeholder="unidad" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateItem} disabled={createItem.isPending}>
                {createItem.isPending ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems && lowStockItems.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Stock bajo - {lowStockItems.length} productos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lowStockItems.map(item => (
                <Badge key={item.id} variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                  {item.name}: {parseFloat(item.currentStock || "0")} {item.unit}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar producto..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {CATEGORIES.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Inventory List */}
      <Card>
        <CardHeader>
          <CardTitle>Productos ({filteredInventory.length})</CardTitle>
          <CardDescription>Lista de productos en inventario</CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(inventoryByCategory).length > 0 ? (
            <div className="space-y-6">
              {Object.entries(inventoryByCategory).map(([cat, items]) => (
                <div key={cat}>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">{cat}</h3>
                  <div className="space-y-2">
                    {items.map(item => {
                      const current = parseFloat(item.currentStock || "0");
                      const minimum = parseFloat(item.minimumStock || "0");
                      const isLow = current <= minimum;
                      return (
                        <div key={item.id} className={`flex items-center justify-between p-3 rounded-lg border ${isLow ? 'border-orange-200 bg-orange-50/30' : ''}`}>
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${isLow ? 'bg-orange-100' : 'bg-muted'}`}>
                              <Package className={`h-4 w-4 ${isLow ? 'text-orange-500' : 'text-muted-foreground'}`} />
                            </div>
                            <div>
                              <p className="font-medium">{item.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {item.supplier || 'Sin proveedor'} • Mín: {minimum} {item.unit}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right mr-4">
                              <p className={`text-lg font-bold ${isLow ? 'text-orange-500' : ''}`}>
                                {current} {item.unit}
                              </p>
                            </div>
                            <Button size="icon" variant="outline" onClick={() => openAdjustDialog(item, "in")}>
                              <ArrowUp className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button size="icon" variant="outline" onClick={() => openAdjustDialog(item, "out")}>
                              <ArrowDown className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No hay productos en el inventario</p>
              <Button variant="link" onClick={() => setIsDialogOpen(true)}>
                Añadir primer producto
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Adjust Stock Dialog */}
      <Dialog open={isAdjustDialog} onOpenChange={setIsAdjustDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {adjustType === "in" ? "Entrada de stock" : "Salida de stock"}
            </DialogTitle>
            <DialogDescription>
              {selectedItem?.name} - Stock actual: {parseFloat(selectedItem?.currentStock || "0")} {selectedItem?.unit}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Cantidad</Label>
              <Input 
                type="number" 
                value={adjustQuantity} 
                onChange={e => setAdjustQuantity(e.target.value)} 
                placeholder="0" 
              />
            </div>
            <div className="grid gap-2">
              <Label>Motivo (opcional)</Label>
              <Input 
                value={adjustReason} 
                onChange={e => setAdjustReason(e.target.value)} 
                placeholder="Ej: Pedido recibido, Venta, Merma..." 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAdjustDialog(false)}>Cancelar</Button>
            <Button onClick={handleAdjustStock} disabled={adjustStock.isPending}>
              {adjustStock.isPending ? "Guardando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

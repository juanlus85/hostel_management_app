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

const CATEGORIES = ["Bebidas", "Alimentación", "Limpieza", "Papelería", "Bocatas", "Otros"];

export default function Inventario() {
  const { selectedBusiness } = useBusinessContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAdjustDialog, setIsAdjustDialog] = useState(false);
  const [isEditDialog, setIsEditDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [supplier, setSupplier] = useState("");
  const [customSupplier, setCustomSupplier] = useState("");
  const [currentStock, setCurrentStock] = useState("");
  const [minimumStock, setMinimumStock] = useState("");
  const [unit, setUnit] = useState("unidad");
  const [adjustType, setAdjustType] = useState<"in" | "out" | "adjustment">("in");
  const [adjustQuantity, setAdjustQuantity] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  
  // Edit states
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editSupplier, setEditSupplier] = useState("");
  const [editMinimumStock, setEditMinimumStock] = useState("");
  const [editUnit, setEditUnit] = useState("");

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

  // Get suppliers from database
  const { data: suppliers } = trpc.suppliers.list.useQuery();

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

  const updateItem = trpc.inventory.update.useMutation({
    onSuccess: () => {
      toast.success("Producto actualizado");
      utils.inventory.list.invalidate();
      utils.inventory.lowStock.invalidate();
      setIsEditDialog(false);
      setSelectedItem(null);
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
    setCustomSupplier("");
    setCurrentStock("");
    setMinimumStock("");
    setUnit("unidad");
  };

  const handleCreateItem = () => {
    const itemName = name.trim();
    if (!currentBusinessId) {
      toast.error("Selecciona un negocio");
      return;
    }
    if (!itemName) {
      toast.error("El nombre es obligatorio");
      return;
    }
    const finalSupplier = supplier === "_custom" ? customSupplier : supplier;
    createItem.mutate({
      businessId: currentBusinessId,
      name: itemName,
      category,
      supplier: finalSupplier,
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

  const openEditDialog = (item: any) => {
    setSelectedItem(item);
    setEditName(item.name);
    setEditCategory(item.category || "");
    setEditSupplier(item.supplier || "");
    setEditMinimumStock(item.minimumStock || "0");
    setEditUnit(item.unit || "unidad");
    setIsEditDialog(true);
  };

  const handleUpdateItem = () => {
    if (!selectedItem || !editName) {
      toast.error("El nombre es obligatorio");
      return;
    }
    updateItem.mutate({
      id: selectedItem.id,
      name: editName,
      category: editCategory,
      supplier: editSupplier,
      minimumStock: editMinimumStock,
      unit: editUnit,
    });
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
              <DialogDescription>Registra un producto que falta o necesitas pedir</DialogDescription>
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
                      {suppliers?.map(sup => (
                        <SelectItem key={sup.id} value={sup.name}>{sup.name}</SelectItem>
                      ))}
                      <SelectItem value="_custom">Otro (escribir)</SelectItem>
                    </SelectContent>
                  </Select>
                  {supplier === "_custom" && (
                    <Input 
                      value={customSupplier} 
                      onChange={e => setCustomSupplier(e.target.value)} 
                      placeholder="Nombre del proveedor"
                      className="mt-2"
                    />
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label>Stock actual</Label>
                  <Input type="number" value={currentStock} onChange={e => setCurrentStock(e.target.value)} placeholder="0" />
                </div>
                <div className="grid gap-2">
                  <Label>Stock mínimo (opcional)</Label>
                  <Input type="number" value={minimumStock} onChange={e => setMinimumStock(e.target.value)} placeholder="0" />
                </div>
                <div className="grid gap-2">
                  <Label>Unidad</Label>
                  <Select value={unit} onValueChange={setUnit}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unidad">Unidad</SelectItem>
                      <SelectItem value="kg">Kg</SelectItem>
                      <SelectItem value="litro">Litro</SelectItem>
                      <SelectItem value="caja">Caja</SelectItem>
                      <SelectItem value="pack">Pack</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateItem} disabled={createItem.isPending}>
                {createItem.isPending ? "Guardando..." : "Añadir producto"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems && lowStockItems.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-orange-700 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Stock bajo ({lowStockItems.length} productos)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lowStockItems.map(item => (
                <Badge key={item.id} variant="outline" className="border-orange-300 text-orange-700">
                  {item.name}: {item.currentStock} {item.unit}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar producto o proveedor..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-48">
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
      {Object.entries(inventoryByCategory).map(([category, items]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="text-lg">{category}</CardTitle>
            <CardDescription>{items.length} productos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">Producto</th>
                    <th className="text-left py-2 px-2">Proveedor</th>
                    <th className="text-center py-2 px-2">Stock</th>
                    <th className="text-center py-2 px-2">Mínimo</th>
                    <th className="text-center py-2 px-2">Estado</th>
                    <th className="text-right py-2 px-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => {
                    const stock = parseFloat(item.currentStock || "0");
                    const min = parseFloat(item.minimumStock || "0");
                    const isLow = stock <= min;
                    return (
                      <tr key={item.id} className="border-b hover:bg-muted/50">
                        <td className="py-2 px-2 font-medium">{item.name}</td>
                        <td className="py-2 px-2 text-muted-foreground">{item.supplier || "-"}</td>
                        <td className="py-2 px-2 text-center">{stock} {item.unit}</td>
                        <td className="py-2 px-2 text-center">{min} {item.unit}</td>
                        <td className="py-2 px-2 text-center">
                          {isLow ? (
                            <Badge variant="destructive">Bajo</Badge>
                          ) : (
                            <Badge variant="secondary">OK</Badge>
                          )}
                        </td>
                        <td className="py-2 px-2 text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)} title="Editar">
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => openAdjustDialog(item, "in")} title="Entrada">
                              <ArrowUp className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => openAdjustDialog(item, "out")} title="Salida">
                              <ArrowDown className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}

      {filteredInventory.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>No hay productos en el inventario</p>
            <Button variant="link" onClick={() => setIsDialogOpen(true)}>
              Añadir el primero
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Adjust Stock Dialog */}
      <Dialog open={isAdjustDialog} onOpenChange={setIsAdjustDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{adjustType === "in" ? "Entrada de stock" : "Salida de stock"}</DialogTitle>
            <DialogDescription>
              {selectedItem?.name} - Stock actual: {selectedItem?.currentStock} {selectedItem?.unit}
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
                placeholder="Ej: Pedido semanal, Venta, Rotura..."
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

      {/* Edit Item Dialog */}
      <Dialog open={isEditDialog} onOpenChange={setIsEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar producto</DialogTitle>
            <DialogDescription>Modifica los datos del producto</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Nombre del producto *</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Nombre" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Categoría</Label>
                <Select value={editCategory} onValueChange={setEditCategory}>
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
                <Select value={editSupplier} onValueChange={setEditSupplier}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers?.map(sup => (
                      <SelectItem key={sup.id} value={sup.name}>{sup.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Stock mínimo</Label>
                <Input type="number" value={editMinimumStock} onChange={e => setEditMinimumStock(e.target.value)} placeholder="0" />
              </div>
              <div className="grid gap-2">
                <Label>Unidad</Label>
                <Select value={editUnit} onValueChange={setEditUnit}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unidad">Unidad</SelectItem>
                    <SelectItem value="kg">Kg</SelectItem>
                    <SelectItem value="litro">Litro</SelectItem>
                    <SelectItem value="caja">Caja</SelectItem>
                    <SelectItem value="pack">Pack</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialog(false)}>Cancelar</Button>
            <Button onClick={handleUpdateItem} disabled={updateItem.isPending}>
              {updateItem.isPending ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

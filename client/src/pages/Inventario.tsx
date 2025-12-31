import { useBusinessContext } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Package, Plus, Trash2, Edit2, Check, AlertTriangle } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const CATEGORIES = ["Bebidas", "Alimentación", "Limpieza", "Papelería", "Bocatas", "Otros"];

export default function Inventario() {
  const { selectedBusiness } = useBusinessContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialog, setIsEditDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [formBusinessId, setFormBusinessId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [supplier, setSupplier] = useState("");
  const [customSupplier, setCustomSupplier] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("unidad");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Edit states
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editSupplier, setEditSupplier] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [editUnit, setEditUnit] = useState("");

  const utils = trpc.useUtils();

  const { data: businesses } = trpc.businesses.list.useQuery();
  const hostelBusiness = businesses?.find(b => b.code === "hostel");
  const tiendaBusiness = businesses?.find(b => b.code === "tienda");
  
  const currentBusinessId = useMemo(() => {
    if (selectedBusiness === "all") return hostelBusiness?.id;
    return businesses?.find(b => b.code === selectedBusiness)?.id;
  }, [businesses, selectedBusiness, hostelBusiness]);

  // Queries - obtener datos según selección global
  const { data: inventoryHostel } = trpc.inventory.list.useQuery(
    { businessId: hostelBusiness?.id! },
    { enabled: !!hostelBusiness && (selectedBusiness === "hostel" || selectedBusiness === "all") }
  );
  
  const { data: inventoryTienda } = trpc.inventory.list.useQuery(
    { businessId: tiendaBusiness?.id! },
    { enabled: !!tiendaBusiness && (selectedBusiness === "tienda" || selectedBusiness === "all") }
  );
  
  // Combinar datos según selección
  const inventory = selectedBusiness === "all" 
    ? [...(inventoryHostel || []), ...(inventoryTienda || [])].sort((a, b) => a.name.localeCompare(b.name))
    : selectedBusiness === "hostel" 
    ? inventoryHostel || []
    : inventoryTienda || [];
  
  const isLoading = !businesses;

  // Get suppliers from database
  const { data: suppliers } = trpc.suppliers.list.useQuery();

  const createItem = trpc.inventory.create.useMutation({
    onSuccess: () => {
      toast.success("Producto añadido a la lista");
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

  const deleteItem = trpc.inventory.delete.useMutation({
    onSuccess: () => {
      toast.success("Producto eliminado - pedido recibido");
      utils.inventory.list.invalidate();
      utils.inventory.lowStock.invalidate();
    },
    onError: (error) => toast.error("Error: " + error.message),
  });

  const resetForm = () => {
    setName("");
    setCategory("");
    setSupplier("");
    setCustomSupplier("");
    setQuantity("");
    setUnit("unidad");
  };

  const handleCreateItem = () => {
    const itemName = name.trim();
    // Si estamos en modo "Ambos", usar el negocio seleccionado en el formulario
    const businessIdToUse = selectedBusiness === "all" ? formBusinessId : currentBusinessId;
    
    if (!businessIdToUse) {
      toast.error(selectedBusiness === "all" 
        ? "Selecciona para qué negocio es este producto" 
        : "Selecciona un negocio");
      return;
    }
    if (!itemName) {
      toast.error("El nombre es obligatorio");
      return;
    }
    const finalSupplier = supplier === "_custom" ? customSupplier : supplier;
    createItem.mutate({
      businessId: businessIdToUse,
      name: itemName,
      category,
      supplier: finalSupplier,
      currentStock: quantity || "0",
      minimumStock: "0",
      unit,
    });
  };

  const openEditDialog = (item: any) => {
    setSelectedItem(item);
    setEditName(item.name);
    setEditCategory(item.category || "");
    setEditSupplier(item.supplier || "");
    setEditQuantity(item.currentStock?.toString() || "0");
    setEditUnit(item.unit || "unidad");
    setIsEditDialog(true);
  };

  const handleUpdateItem = () => {
    if (!selectedItem || !editName.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    updateItem.mutate({
      id: selectedItem.id,
      name: editName.trim(),
      category: editCategory,
      supplier: editSupplier,
      currentStock: editQuantity,
      unit: editUnit,
    });
  };

  const handleDeleteItem = (item: any) => {
    if (confirm(`¿Eliminar "${item.name}" de la lista? (El pedido ha llegado)`)) {
      deleteItem.mutate({ id: item.id });
    }
  };

  // Filter by search
  const filteredInventory = useMemo(() => {
    if (!inventory) return [];
    return inventory.filter(item => {
      const matchesSearch = !searchTerm || 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.supplier?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [inventory, searchTerm]);

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
            Faltantes - {businessLabel}
          </h1>
          <p className="text-muted-foreground">Lista de productos que faltan o hay que pedir</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Añadir faltante
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Añadir producto faltante</DialogTitle>
              <DialogDescription>Registra un producto que falta o hay que pedir</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* Selector de negocio (solo cuando está en modo "Ambos") */}
              {selectedBusiness === "all" && (
                <div className="p-4 border-2 border-primary/30 rounded-lg bg-primary/5">
                  <Label className="text-base font-semibold">Negocio *</Label>
                  <Select 
                    value={formBusinessId?.toString() || ""} 
                    onValueChange={(v) => setFormBusinessId(parseInt(v))}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Selecciona el negocio" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={hostelBusiness?.id.toString() || ""}>Hostel</SelectItem>
                      <SelectItem value={tiendaBusiness?.id.toString() || ""}>Tienda</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-2">
                    Selecciona para qué negocio es este producto. No se puede crear para ambos a la vez.
                  </p>
                </div>
              )}

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
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Quedan (unidades)</Label>
                  <Input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="0" />
                </div>
                <div className="grid gap-2">
                  <Label>Unidad</Label>
                  <Select value={unit} onValueChange={setUnit}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unidad">Unidad</SelectItem>
                      <SelectItem value="caja">Caja</SelectItem>
                      <SelectItem value="pack">Pack</SelectItem>
                      <SelectItem value="kg">Kg</SelectItem>
                      <SelectItem value="litro">Litro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              {!currentBusinessId && (
                <p className="text-sm text-muted-foreground mr-auto">Selecciona un negocio para continuar</p>
              )}
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateItem} disabled={createItem.isPending || !currentBusinessId}>
                {createItem.isPending ? "Guardando..." : "Añadir"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Alert if there are items */}
      {inventory && inventory.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <span className="text-amber-800 font-medium">
              {inventory.length} producto{inventory.length !== 1 ? 's' : ''} pendiente{inventory.length !== 1 ? 's' : ''} de pedir
            </span>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Input 
            placeholder="Buscar producto o proveedor..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Cargando...
          </CardContent>
        </Card>
      ) : filteredInventory.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No hay productos faltantes</p>
            <p className="text-sm text-muted-foreground mt-1">¡Todo el stock está completo!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(inventoryByCategory).map(([category, items]) => (
            <Card key={category}>
              <CardHeader className="py-3">
                <CardTitle className="text-lg">{category}</CardTitle>
                <CardDescription>{items.length} producto{items.length !== 1 ? 's' : ''}</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {items.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-4 hover:bg-muted/50">
                      <div className="flex-1">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {item.supplier && <span>{item.supplier} · </span>}
                          <span className="text-amber-600 font-medium">
                            Quedan: {parseFloat(item.currentStock || 0).toFixed(0)} {item.unit}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => openEditDialog(item)}
                          title="Editar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => handleDeleteItem(item)}
                          title="Pedido recibido - Eliminar"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialog} onOpenChange={setIsEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar producto</DialogTitle>
            <DialogDescription>Modifica los datos del producto faltante</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Nombre del producto *</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} />
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
                <Label>Quedan (unidades)</Label>
                <Input type="number" value={editQuantity} onChange={e => setEditQuantity(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Unidad</Label>
                <Select value={editUnit} onValueChange={setEditUnit}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unidad">Unidad</SelectItem>
                    <SelectItem value="caja">Caja</SelectItem>
                    <SelectItem value="pack">Pack</SelectItem>
                    <SelectItem value="kg">Kg</SelectItem>
                    <SelectItem value="litro">Litro</SelectItem>
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

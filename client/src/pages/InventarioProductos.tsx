import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Upload,
  Plus,
  Pencil,
  Trash2,
  Download,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

export default function InventarioProductos() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);

  const { data: products = [], refetch } =
    trpc.inventoryProducts.list.useQuery();
  const createMutation = trpc.inventoryProducts.create.useMutation();
  const updateMutation = trpc.inventoryProducts.update.useMutation();
  const deleteMutation = trpc.inventoryProducts.delete.useMutation();
  const importMutation = trpc.inventoryProducts.importCSV.useMutation();
  const syncLoyverseMutation = trpc.inventoryProducts.syncLoyverse.useMutation({
    onSuccess: result => {
      toast.success(
        `Loyverse sincronizado: ${result.total} productos (${result.created} nuevos, ${result.updated} actualizados)`
      );
      refetch();
    },
    onError: error => toast.error(error.message),
  });

  const [formData, setFormData] = useState({
    handle: "",
    ref: "",
    name: "",
    category: "",
    cost: "",
    price: "",
    inStock: "",
  });

  // Ordenar productos por categoría
  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      const catA = a.category || "Sin categoría";
      const catB = b.category || "Sin categoría";
      if (catA !== catB) return catA.localeCompare(catB);
      return a.name.localeCompare(b.name);
    });
  }, [products]);

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    try {
      await createMutation.mutateAsync(formData);
      toast.success("Producto creado correctamente");
      setIsCreateOpen(false);
      setFormData({
        handle: "",
        ref: "",
        name: "",
        category: "",
        cost: "",
        price: "",
        inStock: "",
      });
      refetch();
    } catch (error) {
      toast.error("Error al crear producto");
    }
  };

  const handleUpdate = async () => {
    if (!editingProduct) return;
    if (!formData.name.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    try {
      await updateMutation.mutateAsync({ id: editingProduct.id, ...formData });
      toast.success("Producto actualizado correctamente");
      setEditingProduct(null);
      setFormData({
        handle: "",
        ref: "",
        name: "",
        category: "",
        cost: "",
        price: "",
        inStock: "",
      });
      refetch();
    } catch (error) {
      toast.error("Error al actualizar producto");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar este producto?")) return;
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("Producto eliminado correctamente");
      refetch();
    } catch (error) {
      toast.error("Error al eliminar producto");
    }
  };

  const parseCSVValue = (value: string): string => {
    // Limpiar valor
    let trimmed = value.trim().replace(/"/g, "");

    // Si está vacío, retornar vacío
    if (!trimmed) return "";

    // Si no es un número, retornar tal cual
    if (!/[\d,.]/.test(trimmed)) return trimmed;

    // Detectar formato:
    // - Europeo con coma decimal: 1,50 o 1.234,50
    // - US con punto decimal: 1.50 o 1,234.50

    // Si tiene punto Y coma, determinar cuál es el decimal
    if (trimmed.includes(".") && trimmed.includes(",")) {
      // Si el último separador es coma → formato europeo (1.234,50)
      if (trimmed.lastIndexOf(",") > trimmed.lastIndexOf(".")) {
        trimmed = trimmed.replace(/\./g, "").replace(",", ".");
      } else {
        // Si el último separador es punto → formato US (1,234.50)
        trimmed = trimmed.replace(/,/g, "");
      }
    }
    // Si solo tiene coma → formato europeo (1,50)
    else if (trimmed.includes(",") && !trimmed.includes(".")) {
      trimmed = trimmed.replace(",", ".");
    }
    // Si solo tiene punto → puede ser decimal o separador de miles
    else if (trimmed.includes(".")) {
      // Si hay más de un punto, es separador de miles (1.234.567)
      const dotCount = (trimmed.match(/\./g) || []).length;
      if (dotCount > 1) {
        trimmed = trimmed.replace(/\./g, "");
      }
      // Si hay un solo punto y está seguido de 1-2 dígitos → es decimal
      // Si está seguido de 3 dígitos exactos → es separador de miles
      else {
        const afterDot = trimmed.split(".")[1];
        if (afterDot && afterDot.length === 3 && /^\d+$/.test(afterDot)) {
          // Es separador de miles (1.234)
          trimmed = trimmed.replace(".", "");
        }
        // else: es decimal (1.50) → dejar tal cual
      }
    }

    return trimmed;
  };

  const handleCSVImport = async () => {
    if (!csvFile) return;

    try {
      const text = await csvFile.text();

      // Detectar separador (coma o punto y coma)
      const firstLine = text.split("\n")[0];
      const separator = firstLine.includes(";") ? ";" : ",";

      const lines = text.split("\n").filter(l => l.trim());
      const headers = lines[0]
        .split(separator)
        .map(h => h.trim().replace(/"/g, ""));

      const products = lines
        .slice(1)
        .map(line => {
          // Parsear respetando comillas
          const values: string[] = [];
          let current = "";
          let inQuotes = false;

          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === separator && !inQuotes) {
              values.push(current.trim());
              current = "";
            } else {
              current += char;
            }
          }
          values.push(current.trim());

          return {
            handle: parseCSVValue(values[0] || ""),
            ref: parseCSVValue(values[1] || ""),
            name: parseCSVValue(values[2] || ""),
            category: parseCSVValue(values[3] || ""),
            cost: parseCSVValue(values[4] || "0"),
            price: parseCSVValue(values[5] || "0"),
            inStock: parseCSVValue(values[6] || "0"),
          };
        })
        .filter(p => p.name);

      await importMutation.mutateAsync({ products });
      toast.success(`${products.length} productos importados correctamente`);
      setCsvFile(null);
      refetch();
    } catch (error) {
      toast.error("Error al importar CSV");
      console.error(error);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      "Handle",
      "REF",
      "Nombre",
      "Categoría",
      "Coste",
      "Precio",
      "En inventario",
    ];
    const rows = sortedProducts.map(p => [
      p.handle || "",
      p.ref || "",
      p.name,
      p.category || "",
      p.cost,
      p.price,
      p.inStock,
    ]);

    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventario_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const openEdit = (product: any) => {
    setEditingProduct(product);
    setFormData({
      handle: product.handle || "",
      ref: product.ref || "",
      name: product.name,
      category: product.category || "",
      cost: product.cost,
      price: product.price,
      inStock: product.inStock,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Catálogo de Productos</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => syncLoyverseMutation.mutate()}
            disabled={syncLoyverseMutation.isPending}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${syncLoyverseMutation.isPending ? "animate-spin" : ""}`}
            />
            {syncLoyverseMutation.isPending
              ? "Actualizando stock…"
              : "Sincronizar stock Loyverse"}
          </Button>
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                Importar CSV
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Importar CSV</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  El CSV debe tener las columnas: Handle, REF, Nombre,
                  Categoría, Coste, Precio, En inventario
                </p>
                <p className="text-sm text-muted-foreground">
                  Soporta separadores: coma (,) o punto y coma (;)
                </p>
                <p className="text-sm text-muted-foreground">
                  Decimales: acepta punto (1.50) o coma (1,50)
                </p>
                <p className="text-sm font-semibold text-amber-600">
                  ⚠️ IMPORTANTE: Esta acción REEMPLAZARÁ todo el inventario
                  actual
                </p>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={e => setCsvFile(e.target.files?.[0] || null)}
                />
                <Button
                  onClick={handleCSVImport}
                  disabled={!csvFile}
                  className="w-full"
                >
                  Importar (Reemplazar todo)
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Producto
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Producto</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4">
                <div>
                  <Label>Nombre *</Label>
                  <Input
                    value={formData.name}
                    onChange={e =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Categoría</Label>
                  <Input
                    value={formData.category}
                    onChange={e =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label>Coste</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.cost}
                      onChange={e =>
                        setFormData({ ...formData, cost: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Precio</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={e =>
                        setFormData({ ...formData, price: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Stock</Label>
                    <Input
                      type="number"
                      step="0.001"
                      value={formData.inStock}
                      onChange={e =>
                        setFormData({ ...formData, inStock: e.target.value })
                      }
                    />
                  </div>
                </div>
                <Button onClick={handleCreate}>Crear</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3">Nombre</th>
              <th className="text-left p-3">Categoría</th>
              <th className="text-right p-3">Coste</th>
              <th className="text-right p-3">Precio</th>
              <th className="text-right p-3">Stock</th>
              <th className="text-center p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sortedProducts.map(product => (
              <tr key={product.id} className="border-t hover:bg-muted/50">
                <td className="p-3 font-medium">{product.name}</td>
                <td className="p-3 text-sm">{product.category}</td>
                <td className="p-3 text-right">
                  €{parseFloat(product.cost).toFixed(2)}
                </td>
                <td className="p-3 text-right">
                  €{parseFloat(product.price).toFixed(2)}
                </td>
                <td className="p-3 text-right">
                  {parseFloat(product.inStock).toFixed(3)}
                </td>
                <td className="p-3">
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEdit(product)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(product.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingProduct && (
        <Dialog
          open={!!editingProduct}
          onOpenChange={() => setEditingProduct(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Producto</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              <div>
                <Label>Nombre *</Label>
                <Input
                  value={formData.name}
                  onChange={e =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Categoría</Label>
                <Input
                  value={formData.category}
                  onChange={e =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label>Coste</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.cost}
                    onChange={e =>
                      setFormData({ ...formData, cost: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Precio</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={e =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Stock</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={formData.inStock}
                    onChange={e =>
                      setFormData({ ...formData, inStock: e.target.value })
                    }
                  />
                </div>
              </div>
              <Button onClick={handleUpdate}>Guardar Cambios</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

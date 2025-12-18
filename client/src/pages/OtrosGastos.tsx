import { useState } from "react";
import { trpc } from "../lib/trpc";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Edit, DollarSign } from "lucide-react";

const CATEGORIAS = [
  { value: "sueldos", label: "Sueldos" },
  { value: "seguridad_social", label: "Seguridad Social" },
  { value: "impuestos", label: "Impuestos" },
  { value: "seguros", label: "Seguros" },
  { value: "otros", label: "Otros" },
];

export default function OtrosGastos() {
  const [selectedBusiness, setSelectedBusiness] = useState<number>(1); // 1 = hostel
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Form state
  const [concepto, setConcepto] = useState("");
  const [categoria, setCategoria] = useState<string>("");
  const [categoriaOtros, setCategoriaOtros] = useState("");
  const [importe, setImporte] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [notas, setNotas] = useState("");

  const { data: gastos = [], refetch } = trpc.otrosGastos.list.useQuery({
    businessId: selectedBusiness,
  });

  const createMutation = trpc.otrosGastos.create.useMutation({
    onSuccess: () => {
      toast.success("Gasto registrado correctamente");
      refetch();
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Error al registrar gasto: ${error.message}`);
    },
  });

  const updateMutation = trpc.otrosGastos.update.useMutation({
    onSuccess: () => {
      toast.success("Gasto actualizado correctamente");
      refetch();
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Error al actualizar gasto: ${error.message}`);
    },
  });

  const deleteMutation = trpc.otrosGastos.delete.useMutation({
    onSuccess: () => {
      toast.success("Gasto eliminado correctamente");
      refetch();
    },
    onError: (error) => {
      toast.error(`Error al eliminar gasto: ${error.message}`);
    },
  });

  const resetForm = () => {
    setConcepto("");
    setCategoria("");
    setCategoriaOtros("");
    setImporte("");
    setFecha(new Date().toISOString().split("T")[0]);
    setNotas("");
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!concepto || !categoria || !importe || !fecha) {
      toast.error("Por favor completa todos los campos obligatorios");
      return;
    }

    if (categoria === "otros" && !categoriaOtros) {
      toast.error("Por favor especifica el tipo de gasto");
      return;
    }

    const data = {
      businessId: selectedBusiness,
      concepto,
      categoria: categoria as any,
      categoriaOtros: categoria === "otros" ? categoriaOtros : undefined,
      importe: parseFloat(importe),
      fecha,
      notas: notas || undefined,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (gasto: any) => {
    setEditingId(gasto.id);
    setConcepto(gasto.concepto);
    setCategoria(gasto.categoria);
    setCategoriaOtros(gasto.categoriaOtros || "");
    setImporte(gasto.importe.toString());
    setFecha(gasto.fecha);
    setNotas(gasto.notas || "");
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("¿Estás seguro de eliminar este gasto?")) {
      deleteMutation.mutate({ id });
    }
  };

  const totalGastos = gastos.reduce((sum, g) => sum + parseFloat(g.importe.toString()), 0);

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Otros Gastos</h1>
          <p className="text-muted-foreground">Gestiona gastos sin factura (sueldos, impuestos, seguros, etc.)</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Gasto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Gasto" : "Registrar Nuevo Gasto"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="concepto">Concepto *</Label>
                  <Input
                    id="concepto"
                    value={concepto}
                    onChange={(e) => setConcepto(e.target.value)}
                    placeholder="Ej: Nómina enero 2025"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="categoria">Categoría *</Label>
                  <Select value={categoria} onValueChange={setCategoria}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {categoria === "otros" && (
                <div className="space-y-2">
                  <Label htmlFor="categoriaOtros">Especificar tipo de gasto *</Label>
                  <Input
                    id="categoriaOtros"
                    value={categoriaOtros}
                    onChange={(e) => setCategoriaOtros(e.target.value)}
                    placeholder="Ej: Mantenimiento, Publicidad, etc."
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="importe">Importe (€) *</Label>
                  <Input
                    id="importe"
                    type="number"
                    step="0.01"
                    value={importe}
                    onChange={(e) => setImporte(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fecha">Fecha *</Label>
                  <Input
                    id="fecha"
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notas">Notas</Label>
                <Textarea
                  id="notas"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Información adicional..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingId ? "Actualizar" : "Registrar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Total Gastos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-red-600">€{totalGastos.toFixed(2)}</p>
          <p className="text-sm text-muted-foreground mt-1">{gastos.length} gastos registrados</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Gastos</CardTitle>
        </CardHeader>
        <CardContent>
          {gastos.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No hay gastos registrados. Haz clic en "Nuevo Gasto" para comenzar.
            </p>
          ) : (
            <div className="space-y-3">
              {gastos.map((gasto) => (
                <div
                  key={gasto.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">{gasto.concepto}</h3>
                      <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                        {CATEGORIAS.find((c) => c.value === gasto.categoria)?.label}
                        {gasto.categoria === "otros" && gasto.categoriaOtros && ` - ${gasto.categoriaOtros}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span>{new Date(gasto.fecha).toLocaleDateString("es-ES")}</span>
                      {gasto.notas && <span className="text-xs">• {gasto.notas}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-xl font-bold text-red-600">€{parseFloat(gasto.importe.toString()).toFixed(2)}</p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(gasto)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(gasto.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

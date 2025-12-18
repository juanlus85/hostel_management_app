import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Edit, DollarSign } from "lucide-react";

export default function OtrosGastos() {

  const utils = trpc.useUtils();

  // Business selection
  const { data: businesses } = trpc.businesses.list.useQuery();
  const [currentBusinessId, setCurrentBusinessId] = useState<number | null>(null);

  // Form state
  const [concepto, setConcepto] = useState("");
  const [categoria, setCategoria] = useState<"sueldos" | "seguridad_social" | "impuestos" | "seguros" | "otros">("sueldos");
  const [categoriaOtros, setCategoriaOtros] = useState("");
  const [importe, setImporte] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [notas, setNotas] = useState("");

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);

  // Set default business
  useEffect(() => {
    if (businesses && businesses.length > 0 && !currentBusinessId) {
      setCurrentBusinessId(businesses[0].id);
    }
  }, [businesses, currentBusinessId]);

  // Queries
  const { data: gastos, isLoading } = trpc.otrosGastos.list.useQuery(
    { businessId: currentBusinessId! },
    { enabled: !!currentBusinessId }
  );

  // Mutations
  const createMutation = trpc.otrosGastos.create.useMutation({
    onSuccess: () => {
      toast.success("Gasto creado correctamente");
      utils.otrosGastos.list.invalidate();
      utils.dashboard.stats.invalidate();
      resetForm();
    },
    onError: (error) => {
      toast.error("Error al crear gasto: " + error.message);
    },
  });

  const updateMutation = trpc.otrosGastos.update.useMutation({
    onSuccess: () => {
      toast.success("Gasto actualizado correctamente");
      utils.otrosGastos.list.invalidate();
      utils.dashboard.stats.invalidate();
      resetForm();
    },
    onError: (error) => {
      toast.error("Error al actualizar gasto: " + error.message);
    },
  });

  const deleteMutation = trpc.otrosGastos.delete.useMutation({
    onSuccess: () => {
      toast.success("Gasto eliminado correctamente");
      utils.otrosGastos.list.invalidate();
      utils.dashboard.stats.invalidate();
    },
    onError: (error) => {
      toast.error("Error al eliminar gasto: " + error.message);
    },
  });

  const resetForm = () => {
    setConcepto("");
    setCategoria("sueldos");
    setCategoriaOtros("");
    setImporte("");
    setFecha(new Date().toISOString().split('T')[0]);
    setNotas("");
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusinessId) {
      toast.error("Selecciona un negocio");
      return;
    }
    if (!concepto || !importe || !fecha) {
      toast.error("Completa todos los campos obligatorios");
      return;
    }

    const data = {
      businessId: currentBusinessId,
      concepto,
      categoria,
      categoriaOtros: categoria === "otros" ? categoriaOtros : undefined,
      importe,
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
    setImporte(gasto.importe);
    setFecha(gasto.fecha);
    setNotas(gasto.notas || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (id: number) => {
    if (confirm("¿Estás seguro de que quieres eliminar este gasto?")) {
      deleteMutation.mutate({ id });
    }
  };

  const getCategoriaLabel = (cat: string, catOtros?: string) => {
    const labels: Record<string, string> = {
      sueldos: "Sueldos",
      seguridad_social: "Seguridad Social",
      impuestos: "Impuestos",
      seguros: "Seguros",
      otros: catOtros || "Otros",
    };
    return labels[cat] || cat;
  };

  if (!businesses || businesses.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Otros Gastos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">No hay negocios configurados. Contacta al administrador.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Otros Gastos</h1>
          <p className="text-muted-foreground">Gestiona gastos no facturados (sueldos, seguros, impuestos, etc.)</p>
        </div>
        <Select value={currentBusinessId?.toString()} onValueChange={(v) => setCurrentBusinessId(parseInt(v))}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Seleccionar negocio" />
          </SelectTrigger>
          <SelectContent>
            {businesses.map((b) => (
              <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {editingId ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            {editingId ? "Editar Gasto" : "Registrar Nuevo Gasto"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="concepto">Concepto *</Label>
                <Input
                  id="concepto"
                  value={concepto}
                  onChange={(e) => setConcepto(e.target.value)}
                  placeholder="Ej: Nómina diciembre, Seguro responsabilidad civil..."
                  required
                />
              </div>
              <div>
                <Label htmlFor="categoria">Categoría *</Label>
                <Select value={categoria} onValueChange={(v: any) => setCategoria(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sueldos">Sueldos</SelectItem>
                    <SelectItem value="seguridad_social">Seguridad Social</SelectItem>
                    <SelectItem value="impuestos">Impuestos</SelectItem>
                    <SelectItem value="seguros">Seguros</SelectItem>
                    <SelectItem value="otros">Otros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {categoria === "otros" && (
              <div>
                <Label htmlFor="categoriaOtros">Especificar categoría</Label>
                <Input
                  id="categoriaOtros"
                  value={categoriaOtros}
                  onChange={(e) => setCategoriaOtros(e.target.value)}
                  placeholder="Ej: Mantenimiento, Suministros..."
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="importe">Importe (€) *</Label>
                <Input
                  id="importe"
                  type="number"
                  step="0.01"
                  value={importe}
                  onChange={(e) => setImporte(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <Label htmlFor="fecha">Fecha *</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notas">Notas</Label>
              <Textarea
                id="notas"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Información adicional..."
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingId ? "Actualizar Gasto" : "Registrar Gasto"}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Gastos Registrados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !gastos || gastos.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No hay gastos registrados</p>
          ) : (
            <div className="space-y-2">
              {gastos.map((gasto) => (
                <div key={gasto.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{gasto.concepto}</h3>
                      <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">
                        {getCategoriaLabel(gasto.categoria, gasto.categoriaOtros || undefined)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(gasto.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                    {gasto.notas && <p className="text-sm text-muted-foreground italic">{gasto.notas}</p>}
                  </div>
                  <div className="flex items-center gap-4 mt-2 md:mt-0">
                    <span className="text-xl font-bold text-destructive">-€{parseFloat(gasto.importe).toFixed(2)}</span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(gasto)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(gasto.id)} disabled={deleteMutation.isPending}>
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

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useBusinessContext } from "@/components/DashboardLayout";
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

  // Business selection from global context
  const { selectedBusiness } = useBusinessContext();
  const { data: businesses } = trpc.businesses.list.useQuery();
  const [currentBusinessId, setCurrentBusinessId] = useState<number | null>(null);

  // Form state
  const [formBusinessId, setFormBusinessId] = useState<number | null>(null);
  const [type, setType] = useState<"gasto" | "ingreso">("gasto");
  const [concepto, setConcepto] = useState("");
  const [categoria, setCategoria] = useState<"sueldos" | "seguridad_social" | "impuestos" | "seguros" | "otros">("sueldos");
  const [categoriaOtros, setCategoriaOtros] = useState("");
  const [importe, setImporte] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cuenta_bancaria" | "tarjeta" | "ana" | "juanlu" | "caja_hostel" | "caja_tienda" | "caja_fuerte" | "caja_fuerte_cambio" | "otros" | "">("cuenta_bancaria");
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [notas, setNotas] = useState("");

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);

  // Get businesses
  const hostelBusiness = businesses?.find(b => b.name.includes("Hostel"));
  const tiendaBusiness = businesses?.find(b => b.name.includes("Tienda"));

  // Set currentBusinessId based on selectedBusiness
  useEffect(() => {
    if (!businesses) return;
    if (selectedBusiness === "hostel") {
      setCurrentBusinessId(hostelBusiness?.id || null);
    } else if (selectedBusiness === "tienda") {
      setCurrentBusinessId(tiendaBusiness?.id || null);
    } else {
      // Para "all", usar hostel por defecto para crear nuevos gastos
      setCurrentBusinessId(hostelBusiness?.id || null);
    }
  }, [selectedBusiness, businesses, hostelBusiness, tiendaBusiness]);

  // Queries - obtener datos según selección global
  
  const { data: gastosHostel } = trpc.otrosGastos.list.useQuery(
    { businessId: hostelBusiness?.id! },
    { enabled: !!hostelBusiness && (selectedBusiness === "hostel" || selectedBusiness === "all") }
  );
  
  const { data: gastosTienda } = trpc.otrosGastos.list.useQuery(
    { businessId: tiendaBusiness?.id! },
    { enabled: !!tiendaBusiness && (selectedBusiness === "tienda" || selectedBusiness === "all") }
  );
  
  // Combinar datos según selección
  const gastos = selectedBusiness === "all" 
    ? [...(gastosHostel || []), ...(gastosTienda || [])].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    : selectedBusiness === "hostel" 
    ? gastosHostel || []
    : gastosTienda || [];
  
  const isLoading = !businesses;

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
    setType("gasto");
    setConcepto("");
    setCategoria("sueldos");
    setCategoriaOtros("");
    setImporte("");
    setPaymentMethod("cuenta_bancaria");
    setFecha(new Date().toISOString().split('T')[0]);
    setNotas("");
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Si estamos en modo "Ambos", usar el negocio seleccionado en el formulario
    const businessIdToUse = selectedBusiness === "all" ? formBusinessId : currentBusinessId;
    
    if (!businessIdToUse) {
      toast.error(selectedBusiness === "all" 
        ? "Selecciona para qué negocio es este gasto/ingreso" 
        : "Selecciona un negocio");
      return;
    }
    if (!concepto || !importe || !fecha) {
      toast.error("Completa todos los campos obligatorios");
      return;
    }

    const data = {
      businessId: businessIdToUse,
      type,
      concepto,
      categoria,
      categoriaOtros: categoria === "otros" ? categoriaOtros : undefined,
      importe,
      paymentMethod: paymentMethod || undefined,
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
    setType(gasto.type || "gasto");
    setConcepto(gasto.concepto);
    setCategoria(gasto.categoria);
    setCategoriaOtros(gasto.categoriaOtros || "");
    setImporte(gasto.importe);
    setPaymentMethod(gasto.paymentMethod || "cuenta_bancaria");
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

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cuenta_bancaria: "Cuenta Bancaria",
      tarjeta: "Tarjeta",
      ana: "Ana",
      juanlu: "Juanlu",
      caja_hostel: "Caja Hostel",
      caja_tienda: "Caja Tienda",
      caja_fuerte: "Caja Fuerte",
      caja_fuerte_cambio: "Caja Fuerte Cambio",
      otros: "Otros",
    };
    return labels[method] || method;
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
      <div>
        <h1 className="text-3xl font-bold">Otros Gastos/Ingresos</h1>
        <p className="text-muted-foreground">Gestiona gastos e ingresos no facturados (sueldos, seguros, impuestos, etc.)</p>
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
                  Selecciona para qué negocio es este gasto/ingreso. No se puede crear para ambos a la vez.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Tipo *</Label>
                <Select value={type} onValueChange={(v: any) => setType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gasto">Gasto</SelectItem>
                    <SelectItem value="ingreso">Ingreso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                <Label htmlFor="paymentMethod">Método de Pago</Label>
                <Select value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
                  <SelectTrigger id="paymentMethod">
                    <SelectValue placeholder="Selecciona método" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cuenta_bancaria">Cuenta Bancaria</SelectItem>
                    <SelectItem value="tarjeta">Tarjeta</SelectItem>
                    <SelectItem value="ana">Ana</SelectItem>
                    <SelectItem value="juanlu">Juanlu</SelectItem>
                    <SelectItem value="caja_hostel">Caja Hostel</SelectItem>
                    <SelectItem value="caja_tienda">Caja Tienda</SelectItem>
                    <SelectItem value="caja_fuerte">Caja Fuerte</SelectItem>
                    <SelectItem value="caja_fuerte_cambio">Caja Fuerte Cambio</SelectItem>
                    <SelectItem value="otros">Otros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                      <span className={`text-xs px-2 py-1 rounded ${gasto.type === 'ingreso' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {gasto.type === 'ingreso' ? 'Ingreso' : 'Gasto'}
                      </span>
                      <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">
                        {getCategoriaLabel(gasto.categoria, gasto.categoriaOtros || undefined)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(gasto.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                      {gasto.paymentMethod && (
                        <span className="ml-2 text-xs px-2 py-0.5 bg-secondary/50 rounded">
                          {getPaymentMethodLabel(gasto.paymentMethod)}
                        </span>
                      )}
                    </p>
                    {gasto.notas && <p className="text-sm text-muted-foreground italic">{gasto.notas}</p>}
                  </div>
                  <div className="flex items-center gap-4 mt-2 md:mt-0">
                    <span className={`text-xl font-bold ${gasto.type === 'ingreso' ? 'text-green-600' : 'text-destructive'}`}>
                      {gasto.type === 'ingreso' ? '+' : '-'}€{parseFloat(gasto.importe).toFixed(2)}
                    </span>
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

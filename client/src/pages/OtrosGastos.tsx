import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useBusinessContext } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Edit, DollarSign, Calendar } from "lucide-react";

// Helper para formatear fecha como YYYY-MM-DD sin conversión de timezone
function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function OtrosGastos() {

  const utils = trpc.useUtils();

  // Business selection from global context
  const { selectedBusiness } = useBusinessContext();
  
  // Filtro de fecha
  const currentDate = new Date();
  const [filterType, setFilterType] = useState<string>("last30"); // "last30" | "last3months" | "all" | "by_month"
  const [selectedMonth, setSelectedMonth] = useState<string>("0"); // 0-11
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear().toString());
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

  // Get available years dynamically from database
  const { data: availableYears } = trpc.utils.getAvailableYears.useQuery();
  const yearOptions = availableYears || [currentDate.getFullYear()];
  
  // Get businesses
  const hostelBusiness = businesses?.find(b => b.name.includes("Hostel"));
  const tiendaBusiness = businesses?.find(b => b.name.includes("Tienda"));
  
  // Calcular rango de fechas según filtro
  const dateRange = useMemo(() => {
    if (filterType === "last30") {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);
      return {
        startDate: formatDateLocal(start),
        endDate: formatDateLocal(end)
      };
    } else if (filterType === "last3months") {
      const end = new Date();
      const start = new Date();
      start.setMonth(start.getMonth() - 3);
      return {
        startDate: formatDateLocal(start),
        endDate: formatDateLocal(end)
      };
    } else if (filterType === "all") {
      return { startDate: undefined, endDate: undefined };
    } else if (filterType === "by_month") {
      const year = parseInt(selectedYear);
      const month = parseInt(selectedMonth);
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0);
      return {
        startDate: formatDateLocal(start),
        endDate: formatDateLocal(end)
      };
    }
    return { startDate: undefined, endDate: undefined };
  }, [filterType, selectedMonth, selectedYear]);

  // Set currentBusinessId based on selectedBusiness
  useEffect(() => {
    if (!businesses) return;
    if (selectedBusiness === "hostel") {
      setCurrentBusinessId(hostelBusiness?.id || null);
      if (!editingId) setFormBusinessId(hostelBusiness?.id || null);
    } else if (selectedBusiness === "tienda") {
      setCurrentBusinessId(tiendaBusiness?.id || null);
      if (!editingId) setFormBusinessId(tiendaBusiness?.id || null);
    } else {
      // Para "all", usar hostel por defecto para crear nuevos gastos
      setCurrentBusinessId(hostelBusiness?.id || null);
      if (!editingId) setFormBusinessId(hostelBusiness?.id || null);
    }
  }, [selectedBusiness, businesses, hostelBusiness, tiendaBusiness, editingId]);

  // Queries - obtener datos según selección global
  
  const { data: gastosHostel } = trpc.otrosGastos.list.useQuery(
    { businessId: hostelBusiness?.id!, startDate: dateRange.startDate, endDate: dateRange.endDate },
    { enabled: !!hostelBusiness && (selectedBusiness === "hostel" || selectedBusiness === "all") }
  );
  
  const { data: gastosTienda } = trpc.otrosGastos.list.useQuery(
    { businessId: tiendaBusiness?.id!, startDate: dateRange.startDate, endDate: dateRange.endDate },
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
    setFormBusinessId(currentBusinessId);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const businessIdToUse = formBusinessId || currentBusinessId;
    
    if (!businessIdToUse) {
      toast.error("Selecciona para qué negocio es este gasto o ingreso");
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
    setFormBusinessId(gasto.businessId);
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

  const getBusinessLabel = (businessId: number) => {
    if (businessId === hostelBusiness?.id) return "Hostel";
    if (businessId === tiendaBusiness?.id) return "Tienda";
    return "Sin negocio";
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
            <div className="p-4 border-2 border-primary/30 rounded-lg bg-primary/5">
              <Label className="text-base font-semibold">Asignar a negocio *</Label>
              <Select 
                value={formBusinessId?.toString() || ""} 
                onValueChange={(v) => setFormBusinessId(parseInt(v))}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Selecciona el negocio" />
                </SelectTrigger>
                <SelectContent>
                  {hostelBusiness && <SelectItem value={hostelBusiness.id.toString()}>Hostel</SelectItem>}
                  {tiendaBusiness && <SelectItem value={tiendaBusiness.id.toString()}>Tienda</SelectItem>}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">
                Cada gasto o ingreso se registra en un único negocio. Puedes cambiarlo también al editar.
              </p>
            </div>

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

      {/* Filtros de fecha */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <Label>Mostrar</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last30">Últimos 30 días</SelectItem>
                    <SelectItem value="last3months">Últimos 3 meses</SelectItem>
                    <SelectItem value="all">Mostrar todos</SelectItem>
                  <SelectItem value="by_month">Por mes específico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {filterType === "by_month" && (
              <>
                <div className="flex-1">
                  <Label>Año</Label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map(year => (
                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label>Mes</Label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Enero</SelectItem>
                      <SelectItem value="1">Febrero</SelectItem>
                      <SelectItem value="2">Marzo</SelectItem>
                      <SelectItem value="3">Abril</SelectItem>
                      <SelectItem value="4">Mayo</SelectItem>
                      <SelectItem value="5">Junio</SelectItem>
                      <SelectItem value="6">Julio</SelectItem>
                      <SelectItem value="7">Agosto</SelectItem>
                      <SelectItem value="8">Septiembre</SelectItem>
                      <SelectItem value="9">Octubre</SelectItem>
                      <SelectItem value="10">Noviembre</SelectItem>
                      <SelectItem value="11">Diciembre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
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
                      <span className="text-xs px-2 py-1 bg-secondary text-secondary-foreground rounded">
                        {getBusinessLabel(gasto.businessId)}
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

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check, X, Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const TYPE_LABELS: Record<string, string> = {
  entrada_efectivo_caja: "Entrada Efectivo desde Caja",
  salida_efectivo_cambio: "Salida Efectivo (Cambio)",
  entrada_salida_bbva: "Entrada / Salida BBVA",
  descuadres: "Descuadres",
  sueldos: "Sueldos",
  pago_proveedor: "Pago Proveedor",
  ajuste: "Ajuste",
  caja_semana: "Caja Semana",
  es_efectivo_cf_hostel: "E/S Efectivo (C.F. Hostel)",
  es_efectivo_cf_tienda: "E/S Efectivo (C.F. Tienda)",
};

export default function CajasF() {
  const [activeTab, setActiveTab] = useState<"hostel" | "tienda">("hostel");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    type: "" as any,
    concept: "",
    amount: "",
  });

  const businessId = activeTab === "hostel" ? 1 : 2;

  const { data: movements, refetch } = trpc.safeBoxes.list.useQuery({
    businessId,
    limit: 30,
  });

  const createMutation = trpc.safeBoxes.create.useMutation({
    onSuccess: () => {
      toast.success("Movimiento agregado correctamente");
      refetch();
      setShowForm(false);
      setFormData({
        date: new Date().toISOString().split("T")[0],
        type: "" as any,
        concept: "",
        amount: "",
      });
    },
    onError: (error) => {
      toast.error("Error al agregar movimiento: " + error.message);
    },
  });

  const updateCheckStatusMutation = trpc.safeBoxes.updateCheckStatus.useMutation({
    onSuccess: () => {
      toast.success("Estado de verificación actualizado");
      refetch();
    },
    onError: (error) => {
      toast.error("Error al actualizar estado: " + error.message);
    },
  });

  const deleteMutation = trpc.safeBoxes.delete.useMutation({
    onSuccess: () => {
      toast.success("Movimiento eliminado correctamente");
      refetch();
    },
    onError: (error) => {
      toast.error("Error al eliminar movimiento: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.type || !formData.amount) {
      toast.error("Por favor completa todos los campos obligatorios");
      return;
    }
    createMutation.mutate({
      businessId,
      ...formData,
    });
  };

  const handleCheckStatusClick = (id: number, currentStatus: string) => {
    let newStatus: "unchecked" | "correct" | "incorrect";
    if (currentStatus === "unchecked") {
      newStatus = "correct";
    } else if (currentStatus === "correct") {
      newStatus = "incorrect";
    } else {
      newStatus = "unchecked";
    }
    updateCheckStatusMutation.mutate({ id, checkStatus: newStatus });
  };

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Cajas Fuertes</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancelar" : "Agregar Movimiento"}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="hostel">C.F. Hostel</TabsTrigger>
          <TabsTrigger value="tienda">C.F. Tienda (Cambio)</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {showForm && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Nuevo Movimiento</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="date">Fecha</Label>
                      <Input
                        id="date"
                        type="date"
                        value={formData.date}
                        onChange={(e) =>
                          setFormData({ ...formData, date: e.target.value })
                        }
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="type">Tipología *</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value) =>
                          setFormData({ ...formData, type: value as any })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona tipología" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(TYPE_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="concept">Concepto</Label>
                      <Input
                        id="concept"
                        value={formData.concept}
                        onChange={(e) =>
                          setFormData({ ...formData, concept: e.target.value })
                        }
                        placeholder="Descripción del movimiento"
                      />
                    </div>

                    <div>
                      <Label htmlFor="amount">Cantidad (€) *</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        value={formData.amount}
                        onChange={(e) =>
                          setFormData({ ...formData, amount: e.target.value })
                        }
                        placeholder="Positivo o negativo"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowForm(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending ? "Guardando..." : "Guardar"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>
                Últimos 30 Movimientos - {activeTab === "hostel" ? "Hostel" : "Tienda (Cambio)"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipología</TableHead>
                      <TableHead>Concepto</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">Total Acumula</TableHead>
                      <TableHead className="text-center">Chequeo</TableHead>
                      <TableHead className="text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements && movements.length > 0 ? (
                      movements.map((movement: any) => {
                        const amount = parseFloat(movement.amount);
                        const isPositive = amount >= 0;
                        return (
                          <TableRow key={movement.id}>
                            <TableCell>{movement.date}</TableCell>
                            <TableCell className="text-sm">
                              {TYPE_LABELS[movement.type] || movement.type}
                            </TableCell>
                            <TableCell>{movement.concept || "-"}</TableCell>
                            <TableCell
                              className={`text-right font-medium ${
                                isPositive ? "text-green-600" : "text-red-600"
                              }`}
                            >
                              {isPositive ? "+" : ""}€{Math.abs(amount).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-bold">
                              €{parseFloat(movement.accumulated).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleCheckStatusClick(movement.id, movement.checkStatus)
                                }
                              >
                                {movement.checkStatus === "correct" && (
                                  <Check className="h-5 w-5 text-green-600" />
                                )}
                                {movement.checkStatus === "incorrect" && (
                                  <X className="h-5 w-5 text-red-600" />
                                )}
                                {movement.checkStatus === "unchecked" && (
                                  <Minus className="h-5 w-5 text-gray-400" />
                                )}
                              </Button>
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (
                                    confirm(
                                      "¿Estás seguro de eliminar este movimiento? Esto recalculará todos los acumulados."
                                    )
                                  ) {
                                    deleteMutation.mutate({ id: movement.id });
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          No hay movimientos registrados
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

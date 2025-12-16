import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useBusinessContext } from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { 
  Banknote, Coins, CreditCard, Calculator, Plus, Minus, 
  Download, Save, Lock, History, ChevronLeft, ChevronRight,
  Trash2, FileText, Building2, Store
} from "lucide-react";

interface CashMovement {
  id: number;
  cashClosingId: number;
  type: "in" | "out";
  description: string;
  amount: string;
}

export default function Caja() {
  const { user } = useAuth();
  const { selectedBusiness } = useBusinessContext();
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    if (now.getHours() < 6) {
      now.setDate(now.getDate() - 1);
    }
    return now.toISOString().split("T")[0];
  });
  const [showMovementDialog, setShowMovementDialog] = useState(false);
  const [movementType, setMovementType] = useState<"in" | "out">("out");
  const [movementDescription, setMovementDescription] = useState("");
  const [movementAmount, setMovementAmount] = useState("");
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);

  // Form state for cash counting
  const [coins010, setCoins010] = useState(0);
  const [coins020, setCoins020] = useState(0);
  const [coins050, setCoins050] = useState(0);
  const [coins100, setCoins100] = useState(0);
  const [coins200, setCoins200] = useState(0);
  const [bills5, setBills5] = useState(0);
  const [bills10, setBills10] = useState(0);
  const [bills20, setBills20] = useState(0);
  const [bills50, setBills50] = useState(0);
  const [totalCards, setTotalCards] = useState("");
  const [zReading, setZReading] = useState("");
  const [prepaidBooking, setPrepaidBooking] = useState("");
  const [withdrawnCash, setWithdrawnCash] = useState("");
  const [withdrawnCards, setWithdrawnCards] = useState("");
  const [changeForNextDay, setChangeForNextDay] = useState("");
  const [notes, setNotes] = useState("");

  const utils = trpc.useUtils();
  const { data: businesses } = trpc.businesses.list.useQuery();
  
  const currentBusinessId = useMemo(() => {
    if (selectedBusiness === "all") return businesses?.[0]?.id;
    return businesses?.find(b => b.code === selectedBusiness)?.id;
  }, [businesses, selectedBusiness]);

  const { data: cashClosing, refetch: refetchClosing } = trpc.cashClosings.getByDate.useQuery(
    { businessId: currentBusinessId || 1, date: currentDate },
    { enabled: !!currentBusinessId }
  );

  const { data: movements, refetch: refetchMovements } = trpc.cashMovements.list.useQuery(
    { cashClosingId: cashClosing?.id || 0 },
    { enabled: !!cashClosing?.id }
  );

  const { data: history } = trpc.cashClosings.list.useQuery(
    { businessId: currentBusinessId || 1 },
    { enabled: !!currentBusinessId }
  );

  const getOrCreateClosing = trpc.cashClosings.getOrCreate.useMutation({
    onSuccess: () => refetchClosing(),
  });

  const updateClosing = trpc.cashClosings.update.useMutation({
    onSuccess: () => {
      refetchClosing();
      toast.success("Caja guardada");
    },
  });

  const closeClosing = trpc.cashClosings.close.useMutation({
    onSuccess: () => {
      refetchClosing();
      toast.success("Caja cerrada correctamente");
    },
  });

  const reopenClosing = trpc.cashClosings.reopen.useMutation({
    onSuccess: () => {
      refetchClosing();
      toast.success("Caja reabierta");
    },
  });

  const createMovement = trpc.cashMovements.create.useMutation({
    onSuccess: () => {
      refetchMovements();
      setShowMovementDialog(false);
      setMovementDescription("");
      setMovementAmount("");
      toast.success("Movimiento registrado");
    },
  });

  const deleteMovement = trpc.cashMovements.delete.useMutation({
    onSuccess: () => {
      refetchMovements();
      toast.success("Movimiento eliminado");
    },
  });

  // Initialize closing when date changes
  useEffect(() => {
    if (currentBusinessId && currentDate) {
      getOrCreateClosing.mutate({ businessId: currentBusinessId, date: currentDate });
    }
  }, [currentBusinessId, currentDate]);

  // Load data from closing
  useEffect(() => {
    if (cashClosing) {
      setCoins010(cashClosing.coins010 || 0);
      setCoins020(cashClosing.coins020 || 0);
      setCoins050(cashClosing.coins050 || 0);
      setCoins100(cashClosing.coins100 || 0);
      setCoins200(cashClosing.coins200 || 0);
      setBills5(cashClosing.bills5 || 0);
      setBills10(cashClosing.bills10 || 0);
      setBills20(cashClosing.bills20 || 0);
      setBills50(cashClosing.bills50 || 0);
      setTotalCards(cashClosing.totalCards || "");
      setZReading(cashClosing.zReading || "");
      setPrepaidBooking(cashClosing.prepaidBooking || "");
      setWithdrawnCash(cashClosing.withdrawnCash || "");
      setWithdrawnCards(cashClosing.withdrawnCards || "");
      // Solo cargar changeForNextDay si ya tiene valor guardado, sino se calcula automáticamente
      setChangeForNextDay(cashClosing.changeForNextDay || "");
      setNotes(cashClosing.notes || "");
    }
  }, [cashClosing]);

  // Calculate totals
  const totalCashCalc = useMemo(() => {
    return (
      coins010 * 0.1 +
      coins020 * 0.2 +
      coins050 * 0.5 +
      coins100 * 1 +
      coins200 * 2 +
      bills5 * 5 +
      bills10 * 10 +
      bills20 * 20 +
      bills50 * 50
    );
  }, [coins010, coins020, coins050, coins100, coins200, bills5, bills10, bills20, bills50]);

  const movementsTotal = useMemo(() => {
    if (!movements) return 0;
    return movements.reduce((sum: number, m: CashMovement) => {
      const amount = parseFloat(m.amount) || 0;
      return sum + (m.type === "in" ? amount : -amount);
    }, 0);
  }, [movements]);

  const previousChange = parseFloat(cashClosing?.previousChange || "0");
  const cardsTotal = parseFloat(totalCards) || 0;
  const zTotal = parseFloat(zReading) || 0;
  const prepaidTotal = parseFloat(prepaidBooking) || 0;
  const withdrawnCashTotal = parseFloat(withdrawnCash) || 0;
  const withdrawnCardsTotal = parseFloat(withdrawnCards) || 0;
  // Si changeForNextDay está vacío o es "0.00", usar totalCashCalc
  const changeNext = (changeForNextDay !== "" && changeForNextDay !== "0.00" && parseFloat(changeForNextDay) !== 0) 
    ? parseFloat(changeForNextDay) 
    : totalCashCalc;

  // Expected = Z + Cambio anterior + Movimientos - Prepago - Retirado
  const expectedTotal = zTotal + previousChange + movementsTotal - prepaidTotal - withdrawnCashTotal - withdrawnCardsTotal;
  // Actual = Total efectivo + Tarjetas
  const actualTotal = totalCashCalc + cardsTotal;
  // Difference
  const difference = actualTotal - expectedTotal;

  const handleSave = () => {
    if (!cashClosing?.id) return;
    updateClosing.mutate({
      id: cashClosing.id,
      coins010, coins020, coins050, coins100, coins200,
      bills5, bills10, bills20, bills50,
      totalCash: totalCashCalc.toFixed(2),
      totalCards: cardsTotal.toFixed(2),
      zReading: zTotal.toFixed(2),
      prepaidBooking: prepaidTotal.toFixed(2),
      withdrawnCash: withdrawnCashTotal.toFixed(2),
      withdrawnCards: withdrawnCardsTotal.toFixed(2),
      expectedTotal: expectedTotal.toFixed(2),
      actualTotal: actualTotal.toFixed(2),
      difference: difference.toFixed(2),
      changeForNextDay: changeNext.toFixed(2),
      notes,
    });
  };

  const handleClose = () => {
    if (!cashClosing?.id) return;
    // Usar changeNext que ya tiene la lógica correcta (totalCashCalc si no se ha modificado)
    updateClosing.mutate({
      id: cashClosing.id,
      coins010, coins020, coins050, coins100, coins200,
      bills5, bills10, bills20, bills50,
      totalCash: totalCashCalc.toFixed(2),
      totalCards: cardsTotal.toFixed(2),
      zReading: zTotal.toFixed(2),
      prepaidBooking: prepaidTotal.toFixed(2),
      withdrawnCash: withdrawnCashTotal.toFixed(2),
      withdrawnCards: withdrawnCardsTotal.toFixed(2),
      expectedTotal: expectedTotal.toFixed(2),
      actualTotal: actualTotal.toFixed(2),
      difference: difference.toFixed(2),
      changeForNextDay: changeNext.toFixed(2),
      notes,
    });
    closeClosing.mutate({ id: cashClosing.id });
  };

  const handleReopen = () => {
    if (!cashClosing?.id) return;
    reopenClosing.mutate({ id: cashClosing.id });
  };

  const handleAddMovement = () => {
    if (!cashClosing?.id || !movementDescription.trim() || !movementAmount) {
      toast.error("Completa todos los campos");
      return;
    }
    createMovement.mutate({
      cashClosingId: cashClosing.id,
      type: movementType,
      description: movementDescription,
      amount: movementAmount,
    });
  };

  const navigateDate = (days: number) => {
    const date = new Date(currentDate);
    date.setDate(date.getDate() + days);
    setCurrentDate(date.toISOString().split("T")[0]);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  };

  const isClosed = cashClosing?.status === "closed";
  const businessLabel = selectedBusiness === "hostel" ? "Hostel" : selectedBusiness === "tienda" ? "Tienda" : "Ambos";
  const BusinessIcon = selectedBusiness === "hostel" ? Building2 : Store;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Banknote className="h-6 w-6 text-primary" />
            Caja - {businessLabel}
          </h1>
          <p className="text-muted-foreground capitalize">{formatDate(currentDate)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateDate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Input
            type="date"
            value={currentDate}
            onChange={(e) => setCurrentDate(e.target.value)}
            className="w-40"
          />
          <Button variant="outline" size="icon" onClick={() => navigateDate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon">
                <History className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Histórico de Cierres</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                {history?.map((h: any) => (
                  <div
                    key={h.id}
                    className="flex justify-between items-center p-3 border rounded-lg cursor-pointer hover:bg-muted"
                    onClick={() => {
                      setCurrentDate(h.date);
                      setShowHistoryDialog(false);
                    }}
                  >
                    <div>
                      <p className="font-medium">{formatDate(h.date)}</p>
                      <p className="text-sm text-muted-foreground">
                        Efectivo: €{h.totalCash} | Tarjetas: €{h.totalCards}
                      </p>
                    </div>
                    <Badge variant={h.status === "closed" ? "default" : "secondary"}>
                      {h.status === "closed" ? "Cerrada" : "Borrador"}
                    </Badge>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isClosed && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-2">
          <Lock className="h-5 w-5 text-yellow-600" />
          <span className="text-yellow-800">Esta caja está cerrada. Los datos son de solo lectura.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Cash Counting */}
        <div className="lg:col-span-2 space-y-6">
          {/* Coins & Bills */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5" />
                Desglose de Caja
              </CardTitle>
              <CardDescription>Introduce la cantidad de cada denominación</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {/* Coins */}
                <div className="space-y-2">
                  <Label className="text-xs">0.10€</Label>
                  <Input
                    type="number"
                    min="0"
                    value={coins010}
                    onChange={(e) => setCoins010(parseInt(e.target.value) || 0)}
                    disabled={isClosed}
                    className="text-center"
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    €{(coins010 * 0.1).toFixed(2)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">0.20€</Label>
                  <Input
                    type="number"
                    min="0"
                    value={coins020}
                    onChange={(e) => setCoins020(parseInt(e.target.value) || 0)}
                    disabled={isClosed}
                    className="text-center"
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    €{(coins020 * 0.2).toFixed(2)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">0.50€</Label>
                  <Input
                    type="number"
                    min="0"
                    value={coins050}
                    onChange={(e) => setCoins050(parseInt(e.target.value) || 0)}
                    disabled={isClosed}
                    className="text-center"
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    €{(coins050 * 0.5).toFixed(2)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">1€</Label>
                  <Input
                    type="number"
                    min="0"
                    value={coins100}
                    onChange={(e) => setCoins100(parseInt(e.target.value) || 0)}
                    disabled={isClosed}
                    className="text-center"
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    €{(coins100 * 1).toFixed(2)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">2€</Label>
                  <Input
                    type="number"
                    min="0"
                    value={coins200}
                    onChange={(e) => setCoins200(parseInt(e.target.value) || 0)}
                    disabled={isClosed}
                    className="text-center"
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    €{(coins200 * 2).toFixed(2)}
                  </p>
                </div>
                {/* Bills */}
                <div className="space-y-2">
                  <Label className="text-xs">5€</Label>
                  <Input
                    type="number"
                    min="0"
                    value={bills5}
                    onChange={(e) => setBills5(parseInt(e.target.value) || 0)}
                    disabled={isClosed}
                    className="text-center"
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    €{(bills5 * 5).toFixed(2)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">10€</Label>
                  <Input
                    type="number"
                    min="0"
                    value={bills10}
                    onChange={(e) => setBills10(parseInt(e.target.value) || 0)}
                    disabled={isClosed}
                    className="text-center"
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    €{(bills10 * 10).toFixed(2)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">20€</Label>
                  <Input
                    type="number"
                    min="0"
                    value={bills20}
                    onChange={(e) => setBills20(parseInt(e.target.value) || 0)}
                    disabled={isClosed}
                    className="text-center"
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    €{(bills20 * 20).toFixed(2)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">50€</Label>
                  <Input
                    type="number"
                    min="0"
                    value={bills50}
                    onChange={(e) => setBills50(parseInt(e.target.value) || 0)}
                    disabled={isClosed}
                    className="text-center"
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    €{(bills50 * 50).toFixed(2)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1">
                    <CreditCard className="h-3 w-3" /> Tarjetas
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={totalCards}
                    onChange={(e) => setTotalCards(e.target.value)}
                    disabled={isClosed}
                    className="text-center"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <Separator className="my-4" />

              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Total Efectivo:</span>
                <span className="text-green-600">€{totalCashCalc.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Movements */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Entradas/Salidas de Efectivo
                </CardTitle>
                <CardDescription>Movimientos del día (ej: Pago al del termo -40€)</CardDescription>
              </div>
              {!isClosed && (
                <Dialog open={showMovementDialog} onOpenChange={setShowMovementDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-1" /> Añadir
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nuevo Movimiento</DialogTitle>
                      <DialogDescription>Registra una entrada o salida de efectivo</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <Button
                          variant={movementType === "in" ? "default" : "outline"}
                          onClick={() => setMovementType("in")}
                          className="flex-1"
                        >
                          <Plus className="h-4 w-4 mr-1" /> Entrada
                        </Button>
                        <Button
                          variant={movementType === "out" ? "default" : "outline"}
                          onClick={() => setMovementType("out")}
                          className="flex-1"
                        >
                          <Minus className="h-4 w-4 mr-1" /> Salida
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <Label>Descripción</Label>
                        <Input
                          value={movementDescription}
                          onChange={(e) => setMovementDescription(e.target.value)}
                          placeholder="Ej: Pago al del termo"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Importe (€)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={movementAmount}
                          onChange={(e) => setMovementAmount(e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                      <Button onClick={handleAddMovement} className="w-full">
                        Guardar Movimiento
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              {movements && movements.length > 0 ? (
                <div className="space-y-2">
                  {movements.map((m: CashMovement) => (
                    <div key={m.id} className="flex justify-between items-center p-2 border rounded">
                      <span>{m.description}</span>
                      <div className="flex items-center gap-2">
                        <span className={m.type === "in" ? "text-green-600" : "text-red-600"}>
                          {m.type === "in" ? "+" : "-"}€{parseFloat(m.amount).toFixed(2)}
                        </span>
                        {!isClosed && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMovement.mutate({ id: m.id })}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total Movimientos:</span>
                    <span className={movementsTotal >= 0 ? "text-green-600" : "text-red-600"}>
                      €{movementsTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">Sin movimientos registrados</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Summary */}
        <div className="space-y-6">
          {/* Z and Retiros */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Datos del Cierre
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Z de Caja</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={zReading}
                  onChange={(e) => setZReading(e.target.value)}
                  disabled={isClosed}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Cambio Anterior (automático)</Label>
                <Input
                  type="number"
                  value={previousChange.toFixed(2)}
                  disabled
                  className="bg-muted"
                />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Prepago Booking</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={prepaidBooking}
                  onChange={(e) => setPrepaidBooking(e.target.value)}
                  disabled={isClosed}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Retirado Efectivo</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={withdrawnCash}
                  onChange={(e) => setWithdrawnCash(e.target.value)}
                  disabled={isClosed}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Retirado Tarjetas</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={withdrawnCards}
                  onChange={(e) => setWithdrawnCards(e.target.value)}
                  disabled={isClosed}
                  placeholder="0.00"
                />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Cambio para mañana (por defecto = efectivo)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={changeNext.toFixed(2)}
                  onChange={(e) => setChangeForNextDay(e.target.value)}
                  disabled={isClosed}
                  placeholder={totalCashCalc.toFixed(2)}
                />
                <p className="text-xs text-muted-foreground">Se usa el total efectivo si no se modifica</p>
              </div>
            </CardContent>
          </Card>

          {/* Totals */}
          <Card>
            <CardHeader>
              <CardTitle>Resumen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Efectivo:</span>
                <span className="font-medium">€{totalCashCalc.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Tarjetas:</span>
                <span className="font-medium">€{cardsTotal.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Caja:</span>
                <span className="font-semibold text-lg">€{actualTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Debería haber:</span>
                <span className="font-medium">€{expectedTotal.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="font-semibold">Descuadre:</span>
                <span className={`font-bold text-lg ${difference === 0 ? "text-green-600" : difference > 0 ? "text-blue-600" : "text-red-600"}`}>
                  €{difference.toFixed(2)}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cambio siguiente:</span>
                <span className="font-medium">€{changeNext.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Notas</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isClosed}
                placeholder="Notas adicionales..."
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Actions */}
          {!isClosed ? (
            <div className="flex flex-col gap-2">
              <Button onClick={handleSave} className="w-full">
                <Save className="h-4 w-4 mr-2" /> Guardar Borrador
              </Button>
              <Button onClick={handleClose} variant="destructive" className="w-full">
                <Lock className="h-4 w-4 mr-2" /> Cerrar Caja
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Button onClick={handleReopen} variant="outline" className="w-full">
                <Lock className="h-4 w-4 mr-2" /> Reabrir Caja
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useAuth } from "@/_core/hooks/useAuth";
import { useBusinessContext } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Wallet, Plus, TrendingUp, TrendingDown, Lock, Unlock, Building2, Store } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const CATEGORIES = {
  income: ["Ventas", "Reservas", "Otros ingresos"],
  expense: ["Compras", "Suministros", "Servicios", "Personal", "Otros gastos"],
};

export default function Caja() {
  const { user } = useAuth();
  const { selectedBusiness } = useBusinessContext();
  const [isOpenCajaDialog, setIsOpenCajaDialog] = useState(false);
  const [isCloseCajaDialog, setIsCloseCajaDialog] = useState(false);
  const [isTransactionDialog, setIsTransactionDialog] = useState(false);
  const [openingAmount, setOpeningAmount] = useState("");
  const [closingAmount, setClosingAmount] = useState("");
  const [closingNotes, setClosingNotes] = useState("");
  const [txType, setTxType] = useState<"income" | "expense">("income");
  const [txConcept, setTxConcept] = useState("");
  const [txAmount, setTxAmount] = useState("");
  const [txCategory, setTxCategory] = useState("");
  const [txPaymentMethod, setTxPaymentMethod] = useState<"cash" | "card" | "transfer" | "other">("cash");
  const [txNotes, setTxNotes] = useState("");

  const utils = trpc.useUtils();
  const today = new Date().toISOString().split('T')[0];

  const { data: businesses } = trpc.businesses.list.useQuery();
  const currentBusinessId = useMemo(() => {
    if (selectedBusiness === "all") return businesses?.[0]?.id;
    return businesses?.find(b => b.code === selectedBusiness)?.id;
  }, [businesses, selectedBusiness]);

  const { data: openCashRegister } = trpc.cashRegisters.getOpen.useQuery(
    { businessId: currentBusinessId! },
    { enabled: !!currentBusinessId }
  );

  const { data: transactions } = trpc.transactions.list.useQuery(
    { businessId: currentBusinessId!, startDate: today, endDate: today },
    { enabled: !!currentBusinessId }
  );

  const { data: cashRegisters } = trpc.cashRegisters.list.useQuery(
    { businessId: currentBusinessId! },
    { enabled: !!currentBusinessId }
  );

  const openCaja = trpc.cashRegisters.open.useMutation({
    onSuccess: () => {
      toast.success("Caja abierta correctamente");
      utils.cashRegisters.getOpen.invalidate();
      utils.cashRegisters.list.invalidate();
      setIsOpenCajaDialog(false);
      setOpeningAmount("");
    },
    onError: (error) => toast.error("Error: " + error.message),
  });

  const closeCaja = trpc.cashRegisters.close.useMutation({
    onSuccess: () => {
      toast.success("Caja cerrada correctamente");
      utils.cashRegisters.getOpen.invalidate();
      utils.cashRegisters.list.invalidate();
      setIsCloseCajaDialog(false);
      setClosingAmount("");
      setClosingNotes("");
    },
    onError: (error) => toast.error("Error: " + error.message),
  });

  const createTransaction = trpc.transactions.create.useMutation({
    onSuccess: () => {
      toast.success("Movimiento registrado");
      utils.transactions.list.invalidate();
      setIsTransactionDialog(false);
      resetTxForm();
    },
    onError: (error) => toast.error("Error: " + error.message),
  });

  const resetTxForm = () => {
    setTxType("income");
    setTxConcept("");
    setTxAmount("");
    setTxCategory("");
    setTxPaymentMethod("cash");
    setTxNotes("");
  };

  const handleOpenCaja = () => {
    if (!currentBusinessId || !openingAmount) return;
    openCaja.mutate({ businessId: currentBusinessId, openingAmount });
  };

  const handleCloseCaja = () => {
    if (!openCashRegister || !closingAmount) return;
    closeCaja.mutate({ id: openCashRegister.id, closingAmount, notes: closingNotes });
  };

  const handleCreateTransaction = () => {
    if (!currentBusinessId || !txConcept || !txAmount) {
      toast.error("Completa todos los campos requeridos");
      return;
    }
    createTransaction.mutate({
      businessId: currentBusinessId,
      cashRegisterId: openCashRegister?.id,
      type: txType,
      concept: txConcept,
      amount: txAmount,
      category: txCategory,
      paymentMethod: txPaymentMethod,
      date: today,
      notes: txNotes,
    });
  };

  // Calculate totals
  const totals = useMemo(() => {
    if (!transactions) return { income: 0, expense: 0, cashIncome: 0, cashExpense: 0 };
    return transactions.reduce((acc, t) => {
      const amount = parseFloat(t.amount || "0");
      if (t.type === "income") {
        acc.income += amount;
        if (t.paymentMethod === "cash") acc.cashIncome += amount;
      } else {
        acc.expense += amount;
        if (t.paymentMethod === "cash") acc.cashExpense += amount;
      }
      return acc;
    }, { income: 0, expense: 0, cashIncome: 0, cashExpense: 0 });
  }, [transactions]);

  // Calculate expected cash
  const expectedCash = useMemo(() => {
    if (!openCashRegister) return 0;
    const opening = parseFloat(openCashRegister.openingAmount || "0");
    const withdrawn = parseFloat(openCashRegister.cashWithdrawn || "0");
    return opening + totals.cashIncome - totals.cashExpense - withdrawn;
  }, [openCashRegister, totals]);

  const businessLabel = selectedBusiness === "hostel" ? "Hostel" : selectedBusiness === "tienda" ? "Tienda" : "Ambos";
  const BusinessIcon = selectedBusiness === "hostel" ? Building2 : Store;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" />
            Caja - {businessLabel}
          </h1>
          <p className="text-muted-foreground">Gestión de ingresos, gastos y arqueos diarios</p>
        </div>
        <div className="flex gap-2">
          {!openCashRegister ? (
            <Dialog open={isOpenCajaDialog} onOpenChange={setIsOpenCajaDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Unlock className="h-4 w-4 mr-2" />
                  Abrir caja
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Abrir caja</DialogTitle>
                  <DialogDescription>Introduce el importe inicial en caja</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Importe inicial (€)</Label>
                    <Input 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00"
                      value={openingAmount} 
                      onChange={e => setOpeningAmount(e.target.value)} 
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsOpenCajaDialog(false)}>Cancelar</Button>
                  <Button onClick={handleOpenCaja} disabled={openCaja.isPending}>
                    {openCaja.isPending ? "Abriendo..." : "Abrir caja"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : (
            <>
              <Dialog open={isTransactionDialog} onOpenChange={setIsTransactionDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo movimiento
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Registrar movimiento</DialogTitle>
                    <DialogDescription>Añade un ingreso o gasto</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label>Tipo</Label>
                      <Select value={txType} onValueChange={(v: "income" | "expense") => setTxType(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="income">Ingreso</SelectItem>
                          <SelectItem value="expense">Gasto</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Concepto</Label>
                      <Input value={txConcept} onChange={e => setTxConcept(e.target.value)} placeholder="Descripción del movimiento" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Importe (€)</Label>
                        <Input type="number" step="0.01" value={txAmount} onChange={e => setTxAmount(e.target.value)} placeholder="0.00" />
                      </div>
                      <div className="grid gap-2">
                        <Label>Forma de pago</Label>
                        <Select value={txPaymentMethod} onValueChange={(v: any) => setTxPaymentMethod(v)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Efectivo</SelectItem>
                            <SelectItem value="card">Tarjeta</SelectItem>
                            <SelectItem value="transfer">Transferencia</SelectItem>
                            <SelectItem value="other">Otro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label>Categoría</Label>
                      <Select value={txCategory} onValueChange={setTxCategory}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar categoría" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES[txType].map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Notas (opcional)</Label>
                      <Textarea value={txNotes} onChange={e => setTxNotes(e.target.value)} placeholder="Notas adicionales" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsTransactionDialog(false)}>Cancelar</Button>
                    <Button onClick={handleCreateTransaction} disabled={createTransaction.isPending}>
                      {createTransaction.isPending ? "Guardando..." : "Guardar"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={isCloseCajaDialog} onOpenChange={setIsCloseCajaDialog}>
                <DialogTrigger asChild>
                  <Button variant="secondary">
                    <Lock className="h-4 w-4 mr-2" />
                    Cerrar caja
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Cerrar caja</DialogTitle>
                    <DialogDescription>Realiza el arqueo final del día</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="p-4 rounded-lg bg-muted">
                      <div className="flex justify-between mb-2">
                        <span>Apertura:</span>
                        <span className="font-medium">€{parseFloat(openCashRegister?.openingAmount || "0").toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between mb-2 text-green-600">
                        <span>+ Ingresos efectivo:</span>
                        <span className="font-medium">€{totals.cashIncome.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between mb-2 text-red-600">
                        <span>- Gastos efectivo:</span>
                        <span className="font-medium">€{totals.cashExpense.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between mb-2 text-orange-600">
                        <span>- Retirado:</span>
                        <span className="font-medium">€{parseFloat(openCashRegister?.cashWithdrawn || "0").toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t font-bold">
                        <span>Debería haber:</span>
                        <span>€{expectedCash.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label>¿Cuánto hay realmente? (€)</Label>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00"
                        value={closingAmount} 
                        onChange={e => setClosingAmount(e.target.value)} 
                      />
                      {closingAmount && (
                        <p className={`text-sm ${parseFloat(closingAmount) - expectedCash === 0 ? 'text-green-600' : 'text-orange-600'}`}>
                          Diferencia: €{(parseFloat(closingAmount) - expectedCash).toFixed(2)}
                        </p>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <Label>Notas (opcional)</Label>
                      <Textarea value={closingNotes} onChange={e => setClosingNotes(e.target.value)} placeholder="Observaciones del cierre" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCloseCajaDialog(false)}>Cancelar</Button>
                    <Button onClick={handleCloseCaja} disabled={closeCaja.isPending}>
                      {closeCaja.isPending ? "Cerrando..." : "Cerrar caja"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {/* Status Card */}
      {openCashRegister && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-100">
                  <Unlock className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Caja abierta</p>
                  <p className="text-sm text-muted-foreground">
                    Apertura: €{parseFloat(openCashRegister.openingAmount || "0").toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Efectivo esperado</p>
                <p className="text-2xl font-bold">€{expectedCash.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos hoy</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">€{totals.income.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Efectivo: €{totals.cashIncome.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos hoy</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">€{totals.expense.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Efectivo: €{totals.cashExpense.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totals.income - totals.expense >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              €{(totals.income - totals.expense).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Resultado del día</p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle>Movimientos de hoy</CardTitle>
          <CardDescription>Lista de ingresos y gastos registrados</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions && transactions.length > 0 ? (
            <div className="space-y-2">
              {transactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    {tx.type === "income" ? (
                      <div className="p-2 rounded-full bg-green-100">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      </div>
                    ) : (
                      <div className="p-2 rounded-full bg-red-100">
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{tx.concept}</p>
                      <p className="text-sm text-muted-foreground">
                        {tx.category} • {tx.paymentMethod === "cash" ? "Efectivo" : tx.paymentMethod === "card" ? "Tarjeta" : tx.paymentMethod}
                      </p>
                    </div>
                  </div>
                  <div className={`text-lg font-bold ${tx.type === "income" ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.type === "income" ? "+" : "-"}€{parseFloat(tx.amount || "0").toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Wallet className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No hay movimientos registrados hoy</p>
              {openCashRegister && (
                <Button variant="link" onClick={() => setIsTransactionDialog(true)}>
                  Registrar primer movimiento
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historical Cash Registers */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de cajas</CardTitle>
          <CardDescription>Arqueos anteriores</CardDescription>
        </CardHeader>
        <CardContent>
          {cashRegisters && cashRegisters.filter(c => c.status === "closed").length > 0 ? (
            <div className="space-y-2">
              {cashRegisters.filter(c => c.status === "closed").slice(0, 7).map(cr => (
                <div key={cr.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">{new Date(cr.date + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                    <p className="text-sm text-muted-foreground">
                      Apertura: €{parseFloat(cr.openingAmount || "0").toFixed(2)} → Cierre: €{parseFloat(cr.closingAmount || "0").toFixed(2)}
                    </p>
                  </div>
                  <div className={`text-right ${parseFloat(cr.difference || "0") === 0 ? 'text-green-600' : 'text-orange-500'}`}>
                    <p className="font-medium">Diferencia</p>
                    <p className="text-lg font-bold">€{parseFloat(cr.difference || "0").toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-4 text-muted-foreground">No hay arqueos anteriores</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

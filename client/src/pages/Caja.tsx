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
import { Wallet, Plus, TrendingUp, TrendingDown, Lock, Building2, Store, Calculator, History, Clock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const PAYMENT_METHODS = [
  { value: "cash", label: "Efectivo" },
  { value: "card", label: "Tarjeta" },
  { value: "transfer", label: "Transferencia" },
  { value: "cuenta_bancaria", label: "Cuenta Bancaria" },
  { value: "ana", label: "Ana" },
  { value: "juanlu", label: "Juanlu" },
  { value: "caja_hostel", label: "Caja Hostel" },
  { value: "caja_tienda", label: "Caja Tienda" },
  { value: "caja_fuerte", label: "Caja Fuerte" },
  { value: "caja_fuerte_cambio", label: "Caja Fuerte Cambio" },
  { value: "other", label: "Otros" },
];

const CATEGORIES = {
  income: ["Ventas", "Reservas", "Prepago Booking", "Otros ingresos"],
  expense: ["Compras", "Suministros", "Servicios", "Personal", "Otros gastos"],
};

export default function Caja() {
  const { user } = useAuth();
  const { selectedBusiness } = useBusinessContext();
  const [isCloseCajaDialog, setIsCloseCajaDialog] = useState(false);
  const [isTransactionDialog, setIsTransactionDialog] = useState(false);
  const [closingAmount, setClosingAmount] = useState("");
  const [closingNotes, setClosingNotes] = useState("");
  const [txType, setTxType] = useState<"income" | "expense">("income");
  const [txConcept, setTxConcept] = useState("");
  const [txAmount, setTxAmount] = useState("");
  const [txCategory, setTxCategory] = useState("");
  const [txPaymentMethod, setTxPaymentMethod] = useState("cash");
  const [txNotes, setTxNotes] = useState("");

  const utils = trpc.useUtils();
  
  // Get today's date considering 6am cutoff
  const getBusinessDate = () => {
    const now = new Date();
    const hour = now.getHours();
    // If before 6am, use previous day
    if (hour < 6) {
      now.setDate(now.getDate() - 1);
    }
    return now.toISOString().split('T')[0];
  };
  
  const today = getBusinessDate();

  const { data: businesses } = trpc.businesses.list.useQuery();
  const currentBusinessId = useMemo(() => {
    if (selectedBusiness === "all") return businesses?.[0]?.id;
    return businesses?.find(b => b.code === selectedBusiness)?.id;
  }, [businesses, selectedBusiness]);

  // Auto-create/get cash register for today
  const getOrCreateCash = trpc.cashAuto.getOrCreate.useMutation({
    onSuccess: () => {
      utils.cashRegisters.getOpen.invalidate();
      utils.cashRegisters.list.invalidate();
    },
  });

  // Auto-initialize cash register when business is selected
  useEffect(() => {
    if (currentBusinessId) {
      getOrCreateCash.mutate({ businessId: currentBusinessId, date: today });
    }
  }, [currentBusinessId, today]);

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

  const handleCloseCaja = () => {
    if (!openCashRegister || !closingAmount) return;
    closeCaja.mutate({ id: openCashRegister.id, closingAmount, notes: closingNotes });
  };

  const handleCreateTransaction = () => {
    const concept = txConcept.trim();
    const amount = txAmount.trim();
    if (!currentBusinessId) {
      toast.error("Selecciona un negocio");
      return;
    }
    if (!concept) {
      toast.error("El concepto es obligatorio");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("El importe debe ser mayor que 0");
      return;
    }
    createTransaction.mutate({
      businessId: currentBusinessId,
      cashRegisterId: openCashRegister?.id,
      type: txType,
      concept: concept,
      amount: amount,
      category: txCategory,
      paymentMethod: txPaymentMethod as any,
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
          <p className="text-muted-foreground">Fecha: {new Date(today + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isTransactionDialog} onOpenChange={setIsTransactionDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Registrar movimiento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuevo movimiento</DialogTitle>
                <DialogDescription>Registra un ingreso o gasto</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <Tabs value={txType} onValueChange={(v) => setTxType(v as "income" | "expense")}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="income" className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Ingreso
                    </TabsTrigger>
                    <TabsTrigger value="expense" className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4" />
                      Gasto
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <div className="grid gap-2">
                  <Label>Concepto *</Label>
                  <Input value={txConcept} onChange={e => setTxConcept(e.target.value)} placeholder="Descripción del movimiento" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Importe (€) *</Label>
                    <Input type="number" step="0.01" value={txAmount} onChange={e => setTxAmount(e.target.value)} placeholder="0.00" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Categoría</Label>
                    <Select value={txCategory} onValueChange={setTxCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES[txType].map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Forma de pago</Label>
                  <Select value={txPaymentMethod} onValueChange={setTxPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map(pm => (
                        <SelectItem key={pm.value} value={pm.value}>{pm.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Notas</Label>
                  <Textarea value={txNotes} onChange={e => setTxNotes(e.target.value)} placeholder="Notas adicionales..." />
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
          
          {openCashRegister && openCashRegister.status === "open" && (
            <Dialog open={isCloseCajaDialog} onOpenChange={setIsCloseCajaDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">
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
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Apertura:</span>
                          <span className="font-medium">€{parseFloat(openCashRegister?.openingAmount || "0").toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-green-600">
                          <span>+ Ingresos efectivo:</span>
                          <span className="font-medium">€{totals.cashIncome.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-red-600">
                          <span>- Gastos efectivo:</span>
                          <span className="font-medium">€{totals.cashExpense.toFixed(2)}</span>
                        </div>
                        <div className="border-t pt-2 flex justify-between font-bold">
                          <span>Debería haber:</span>
                          <span>€{expectedCash.toFixed(2)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <div className="grid gap-2">
                    <Label>¿Cuánto hay en caja? (€)</Label>
                    <Input 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00"
                      value={closingAmount} 
                      onChange={e => setClosingAmount(e.target.value)} 
                    />
                    {closingAmount && (
                      <p className={`text-sm font-medium ${parseFloat(closingAmount) - expectedCash === 0 ? 'text-green-600' : 'text-red-600'}`}>
                        Descuadre: €{(parseFloat(closingAmount) - expectedCash).toFixed(2)}
                      </p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label>Notas</Label>
                    <Textarea value={closingNotes} onChange={e => setClosingNotes(e.target.value)} placeholder="Observaciones del cierre..." />
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
          )}
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Apertura</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{parseFloat(openCashRegister?.openingAmount || "0").toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Saldo inicial del día</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">€{totals.income.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Efectivo: €{totals.cashIncome.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">€{totals.expense.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Efectivo: €{totals.cashExpense.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Debería haber</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{expectedCash.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">En efectivo</p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Movimientos de hoy
          </CardTitle>
          <CardDescription>{transactions?.length || 0} movimientos registrados</CardDescription>
        </CardHeader>
        <CardContent>
          {!transactions || transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay movimientos registrados hoy</p>
              <Button variant="link" onClick={() => setIsTransactionDialog(true)}>
                Registrar el primero
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${tx.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {tx.type === 'income' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="font-medium">{tx.concept}</p>
                      <p className="text-sm text-muted-foreground">
                        {tx.category} · {PAYMENT_METHODS.find(p => p.value === tx.paymentMethod)?.label || tx.paymentMethod}
                      </p>
                    </div>
                  </div>
                  <span className={`font-bold ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.type === 'income' ? '+' : '-'}€{parseFloat(tx.amount || "0").toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historical Cash Registers */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de cajas</CardTitle>
          <CardDescription>Últimos cierres de caja</CardDescription>
        </CardHeader>
        <CardContent>
          {!cashRegisters || cashRegisters.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">Sin histórico disponible</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Fecha</th>
                    <th className="text-right py-2">Apertura</th>
                    <th className="text-right py-2">Cierre</th>
                    <th className="text-right py-2">Descuadre</th>
                    <th className="text-center py-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {cashRegisters.slice(0, 10).map((cr) => (
                    <tr key={cr.id} className="border-b hover:bg-muted/50">
                      <td className="py-2">{new Date(cr.date + 'T12:00:00').toLocaleDateString('es-ES')}</td>
                      <td className="text-right py-2">€{parseFloat(cr.openingAmount || "0").toFixed(2)}</td>
                      <td className="text-right py-2">{cr.closingAmount ? `€${parseFloat(cr.closingAmount).toFixed(2)}` : '-'}</td>
                      <td className={`text-right py-2 font-medium ${parseFloat(cr.difference || "0") === 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {cr.difference ? `€${parseFloat(cr.difference).toFixed(2)}` : '-'}
                      </td>
                      <td className="text-center py-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${cr.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                          {cr.status === 'open' ? 'Abierta' : 'Cerrada'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

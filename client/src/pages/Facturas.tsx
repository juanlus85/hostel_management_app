import { useBusinessContext } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Receipt, Plus, Camera, Upload, Check, AlertCircle, Search, Building2, Store, Loader2, Sparkles } from "lucide-react";
import { useMemo, useState, useRef } from "react";
import { toast } from "sonner";

export default function Facturas() {
  const { selectedBusiness } = useBusinessContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [supplier, setSupplier] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [baseAmount, setBaseAmount] = useState("");
  const [vatRate, setVatRate] = useState("21");
  const [totalAmount, setTotalAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();

  const { data: businesses } = trpc.businesses.list.useQuery();
  const currentBusinessId = useMemo(() => {
    if (selectedBusiness === "all") return businesses?.[0]?.id;
    return businesses?.find(b => b.code === selectedBusiness)?.id;
  }, [businesses, selectedBusiness]);

  const { data: invoices, isLoading } = trpc.invoices.list.useQuery(
    { businessId: currentBusinessId! },
    { enabled: !!currentBusinessId }
  );

  const createInvoice = trpc.invoices.create.useMutation({
    onSuccess: () => {
      toast.success("Factura registrada correctamente");
      utils.invoices.list.invalidate();
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => toast.error("Error: " + error.message),
  });

  const updateInvoice = trpc.invoices.update.useMutation({
    onSuccess: () => {
      toast.success("Factura actualizada");
      utils.invoices.list.invalidate();
    },
  });

  const processOCR = trpc.ocr.processInvoice.useMutation({
    onSuccess: (data) => {
      if (data) {
        if (data.supplier) setSupplier(data.supplier);
        if (data.invoiceNumber) setInvoiceNumber(data.invoiceNumber);
        if (data.invoiceDate) setInvoiceDate(data.invoiceDate);
        if (data.baseAmount) setBaseAmount(data.baseAmount);
        if (data.vatRate) setVatRate(data.vatRate);
        if (data.totalAmount) setTotalAmount(data.totalAmount);
        toast.success("Datos extraídos correctamente");
      } else {
        toast.error("No se pudieron extraer los datos");
      }
      setIsProcessingOCR(false);
    },
    onError: (error) => {
      toast.error("Error en OCR: " + error.message);
      setIsProcessingOCR(false);
    },
  });

  const resetForm = () => {
    setSupplier("");
    setInvoiceNumber("");
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setBaseAmount("");
    setVatRate("21");
    setTotalAmount("");
    setNotes("");
    setImageFile(null);
    setImagePreview(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setImagePreview(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProcessOCR = () => {
    if (!imagePreview) {
      toast.error("Primero sube una imagen");
      return;
    }
    setIsProcessingOCR(true);
    processOCR.mutate({ imageUrl: imagePreview });
  };

  const calculateTotal = () => {
    if (baseAmount && vatRate) {
      const base = parseFloat(baseAmount);
      const vat = parseFloat(vatRate);
      const total = base * (1 + vat / 100);
      setTotalAmount(total.toFixed(2));
    }
  };

  const handleCreateInvoice = async () => {
    if (!currentBusinessId) return;
    
    // TODO: Upload image to S3 and get URL
    // For now, we'll create without image
    createInvoice.mutate({
      businessId: currentBusinessId,
      supplier,
      invoiceNumber,
      invoiceDate,
      baseAmount,
      vatRate,
      vatAmount: baseAmount && vatRate ? (parseFloat(baseAmount) * parseFloat(vatRate) / 100).toFixed(2) : undefined,
      totalAmount,
      notes,
    });
  };

  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];
    if (!searchTerm) return invoices;
    const term = searchTerm.toLowerCase();
    return invoices.filter(inv => 
      inv.supplier?.toLowerCase().includes(term) ||
      inv.invoiceNumber?.toLowerCase().includes(term)
    );
  }, [invoices, searchTerm]);

  const businessLabel = selectedBusiness === "hostel" ? "Hostel" : selectedBusiness === "tienda" ? "Tienda" : "Ambos";
  const BusinessIcon = selectedBusiness === "hostel" ? Building2 : Store;

  // Group invoices by month
  const invoicesByMonth = useMemo(() => {
    const groups: Record<string, typeof filteredInvoices> = {};
    filteredInvoices.forEach(inv => {
      const month = inv.invoiceDate ? new Date(inv.invoiceDate + 'T00:00:00').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }) : 'Sin fecha';
      if (!groups[month]) groups[month] = [];
      groups[month].push(inv);
    });
    return groups;
  }, [filteredInvoices]);

  // Calculate totals
  const totals = useMemo(() => {
    return filteredInvoices.reduce((acc, inv) => {
      acc.base += parseFloat(inv.baseAmount || "0");
      acc.vat += parseFloat(inv.vatAmount || "0");
      acc.total += parseFloat(inv.totalAmount || "0");
      return acc;
    }, { base: 0, vat: 0, total: 0 });
  }, [filteredInvoices]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Receipt className="h-6 w-6 text-primary" />
            Facturas - {businessLabel}
          </h1>
          <p className="text-muted-foreground">Gestión de facturas y gastos con captura de tickets</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva factura
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Registrar factura</DialogTitle>
              <DialogDescription>Añade una nueva factura o ticket de gasto</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* Image Upload */}
              <div className="grid gap-2">
                <Label>Foto del ticket/factura</Label>
                <div className="flex gap-4">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Hacer foto
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.removeAttribute('capture');
                        fileInputRef.current.click();
                        fileInputRef.current.setAttribute('capture', 'environment');
                      }
                    }}
                    className="flex-1"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Subir imagen
                  </Button>
                </div>
                {imagePreview && (
                  <div className="mt-2 space-y-2">
                    <div className="relative">
                      <img src={imagePreview} alt="Preview" className="max-h-48 rounded-lg border" />
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        className="absolute top-2 right-2"
                        onClick={() => { setImageFile(null); setImagePreview(null); }}
                      >
                        Eliminar
                      </Button>
                    </div>
                    <Button 
                      type="button"
                      onClick={handleProcessOCR}
                      disabled={isProcessingOCR}
                      className="w-full bg-gradient-to-r from-primary to-accent"
                    >
                      {isProcessingOCR ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Procesando OCR...</>
                      ) : (
                        <><Sparkles className="h-4 w-4 mr-2" />Extraer datos automáticamente (OCR)</>
                      )}
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Proveedor</Label>
                  <Input value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="Nombre del proveedor" />
                </div>
                <div className="grid gap-2">
                  <Label>Nº Factura</Label>
                  <Input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} placeholder="Número de factura" />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Fecha</Label>
                <Input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label>Base imponible (€)</Label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    value={baseAmount} 
                    onChange={e => setBaseAmount(e.target.value)} 
                    onBlur={calculateTotal}
                    placeholder="0.00" 
                  />
                </div>
                <div className="grid gap-2">
                  <Label>IVA (%)</Label>
                  <Input 
                    type="number" 
                    value={vatRate} 
                    onChange={e => setVatRate(e.target.value)} 
                    onBlur={calculateTotal}
                    placeholder="21" 
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Total (€)</Label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    value={totalAmount} 
                    onChange={e => setTotalAmount(e.target.value)} 
                    placeholder="0.00" 
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Notas</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas adicionales" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateInvoice} disabled={createInvoice.isPending}>
                {createInvoice.isPending ? "Guardando..." : "Guardar factura"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total facturas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredInvoices.length}</div>
            <p className="text-xs text-muted-foreground">Registradas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Base imponible</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{totals.base.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">IVA: €{totals.vat.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total gastos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">€{totals.total.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Con IVA incluido</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Buscar por proveedor o número de factura..." 
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Invoices List */}
      <Card>
        <CardHeader>
          <CardTitle>Listado de facturas</CardTitle>
          <CardDescription>Todas las facturas registradas</CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(invoicesByMonth).length > 0 ? (
            <div className="space-y-6">
              {Object.entries(invoicesByMonth).map(([month, invs]) => (
                <div key={month}>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3 capitalize">{month}</h3>
                  <div className="space-y-2">
                    {invs.map(inv => (
                      <div key={inv.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-full ${inv.isVerified ? 'bg-green-100' : 'bg-orange-100'}`}>
                            {inv.isVerified ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-orange-500" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{inv.supplier || 'Sin proveedor'}</p>
                            <p className="text-sm text-muted-foreground">
                              {inv.invoiceNumber ? `#${inv.invoiceNumber} • ` : ''}
                              {inv.invoiceDate ? new Date(inv.invoiceDate + 'T00:00:00').toLocaleDateString('es-ES') : 'Sin fecha'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">€{parseFloat(inv.totalAmount || "0").toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">
                            Base: €{parseFloat(inv.baseAmount || "0").toFixed(2)} + IVA
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No hay facturas registradas</p>
              <Button variant="link" onClick={() => setIsDialogOpen(true)}>
                Registrar primera factura
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

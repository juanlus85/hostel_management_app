import { useBusinessContext } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Receipt, Plus, Camera, Upload, Check, AlertCircle, Search, Building2, Store, Loader2, Sparkles, Edit2, FileText, CheckCircle2, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useMemo, useState, useRef } from "react";
import { toast } from "sonner";

const PAYMENT_METHODS = [
  { value: "cuenta_bancaria", label: "Cuenta Bancaria" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "ana", label: "Ana" },
  { value: "juanlu", label: "Juanlu" },
  { value: "caja_hostel", label: "Caja Hostel" },
  { value: "caja_tienda", label: "Caja Tienda" },
  { value: "caja_fuerte", label: "Caja Fuerte" },
  { value: "caja_fuerte_cambio", label: "Caja Fuerte Cambio" },
  { value: "otros", label: "Otros" },
] as const;

type PaymentMethodValue = typeof PAYMENT_METHODS[number]["value"];

export default function Facturas() {
  const { selectedBusiness } = useBusinessContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [supplier, setSupplier] = useState("");
  const [customSupplier, setCustomSupplier] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [totalAmount, setTotalAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodValue | "">("");
  const [notes, setNotes] = useState("");
  const [hasVAT, setHasVAT] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formBusinessId, setFormBusinessId] = useState<number | null>(null);
  
  // Filtro de mes/año
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<string>("last30");
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear().toString());

  // Edit form states
  const [editSupplier, setEditSupplier] = useState("");
  const [editInvoiceNumber, setEditInvoiceNumber] = useState("");
  const [editInvoiceDate, setEditInvoiceDate] = useState("");
  const [editTotalAmount, setEditTotalAmount] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState<PaymentMethodValue | "">("");
  const [editNotes, setEditNotes] = useState("");

  const utils = trpc.useUtils();

  const { data: businesses } = trpc.businesses.list.useQuery();
  const hostelBusiness = businesses?.find(b => b.code === "hostel");
  const tiendaBusiness = businesses?.find(b => b.code === "tienda");
  
  const currentBusinessId = useMemo(() => {
    if (selectedBusiness === "all") return hostelBusiness?.id;
    return businesses?.find(b => b.code === selectedBusiness)?.id;
  }, [businesses, selectedBusiness, hostelBusiness]);

  // Calcular rango de fechas según filtro
  const dateRange = useMemo(() => {
    if (selectedMonth === "last30") {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0]
      };
    } else if (selectedMonth === "all") {
      return { startDate: undefined, endDate: undefined };
    } else {
      const year = parseInt(selectedYear);
      const month = parseInt(selectedMonth);
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0);
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0]
      };
    }
  }, [selectedMonth, selectedYear]);

  // Queries - obtener datos según selección global
  const { data: invoicesHostel } = trpc.invoices.list.useQuery(
    { businessId: hostelBusiness?.id!, startDate: dateRange.startDate, endDate: dateRange.endDate },
    { enabled: !!hostelBusiness && (selectedBusiness === "hostel" || selectedBusiness === "all") }
  );
  
  const { data: invoicesTienda } = trpc.invoices.list.useQuery(
    { businessId: tiendaBusiness?.id!, startDate: dateRange.startDate, endDate: dateRange.endDate },
    { enabled: !!tiendaBusiness && (selectedBusiness === "tienda" || selectedBusiness === "all") }
  );
  
  // Combinar datos según selección
  const invoices = selectedBusiness === "all" 
    ? [...(invoicesHostel || []), ...(invoicesTienda || [])].sort((a, b) => {
        const dateA = a.invoiceDate ? new Date(a.invoiceDate).getTime() : 0;
        const dateB = b.invoiceDate ? new Date(b.invoiceDate).getTime() : 0;
        return dateB - dateA;
      })
    : selectedBusiness === "hostel" 
    ? invoicesHostel || []
    : invoicesTienda || [];
  
  const isLoading = !businesses;

  // Get suppliers from database
  const { data: suppliers } = trpc.suppliers.list.useQuery();

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
      setIsEditDialogOpen(false);
      setSelectedInvoice(null);
    },
    onError: (error) => toast.error("Error: " + error.message),
  });

  const deleteMutation = trpc.invoices.delete.useMutation({
    onSuccess: () => {
      toast.success("Factura eliminada correctamente");
      utils.invoices.list.invalidate();
      utils.dashboard.stats.invalidate();
    },
    onError: (error) => toast.error("Error al eliminar: " + error.message),
  });

  const uploadFile = trpc.invoices.uploadFile.useMutation({
    onError: (error) => toast.error("Error al subir archivo: " + error.message),
  });

  const processOCR = trpc.ocr.processInvoice.useMutation({
    onSuccess: (data) => {
      if (data) {
        if (data.supplier) setSupplier(data.supplier);
        if (data.invoiceNumber) setInvoiceNumber(data.invoiceNumber);
        if (data.invoiceDate) setInvoiceDate(data.invoiceDate);
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
    setCustomSupplier("");
    setInvoiceNumber("");
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setTotalAmount("");
    setPaymentMethod("");
    setNotes("");
    setHasVAT(true);
    setImageFile(null);
    setImagePreview(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check if it's an image or PDF
      const isImage = file.type.startsWith('image/');
      const isPDF = file.type === 'application/pdf';
      
      if (!isImage && !isPDF) {
        toast.error("Solo se permiten imágenes o archivos PDF");
        return;
      }

      setImageFile(file);
      
      if (isImage) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          setImagePreview(dataUrl);
        };
        reader.readAsDataURL(file);
      } else {
        // For PDF, just show a placeholder
        setImagePreview("pdf:" + file.name);
      }
    }
  };

  const handleProcessOCR = () => {
    if (!imagePreview) {
      toast.error("Primero sube una imagen");
      return;
    }
    if (imagePreview.startsWith("pdf:")) {
      toast.error("OCR solo disponible para imágenes, no para PDF");
      return;
    }
    setIsProcessingOCR(true);
    processOCR.mutate({ imageUrl: imagePreview });
  };

  const handleCreateInvoice = async () => {
    // Si estamos en modo "Ambos", usar el negocio seleccionado en el formulario
    const businessIdToUse = selectedBusiness === "all" ? formBusinessId : currentBusinessId;
    
    if (!businessIdToUse) {
      toast.error(selectedBusiness === "all" 
        ? "Selecciona para qué negocio es esta factura" 
        : "Selecciona un negocio");
      return;
    }
    
    const finalSupplier = supplier === "_custom" ? customSupplier.trim() : supplier;
    const total = totalAmount.trim();
    
    // At least supplier or total should be provided
    if (!finalSupplier && !total) {
      toast.error("Indica al menos el proveedor o el total");
      return;
    }
    
    // Upload file to S3 if present
    let fileUrl: string | undefined;
    let fileKey: string | undefined;
    
    if (imageFile) {
      try {
        toast.info("Subiendo archivo...");
        
        // Convert file to base64
        const reader = new FileReader();
        const fileData = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(imageFile);
        });
        
        // Upload to S3
        // Generate formatted filename: [Proveedor] - [Trimestre]T - [Fecha].pdf
        const fileExtension = imageFile.name.split('.').pop();
        const quarter = invoiceDate ? Math.ceil((new Date(invoiceDate).getMonth() + 1) / 3) : Math.ceil((new Date().getMonth() + 1) / 3);
        const year = invoiceDate ? new Date(invoiceDate).getFullYear() : new Date().getFullYear();
        const dateStr = invoiceDate ? invoiceDate.replace(/-/g, '').slice(2) : new Date().toISOString().split('T')[0].replace(/-/g, '').slice(2);
        const supplierName = finalSupplier || supplier || 'Sin_Proveedor';
        const formattedFileName = `${supplierName} - ${quarter}T ${year} - ${dateStr}.${fileExtension}`;
        
        const uploadResult = await uploadFile.mutateAsync({
          fileData,
          fileName: formattedFileName,
          contentType: imageFile.type,
        });
        
        fileUrl = uploadResult.url;
        fileKey = uploadResult.key;
        console.log("[Frontend] File uploaded:", fileUrl);
      } catch (error) {
        console.error("[Frontend] Error uploading file:", error);
        toast.error("Error al subir el archivo");
        return;
      }
    }
    
    createInvoice.mutate({
      businessId: businessIdToUse,
      supplier: finalSupplier || undefined,
      invoiceNumber: invoiceNumber.trim() || undefined,
      invoiceDate: invoiceDate || undefined,
      totalAmount: total || undefined,
      paymentMethod: paymentMethod || undefined,
      hasVAT,
      notes: notes.trim() || undefined,
      imageUrl: fileUrl,
      imageKey: fileKey,
    });
  };

  const openEditDialog = (invoice: any) => {
    setSelectedInvoice(invoice);
    setEditSupplier(invoice.supplier || "");
    setEditInvoiceNumber(invoice.invoiceNumber || "");
    setEditInvoiceDate(invoice.invoiceDate || "");
    setEditTotalAmount(invoice.totalAmount || "");
    setEditPaymentMethod(invoice.paymentMethod || "");
    setEditNotes(invoice.notes || "");
    setIsEditDialogOpen(true);
  };

  const handleUpdateInvoice = () => {
    if (!selectedInvoice) return;
    updateInvoice.mutate({
      id: selectedInvoice.id,
      supplier: editSupplier,
      invoiceNumber: editInvoiceNumber,
      invoiceDate: editInvoiceDate,
      totalAmount: editTotalAmount,
      paymentMethod: editPaymentMethod || undefined,
      notes: editNotes,
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
      acc.total += parseFloat(inv.totalAmount || "0");
      return acc;
    }, { total: 0 });
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registrar factura</DialogTitle>
              <DialogDescription>Añade una nueva factura o ticket de gasto</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* Selector de negocio (solo cuando está en modo "Ambos") */}
              {selectedBusiness === "all" && (
                <div className="grid gap-2 p-4 border-2 border-primary/30 rounded-lg bg-primary/5">
                  <Label className="text-base font-semibold">Negocio *</Label>
                  <Select 
                    value={formBusinessId?.toString() || ""} 
                    onValueChange={(v) => setFormBusinessId(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona el negocio" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={hostelBusiness?.id.toString() || ""}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          Hostel
                        </div>
                      </SelectItem>
                      <SelectItem value={tiendaBusiness?.id.toString() || ""}>
                        <div className="flex items-center gap-2">
                          <Store className="h-4 w-4" />
                          Tienda
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Selecciona para qué negocio es esta factura. No se puede crear para ambos a la vez.
                  </p>
                </div>
              )}

              {/* Image/PDF Upload */}
              <div className="grid gap-2">
                <Label>Foto del ticket/factura o PDF</Label>
                <div className="flex gap-4">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
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
                    Subir archivo
                  </Button>
                </div>
                {imagePreview && (
                  <div className="mt-2 space-y-2">
                    <div className="relative">
                      {imagePreview.startsWith("pdf:") ? (
                        <div className="flex items-center gap-2 p-4 border rounded-lg bg-muted">
                          <FileText className="h-8 w-8 text-red-500" />
                          <span>{imagePreview.replace("pdf:", "")}</span>
                        </div>
                      ) : (
                        <img src={imagePreview} alt="Preview" className="max-h-48 rounded-lg border" />
                      )}
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        className="absolute top-2 right-2"
                        onClick={() => { setImageFile(null); setImagePreview(null); }}
                      >
                        Eliminar
                      </Button>
                    </div>
                    {!imagePreview.startsWith("pdf:") && (
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
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Proveedor</Label>
                  <Select value={supplier} onValueChange={setSupplier}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar proveedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers?.map(sup => (
                        <SelectItem key={sup.id} value={sup.name}>{sup.name}</SelectItem>
                      ))}
                      <SelectItem value="_custom">Otro (escribir)</SelectItem>
                    </SelectContent>
                  </Select>
                  {supplier === "_custom" && (
                    <Input 
                      value={customSupplier} 
                      onChange={e => setCustomSupplier(e.target.value)} 
                      placeholder="Nombre del proveedor"
                      className="mt-2"
                    />
                  )}
                </div>
                <div className="grid gap-2">
                  <Label>Nº Factura</Label>
                  <Input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} placeholder="Número de factura" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Fecha</Label>
                  <Input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Total (€) *</Label>
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
                <Label>Forma de pago</Label>
                <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethodValue)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar forma de pago" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map(method => (
                      <SelectItem key={method.value} value={method.value}>{method.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Notas</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas adicionales" />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <Checkbox 
                  id="hasVAT" 
                  checked={hasVAT} 
                  onCheckedChange={(checked) => setHasVAT(checked as boolean)}
                />
                <Label 
                  htmlFor="hasVAT" 
                  className="text-sm font-normal cursor-pointer"
                >
                  Factura con IVA / A contabilizar
                </Label>
              </div>
            </div>
            <DialogFooter>
              {!currentBusinessId && (
                <p className="text-sm text-muted-foreground mr-auto">Selecciona un negocio para continuar</p>
              )}
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateInvoice} disabled={createInvoice.isPending || !currentBusinessId}>
                {createInvoice.isPending ? "Guardando..." : "Registrar factura"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last30">Últimas 30 facturas</SelectItem>
              <SelectItem value="all">Todas las facturas</SelectItem>
              <SelectItem value="0">Enero {selectedYear}</SelectItem>
              <SelectItem value="1">Febrero {selectedYear}</SelectItem>
              <SelectItem value="2">Marzo {selectedYear}</SelectItem>
              <SelectItem value="3">Abril {selectedYear}</SelectItem>
              <SelectItem value="4">Mayo {selectedYear}</SelectItem>
              <SelectItem value="5">Junio {selectedYear}</SelectItem>
              <SelectItem value="6">Julio {selectedYear}</SelectItem>
              <SelectItem value="7">Agosto {selectedYear}</SelectItem>
              <SelectItem value="8">Septiembre {selectedYear}</SelectItem>
              <SelectItem value="9">Octubre {selectedYear}</SelectItem>
              <SelectItem value="10">Noviembre {selectedYear}</SelectItem>
              <SelectItem value="11">Diciembre {selectedYear}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {selectedMonth !== "last30" && selectedMonth !== "all" && (
          <div className="w-full sm:w-32">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {/* Mostrar desde 2025 (inicio del negocio) hasta año siguiente */}
                {Array.from(
                  { length: currentDate.getFullYear() + 1 - 2025 + 1 },
                  (_, i) => currentDate.getFullYear() + 1 - i
                ).map(year => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
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

      {/* Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Resumen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{filteredInvoices.length} facturas</span>
            <span className="text-xl font-bold">Total: €{totals.total.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Invoices List */}
      {Object.entries(invoicesByMonth).map(([month, monthInvoices]) => (
        <Card key={month}>
          <CardHeader>
            <CardTitle className="text-lg capitalize">{month}</CardTitle>
            <CardDescription>{monthInvoices.length} facturas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {monthInvoices.map(invoice => (
                <div 
                  key={invoice.id} 
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-primary/10">
                      <Receipt className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{invoice.supplier || "Sin proveedor"}</p>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        {invoice.invoiceNumber && <span>#{invoice.invoiceNumber}</span>}
                        {invoice.invoiceDate && <span>{new Date(invoice.invoiceDate + 'T00:00:00').toLocaleDateString('es-ES')}</span>}
                        {invoice.paymentMethod && <span className="text-primary">• {invoice.paymentMethod}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3 w-full sm:w-auto">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={invoice.hasVAT}
                        onCheckedChange={(checked) => {
                          updateInvoice.mutate({ id: invoice.id, hasVAT: !!checked });
                        }}
                      />
                      <span className="text-xs text-muted-foreground">
                        IVA
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={invoice.isScanned || !!invoice.imageUrl}
                        onCheckedChange={(checked) => {
                          updateInvoice.mutate({ id: invoice.id, isScanned: !!checked });
                        }}
                        disabled={!!invoice.imageUrl}
                      />
                      <span className="text-xs text-muted-foreground">
                        Escaneada
                      </span>
                    </div>
                    <div className="text-right ml-auto">
                      <p className="font-bold">€{parseFloat(invoice.totalAmount || "0").toFixed(2)}</p>
                    </div>
                    <div className="flex gap-1">
                      {!invoice.imageUrl && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*,application/pdf';
                            input.onchange = async (e) => {
                              const file = (e.target as HTMLInputElement).files?.[0];
                              if (!file) return;
                              
                              const reader = new FileReader();
                              reader.onload = async () => {
                                const base64 = reader.result as string;
                                const fileData = base64.split(',')[1];
                                const fileExtension = file.name.split('.').pop();
                                
                                try {
                                  // Generar nombre de archivo con formato
                                  const invoiceDate = invoice.invoiceDate || new Date().toISOString().split('T')[0];
                                  const date = new Date(invoiceDate + 'T00:00:00');
                                  const quarter = Math.ceil((date.getMonth() + 1) / 3);
                                  const year = date.getFullYear();
                                  const dateStr = invoiceDate.replace(/-/g, '').slice(2);
                                  const supplierName = invoice.supplier || 'Sin_Proveedor';
                                  const formattedFileName = `${supplierName} - ${quarter}T ${year} - ${dateStr}.${fileExtension}`;
                                  
                                  const uploadResult = await uploadFile.mutateAsync({
                                    fileData,
                                    fileName: formattedFileName,
                                    contentType: file.type,
                                  });
                                  
                                  await updateInvoice.mutateAsync({ 
                                    id: invoice.id, 
                                    imageUrl: uploadResult.url, 
                                    imageKey: uploadResult.key,
                                    resendEmail: true 
                                  });
                                  toast.success('Documento subido y email reenviado');
                                } catch (error) {
                                  console.error('Error al subir documento:', error);
                                  toast.error('Error al subir documento');
                                }
                              };
                              reader.readAsDataURL(file);
                            };
                            input.click();
                          }}
                          title="Subir documento"
                        >
                          <Upload className="h-4 w-4 text-blue-600" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(invoice)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => {
                          if (confirm('¿Estás seguro de que quieres eliminar esta factura?')) {
                            deleteMutation.mutate({ id: invoice.id });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {filteredInvoices.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Receipt className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>No hay facturas registradas</p>
            <Button variant="link" onClick={() => setIsDialogOpen(true)}>
              Añadir la primera
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar factura</DialogTitle>
            <DialogDescription>Modifica los datos de la factura</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Proveedor</Label>
                <Input value={editSupplier} onChange={e => setEditSupplier(e.target.value)} placeholder="Proveedor" />
              </div>
              <div className="grid gap-2">
                <Label>Nº Factura</Label>
                <Input value={editInvoiceNumber} onChange={e => setEditInvoiceNumber(e.target.value)} placeholder="Número" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Fecha</Label>
                <Input type="date" value={editInvoiceDate} onChange={e => setEditInvoiceDate(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Total (€)</Label>
                <Input type="number" step="0.01" value={editTotalAmount} onChange={e => setEditTotalAmount(e.target.value)} placeholder="0.00" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Forma de pago</Label>
              <Select value={editPaymentMethod} onValueChange={(v) => setEditPaymentMethod(v as PaymentMethodValue)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map(method => (
                    <SelectItem key={method.value} value={method.value}>{method.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Notas</Label>
              <Textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Notas" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdateInvoice} disabled={updateInvoice.isPending}>
              {updateInvoice.isPending ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

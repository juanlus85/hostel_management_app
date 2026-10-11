import { useEffect, useRef, useState } from "react";
import { Building2, Camera, FileText, Loader2, Store, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { findCommercialSupplier } from "@shared/supplierMatching";
import { getSupportedInvoiceContentType } from "@shared/invoiceUpload";

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

type PaymentMethod = (typeof PAYMENT_METHODS)[number]["value"];
type BusinessContext = "hostel" | "tienda" | "all";

type QuickReceivedInvoiceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedBusiness: BusinessContext;
};

function today(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Modal completo de nueva factura recibida para abrirse desde el Dashboard. */
export function QuickReceivedInvoiceDialog({ open, onOpenChange, selectedBusiness }: QuickReceivedInvoiceDialogProps) {
  const utils = trpc.useUtils();
  const { data: businesses } = trpc.businesses.list.useQuery();
  const { data: suppliers } = trpc.suppliers.list.useQuery();
  const uploadFile = trpc.invoices.uploadFile.useMutation();
  const processInvoiceFile = trpc.ocr.processInvoiceFile.useMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [businessId, setBusinessId] = useState<number | null>(null);
  const [supplier, setSupplier] = useState("");
  const [customSupplier, setCustomSupplier] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(today());
  const [totalAmount, setTotalAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [notes, setNotes] = useState("");
  const [hasVAT, setHasVAT] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const hasOpenedRef = useRef(false);

  const createInvoice = trpc.invoices.create.useMutation({
    onSuccess: () => {
      toast.success("Factura registrada correctamente");
      utils.invoices.list.invalidate();
      utils.dashboard.stats.invalidate();
      utils.dashboard.supplierExpenses.invalidate();
      utils.dashboard.trend.invalidate();
      resetForm();
      onOpenChange(false);
    },
    onError: (error) => toast.error(`Error: ${error.message}`),
  });

  const resetForm = () => {
    const defaultBusiness = businesses?.find((business) => business.code === selectedBusiness)?.id || null;
    setBusinessId(defaultBusiness);
    setSupplier("");
    setCustomSupplier("");
    setInvoiceNumber("");
    setInvoiceDate(today());
    setTotalAmount("");
    setPaymentMethod("");
    setNotes("");
    setHasVAT(true);
    setImageFile(null);
    setImagePreview(null);
    setIsProcessingOCR(false);
  };

  useEffect(() => {
    if (open && !hasOpenedRef.current) {
      resetForm();
      hasOpenedRef.current = true;
    }
    if (!open) hasOpenedRef.current = false;
  }, [open, businesses, selectedBusiness]);

  useEffect(() => {
    if (open && !businessId && selectedBusiness !== "all") {
      setBusinessId(businesses?.find((business) => business.code === selectedBusiness)?.id || null);
    }
  }, [open, businessId, businesses, selectedBusiness]);

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
  };

  const applyExtractedData = (data: any) => {
    if (!data) return;
    if (data.supplier?.trim()) {
      const recognisedSupplier = data.supplier.trim();
      const savedSupplier = findCommercialSupplier(suppliers, recognisedSupplier);
      if (savedSupplier) {
        setSupplier(savedSupplier.name);
        setCustomSupplier("");
      } else {
        setSupplier("_custom");
        setCustomSupplier(recognisedSupplier);
      }
    }
    if (data.invoiceNumber?.trim()) setInvoiceNumber(data.invoiceNumber.trim());
    if (/^\d{4}-\d{2}-\d{2}$/.test(data.invoiceDate || "")) setInvoiceDate(data.invoiceDate);
    if (data.totalAmount?.trim()) setTotalAmount(data.totalAmount.trim());
  };

  const handleFile = async (file: File) => {
    const contentType = getSupportedInvoiceContentType(file);
    if (!contentType) {
      toast.error("Adjunta un PDF, JPG, PNG o WEBP de una factura");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error("El archivo supera el límite de 15 MB");
      return;
    }

    setImageFile(file);
    setImagePreview(contentType === "application/pdf" ? `pdf:${file.name}` : URL.createObjectURL(file));
    setIsProcessingOCR(true);
    try {
      const fileData = await readFileAsDataUrl(file);
      const data = await processInvoiceFile.mutateAsync({ fileData, fileName: file.name, contentType });
      applyExtractedData(data);
      toast.success(data ? "Datos detectados. Revísalos antes de registrar la factura." : "No se detectaron datos. Completa los campos manualmente.");
    } catch (error: any) {
      toast.error(error?.message || "No se pudo analizar la factura. Completa los campos manualmente.");
    } finally {
      setIsProcessingOCR(false);
    }
  };

  const handleCreate = async () => {
    if (!businessId) {
      toast.error("Selecciona para qué negocio es esta factura");
      return;
    }
    const finalSupplier = supplier === "_custom" ? customSupplier.trim() : supplier;
    if (!finalSupplier) {
      toast.error("El proveedor es obligatorio para registrar una factura");
      return;
    }

    let imageUrl: string | undefined;
    let imageKey: string | undefined;
    if (imageFile) {
      const contentType = getSupportedInvoiceContentType(imageFile);
      if (!contentType) return;
      try {
        toast.info("Subiendo archivo...");
        const fileData = await readFileAsDataUrl(imageFile);
        const extension = imageFile.name.split(".").pop() || "pdf";
        const dateForName = invoiceDate || today();
        const [year, month, day] = dateForName.split("-");
        const quarter = Math.ceil(Number(month) / 3);
        const formattedName = `${finalSupplier} - ${quarter}T ${year} - ${day}${month}${year.slice(2)}.${extension}`;
        const result = await uploadFile.mutateAsync({ fileData, fileName: formattedName, contentType });
        imageUrl = result.url;
        imageKey = result.key;
      } catch (error) {
        console.error("[Dashboard] Error al subir factura", error);
        toast.error("No se pudo subir el archivo");
        return;
      }
    }

    createInvoice.mutate({
      businessId,
      supplier: finalSupplier,
      invoiceNumber: invoiceNumber.trim() || undefined,
      invoiceDate: invoiceDate || undefined,
      totalAmount: totalAmount.trim() || undefined,
      paymentMethod: paymentMethod || undefined,
      hasVAT,
      notes: notes.trim() || undefined,
      imageUrl,
      imageKey,
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar factura</DialogTitle>
          <DialogDescription>Añade una nueva factura o ticket de gasto sin salir del Dashboard.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {selectedBusiness === "all" && <div className="grid gap-2 rounded-lg border-2 border-primary/30 bg-primary/5 p-4">
            <Label className="text-base font-semibold">Negocio *</Label>
            <Select value={businessId?.toString() || ""} onValueChange={(value) => setBusinessId(Number(value))}>
              <SelectTrigger><SelectValue placeholder="Selecciona el negocio" /></SelectTrigger>
              <SelectContent>
                {businesses?.filter((business) => ["hostel", "tienda", "organizus"].includes(business.code)).map((business) => (
                  <SelectItem key={business.id} value={business.id.toString()}>
                    <span className="flex items-center gap-2">{business.code === "tienda" ? <Store className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}{business.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Cada factura se registra en un único negocio.</p>
          </div>}

          <div className="grid gap-2">
            <Label>Foto del ticket/factura o PDF</Label>
            <input ref={fileInputRef} type="file" accept="image/*,application/pdf" capture="environment" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) handleFile(file); event.target.value = ""; }} />
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
              <Button type="button" variant="outline" className="flex-1" onClick={() => fileInputRef.current?.click()}><Camera className="mr-2 h-4 w-4" />Hacer foto</Button>
              <Button type="button" variant="outline" className="flex-1" onClick={() => { fileInputRef.current?.removeAttribute("capture"); fileInputRef.current?.click(); fileInputRef.current?.setAttribute("capture", "environment"); }}><Upload className="mr-2 h-4 w-4" />Subir archivo</Button>
            </div>
            {imagePreview && <div className="mt-2 space-y-2"><div className="relative">{imagePreview.startsWith("pdf:") ? <div className="flex items-center gap-2 rounded-lg border bg-muted p-4"><FileText className="h-8 w-8 text-red-500" /><span>{imagePreview.replace("pdf:", "")}</span></div> : <img src={imagePreview} alt="Vista previa de la factura" className="max-h-48 rounded-lg border" />}<Button size="sm" variant="destructive" className="absolute right-2 top-2" onClick={() => { setImageFile(null); setImagePreview(null); }}>Eliminar</Button></div>{isProcessingOCR ? <div className="flex items-center justify-center gap-2 rounded-md bg-primary/10 px-3 py-2 text-sm font-medium text-primary"><Loader2 className="h-4 w-4 animate-spin" />Analizando factura con IA…</div> : <p className="text-xs text-muted-foreground">Los datos reconocidos se muestran arriba. Revísalos antes de guardar.</p>}</div>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2"><Label>Proveedor *</Label><Select value={supplier} onValueChange={setSupplier}><SelectTrigger><SelectValue placeholder="Seleccionar proveedor" /></SelectTrigger><SelectContent>{suppliers?.map((item) => <SelectItem key={item.id} value={item.name}>{item.name}</SelectItem>)}<SelectItem value="_custom">Otro (escribir)</SelectItem></SelectContent></Select>{supplier === "_custom" && <Input value={customSupplier} onChange={(event) => setCustomSupplier(event.target.value)} placeholder="Nombre del proveedor" />}</div>
            <div className="grid gap-2"><Label>Nº factura</Label><Input value={invoiceNumber} onChange={(event) => setInvoiceNumber(event.target.value)} placeholder="Número de factura" /></div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div className="grid gap-2"><Label>Fecha</Label><Input type="date" value={invoiceDate} onChange={(event) => setInvoiceDate(event.target.value)} /></div><div className="grid gap-2"><Label>Total (€)</Label><Input type="number" step="0.01" value={totalAmount} onChange={(event) => setTotalAmount(event.target.value)} placeholder="0.00" /></div></div>
          <div className="grid gap-2"><Label>Forma de pago</Label><Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}><SelectTrigger><SelectValue placeholder="Seleccionar forma de pago" /></SelectTrigger><SelectContent>{PAYMENT_METHODS.map((method) => <SelectItem key={method.value} value={method.value}>{method.label}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid gap-2"><Label>Notas</Label><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Notas adicionales" /></div>
          <div className="flex items-center space-x-2"><Checkbox id="quick-invoice-vat" checked={hasVAT} onCheckedChange={(value) => setHasVAT(value as boolean)} /><Label htmlFor="quick-invoice-vat" className="cursor-pointer text-sm font-normal">Factura con IVA / A contabilizar</Label></div>
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row"><Button className="w-full sm:w-auto" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button className="w-full sm:w-auto" onClick={handleCreate} disabled={createInvoice.isPending || uploadFile.isPending}>{createInvoice.isPending || uploadFile.isPending ? "Guardando..." : "Registrar factura"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

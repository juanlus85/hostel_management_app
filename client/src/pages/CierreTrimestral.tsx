import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useBusinessContext } from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { 
  Calendar, Download, FileArchive, FileText, Receipt, 
  TrendingUp, TrendingDown, DollarSign, AlertTriangle
} from "lucide-react";

const QUARTERS = [
  { value: "Q1", label: "1er Trimestre (Ene-Mar)", months: [0, 1, 2] },
  { value: "Q2", label: "2do Trimestre (Abr-Jun)", months: [3, 4, 5] },
  { value: "Q3", label: "3er Trimestre (Jul-Sep)", months: [6, 7, 8] },
  { value: "Q4", label: "4to Trimestre (Oct-Dic)", months: [9, 10, 11] },
];

export default function CierreTrimestral() {
  const { user } = useAuth();
  const { selectedBusiness } = useBusinessContext();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [selectedQuarter, setSelectedQuarter] = useState("Q4");
  const [isExporting, setIsExporting] = useState(false);

  const { data: businesses } = trpc.businesses.list.useQuery();
  
  const currentBusinessId = useMemo(() => {
    if (selectedBusiness === "all") return businesses?.[0]?.id;
    return businesses?.find(b => b.code === selectedBusiness)?.id;
  }, [businesses, selectedBusiness]);

  // Calculate date range for selected quarter
  const dateRange = useMemo(() => {
    const quarter = QUARTERS.find(q => q.value === selectedQuarter);
    if (!quarter) return { start: "", end: "" };
    
    const year = parseInt(selectedYear);
    const startMonth = quarter.months[0];
    const endMonth = quarter.months[2];
    
    const startDate = new Date(year, startMonth, 1);
    const endDate = new Date(year, endMonth + 1, 0); // Last day of end month
    
    return {
      start: startDate.toISOString().split("T")[0],
      end: endDate.toISOString().split("T")[0],
    };
  }, [selectedYear, selectedQuarter]);

  // Check if quarter can be closed (must be after quarter ends)
  const canCloseQuarter = useMemo(() => {
    const quarter = QUARTERS.find(q => q.value === selectedQuarter);
    if (!quarter) return false;
    
    const year = parseInt(selectedYear);
    const endMonth = quarter.months[2];
    const quarterEndDate = new Date(year, endMonth + 1, 0);
    
    return new Date() > quarterEndDate;
  }, [selectedYear, selectedQuarter]);

  // Fetch data for the quarter
  const { data: cashClosings } = trpc.cashClosings.list.useQuery(
    { businessId: currentBusinessId || 1, startDate: dateRange.start, endDate: dateRange.end },
    { enabled: !!currentBusinessId && !!dateRange.start }
  );

  const { data: invoices } = trpc.invoices.list.useQuery(
    { businessId: currentBusinessId || 1 },
    { enabled: !!currentBusinessId }
  );

  // Filter invoices by date range
  const quarterInvoices = useMemo(() => {
    if (!invoices) return [];
    return invoices.filter((inv: any) => {
      const invDate = inv.date;
      return invDate >= dateRange.start && invDate <= dateRange.end;
    });
  }, [invoices, dateRange]);

  // Calculate summary
  const summary = useMemo(() => {
    let totalIncome = 0;
    let totalExpenses = 0;
    let withdrawnCash = 0;
    let withdrawnCards = 0;
    let totalDifference = 0;
    let closedDays = 0;

    cashClosings?.forEach((closing: any) => {
      if (closing.status === "closed") {
        closedDays++;
        // Usar zReading como ingresos (la Z de caja)
        totalIncome += parseFloat(closing.zReading || "0");
        withdrawnCash += parseFloat(closing.withdrawnCash || "0");
        withdrawnCards += parseFloat(closing.withdrawnCards || "0");
        totalDifference += parseFloat(closing.difference || "0");
      }
    });

    quarterInvoices.forEach((inv: any) => {
      totalExpenses += parseFloat(inv.total || "0");
    });

    return {
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses,
      withdrawnCash,
      withdrawnCards,
      totalDifference,
      closedDays,
      totalInvoices: quarterInvoices.length,
    };
  }, [cashClosings, quarterInvoices]);

  // Fetch CSV data for export
  const { data: csvData } = trpc.cashClosings.exportCSV.useQuery(
    { businessId: currentBusinessId || 1, startDate: dateRange.start, endDate: dateRange.end },
    { enabled: !!currentBusinessId && !!dateRange.start }
  );

  const handleExportZip = async () => {
    if (!currentBusinessId) {
      toast.error("Selecciona un negocio");
      return;
    }

    if (!csvData) {
      toast.error("Cargando datos...");
      return;
    }

    setIsExporting(true);
    try {

      // Create CSV content for invoices
      const invoicesCsv = [
        "Fecha,Proveedor,Nº Factura,Total,Forma de Pago,Notas",
        ...quarterInvoices.map((inv: any) => 
          `${inv.date},${inv.supplier},${inv.invoiceNumber},${inv.total},${inv.paymentMethod || ""},${inv.notes || ""}`
        )
      ].join("\n");

      // Create summary CSV
      const summaryCsv = [
        "Resumen Trimestral",
        `Período,${dateRange.start} a ${dateRange.end}`,
        `Negocio,${selectedBusiness === "hostel" ? "Hostel" : "Tienda"}`,
        "",
        "Concepto,Importe",
        `Total Ingresos,${summary.totalIncome.toFixed(2)}`,
        `Total Gastos (Facturas),${summary.totalExpenses.toFixed(2)}`,
        `Balance,${summary.balance.toFixed(2)}`,
        "",
        `Total Efectivo,${summary.withdrawnCash.toFixed(2)}`,
        `Total Tarjetas,${summary.withdrawnCards.toFixed(2)}`,
        `Descuadre Acumulado,${summary.totalDifference.toFixed(2)}`,
        "",
        `Días Cerrados,${summary.closedDays}`,
        `Facturas Registradas,${summary.totalInvoices}`,
      ].join("\n");

      // Create a simple download of the CSVs (in a real app, we'd create a ZIP)
      // For now, download each file separately
      const downloadCsv = (content: string, filename: string) => {
        const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      };

      const businessName = selectedBusiness === "hostel" ? "Hostel" : "Tienda";
      const prefix = `${selectedYear}_${selectedQuarter}_${businessName}`;

      downloadCsv(csvData, `${prefix}_Cierres_Caja.csv`);
      setTimeout(() => downloadCsv(invoicesCsv, `${prefix}_Facturas.csv`), 500);
      setTimeout(() => downloadCsv(summaryCsv, `${prefix}_Resumen.csv`), 1000);

      toast.success("Archivos exportados correctamente");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Error al exportar los datos");
    } finally {
      setIsExporting(false);
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());
  const businessLabel = selectedBusiness === "hostel" ? "Hostel" : selectedBusiness === "tienda" ? "Tienda" : "Ambos";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            Cierre Trimestral - {businessLabel}
          </h1>
          <p className="text-muted-foreground">Exporta y revisa los datos de cada trimestre</p>
        </div>
      </div>

      {/* Quarter Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Seleccionar Trimestre</CardTitle>
          <CardDescription>Elige el año y trimestre que deseas revisar o exportar</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Año</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Trimestre</label>
              <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUARTERS.map(q => (
                    <SelectItem key={q.value} value={q.value}>{q.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="mt-4 flex items-center gap-2">
            <Badge variant={canCloseQuarter ? "default" : "secondary"}>
              {canCloseQuarter ? "Trimestre finalizado" : "Trimestre en curso"}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Período: {dateRange.start} a {dateRange.end}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Total Ingresos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">€{summary.totalIncome.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">
              Efectivo: €{summary.withdrawnCash.toFixed(2)} | Tarjetas: €{summary.withdrawnCards.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              Total Gastos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">€{summary.totalExpenses.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">{summary.totalInvoices} facturas registradas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-600" />
              Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${summary.balance >= 0 ? "text-green-600" : "text-red-600"}`}>
              €{summary.balance.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">Ingresos - Gastos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Descuadre Acumulado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${summary.totalDifference === 0 ? "text-green-600" : summary.totalDifference > 0 ? "text-blue-600" : "text-red-600"}`}>
              €{summary.totalDifference.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">{summary.closedDays} días cerrados</p>
          </CardContent>
        </Card>
      </div>

      {/* Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileArchive className="h-5 w-5" />
            Exportar Datos del Trimestre
          </CardTitle>
          <CardDescription>
            Descarga todos los datos del trimestre en formato CSV para contabilidad o inspecciones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <FileText className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="font-medium">Cierres de Caja</p>
                  <p className="text-sm text-muted-foreground">{summary.closedDays} registros</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <Receipt className="h-8 w-8 text-green-600" />
                <div>
                  <p className="font-medium">Facturas</p>
                  <p className="text-sm text-muted-foreground">{summary.totalInvoices} registros</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <FileArchive className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="font-medium">Resumen</p>
                  <p className="text-sm text-muted-foreground">Totales del trimestre</p>
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Se descargarán 3 archivos CSV: Cierres de Caja, Facturas y Resumen del trimestre.
              </p>
              <Button 
                onClick={handleExportZip} 
                disabled={isExporting}
                className="w-full sm:w-auto"
              >
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? "Exportando..." : "Exportar CSV"}
              </Button>
            </div>

            {!canCloseQuarter && (
              <p className="text-sm text-amber-600 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Trimestre en curso. Los datos exportados son parciales hasta la fecha actual.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

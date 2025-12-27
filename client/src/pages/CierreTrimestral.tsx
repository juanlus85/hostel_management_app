import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useBusinessContext } from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  
  const businessIds = useMemo(() => {
    if (selectedBusiness === "all") {
      return businesses?.map(b => b.id) || [];
    }
    const business = businesses?.find(b => b.code === selectedBusiness);
    return business ? [business.id] : [];
  }, [businesses, selectedBusiness]);

  const currentBusinessId = businessIds[0];

  // Calculate date range for selected quarter
  const dateRange = useMemo(() => {
    const quarter = QUARTERS.find(q => q.value === selectedQuarter);
    if (!quarter) return { start: "", end: "" };
    
    const year = parseInt(selectedYear);
    const startMonth = quarter.months[0];
    const endMonth = quarter.months[2];
    
    const startDate = new Date(year, startMonth, 1);
    const endDate = new Date(year, endMonth + 1, 0); // Last day of end month
    
    // Format dates as YYYY-MM-DD in local timezone to avoid UTC offset issues
    const formatDate = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };
    
    return {
      start: formatDate(startDate),
      end: formatDate(endDate),
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

  // Fetch data for the quarter - handle multiple businesses
  const hostelId = businesses?.find(b => b.code === "hostel")?.id;
  const tiendaId = businesses?.find(b => b.code === "tienda")?.id;

  const { data: hostelClosings } = trpc.cashClosings.list.useQuery(
    { businessId: hostelId || 1, startDate: dateRange.start, endDate: dateRange.end },
    { enabled: !!hostelId && !!dateRange.start && (selectedBusiness === "all" || selectedBusiness === "hostel") }
  );

  const { data: tiendaClosings } = trpc.cashClosings.list.useQuery(
    { businessId: tiendaId || 2, startDate: dateRange.start, endDate: dateRange.end },
    { enabled: !!tiendaId && !!dateRange.start && (selectedBusiness === "all" || selectedBusiness === "tienda") }
  );

  const { data: hostelInvoices } = trpc.invoices.list.useQuery(
    { businessId: hostelId || 1, startDate: dateRange.start, endDate: dateRange.end },
    { enabled: !!hostelId && !!dateRange.start && (selectedBusiness === "all" || selectedBusiness === "hostel") }
  );

  const { data: tiendaInvoices } = trpc.invoices.list.useQuery(
    { businessId: tiendaId || 2, startDate: dateRange.start, endDate: dateRange.end },
    { enabled: !!tiendaId && !!dateRange.start && (selectedBusiness === "all" || selectedBusiness === "tienda") }
  );

  const { data: hostelOtrosGastos } = trpc.otrosGastos.list.useQuery(
    { businessId: hostelId || 1, startDate: dateRange.start, endDate: dateRange.end },
    { enabled: !!hostelId && !!dateRange.start && (selectedBusiness === "all" || selectedBusiness === "hostel") }
  );

  const { data: tiendaOtrosGastos } = trpc.otrosGastos.list.useQuery(
    { businessId: tiendaId || 2, startDate: dateRange.start, endDate: dateRange.end },
    { enabled: !!tiendaId && !!dateRange.start && (selectedBusiness === "all" || selectedBusiness === "tienda") }
  );

  // Combine data based on selection
  const cashClosings = useMemo(() => {
    if (selectedBusiness === "all") {
      return [...(hostelClosings || []), ...(tiendaClosings || [])];
    }
    if (selectedBusiness === "hostel") return hostelClosings || [];
    if (selectedBusiness === "tienda") return tiendaClosings || [];
    return [];
  }, [selectedBusiness, hostelClosings, tiendaClosings]);

  const invoices = useMemo(() => {
    if (selectedBusiness === "all") {
      return [...(hostelInvoices || []), ...(tiendaInvoices || [])];
    }
    if (selectedBusiness === "hostel") return hostelInvoices || [];
    if (selectedBusiness === "tienda") return tiendaInvoices || [];
    return [];
  }, [selectedBusiness, hostelInvoices, tiendaInvoices]);

  const otrosGastos = useMemo(() => {
    if (selectedBusiness === "all") {
      return [...(hostelOtrosGastos || []), ...(tiendaOtrosGastos || [])];
    }
    if (selectedBusiness === "hostel") return hostelOtrosGastos || [];
    if (selectedBusiness === "tienda") return tiendaOtrosGastos || [];
    return [];
  }, [selectedBusiness, hostelOtrosGastos, tiendaOtrosGastos]);

  // Invoices are already filtered by backend
  const quarterInvoices = invoices || [];

  // Combinar todos los gastos y ordenarlos por monto
  const allExpenses = useMemo(() => {
    const expenses: Array<{
      type: 'factura' | 'otro_gasto';
      supplier: string;
      amount: number;
      date: string;
      description?: string;
      business: string;
    }> = [];

    // Agregar facturas
    quarterInvoices.forEach((inv: any) => {
      expenses.push({
        type: 'factura',
        supplier: inv.supplier || 'Sin proveedor',
        amount: parseFloat(inv.totalAmount || '0'),
        date: inv.invoiceDate || '',
        business: inv.businessId === hostelId ? 'Hostel' : 'Tienda'
      });
    });

    // Agregar otros gastos
    otrosGastos.forEach((item: any) => {
      if (item.type === 'gasto') {
        expenses.push({
          type: 'otro_gasto',
          supplier: item.concepto || 'Sin concepto',
          amount: parseFloat(item.importe || '0'),
          date: item.fecha || '',
          description: item.descripcion,
          business: item.businessId === hostelId ? 'Hostel' : 'Tienda'
        });
      }
    });

    // Ordenar por monto descendente
    return expenses.sort((a, b) => b.amount - a.amount);
  }, [quarterInvoices, otrosGastos, hostelId]);

  // Calculate summary
  const summary = useMemo(() => {
    let totalIncomeZ = 0; // Ingresos de caja (zReading)
    let otherIncome = 0; // Otros ingresos (type='ingreso')
    let totalExpenses = 0;
    let withdrawnCash = 0;
    let withdrawnCards = 0;
    let totalDifference = 0;
    let closedDays = 0;

    cashClosings?.forEach((closing: any) => {
      if (closing.status === "closed") {
        closedDays++;
        // Usar zReading como ingresos (la Z de caja)
        totalIncomeZ += parseFloat(closing.zReading || "0");
        withdrawnCash += parseFloat(closing.withdrawnCash || "0");
        withdrawnCards += parseFloat(closing.withdrawnCards || "0");
        totalDifference += parseFloat(closing.difference || "0");
      }
    });

    quarterInvoices.forEach((inv: any) => {
      totalExpenses += parseFloat(inv.totalAmount || "0");
    });

    otrosGastos.forEach((item: any) => {
      if (item.type === 'gasto') {
        totalExpenses += parseFloat(item.importe || "0");
      } else if (item.type === 'ingreso') {
        otherIncome += parseFloat(item.importe || "0");
      }
    });

    const totalIncome = totalIncomeZ + otherIncome;

    return {
      totalIncomeZ,
      otherIncome,
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses,
      withdrawnCash,
      withdrawnCards,
      totalDifference,
      closedDays,
      totalInvoices: quarterInvoices.length,
    };
  }, [cashClosings, quarterInvoices, otrosGastos]);

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
          `${inv.invoiceDate},${inv.supplier},${inv.invoiceNumber},${inv.totalAmount},${inv.paymentMethod || ""},${inv.notes || ""}`
        )
      ].join("\n");

      // Create CSV content for otros gastos
      const otrosGastosCsv = [
        "Fecha,Concepto,Categoría,Importe,Notas",
        ...otrosGastos.map((gasto: any) => {
          const categoria = gasto.categoria === "otros" && gasto.categoriaOtros 
            ? gasto.categoriaOtros 
            : gasto.categoria;
          return `${gasto.fecha},${gasto.concepto},${categoria},${gasto.importe},${gasto.notas || ""}`;
        })
      ].join("\n");

      // Create summary CSV
      const summaryCsv = [
        "Resumen Trimestral",
        `Período,${dateRange.start} a ${dateRange.end}`,
        `Negocio,${selectedBusiness === "hostel" ? "Hostel" : "Tienda"}`,
        "",
        "Concepto,Importe",
        `Total Ingresos,${summary.totalIncome.toFixed(2)}`,
        `Total Gastos (Facturas + Otros),${summary.totalExpenses.toFixed(2)}`,
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
      setTimeout(() => downloadCsv(otrosGastosCsv, `${prefix}_Otros_Gastos.csv`), 1000);
      setTimeout(() => downloadCsv(summaryCsv, `${prefix}_Resumen.csv`), 1500);

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

      {/* Tabs */}
      <Tabs key={`${selectedYear}-${selectedQuarter}`} defaultValue="resumen" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3">
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="gastos">Gastos Detallados</TabsTrigger>
          <TabsTrigger value="graficos">Gráficos</TabsTrigger>
        </TabsList>

        {/* Pestaña Resumen */}
        <TabsContent value="resumen" className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Ingresos (Z)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">€{summary.totalIncomeZ.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">
              Efectivo: €{summary.withdrawnCash.toFixed(2)} | Tarjetas: €{summary.withdrawnCards.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Otros Ingresos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">€{summary.otherIncome.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Otros ingresos</p>
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
            <p className="text-xs text-muted-foreground">{summary.totalInvoices} facturas</p>
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
            <p className="text-xs text-muted-foreground">Resultado neto</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Descuadre
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${summary.totalDifference === 0 ? "text-green-600" : summary.totalDifference > 0 ? "text-blue-600" : "text-red-600"}`}>
              €{summary.totalDifference.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">{summary.closedDays} días</p>
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
        </TabsContent>

        {/* Pestaña Gastos Detallados */}
        <TabsContent value="gastos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gastos del Trimestre</CardTitle>
              <CardDescription>
                Listado completo de facturas y otros gastos ordenados por monto
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {allExpenses.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No hay gastos registrados en este trimestre</p>
                ) : (
                  <div className="space-y-2">
                    {allExpenses.map((expense, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={expense.type === 'factura' ? 'default' : 'secondary'}>
                              {expense.type === 'factura' ? 'Factura' : 'Otro Gasto'}
                            </Badge>
                            <span className="font-medium">{expense.supplier}</span>
                            <span className="text-sm text-muted-foreground">({expense.business})</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">{expense.date}</span>
                            {expense.description && (
                              <span className="text-xs text-muted-foreground">• {expense.description}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-red-600">€{expense.amount.toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pestaña Gráficos */}
        <TabsContent value="graficos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gráficos y Estadísticas</CardTitle>
              <CardDescription>
                Visualizaciones del trimestre (próximamente)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground py-8">Gráficos en desarrollo</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

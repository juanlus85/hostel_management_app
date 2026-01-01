import { useMemo, useState, useEffect } from "react";
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
  TrendingUp, TrendingDown, DollarSign, AlertTriangle, Filter, ArrowUpDown
} from "lucide-react";
import * as XLSX from 'xlsx';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale);

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
  const [selectedExpenses, setSelectedExpenses] = useState<Set<string>>(new Set());
  const [businessFilter, setBusinessFilter] = useState<'all' | 'hostel' | 'tienda'>('all');
  const [sortBy, setSortBy] = useState<'amount' | 'name'>('amount');

  const { data: businesses } = trpc.businesses.list.useQuery();
  
  // Get available years dynamically from database
  const { data: availableYears } = trpc.utils.getAvailableYears.useQuery();
  const yearOptions = availableYears || [currentYear];
  
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
  // Agrupar gastos por proveedor/concepto
  const groupedExpenses = useMemo(() => {
    const groups = new Map<string, { supplier: string; total: number; count: number; businesses: Set<string> }>();

    // Agregar facturas
    quarterInvoices.forEach((inv: any) => {
      const supplier = inv.supplier || 'Sin proveedor';
      const amount = parseFloat(inv.totalAmount || '0');
      const business = inv.businessId === hostelId ? 'Hostel' : 'Tienda';
      
      if (!groups.has(supplier)) {
        groups.set(supplier, { supplier, total: 0, count: 0, businesses: new Set() });
      }
      const group = groups.get(supplier)!;
      group.total += amount;
      group.count += 1;
      group.businesses.add(business);
    });

    // Agregar otros gastos
    otrosGastos.forEach((item: any) => {
      if (item.type === 'gasto') {
        const supplier = item.concepto || 'Sin concepto';
        const amount = parseFloat(item.importe || '0');
        const business = item.businessId === hostelId ? 'Hostel' : 'Tienda';
        
        if (!groups.has(supplier)) {
          groups.set(supplier, { supplier, total: 0, count: 0, businesses: new Set() });
        }
        const group = groups.get(supplier)!;
        group.total += amount;
        group.count += 1;
        group.businesses.add(business);
      }
    });

    // Convertir a array
    return Array.from(groups.values())
      .map(g => ({
        supplier: g.supplier,
        total: g.total,
        count: g.count,
        businesses: Array.from(g.businesses).join(', '),
        businessSet: g.businesses
      }));
  }, [quarterInvoices, otrosGastos, hostelId]);

  // Inicializar todos los checkboxes como seleccionados
  useEffect(() => {
    if (groupedExpenses.length > 0) {
      setSelectedExpenses(new Set(groupedExpenses.map(e => e.supplier)));
    }
  }, [groupedExpenses]);

  // Calcular total de gastos seleccionados
  const totalSelectedExpenses = useMemo(() => {
    return groupedExpenses
      .filter(e => selectedExpenses.has(e.supplier))
      .reduce((sum, e) => sum + e.total, 0);
  }, [groupedExpenses, selectedExpenses]);

  // Filtrar y ordenar gastos
  const filteredAndSortedExpenses = useMemo(() => {
    let filtered = groupedExpenses;
    
    // Filtrar por negocio
    if (businessFilter !== 'all') {
      const filterName = businessFilter === 'hostel' ? 'Hostel' : 'Tienda';
      filtered = filtered.filter(e => e.businessSet.has(filterName));
    }
    
    // Ordenar
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'amount') {
        return b.total - a.total;
      } else {
        return a.supplier.localeCompare(b.supplier);
      }
    });
    
    return sorted;
  }, [groupedExpenses, businessFilter, sortBy]);

  // Toggle checkbox
  const toggleExpense = (supplier: string) => {
    setSelectedExpenses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(supplier)) {
        newSet.delete(supplier);
      } else {
        newSet.add(supplier);
      }
      return newSet;
    });
  };

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

  // Exportar gastos agrupados  };

  const handleExportXLSX = () => {
    if (!hostelClosings && !tiendaClosings) {
      toast.error("No hay datos de cierres de caja para exportar");
      return;
    }

    try {
      const workbook = XLSX.utils.book_new();
      
      // Get quarter info
      const quarter = QUARTERS.find(q => q.value === selectedQuarter);
      if (!quarter) return;
      
      const monthNames = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", 
                          "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
      
      // Calculate totals per month and business from closings data
      const hostelByMonth: Record<number, number> = {};
      const tiendaByMonth: Record<number, number> = {};
      
      // Process hostel closings
      if (hostelClosings) {
        hostelClosings.forEach((closing: any) => {
          const date = new Date(closing.date);
          const month = date.getMonth();
          const year = date.getFullYear();
          
          // Only include data from selected year and quarter months
          if (year === parseInt(selectedYear.toString()) && quarter.months.includes(month)) {
            const zReading = parseFloat(closing.zReading) || 0;
            hostelByMonth[month] = (hostelByMonth[month] || 0) + zReading;
          }
        });
      }
      
      // Process tienda closings
      if (tiendaClosings) {
        tiendaClosings.forEach((closing: any) => {
          const date = new Date(closing.date);
          const month = date.getMonth();
          const year = date.getFullYear();
          
          // Only include data from selected year and quarter months
          if (year === parseInt(selectedYear.toString()) && quarter.months.includes(month)) {
            const zReading = parseFloat(closing.zReading) || 0;
            tiendaByMonth[month] = (tiendaByMonth[month] || 0) + zReading;
          }
        });
      }
      
      // Build worksheet data with formulas
      const data: any[][] = [];
      let currentRow = 1;
      
      // Title
      data.push([`INGRESOS ${selectedQuarter} ${selectedYear}`]);
      currentRow++;
      data.push([]);
      currentRow++;
      
      // HOSTEL section
      data.push(["HOSTEL"]);
      currentRow++;
      
      const hostelValueRows: number[] = [];
      quarter.months.forEach(monthIdx => {
        const monthName = monthNames[monthIdx];
        data.push([monthName]);
        currentRow++;
        
        const value = hostelByMonth[monthIdx] || 0;
        data.push(["Total", "", value]);
        hostelValueRows.push(currentRow);
        currentRow++;
        
        data.push([]);
        currentRow++;
      });
      
      // Total Trimestre with SUM formula
      const hostelFormula = hostelValueRows.map(row => `C${row}`).join('+');
      data.push(["Total Trimestre", "", { f: hostelFormula }]);
      currentRow++;
      
      data.push([]);
      currentRow++;
      data.push([]);
      currentRow++;
      
      // SWEET & SALTY section
      data.push(["SWEET & SALTY"]);
      currentRow++;
      
      const tiendaValueRows: number[] = [];
      quarter.months.forEach(monthIdx => {
        const monthName = monthNames[monthIdx];
        data.push([monthName]);
        currentRow++;
        
        const value = tiendaByMonth[monthIdx] || 0;
        data.push(["Total", "", value]);
        tiendaValueRows.push(currentRow);
        currentRow++;
        
        data.push([]);
        currentRow++;
      });
      
      // Total Trimestre with SUM formula
      const tiendaFormula = tiendaValueRows.map(row => `C${row}`).join('+');
      data.push(["Total Trimestre", "", { f: tiendaFormula }]);
      
      // Create worksheet
      const worksheet = XLSX.utils.aoa_to_sheet(data);
      
      // Format currency cells
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      for (let R = range.s.r; R <= range.e.r; ++R) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: 2 }); // Column C
        const cell = worksheet[cellAddress];
        if (cell && (typeof cell.v === 'number' || cell.f)) {
          cell.z = '#,##0.00"€"';
        }
      }
      
      // Set column widths
      worksheet['!cols'] = [
        { wch: 20 }, // Column A
        { wch: 15 }, // Column B
        { wch: 15 }, // Column C
        { wch: 15 }  // Column D
      ];
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, "Ingresos Trimestre");
      
      // Generate file and download
      const filename = `INGRESOS_${selectedQuarter}_${selectedYear}.xlsx`;
      XLSX.writeFile(workbook, filename);
      
      toast.success("Archivo XLSX exportado correctamente");
    } catch (error) {
      console.error("Export XLSX error:", error);
      toast.error("Error al exportar el archivo XLSX");
    }
  };

  const exportGroupedExpensesCSV = () => {
    const csvContent = [
      "Proveedor/Concepto,Total,Registros,Negocios",
      ...filteredAndSortedExpenses.map(e => 
        `${e.supplier},${e.total.toFixed(2)},${e.count},${e.businesses}`
      ),
      "",
      `Total,${filteredAndSortedExpenses.reduce((sum, e) => sum + e.total, 0).toFixed(2)}`
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const businessName = businessFilter === 'all' ? 'Todos' : businessFilter === 'hostel' ? 'Hostel' : 'Tienda';
    link.download = `${selectedYear}_${selectedQuarter}_Gastos_Agrupados_${businessName}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("CSV exportado correctamente");
  };

  const years = yearOptions.slice().reverse().map(y => y.toString());
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
              <div className="flex flex-wrap gap-3">
                <Button 
                  onClick={handleExportZip} 
                  disabled={isExporting}
                  className="w-full sm:w-auto"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isExporting ? "Exportando..." : "Exportar CSV"}
                </Button>
                <Button 
                  onClick={handleExportXLSX} 
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Exportar Ingresos Trimestre en XLSX
                </Button>
              </div>
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
                Selecciona los gastos a incluir en el total declarable
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Total de gastos seleccionados */}
              <div className="mb-6 p-4 bg-muted/50 rounded-lg border-2 border-primary/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Declarable</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedExpenses.size} de {groupedExpenses.length} conceptos seleccionados
                    </p>
                  </div>
                  <p className="text-3xl font-bold text-primary">€{totalSelectedExpenses.toFixed(2)}</p>
                </div>
              </div>

              {/* Filtros y ordenamiento */}
              <div className="flex flex-wrap gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={businessFilter} onValueChange={(v: any) => setBusinessFilter(v)}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="hostel">Hostel</SelectItem>
                      <SelectItem value="tienda">Tienda</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                  <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="amount">Por monto</SelectItem>
                      <SelectItem value="name">Por nombre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportGroupedExpensesCSV}
                  className="ml-auto"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar CSV
                </Button>
              </div>

              <div className="space-y-2">
                {filteredAndSortedExpenses.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No hay gastos registrados en este trimestre</p>
                ) : (
                  <div className="space-y-2">
                    {filteredAndSortedExpenses.map((expense, index) => (
                      <div key={index} className="flex items-center gap-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedExpenses.has(expense.supplier)}
                          onChange={() => toggleExpense(expense.supplier)}
                          className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-semibold">{expense.supplier}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-sm text-muted-foreground">{expense.count} {expense.count === 1 ? 'registro' : 'registros'}</span>
                            <span className="text-sm text-muted-foreground">• {expense.businesses}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-red-600">€{expense.total.toFixed(2)}</p>
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
              <CardTitle>Distribución de Gastos por Proveedor</CardTitle>
              <CardDescription>
                Visualización de los gastos del trimestre agrupados por proveedor/concepto
              </CardDescription>
            </CardHeader>
            <CardContent>
              {groupedExpenses.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No hay gastos registrados en este trimestre</p>
              ) : (
                <div className="max-w-2xl mx-auto">
                  <Pie
                    data={{
                      labels: groupedExpenses.slice(0, 10).map(e => e.supplier),
                      datasets: [
                        {
                          label: 'Gastos',
                          data: groupedExpenses.slice(0, 10).map(e => e.total),
                          backgroundColor: [
                            'rgba(255, 99, 132, 0.8)',
                            'rgba(54, 162, 235, 0.8)',
                            'rgba(255, 206, 86, 0.8)',
                            'rgba(75, 192, 192, 0.8)',
                            'rgba(153, 102, 255, 0.8)',
                            'rgba(255, 159, 64, 0.8)',
                            'rgba(199, 199, 199, 0.8)',
                            'rgba(83, 102, 255, 0.8)',
                            'rgba(255, 99, 255, 0.8)',
                            'rgba(99, 255, 132, 0.8)',
                          ],
                          borderColor: [
                            'rgba(255, 99, 132, 1)',
                            'rgba(54, 162, 235, 1)',
                            'rgba(255, 206, 86, 1)',
                            'rgba(75, 192, 192, 1)',
                            'rgba(153, 102, 255, 1)',
                            'rgba(255, 159, 64, 1)',
                            'rgba(199, 199, 199, 1)',
                            'rgba(83, 102, 255, 1)',
                            'rgba(255, 99, 255, 1)',
                            'rgba(99, 255, 132, 1)',
                          ],
                          borderWidth: 1,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: true,
                      plugins: {
                        legend: {
                          position: 'bottom',
                          labels: {
                            boxWidth: 15,
                            padding: 10,
                          },
                        },
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              const label = context.label || '';
                              const value = context.parsed || 0;
                              const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                              const percentage = ((value / total) * 100).toFixed(1);
                              return `${label}: €${value.toFixed(2)} (${percentage}%)`;
                            }
                          }
                        }
                      },
                    }}
                  />
                  {groupedExpenses.length > 10 && (
                    <p className="text-sm text-muted-foreground text-center mt-4">
                      Mostrando los 10 proveedores con mayor gasto. Total: {groupedExpenses.length} proveedores.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

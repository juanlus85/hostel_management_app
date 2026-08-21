import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { cumulativeMonthlySeries, toggleSelectedYear } from "@shared/historicalAccumulated";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, Calendar } from "lucide-react";
import { Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export default function HistoricoCajas() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [chartView, setChartView] = useState<'annual' | 'monthly'>('annual');
  const [selectedMonth, setSelectedMonth] = useState(1); // 1 = Enero
  const [dataToShow, setDataToShow] = useState<'hostel' | 'tienda' | 'total' | 'hostel_tienda' | 'all'>('all');
  const [acumuladosDataToShow, setAcumuladosDataToShow] = useState<'hostel' | 'tienda' | 'total' | 'all'>('all');
  const [acumuladosView, setAcumuladosView] = useState<'single' | 'multi'>('single'); // single year or multi-year comparison
  const [selectedAccumulatedYears, setSelectedAccumulatedYears] = useState<number[]>([currentYear]);

  // Fetch historical data (2014-2025)
  const { data: historicalData } = trpc.historicalCash.getHistoricalData.useQuery();
  
  // Fetch aggregated data for graphics
  const { data: aggregatedData } = trpc.historicalCash.getAggregatedData.useQuery();
  
  // Fetch current year data (2026+)
  const { data: currentYearData } = trpc.historicalCash.getCurrentYearData.useQuery(
    { year: selectedYear },
    { enabled: selectedYear >= 2026 }
  );

  const { data: currentYearDailyData, isLoading: isLoadingDailySales } = trpc.historicalCash.getCurrentYearDailyData.useQuery({
    year: currentYear,
  });

  // Get available years dynamically from database
  const { data: availableYears, isLoading: isLoadingYears } = trpc.utils.getAvailableYears.useQuery();
  const yearOptions = availableYears || [currentYear];
  
  // Show loading state while fetching years
  if (isLoadingYears) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Cargando...</div>
        </div>
      </div>
    );
  }

  // Filter data by selected year
  const yearData = historicalData?.filter(d => d.year === selectedYear) || [];

  // Prepare data for annual view table
  const prepareAnnualData = () => {
    if (selectedYear >= 2026 && currentYearData) {
      // Use current year data from database
      const hostelData = currentYearData.hostel || [];
      const tiendaData = currentYearData.tienda || [];
      
      return MONTHS.map((month, idx) => {
        const monthNum = idx + 1;
        const hostel = hostelData.find(d => d.month === monthNum);
        const tienda = tiendaData.find(d => d.month === monthNum);
        
        return {
          month,
          hostelZ: hostel?.totalZ || "0.00",
          tiendaZ: tienda?.totalZ || "0.00",
        };
      });
    } else {
      // Use historical data
      return MONTHS.map((month, idx) => {
        const monthNum = idx + 1;
        const hostel = yearData.find(d => d.month === monthNum && d.businessType === 'hostel');
        const tienda = yearData.find(d => d.month === monthNum && d.businessType === 'tienda');
        
        return {
          month,
          hostelZ: hostel?.totalZ || "0.00",
          tiendaZ: tienda?.totalZ || "0.00",
        };
      });
    }
  };

  const annualData = prepareAnnualData();

  // Calculate totals for annual view
  const totals = annualData.reduce((acc, row) => ({
    hostelZ: acc.hostelZ + parseFloat(row.hostelZ),
    tiendaZ: acc.tiendaZ + parseFloat(row.tiendaZ),
  }), { hostelZ: 0, tiendaZ: 0 });

  const dailySalesTotals = (currentYearDailyData || []).reduce((acc, row) => ({
    hostelZ: acc.hostelZ + parseFloat(row.hostelZ),
    tiendaZ: acc.tiendaZ + parseFloat(row.tiendaZ),
  }), { hostelZ: 0, tiendaZ: 0 });

  const formatDailyDate = (date: string) => {
    const [year, month, day] = date.split("-").map(Number);
    return new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      weekday: "short",
    }).format(new Date(year, month - 1, day));
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ["Mes", "Hostel Z", "Tienda Z"];
    const rows = annualData.map(row => [
      row.month,
      row.hostelZ,
      row.tiendaZ,
    ]);
    
    const csv = [
      headers.join(","),
      ...rows.map(row => row.join(",")),
      ["TOTAL", totals.hostelZ.toFixed(2), totals.tiendaZ.toFixed(2)],
    ].join("\n");
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `historico_cajas_${selectedYear}.csv`;
    a.click();
  };

  // Prepare chart data for graphics view
  const hostelAnualChartData = {
    labels: aggregatedData?.hostelByYear.map(d => d.year.toString()) || [],
    datasets: [{
      label: 'Hostel',
      data: aggregatedData?.hostelByYear.map(d => parseFloat(d.total)) || [],
      backgroundColor: 'rgba(59, 130, 246, 0.5)',
      borderColor: 'rgb(59, 130, 246)',
      borderWidth: 1,
    }],
  };

  const tiendaAnualChartData = {
    labels: aggregatedData?.tiendaByYear.map(d => d.year.toString()) || [],
    datasets: [{
      label: 'Tienda',
      data: aggregatedData?.tiendaByYear.map(d => parseFloat(d.total)) || [],
      backgroundColor: 'rgba(236, 72, 153, 0.5)',
      borderColor: 'rgb(236, 72, 153)',
      borderWidth: 1,
    }],
  };

  // Prepare monthly tables for graphics view
  const hostelMonthlyTable = aggregatedData?.hostelByMonth.reduce((acc, d) => {
    if (!acc[d.year]) acc[d.year] = {};
    acc[d.year][d.month] = d.total;
    return acc;
  }, {} as { [year: number]: { [month: number]: string } }) || {};

  const tiendaMonthlyTable = aggregatedData?.tiendaByMonth.reduce((acc, d) => {
    if (!acc[d.year]) acc[d.year] = {};
    acc[d.year][d.month] = d.total;
    return acc;
  }, {} as { [year: number]: { [month: number]: string } }) || {};

  const years = Object.keys(hostelMonthlyTable).map(Number).sort();
  const accumulatedYearOptions = Array.from(new Set([...yearOptions, ...years, currentYear])).sort((a, b) => a - b);

  // Combined chart data (Hostel + Tienda + Total)
  const allAnualDatasets = [
    {
      label: 'Hostel',
      data: aggregatedData?.hostelByYear.map(d => parseFloat(d.total)) || [],
      backgroundColor: 'rgba(59, 130, 246, 0.5)',
      borderColor: 'rgb(59, 130, 246)',
      borderWidth: 1,
    },
    {
      label: 'Tienda',
      data: aggregatedData?.tiendaByYear.map(d => parseFloat(d.total)) || [],
      backgroundColor: 'rgba(236, 72, 153, 0.5)',
      borderColor: 'rgb(236, 72, 153)',
      borderWidth: 1,
    },
    {
      label: 'Total',
      data: aggregatedData?.hostelByYear.map((d, idx) => {
        const hostelTotal = parseFloat(d.total);
        const tiendaTotal = parseFloat(aggregatedData?.tiendaByYear[idx]?.total || '0');
        return hostelTotal + tiendaTotal;
      }) || [],
      backgroundColor: 'rgba(34, 197, 94, 0.5)',
      borderColor: 'rgb(34, 197, 94)',
      borderWidth: 1,
    },
  ];

  const combinedAnualChartData = {
    labels: aggregatedData?.hostelByYear.map(d => d.year.toString()) || [],
    datasets: dataToShow === 'hostel' ? [allAnualDatasets[0]] :
              dataToShow === 'tienda' ? [allAnualDatasets[1]] :
              dataToShow === 'total' ? [allAnualDatasets[2]] :
              dataToShow === 'hostel_tienda' ? [allAnualDatasets[0], allAnualDatasets[1]] :
              allAnualDatasets,
  };

  // Monthly comparison chart data (compare same month across years)
  const allMonthlyDatasets = [
    {
      label: 'Hostel',
      data: years.map(year => parseFloat(hostelMonthlyTable[year]?.[selectedMonth] || '0')),
      backgroundColor: 'rgba(59, 130, 246, 0.5)',
      borderColor: 'rgb(59, 130, 246)',
      borderWidth: 1,
    },
    {
      label: 'Tienda',
      data: years.map(year => parseFloat(tiendaMonthlyTable[year]?.[selectedMonth] || '0')),
      backgroundColor: 'rgba(236, 72, 153, 0.5)',
      borderColor: 'rgb(236, 72, 153)',
      borderWidth: 1,
    },
    {
      label: 'Total',
      data: years.map(year => {
        const hostel = parseFloat(hostelMonthlyTable[year]?.[selectedMonth] || '0');
        const tienda = parseFloat(tiendaMonthlyTable[year]?.[selectedMonth] || '0');
        return hostel + tienda;
      }),
      backgroundColor: 'rgba(34, 197, 94, 0.5)',
      borderColor: 'rgb(34, 197, 94)',
      borderWidth: 1,
    },
  ];

  const monthlyComparisonChartData = {
    labels: years.map(y => y.toString()),
    datasets: dataToShow === 'hostel' ? [allMonthlyDatasets[0]] :
              dataToShow === 'tienda' ? [allMonthlyDatasets[1]] :
              dataToShow === 'total' ? [allMonthlyDatasets[2]] :
              dataToShow === 'hostel_tienda' ? [allMonthlyDatasets[0], allMonthlyDatasets[1]] :
              allMonthlyDatasets,
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return '€' + value.toLocaleString();
          }
        }
      }
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Histórico de Cajas</h1>
          <p className="text-muted-foreground">Análisis histórico de facturación (2014-{currentYear})</p>
        </div>
      </div>

      <Tabs defaultValue="graficas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="graficas">
            <TrendingUp className="w-4 h-4 mr-2" />
            Vista Gráficas
          </TabsTrigger>
          <TabsTrigger value="acumulados">
            <TrendingUp className="w-4 h-4 mr-2" />
            Acumulados
          </TabsTrigger>
          <TabsTrigger value="anual">
            <Calendar className="w-4 h-4 mr-2" />
            Vista Anual
          </TabsTrigger>
          <TabsTrigger value="diario">
            <Calendar className="w-4 h-4 mr-2" />
            Ventas Diarias
          </TabsTrigger>
        </TabsList>

        {/* Vista Anual */}
        <TabsContent value="anual" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Cajas del Año {selectedYear}</CardTitle>
                  <CardDescription>Detalle mensual de cajas por negocio</CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map(year => (
                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={exportToCSV} variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Exportar CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-32">Mes</TableHead>
                      <TableHead className="text-right">Hostel Z</TableHead>
                      <TableHead className="text-right">Tienda Z</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {annualData.map((row, idx) => {
                      const total = parseFloat(row.hostelZ) + parseFloat(row.tiendaZ);
                      return (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{row.month}</TableCell>
                          <TableCell className="text-right">€{parseFloat(row.hostelZ).toFixed(2)}</TableCell>
                          <TableCell className="text-right">€{parseFloat(row.tiendaZ).toFixed(2)}</TableCell>
                          <TableCell className="text-right font-medium">€{total.toFixed(2)}</TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell>TOTAL</TableCell>
                      <TableCell className="text-right">€{totals.hostelZ.toFixed(2)}</TableCell>
                      <TableCell className="text-right">€{totals.tiendaZ.toFixed(2)}</TableCell>
                      <TableCell className="text-right">€{(totals.hostelZ + totals.tiendaZ).toFixed(2)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ventas Diarias del Año en Curso */}
        <TabsContent value="diario" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ventas Diarias · {currentYear}</CardTitle>
              <CardDescription>
                Facturación diaria según el cierre Z, separada entre Hostel y Tienda.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border bg-blue-50 p-4">
                  <p className="text-sm text-muted-foreground">Hostel acumulado</p>
                  <p className="text-2xl font-bold text-blue-700">€{dailySalesTotals.hostelZ.toFixed(2)}</p>
                </div>
                <div className="rounded-lg border bg-pink-50 p-4">
                  <p className="text-sm text-muted-foreground">Tienda acumulado</p>
                  <p className="text-2xl font-bold text-pink-700">€{dailySalesTotals.tiendaZ.toFixed(2)}</p>
                </div>
                <div className="rounded-lg border bg-green-50 p-4">
                  <p className="text-sm text-muted-foreground">Total acumulado</p>
                  <p className="text-2xl font-bold text-green-700">€{(dailySalesTotals.hostelZ + dailySalesTotals.tiendaZ).toFixed(2)}</p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Hostel · Ventas Z</TableHead>
                      <TableHead className="text-right">Tienda · Ventas Z</TableHead>
                      <TableHead className="text-right">Total diario</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingDailySales ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">Cargando ventas diarias…</TableCell>
                      </TableRow>
                    ) : currentYearDailyData && currentYearDailyData.length > 0 ? (
                      <>
                        {currentYearDailyData.map((row) => {
                          const hostelZ = parseFloat(row.hostelZ);
                          const tiendaZ = parseFloat(row.tiendaZ);
                          return (
                            <TableRow key={row.date}>
                              <TableCell className="font-medium capitalize">{formatDailyDate(row.date)}</TableCell>
                              <TableCell className="text-right text-blue-700">€{hostelZ.toFixed(2)}</TableCell>
                              <TableCell className="text-right text-pink-700">€{tiendaZ.toFixed(2)}</TableCell>
                              <TableCell className="text-right font-semibold">€{(hostelZ + tiendaZ).toFixed(2)}</TableCell>
                            </TableRow>
                          );
                        })}
                        <TableRow className="bg-muted/50 font-bold">
                          <TableCell>TOTAL {currentYear}</TableCell>
                          <TableCell className="text-right">€{dailySalesTotals.hostelZ.toFixed(2)}</TableCell>
                          <TableCell className="text-right">€{dailySalesTotals.tiendaZ.toFixed(2)}</TableCell>
                          <TableCell className="text-right">€{(dailySalesTotals.hostelZ + dailySalesTotals.tiendaZ).toFixed(2)}</TableCell>
                        </TableRow>
                      </>
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                          No hay cierres de caja cerrados registrados en {currentYear}.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vista Gráficas */}
        <TabsContent value="graficas" className="space-y-4">
          {/* Selector de Vista y Mes */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Vista:</label>
              <Select value={chartView} onValueChange={(v) => setChartView(v as 'annual' | 'monthly')}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Por Años</SelectItem>
                  <SelectItem value="monthly">Por Meses</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {chartView === 'monthly' && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Mes:</label>
                <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month, idx) => (
                      <SelectItem key={idx + 1} value={(idx + 1).toString()}>{month}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Mostrar:</label>
              <Select value={dataToShow} onValueChange={(v) => setDataToShow(v as typeof dataToShow)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="hostel_tienda">Hostel + Tienda</SelectItem>
                  <SelectItem value="hostel">Solo Hostel</SelectItem>
                  <SelectItem value="tienda">Solo Tienda</SelectItem>
                  <SelectItem value="total">Solo Total</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Gráficos */}
          {chartView === 'annual' ? (
            <div className="grid grid-cols-1 gap-4">
              {/* Combined Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Evolución Anual Combinada</CardTitle>
                  <CardDescription>Comparación Hostel, Tienda y Total (2014-{currentYear})</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-96">
                    <Bar data={combinedAnualChartData} options={chartOptions} />
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Hostel Anual Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Hostel Anual</CardTitle>
                    <CardDescription>Evolución anual del hostel (2014-{currentYear})</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <Bar data={hostelAnualChartData} options={chartOptions} />
                    </div>
                  </CardContent>
                </Card>

                {/* Tienda Anual Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Tienda Anual</CardTitle>
                    <CardDescription>Evolución anual de la tienda (2014-{currentYear})</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <Bar data={tiendaAnualChartData} options={chartOptions} />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {/* Monthly Comparison Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Comparación de {MONTHS[selectedMonth - 1]}</CardTitle>
                  <CardDescription>Evolución de {MONTHS[selectedMonth - 1]} a lo largo de los años (2014-{currentYear})</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-96">
                    <Bar data={monthlyComparisonChartData} options={chartOptions} />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Hostel Monthly Table */}
          <Card>
            <CardHeader>
              <CardTitle>Hostel Mensual</CardTitle>
              <CardDescription>Histórico mensual del hostel</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Año</TableHead>
                      {MONTHS.map(month => (
                        <TableHead key={month} className="text-right">{month.slice(0, 3)}</TableHead>
                      ))}
                      <TableHead className="text-right font-bold">Total</TableHead>
                      <TableHead className="text-right font-bold">Variación Anual %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {years.map((year, idx) => {
                      const yearTotal = Object.values(hostelMonthlyTable[year] || {}).reduce((sum, val) => sum + parseFloat(val), 0);
                      const prevYear = years[idx - 1];
                      const prevYearTotal = prevYear ? Object.values(hostelMonthlyTable[prevYear] || {}).reduce((sum, val) => sum + parseFloat(val), 0) : 0;
                      const variation = prevYearTotal > 0 ? ((yearTotal - prevYearTotal) / prevYearTotal * 100) : null;
                      
                      return (
                        <TableRow key={year}>
                          <TableCell className="font-medium">{year}</TableCell>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                            <TableCell key={month} className="text-right">
                              {hostelMonthlyTable[year]?.[month] ? `€${parseFloat(hostelMonthlyTable[year][month]).toFixed(0)}` : '-'}
                            </TableCell>
                          ))}
                          <TableCell className="text-right font-bold">€{yearTotal.toFixed(2)}</TableCell>
                          <TableCell className={`text-right font-bold ${
                            variation === null ? '' : variation >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {variation === null ? '-' : `${variation >= 0 ? '+' : ''}${variation.toFixed(1)}%`}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Tienda Monthly Table */}
          <Card>
            <CardHeader>
              <CardTitle>Tienda Mensual</CardTitle>
              <CardDescription>Histórico mensual de la tienda</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Año</TableHead>
                      {MONTHS.map(month => (
                        <TableHead key={month} className="text-right">{month.slice(0, 3)}</TableHead>
                      ))}
                      <TableHead className="text-right font-bold">Total</TableHead>
                      <TableHead className="text-right font-bold">Variación Anual %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {years.map((year, idx) => {
                      const yearTotal = Object.values(tiendaMonthlyTable[year] || {}).reduce((sum, val) => sum + parseFloat(val), 0);
                      const prevYear = years[idx - 1];
                      const prevYearTotal = prevYear ? Object.values(tiendaMonthlyTable[prevYear] || {}).reduce((sum, val) => sum + parseFloat(val), 0) : 0;
                      const variation = prevYearTotal > 0 ? ((yearTotal - prevYearTotal) / prevYearTotal * 100) : null;
                      
                      return (
                        <TableRow key={year}>
                          <TableCell className="font-medium">{year}</TableCell>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                            <TableCell key={month} className="text-right">
                              {tiendaMonthlyTable[year]?.[month] ? `€${parseFloat(tiendaMonthlyTable[year][month]).toFixed(0)}` : '-'}
                            </TableCell>
                          ))}
                          <TableCell className="text-right font-bold">€{yearTotal.toFixed(2)}</TableCell>
                          <TableCell className={`text-right font-bold ${
                            variation === null ? '' : variation >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {variation === null ? '-' : `${variation >= 0 ? '+' : ''}${variation.toFixed(1)}%`}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vista Acumulados */}
        <TabsContent value="acumulados" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Evolución Acumulada Mes a Mes</CardTitle>
              <CardDescription>Gráfico de evolución acumulada de facturación por mes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Selectores para acumulados */}
                <div className="flex flex-wrap items-center gap-4">
                  {/* Selector de vista (un año vs comparación multi-año) */}
                  <Select value={acumuladosView} onValueChange={(v: 'single' | 'multi') => setAcumuladosView(v)}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Un Año</SelectItem>
                      <SelectItem value="multi">Comparación Multi-Año</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {/* Selector de año (solo si vista es 'single') */}
                  {acumuladosView === 'single' && (
                    <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {yearOptions.map(year => (
                          <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  
                  {/* Selector de datos a mostrar */}
                  <Select value={acumuladosDataToShow} onValueChange={(v: 'hostel' | 'tienda' | 'total' | 'all') => setAcumuladosDataToShow(v)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="hostel">Solo Hostel</SelectItem>
                      <SelectItem value="tienda">Solo Tienda</SelectItem>
                      <SelectItem value="total">Solo Total</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {acumuladosView === 'multi' && <div className="rounded-lg border bg-muted/20 p-3"><div className="mb-2 flex items-center justify-between gap-3"><p className="text-sm font-medium">Años a comparar</p><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setSelectedAccumulatedYears(accumulatedYearOptions)}>Todos</Button><Button size="sm" variant="outline" onClick={() => setSelectedAccumulatedYears([])}>Ninguno</Button></div></div><div className="flex flex-wrap gap-2">{accumulatedYearOptions.slice().reverse().map((year) => <Button key={year} size="sm" variant={selectedAccumulatedYears.includes(year) ? "default" : "outline"} onClick={() => setSelectedAccumulatedYears((years) => toggleSelectedYear(years, year))}>{year}</Button>)}</div></div>}

                {/* Gráfico de líneas acumulado */}
                <div className="h-96">
                  <Line
                    data={(() => {
                      if (acumuladosView === 'single') {
                        // Vista de un solo año
                        const baseDatasets = [
                          {
                            label: 'Hostel Acumulado',
                            data: annualData.reduce((acc: number[], row, idx) => {
                              const prev = idx > 0 ? acc[idx - 1] : 0;
                              acc.push(prev + parseFloat(row.hostelZ));
                              return acc;
                            }, []),
                            borderColor: 'rgb(59, 130, 246)',
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            tension: 0.4,
                          },
                          {
                            label: 'Tienda Acumulado',
                            data: annualData.reduce((acc: number[], row, idx) => {
                              const prev = idx > 0 ? acc[idx - 1] : 0;
                              acc.push(prev + parseFloat(row.tiendaZ));
                              return acc;
                            }, []),
                            borderColor: 'rgb(236, 72, 153)',
                            backgroundColor: 'rgba(236, 72, 153, 0.1)',
                            tension: 0.4,
                          },
                          {
                            label: 'Total Acumulado',
                            data: annualData.reduce((acc: number[], row, idx) => {
                              const prev = idx > 0 ? acc[idx - 1] : 0;
                              const total = parseFloat(row.hostelZ) + parseFloat(row.tiendaZ);
                              acc.push(prev + total);
                              return acc;
                            }, []),
                            borderColor: 'rgb(34, 197, 94)',
                            backgroundColor: 'rgba(34, 197, 94, 0.1)',
                            tension: 0.4,
                          },
                        ];
                        
                        // Filtrar según acumuladosDataToShow
                        const filteredDatasets = baseDatasets.filter(ds => {
                          if (acumuladosDataToShow === 'all') return true;
                          if (acumuladosDataToShow === 'hostel') return ds.label.includes('Hostel');
                          if (acumuladosDataToShow === 'tienda') return ds.label.includes('Tienda');
                          if (acumuladosDataToShow === 'total') return ds.label.includes('Total');
                          return true;
                        });
                        
                        return {
                          labels: MONTHS,
                          datasets: filteredDatasets,
                        };
                      } else {
                        // Vista multi-año: mostrar todos los años superpuestos
                        const colors = [
                          'rgb(59, 130, 246)', 'rgb(236, 72, 153)', 'rgb(34, 197, 94)',
                          'rgb(251, 146, 60)', 'rgb(168, 85, 247)', 'rgb(234, 179, 8)',
                          'rgb(20, 184, 166)', 'rgb(244, 63, 94)', 'rgb(99, 102, 241)',
                          'rgb(245, 158, 11)', 'rgb(139, 92, 246)', 'rgb(6, 182, 212)'
                        ];
                        
                        const datasets: any[] = [];
                        
                        selectedAccumulatedYears.forEach((year, yearIdx) => {
                          const yearAnnualData = MONTHS.map((_, idx) => ({ hostelZ: hostelMonthlyTable[year]?.[idx + 1] || "0.00", tiendaZ: tiendaMonthlyTable[year]?.[idx + 1] || "0.00" }));
                          
                          const color = colors[yearIdx % colors.length];
                          
                          // Agregar dataset según acumuladosDataToShow
                          if (acumuladosDataToShow === 'all' || acumuladosDataToShow === 'hostel') {
                            datasets.push({
                              label: `Hostel ${year}`,
                              data: cumulativeMonthlySeries(yearAnnualData.map((row) => row.hostelZ)),
                              borderColor: color,
                              backgroundColor: color.replace('rgb', 'rgba').replace(')', ', 0.1)'),
                              tension: 0.4,
                              borderWidth: 2,
                            });
                          }
                          
                          if (acumuladosDataToShow === 'all' || acumuladosDataToShow === 'tienda') {
                            datasets.push({
                              label: `Tienda ${year}`,
                              data: cumulativeMonthlySeries(yearAnnualData.map((row) => row.tiendaZ)),
                              borderColor: color,
                              backgroundColor: color.replace('rgb', 'rgba').replace(')', ', 0.1)'),
                              tension: 0.4,
                              borderWidth: 1,
                              borderDash: [5, 5],
                            });
                          }
                          
                          if (acumuladosDataToShow === 'all' || acumuladosDataToShow === 'total') {
                            datasets.push({
                              label: `Total ${year}`,
                              data: cumulativeMonthlySeries(yearAnnualData.map((row) => parseFloat(row.hostelZ) + parseFloat(row.tiendaZ))),
                              borderColor: color,
                              backgroundColor: color.replace('rgb', 'rgba').replace(')', ', 0.1)'),
                              tension: 0.4,
                              borderWidth: 3,
                            });
                          }
                        });
                        
                        return {
                          labels: MONTHS,
                          datasets,
                        };
                      }
                    })()}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'top' as const,
                        },
                        title: {
                          display: true,
                          text: acumuladosView === 'single' 
                            ? `Evolución Acumulada ${selectedYear}`
                            : 'Comparación Multi-Año (Acumulado)',
                        },
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            callback: function(value) {
                              return '€' + value.toLocaleString();
                            }
                          }
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

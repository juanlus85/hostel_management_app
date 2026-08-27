import { useMemo, useState } from "react";
import { Cloud, DatabaseZap, Download, ExternalLink, Loader2, RefreshCw, ShieldCheck, Store, WalletCards } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Madrid" });
const thirtyDaysStart = (() => {
  const start = new Date(`${today}T12:00:00`);
  start.setDate(start.getDate() - 29);
  return start.toLocaleDateString("en-CA", { timeZone: "Europe/Madrid" });
})();
const loyverseMinimumDate = (() => {
  const start = new Date(`${today}T12:00:00`);
  start.setDate(start.getDate() - 30);
  return start.toLocaleDateString("en-CA", { timeZone: "Europe/Madrid" });
})();

type ComparisonRow = { date: string; externalTotal: number; internalTotal: number; difference: number };
type ComparisonData = { rows: ComparisonRow[]; scope: string; providerLabel: string } | undefined;

const money = (value: string | number | null | undefined) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(Number(value || 0));
const dateTime = (value: Date | string | null | undefined) => value ? new Date(value).toLocaleString("es-ES") : "—";

function ConnectionBadge({ ready }: { ready: boolean }) {
  return <Badge className={ready ? "bg-emerald-600 hover:bg-emerald-600" : "bg-slate-500 hover:bg-slate-500"}>{ready ? "Conectado" : "Pendiente de credenciales"}</Badge>;
}

function ComparisonCard({ title, description, data, loading, emptyMessage }: { title: string; description: string; data: ComparisonData; loading: boolean; emptyMessage: string }) {
  return <Card className="border-violet-200 shadow-sm">
    <CardHeader>
      <CardTitle>{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent>
      {loading ? <div className="py-8 text-center text-sm text-muted-foreground"><Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />Calculando comparación…</div> : data?.rows.length ? <>
        <div className="mb-4 rounded-lg border border-violet-100 bg-violet-50 px-4 py-3 text-sm text-violet-950"><strong>Alcance interno:</strong> {data.scope}. La diferencia se calcula como <strong>externo − interno</strong>.</div>
        <div className="overflow-x-auto"><table className="w-full min-w-[660px] text-left text-sm"><thead className="border-b text-xs uppercase text-muted-foreground"><tr><th className="px-3 py-3">Fecha</th><th className="px-3 py-3 text-right">{data.providerLabel}</th><th className="px-3 py-3 text-right">Caja interna</th><th className="px-3 py-3 text-right">Diferencia</th></tr></thead><tbody>{data.rows.map((row) => <tr className="border-b last:border-0" key={row.date}><td className="px-3 py-3 font-medium">{row.date}</td><td className="px-3 py-3 text-right">{money(row.externalTotal)}</td><td className="px-3 py-3 text-right">{money(row.internalTotal)}</td><td className={`px-3 py-3 text-right font-semibold ${row.difference === 0 ? "text-emerald-700" : row.difference > 0 ? "text-orange-700" : "text-rose-700"}`}>{money(row.difference)}</td></tr>)}</tbody></table></div>
      </> : <div className="py-8 text-center text-sm text-muted-foreground"><WalletCards className="mx-auto mb-3 h-7 w-7" />{emptyMessage}</div>}
    </CardContent>
  </Card>;
}

export default function ImportacionesExternas() {
  const [dateFrom, setDateFrom] = useState(thirtyDaysStart);
  const [dateTo, setDateTo] = useState(today);
  const utils = trpc.useUtils();
  const overview = trpc.checkin.externalImports.overview.useQuery();
  const loyverseComparison = trpc.checkin.externalImports.comparison.useQuery({ dateFrom, dateTo, provider: "loyverse" });
  const cloudbedsComparison = trpc.checkin.externalImports.comparison.useQuery({ dateFrom, dateTo, provider: "cloudbeds" });
  const importLoyverse = trpc.checkin.externalImports.importLoyverseDailyCash.useMutation({
    onSuccess: (result: { recordsImported: number }) => {
      toast.success(`Importación completada: ${result.recordsImported} días de ventas recibidos`);
      utils.checkin.externalImports.overview.invalidate();
      utils.checkin.externalImports.comparison.invalidate();
    },
    onError: (error: { message: string }) => toast.error(error.message),
  });
  const totalImported = useMemo(() => (overview.data?.dailyCash || []).filter((record: { provider: string; businessDate: string }) => record.provider === "loyverse" && record.businessDate >= dateFrom && record.businessDate <= dateTo).reduce((sum: number, item: { totalSales: string | number | null }) => sum + Number(item.totalSales || 0), 0), [overview.data?.dailyCash, dateFrom, dateTo]);

  return <div className="space-y-6 p-4 sm:p-6 lg:p-8">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div><div className="mb-2 flex items-center gap-2 text-cyan-700"><DatabaseZap className="h-5 w-5" /><span className="text-sm font-semibold uppercase tracking-wide">Administración</span></div><h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Importaciones externas</h1><p className="mt-2 max-w-3xl text-sm text-muted-foreground">Consulta e importa información de proveedores externos en un espacio independiente. Estos datos no modifican cajas, facturas, reservas ni métricas actuales.</p></div>
      <div className="rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-950"><ShieldCheck className="mr-2 inline h-4 w-4" /><strong>Modo aislado.</strong> Las importaciones se almacenan para revisión.</div>
    </div>

    <div className="grid gap-4 xl:grid-cols-2">
      <Card className="border-orange-200 shadow-sm"><CardHeader className="space-y-3"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><div className="rounded-xl bg-orange-100 p-2.5 text-orange-700"><Store className="h-6 w-6" /></div><div><CardTitle>Loyverse</CardTitle><CardDescription>Ventas diarias agrupadas desde recibos</CardDescription></div></div><ConnectionBadge ready={Boolean(overview.data?.connections.loyverse)} /></div><p className="text-sm text-muted-foreground">Consulta los recibos reales y agrupa las ventas de los últimos 30 días. Cada jornada se calcula de <strong>07:00 a 07:00</strong> (hora de Sevilla) y se compara siempre con la caja de <strong>Tienda</strong>.</p></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="loyverse-from">Desde</Label><Input id="loyverse-from" type="date" value={dateFrom} min={loyverseMinimumDate} max={dateTo} onChange={(event) => setDateFrom(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="loyverse-to">Hasta</Label><Input id="loyverse-to" type="date" value={dateTo} min={dateFrom} max={today} onChange={(event) => setDateTo(event.target.value)} /></div></div><Button className="w-full bg-orange-600 hover:bg-orange-700" disabled={!overview.data?.connections.loyverse || importLoyverse.isPending} onClick={() => importLoyverse.mutate({ dateFrom, dateTo })}>{importLoyverse.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}{overview.data?.connections.loyverse ? "Importar ventas de Loyverse" : "Pendiente de token de Loyverse"}</Button></CardContent></Card>
      <Card className="border-sky-200 shadow-sm"><CardHeader className="space-y-3"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><div className="rounded-xl bg-sky-100 p-2.5 text-sky-700"><Cloud className="h-6 w-6" /></div><div><CardTitle>Cloudbeds</CardTitle><CardDescription>Preparado para comparación con Hostel</CardDescription></div></div><ConnectionBadge ready={Boolean(overview.data?.connections.cloudbeds)} /></div><p className="text-sm text-muted-foreground">Cuando se active, las ventas importadas de Cloudbeds se compararán siempre con la caja de <strong>Hostel</strong>.</p></CardHeader><CardContent className="space-y-4"><div className="rounded-lg border bg-slate-50 p-4 text-sm"><p className="font-medium text-slate-900">Cómo preparar la conexión</p><ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground"><li>En Cloudbeds, abre <strong>Integraciones de API y Credenciales</strong> y pulsa <strong>Nuevas credenciales</strong>.</li><li>Crea una credencial OAuth y conserva el <strong>ID de cliente</strong> y el <strong>secreto de cliente</strong>.</li><li>Cuando los tengas, se añaden como variables privadas en el servidor; nunca en esta pantalla ni en la base de datos.</li></ol></div><Button variant="outline" className="w-full" asChild><a href="https://developers.cloudbeds.com/reference/about-pms-api" target="_blank" rel="noreferrer">Ver documentación de Cloudbeds <ExternalLink className="ml-2 h-4 w-4" /></a></Button></CardContent></Card>
    </div>

    <div className="grid gap-4 md:grid-cols-3"><Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Importaciones realizadas</p><p className="mt-2 text-3xl font-bold">{overview.data?.runs.length || 0}</p></CardContent></Card><Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Días externos importados</p><p className="mt-2 text-3xl font-bold">{overview.data?.dailyCash.length || 0}</p></CardContent></Card><Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Ventas Loyverse del período</p><p className="mt-2 text-3xl font-bold">{money(totalImported)}</p></CardContent></Card></div>

    <ComparisonCard title="Loyverse frente a Tienda" description="Cada fecha se compara automáticamente con el cierre de la caja de Tienda; no hay selector porque esta relación es fija." data={loyverseComparison.data} loading={loyverseComparison.isLoading} emptyMessage="No hay ventas de Loyverse ni cierres de Tienda para este período." />
    <ComparisonCard title="Cloudbeds frente a Hostel" description="Preparado para comparar cada fecha importada de Cloudbeds con el cierre de la caja de Hostel." data={cloudbedsComparison.data} loading={cloudbedsComparison.isLoading} emptyMessage="Aún no hay datos importados desde Cloudbeds para comparar con Hostel." />

    <Card><CardHeader className="flex flex-row items-center justify-between gap-3"><div><CardTitle>Historial de importaciones</CardTitle><CardDescription>Auditoría de cada ejecución; no afecta a los datos operativos.</CardDescription></div><Button variant="outline" size="sm" onClick={() => overview.refetch()} disabled={overview.isFetching}><RefreshCw className={`mr-2 h-4 w-4 ${overview.isFetching ? "animate-spin" : ""}`} />Actualizar</Button></CardHeader><CardContent>{overview.isLoading ? <div className="py-10 text-center text-sm text-muted-foreground"><Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />Cargando historial…</div> : overview.data?.runs.length ? <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="border-b text-xs uppercase text-muted-foreground"><tr><th className="px-3 py-3">Fuente</th><th className="px-3 py-3">Período</th><th className="px-3 py-3">Estado</th><th className="px-3 py-3 text-right">Registros</th><th className="px-3 py-3 text-right">Total</th><th className="px-3 py-3">Fecha</th></tr></thead><tbody>{overview.data.runs.map((run: { id: number; provider: string; dateFrom: string | null; dateTo: string | null; status: "pending" | "running" | "completed" | "failed"; recordsImported: number; totalAmount: string | number | null; createdAt: Date | string | null }) => <tr className="border-b last:border-0" key={run.id}><td className="px-3 py-3 font-medium capitalize">{run.provider}</td><td className="px-3 py-3">{run.dateFrom || "—"} — {run.dateTo || "—"}</td><td className="px-3 py-3"><Badge variant={run.status === "completed" ? "default" : run.status === "failed" ? "destructive" : "secondary"}>{run.status}</Badge></td><td className="px-3 py-3 text-right">{run.recordsImported}</td><td className="px-3 py-3 text-right">{money(run.totalAmount)}</td><td className="px-3 py-3">{dateTime(run.createdAt)}</td></tr>)}</tbody></table></div> : <div className="py-10 text-center text-sm text-muted-foreground"><WalletCards className="mx-auto mb-3 h-7 w-7" />Aún no se ha realizado ninguna importación.</div>}</CardContent></Card>
  </div>;
}

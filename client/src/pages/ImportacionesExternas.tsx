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
const monthStart = `${today.slice(0, 8)}01`;

const money = (value: string | number | null | undefined) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(Number(value || 0));
const dateTime = (value: Date | string | null | undefined) => value ? new Date(value).toLocaleString("es-ES") : "—";

function ConnectionBadge({ ready }: { ready: boolean }) {
  return <Badge className={ready ? "bg-emerald-600 hover:bg-emerald-600" : "bg-slate-500 hover:bg-slate-500"}>{ready ? "Conectado" : "Pendiente de credenciales"}</Badge>;
}

export default function ImportacionesExternas() {
  const [dateFrom, setDateFrom] = useState(monthStart);
  const [dateTo, setDateTo] = useState(today);
  const [comparisonBusinessId, setComparisonBusinessId] = useState<number | null>(null);
  const utils = trpc.useUtils();
  const overview = trpc.checkin.externalImports.overview.useQuery();
  const comparison = trpc.checkin.externalImports.comparison.useQuery({ dateFrom, dateTo, businessId: comparisonBusinessId });
  const importLoyverse = trpc.checkin.externalImports.importLoyverseDailyCash.useMutation({
    onSuccess: (result: { recordsImported: number }) => {
      toast.success(`Importación completada: ${result.recordsImported} cierres recibidos`);
      utils.checkin.externalImports.overview.invalidate();
      utils.checkin.externalImports.comparison.invalidate();
    },
    onError: (error: { message: string }) => toast.error(error.message),
  });

  const totalImported = useMemo(() => (overview.data?.dailyCash || []).reduce((sum: number, item: { totalSales: string | number | null }) => sum + Number(item.totalSales || 0), 0), [overview.data?.dailyCash]);

  return <div className="space-y-6 p-4 sm:p-6 lg:p-8">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <div className="mb-2 flex items-center gap-2 text-cyan-700"><DatabaseZap className="h-5 w-5" /><span className="text-sm font-semibold uppercase tracking-wide">Administración</span></div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Importaciones externas</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Consulta e importa información de proveedores externos en un espacio independiente. Estos datos no modifican cajas, facturas, reservas ni métricas actuales.</p>
      </div>
      <div className="rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-950"><ShieldCheck className="mr-2 inline h-4 w-4" /><strong>Modo aislado.</strong> Las importaciones se almacenan para revisión.</div>
    </div>

    <div className="grid gap-4 xl:grid-cols-2">
      <Card className="border-orange-200 shadow-sm">
        <CardHeader className="space-y-3">
          <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><div className="rounded-xl bg-orange-100 p-2.5 text-orange-700"><Store className="h-6 w-6" /></div><div><CardTitle>Loyverse</CardTitle><CardDescription>Cajas diarias y cierres de turnos</CardDescription></div></div><ConnectionBadge ready={Boolean(overview.data?.connections.loyverse)} /></div>
          <p className="text-sm text-muted-foreground">La primera importación consulta los turnos cerrados de Loyverse y guarda un histórico externo sin tocar el módulo de Caja.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="loyverse-from">Desde</Label><Input id="loyverse-from" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="loyverse-to">Hasta</Label><Input id="loyverse-to" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></div></div>
          <Button className="w-full bg-orange-600 hover:bg-orange-700" disabled={!overview.data?.connections.loyverse || importLoyverse.isPending} onClick={() => importLoyverse.mutate({ dateFrom, dateTo })}>{importLoyverse.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}{overview.data?.connections.loyverse ? "Importar cierres de Loyverse" : "Pendiente de token de Loyverse"}</Button>
          {!overview.data?.connections.loyverse && <p className="text-xs text-muted-foreground">Para activarlo, añade un token personal de Loyverse con permisos de lectura de turnos y métodos de pago.</p>}
        </CardContent>
      </Card>

      <Card className="border-sky-200 shadow-sm">
        <CardHeader className="space-y-3"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><div className="rounded-xl bg-sky-100 p-2.5 text-sky-700"><Cloud className="h-6 w-6" /></div><div><CardTitle>Cloudbeds</CardTitle><CardDescription>Preparado para conexión OAuth y futuras fuentes</CardDescription></div></div><ConnectionBadge ready={Boolean(overview.data?.connections.cloudbeds)} /></div><p className="text-sm text-muted-foreground">La estructura ya está preparada para incorporar panel, pagos, reservas o informes de Cloudbeds cuando se creen las credenciales de la propiedad.</p></CardHeader>
        <CardContent className="space-y-4"><div className="rounded-lg border bg-slate-50 p-4 text-sm"><p className="font-medium text-slate-900">Próximo paso</p><p className="mt-1 text-muted-foreground">Crea la credencial OAuth en Cloudbeds y conserva el ID y el secreto de cliente. No se importará ni sincronizará ningún dato hasta que se active expresamente.</p></div><Button variant="outline" className="w-full" asChild><a href="https://developers.cloudbeds.com/reference/about-pms-api" target="_blank" rel="noreferrer">Ver documentación de Cloudbeds <ExternalLink className="ml-2 h-4 w-4" /></a></Button></CardContent>
      </Card>
    </div>

    <div className="grid gap-4 md:grid-cols-3">
      <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Importaciones realizadas</p><p className="mt-2 text-3xl font-bold">{overview.data?.runs.length || 0}</p></CardContent></Card>
      <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Registros externos</p><p className="mt-2 text-3xl font-bold">{overview.data?.dailyCash.length || 0}</p></CardContent></Card>
      <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Ventas importadas</p><p className="mt-2 text-3xl font-bold">{money(totalImported)}</p></CardContent></Card>
    </div>

    <Card className="border-violet-200 shadow-sm"><CardHeader className="gap-4 xl:flex-row xl:items-end xl:justify-between"><div><CardTitle>Comparación de cajas por día</CardTitle><CardDescription>Consulta externa frente a cierres internos cerrados. La comparación no fusiona ni modifica ninguna fuente.</CardDescription></div><div className="grid w-full gap-3 sm:grid-cols-3 xl:w-auto"><div className="space-y-1"><Label htmlFor="comparison-from">Desde</Label><Input id="comparison-from" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /></div><div className="space-y-1"><Label htmlFor="comparison-to">Hasta</Label><Input id="comparison-to" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></div><div className="space-y-1"><Label htmlFor="comparison-business">Caja interna</Label><select id="comparison-business" value={comparisonBusinessId ?? "all"} onChange={(event) => setComparisonBusinessId(event.target.value === "all" ? null : Number(event.target.value))} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"><option value="all">Hostel y Tienda</option>{comparison.data?.businesses.map((business: { id: number; name: string }) => <option key={business.id} value={business.id}>{business.name}</option>)}</select></div></div></CardHeader><CardContent>{comparison.isLoading ? <div className="py-10 text-center text-sm text-muted-foreground"><Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />Calculando comparación…</div> : comparison.data?.rows.length ? <><div className="mb-4 rounded-lg border border-violet-100 bg-violet-50 px-4 py-3 text-sm text-violet-950"><strong>Alcance interno:</strong> {comparison.data.scope}. La diferencia se calcula como <strong>externo − interno</strong>.</div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="border-b text-xs uppercase text-muted-foreground"><tr><th className="px-3 py-3">Fecha</th><th className="px-3 py-3 text-right">Loyverse / externo</th><th className="px-3 py-3 text-right">Caja interna</th><th className="px-3 py-3 text-right">Diferencia</th></tr></thead><tbody>{comparison.data.rows.map((row: { date: string; externalTotal: number; internalTotal: number; difference: number }) => <tr className="border-b last:border-0" key={row.date}><td className="px-3 py-3 font-medium">{row.date}</td><td className="px-3 py-3 text-right">{money(row.externalTotal)}</td><td className="px-3 py-3 text-right">{money(row.internalTotal)}</td><td className={`px-3 py-3 text-right font-semibold ${row.difference === 0 ? "text-emerald-700" : row.difference > 0 ? "text-orange-700" : "text-rose-700"}`}>{money(row.difference)}</td></tr>)}</tbody></table></div></> : <div className="py-10 text-center text-sm text-muted-foreground"><WalletCards className="mx-auto mb-3 h-7 w-7" />No hay datos externos ni cierres internos cerrados para este período.</div>}</CardContent></Card>

    <Card><CardHeader className="flex flex-row items-center justify-between gap-3"><div><CardTitle>Historial de importaciones</CardTitle><CardDescription>Auditoría de cada ejecución; no afecta a los datos operativos.</CardDescription></div><Button variant="outline" size="sm" onClick={() => overview.refetch()} disabled={overview.isFetching}><RefreshCw className={`mr-2 h-4 w-4 ${overview.isFetching ? "animate-spin" : ""}`} />Actualizar</Button></CardHeader><CardContent>{overview.isLoading ? <div className="py-10 text-center text-sm text-muted-foreground"><Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />Cargando historial…</div> : overview.data?.runs.length ? <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="border-b text-xs uppercase text-muted-foreground"><tr><th className="px-3 py-3">Fuente</th><th className="px-3 py-3">Período</th><th className="px-3 py-3">Estado</th><th className="px-3 py-3 text-right">Registros</th><th className="px-3 py-3 text-right">Total</th><th className="px-3 py-3">Fecha</th></tr></thead><tbody>{overview.data.runs.map((run: { id: number; provider: string; dateFrom: string | null; dateTo: string | null; status: "pending" | "running" | "completed" | "failed"; recordsImported: number; totalAmount: string | number | null; createdAt: Date | string | null }) => <tr className="border-b last:border-0" key={run.id}><td className="px-3 py-3 font-medium capitalize">{run.provider}</td><td className="px-3 py-3">{run.dateFrom || "—"} — {run.dateTo || "—"}</td><td className="px-3 py-3"><Badge variant={run.status === "completed" ? "default" : run.status === "failed" ? "destructive" : "secondary"}>{run.status}</Badge></td><td className="px-3 py-3 text-right">{run.recordsImported}</td><td className="px-3 py-3 text-right">{money(run.totalAmount)}</td><td className="px-3 py-3">{dateTime(run.createdAt)}</td></tr>)}</tbody></table></div> : <div className="py-10 text-center text-sm text-muted-foreground"><WalletCards className="mx-auto mb-3 h-7 w-7" />Aún no se ha realizado ninguna importación.</div>}</CardContent></Card>
  </div>;
}

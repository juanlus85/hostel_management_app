import { useId, useMemo, useRef, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertCircle,
  Check,
  ChevronsUpDown,
  Download,
  Link2,
  Loader2,
  Package,
  RefreshCw,
  Search,
  Unlink,
  X,
} from "lucide-react";
import { toast } from "sonner";

export type InventoryProductPickerProps = {
  products: Array<{
    id: number;
    name: string;
    ref?: string | null;
    category?: string | null;
  }>;
  value: number | null;
  onChange: (id: number | null) => void;
  disabled?: boolean;
  label: string;
  bindingMissing?: boolean;
};

const normalizeSearch = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");

/** Selector puro: acepta cualquier producto del inventario, sin consultas ni filtro Loyverse. */
export function InventoryProductPicker({
  products,
  value,
  onChange,
  disabled = false,
  label,
  bindingMissing = false,
}: InventoryProductPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const listId = useId();
  const selected = products.find(product => product.id === value);
  const missing = value !== null && (bindingMissing || !selected);
  const visibleProducts = useMemo(() => {
    const terms = normalizeSearch(search.trim()).split(/\s+/).filter(Boolean);
    return products
      .filter(product => {
        const text = normalizeSearch(
          `${product.name} ${product.ref ?? ""} ${product.category ?? ""} ${product.id}`
        );
        return terms.every(term => text.includes(term));
      })
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [products, search]);

  const select = (id: number | null) => {
    if (disabled) return;
    setOpen(false);
    setSearch("");
    if (id !== value || bindingMissing) onChange(id);
  };

  return (
    <Popover
      open={open && !disabled}
      onOpenChange={nextOpen => {
        setOpen(nextOpen);
        setSearch("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-label={label}
          aria-expanded={open && !disabled}
          aria-controls={listId}
          disabled={disabled}
          className={`h-auto min-h-11 w-full min-w-0 justify-between gap-2 bg-white px-3 py-2 text-left font-normal whitespace-normal ${missing ? "border-amber-300 text-amber-800" : "border-slate-200 text-slate-700"}`}
        >
          <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">
            {value === null
              ? "Sin vincular · seleccionar producto"
              : missing
                ? `Producto eliminado o no disponible (ID ${value})`
                : selected?.name}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        collisionPadding={12}
        className="w-[min(26rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)] overflow-hidden p-0"
      >
        <Command shouldFilter={false} aria-label={label}>
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder="Buscar nombre, referencia o categoría…"
            aria-label="Buscar producto del inventario"
            className="text-base sm:text-sm"
          />
          <div className="border-b border-slate-100 p-1">
            <Button
              type="button"
              variant="ghost"
              className="min-h-11 w-full justify-start gap-2 text-slate-600"
              disabled={value === null || disabled}
              onClick={() => select(null)}
            >
              <Unlink className="h-4 w-4 shrink-0" />
              Quitar relación con inventario
            </Button>
          </div>
          <CommandList
            id={listId}
            className="max-h-[min(18rem,45dvh)] overscroll-contain"
          >
            <CommandEmpty>
              {products.length === 0
                ? "No hay productos en el inventario."
                : "No hay productos que coincidan con la búsqueda."}
            </CommandEmpty>
            <CommandGroup heading="Productos del inventario">
              {visibleProducts.map(product => (
                <CommandItem
                  key={product.id}
                  value={String(product.id)}
                  disabled={disabled}
                  onSelect={() => select(product.id)}
                  className="min-h-12 cursor-pointer items-start py-3"
                >
                  <Check
                    className={`mt-0.5 h-4 w-4 shrink-0 ${value === product.id ? "text-sky-600 opacity-100" : "opacity-0"}`}
                  />
                  <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">
                    <span className="block font-medium">{product.name}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {[
                        product.ref ? `Ref. ${product.ref}` : null,
                        product.category,
                        `ID ${product.id}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

type CostcoArticle = {
  id: string;
  name: string;
  costcoCode: string;
  cost: string;
  inventoryProductId: number | null;
  inventoryProductName: string | null;
  inventoryStock: string | null;
  bindingMissing: boolean;
};

type BindingFields = Pick<
  CostcoArticle,
  | "inventoryProductId"
  | "inventoryProductName"
  | "inventoryStock"
  | "bindingMissing"
>;

const queryOptions = {
  retry: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  refetchInterval: false,
} as const;

const costFormatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
});
const stockFormatter = new Intl.NumberFormat("es-ES", {
  maximumFractionDigits: 3,
});

function numericValue(value: string | null): number | null {
  if (value === null || value.trim() === "") return null;
  const parsed = Number(value.trim().replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function costLabel(cost: string) {
  const amount = numericValue(cost);
  return amount === null ? "No disponible" : costFormatter.format(amount);
}

function stockLabel(article: CostcoArticle) {
  if (article.inventoryProductId === null) return "Sin vincular";
  if (article.bindingMissing) return "Vínculo no disponible";
  const stock = numericValue(article.inventoryStock);
  return stock === null ? "No disponible" : stockFormatter.format(stock);
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "No se pudo completar la operación.";
}

// CSV con comillas, acentos y saltos de línea seguros; evita fórmulas en datos textuales.
function csvCell(value: string) {
  const numeric = /^\s*[-+]?\d+(?:[.,]\d+)?\s*$/.test(value);
  const safe =
    !numeric && /^[\s]*[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

export default function ArticulosCostco() {
  const {
    user,
    loading: authLoading,
    error: authError,
    refresh: refreshAuth,
  } = useAuth();
  const canEdit = user?.role === "admin";
  const utils = trpc.useUtils();
  const catalogQuery = trpc.costco.list.useQuery(undefined, {
    ...queryOptions,
    enabled: Boolean(user),
  });
  const inventoryQuery = trpc.inventoryProducts.list.useQuery(undefined, {
    ...queryOptions,
    enabled: canEdit,
  });
  const bindingMutation = trpc.costco.setBinding.useMutation();
  const syncMutation = trpc.inventoryProducts.syncLoyverse.useMutation();
  const [search, setSearch] = useState("");
  const [pendingBindings, setPendingBindings] = useState<
    Record<string, BindingFields>
  >({});
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  // Bloqueo síncrono por fila: una segunda pulsación no dispara otra mutación antes del render.
  const rowLocks = useRef(new Set<string>());
  const searchId = useId();
  const products = inventoryQuery.data ?? [];
  const articles: CostcoArticle[] = (catalogQuery.data ?? []).map(article => ({
    ...article,
    ...pendingBindings[article.id],
  }));
  const searchTerms = normalizeSearch(search.trim())
    .split(/\s+/)
    .filter(Boolean);
  const filteredArticles = articles.filter(article => {
    const text = normalizeSearch(`${article.name} ${article.costcoCode}`);
    return searchTerms.every(term => text.includes(term));
  });
  const hasPending = Object.keys(pendingBindings).length > 0;
  const busy = refreshing || syncMutation.isPending;
  const linkedCount = articles.filter(
    article => article.inventoryProductId !== null && !article.bindingMissing
  ).length;

  const saveBinding = async (
    article: CostcoArticle,
    inventoryProductId: number | null
  ) => {
    if (!canEdit || busy || rowLocks.current.has(article.id)) return;
    if (
      article.inventoryProductId === inventoryProductId &&
      !article.bindingMissing
    )
      return;
    const product = products.find(item => item.id === inventoryProductId);
    if (inventoryProductId !== null && !product) {
      toast.error(
        "El producto ya no está disponible. Refresca el inventario y vuelve a intentarlo."
      );
      return;
    }
    const binding: BindingFields = {
      inventoryProductId,
      inventoryProductName: product?.name ?? null,
      inventoryStock: product?.inStock ?? null,
      bindingMissing: false,
    };
    rowLocks.current.add(article.id);
    setRowErrors(previous => {
      const next = { ...previous };
      delete next[article.id];
      return next;
    });
    setPendingBindings(previous => ({ ...previous, [article.id]: binding }));
    try {
      await bindingMutation.mutateAsync({ id: article.id, inventoryProductId });
      // Solo se actualiza la fila confirmada. No se restaura nunca una copia del catálogo completo.
      utils.costco.list.setData(undefined, current =>
        current?.map(row =>
          row.id === article.id ? { ...row, ...binding } : row
        )
      );
      await Promise.all([
        utils.costco.list.invalidate(),
        utils.costco.order.invalidate(),
      ]);
      toast.success(
        inventoryProductId === null
          ? "Relación eliminada"
          : "Relación guardada",
        {
          description: article.name,
        }
      );
    } catch (error) {
      const message = errorMessage(error);
      setRowErrors(previous => ({ ...previous, [article.id]: message }));
      toast.error("No se pudo guardar la relación", { description: message });
    } finally {
      // Rollback local exclusivamente de esta fila: no afecta a guardados concurrentes.
      setPendingBindings(previous => {
        const next = { ...previous };
        delete next[article.id];
        return next;
      });
      rowLocks.current.delete(article.id);
    }
  };

  const refreshLocalInventory = async () => {
    const results = await Promise.all([
      catalogQuery.refetch(),
      ...(canEdit ? [inventoryQuery.refetch()] : []),
      utils.costco.order.invalidate(),
    ]);
    if (
      results.some(result => result && "isError" in result && result.isError)
    ) {
      throw new Error(
        "No se pudieron refrescar todos los datos. Reintenta la lectura del inventario local."
      );
    }
  };

  const handleRefresh = async () => {
    if (busy || rowLocks.current.size > 0) return;
    setRefreshing(true);
    setActionError(null);
    try {
      await refreshLocalInventory();
      toast.success("Stock actualizado desde el inventario local");
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setRefreshing(false);
    }
  };

  const handleSync = async () => {
    if (!canEdit || busy || rowLocks.current.size > 0) return;
    setActionError(null);
    setRefreshing(true);
    let synced = false;
    try {
      const result = await syncMutation.mutateAsync();
      synced = true;
      await refreshLocalInventory();
      toast.success(`Loyverse sincronizado: ${result.total} productos`, {
        description: `${result.created} nuevos y ${result.updated} actualizados.`,
      });
    } catch (error) {
      setActionError(
        synced
          ? `Loyverse se ha sincronizado, pero falta refrescar los datos: ${errorMessage(error)}`
          : errorMessage(error)
      );
    } finally {
      setRefreshing(false);
    }
  };

  const exportCSV = () => {
    if (!catalogQuery.data || hasPending || busy) return;
    const rows = filteredArticles.map(article => [
      article.name,
      article.costcoCode,
      article.cost,
      article.inventoryProductId === null
        ? ""
        : article.bindingMissing
          ? `Producto eliminado o no disponible (ID ${article.inventoryProductId})`
          : (article.inventoryProductName ?? ""),
      article.inventoryProductId === null || article.bindingMissing
        ? ""
        : (article.inventoryStock ?? ""),
      article.inventoryProductId === null
        ? ""
        : String(article.inventoryProductId),
    ]);
    const csv =
      "\uFEFF" +
      [
        [
          "Artículo",
          "Código Costco",
          "Precio Coste",
          "Artículo Inventario",
          "Stock Inventario",
          "ID Artículo Inventario",
        ],
        ...rows,
      ]
        .map(row => row.map(csvCell).join(","))
        .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" })
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `articulos_costco_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const renderBinding = (article: CostcoArticle) => {
    const pending = Boolean(pendingBindings[article.id]);
    return (
      <div className="min-w-0 space-y-2">
        {canEdit ? (
          <InventoryProductPicker
            products={products}
            value={article.inventoryProductId}
            onChange={id => void saveBinding(article, id)}
            label={`Artículo Inventario para ${article.name}`}
            bindingMissing={article.bindingMissing}
            disabled={
              pending ||
              busy ||
              inventoryQuery.isLoading ||
              inventoryQuery.isError
            }
          />
        ) : (
          <p className="break-words text-sm [overflow-wrap:anywhere]">
            {article.inventoryProductId === null
              ? "Sin vincular"
              : article.bindingMissing
                ? "Producto eliminado o no disponible"
                : (article.inventoryProductName ?? "Producto vinculado")}
          </p>
        )}
        {pending && (
          <p
            role="status"
            className="flex items-center gap-1.5 text-xs text-sky-700"
          >
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" /> Guardando
            relación…
          </p>
        )}
        {!pending && article.bindingMissing && (
          <p className="break-words text-xs text-amber-700">
            El producto vinculado ya no existe. Selecciona otro o quita la
            relación.
          </p>
        )}
        {rowErrors[article.id] && (
          <p
            role="alert"
            className="break-words text-xs text-red-700 [overflow-wrap:anywhere]"
          >
            No guardado: {rowErrors[article.id]}. Vuelve a seleccionar para
            reintentar.
          </p>
        )}
      </div>
    );
  };

  const loading = authLoading || (Boolean(user) && catalogQuery.isLoading);
  const catalogUnavailable = catalogQuery.data === undefined;

  return (
    <section
      aria-label="Artículos Costco"
      className="min-w-0 space-y-5 text-slate-800"
    >
      <Card className="min-w-0 border-sky-200 bg-white">
        <CardContent className="space-y-4 px-4 sm:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 space-y-2">
              <h2 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
                <Package className="h-5 w-5 shrink-0 text-sky-600" /> Artículos
                Costco
              </h2>
              <p className="max-w-2xl text-sm leading-relaxed text-slate-600">
                Catálogo y precios de coste suministrados. Vincula cada artículo
                con cualquier producto del inventario para consultar su stock.
                Cada selección se guarda automáticamente.
              </p>
              <p className="text-xs leading-relaxed text-slate-500">
                No se consulta Costco en directo. El stock procede del
                inventario local; Loyverse solo se sincroniza al pulsar su
                botón.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 xl:max-w-lg xl:justify-end">
              <Button
                type="button"
                variant="outline"
                className="min-h-11 gap-2 border-sky-200 bg-sky-50 text-sky-800"
                onClick={() => void handleRefresh()}
                disabled={!user || loading || busy || hasPending}
              >
                <RefreshCw
                  className={`h-4 w-4 shrink-0 ${refreshing && !syncMutation.isPending ? "animate-spin" : ""}`}
                />
                {refreshing && !syncMutation.isPending
                  ? "Refrescando…"
                  : "Refrescar stock local"}
              </Button>
              {canEdit && (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 gap-2 border-slate-200 bg-white"
                  onClick={() => void handleSync()}
                  disabled={loading || busy || hasPending}
                >
                  <RefreshCw
                    className={`h-4 w-4 shrink-0 ${syncMutation.isPending ? "animate-spin" : ""}`}
                  />
                  {syncMutation.isPending
                    ? "Sincronizando…"
                    : "Sincronizar Loyverse"}
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                className="min-h-11 gap-2 border-slate-200 bg-white"
                onClick={exportCSV}
                disabled={
                  catalogUnavailable ||
                  filteredArticles.length === 0 ||
                  busy ||
                  hasPending
                }
                title="Exportar los artículos visibles, con su ID de inventario"
              >
                <Download className="h-4 w-4 shrink-0" /> Exportar CSV
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-3 border-t border-sky-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full min-w-0 sm:max-w-md">
              <label htmlFor={searchId} className="sr-only">
                Buscar artículo por nombre o código Costco
              </label>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400"
              />
              <Input
                id={searchId}
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Buscar artículo o código Costco…"
                className="h-11 border-slate-200 pl-9 pr-11 text-base sm:text-sm"
              />
              {search && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Limpiar búsqueda"
                  onClick={() => setSearch("")}
                  className="absolute right-0 top-0 h-11 w-11"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {!catalogUnavailable && (
              <p
                role="status"
                className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600"
              >
                <span>
                  {filteredArticles.length} de {articles.length} artículos
                </span>
                <span className="inline-flex items-center gap-1 text-sky-700">
                  <Link2 className="h-3.5 w-3.5" /> {linkedCount} vinculados
                </span>
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {!authLoading && !user && !authError && (
        <Card className="border-slate-200 bg-white">
          <CardContent className="text-sm text-slate-600">
            Inicia sesión para consultar los artículos Costco.
          </CardContent>
        </Card>
      )}
      {user && !canEdit && (
        <p className="rounded-lg border border-sky-100 bg-sky-50 p-3 text-sm text-sky-800">
          Solo administración puede modificar las relaciones y sincronizar el
          inventario con Loyverse.
        </p>
      )}
      {(authError ||
        catalogQuery.error ||
        (canEdit && inventoryQuery.error) ||
        actionError) && (
        <div
          role="alert"
          className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <p className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="min-w-0 break-words [overflow-wrap:anywhere]">
              {actionError ??
                (authError
                  ? `No se pudo comprobar la sesión: ${authError.message}`
                  : catalogQuery.error
                    ? `No se pudo cargar el catálogo Costco: ${catalogQuery.error.message}`
                    : `No se pudo cargar el inventario: ${inventoryQuery.error?.message}`)}
              {!catalogUnavailable &&
                " Los datos visibles pueden estar desactualizados."}
            </span>
          </p>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 border-red-200 bg-white text-red-800"
            onClick={() =>
              authError ? void refreshAuth() : void handleRefresh()
            }
            disabled={busy || hasPending}
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Reintentar lectura
          </Button>
        </div>
      )}
      {canEdit && inventoryQuery.isLoading && !loading && (
        <p
          role="status"
          className="flex items-center gap-2 text-sm text-slate-600"
        >
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando productos del
          inventario…
        </p>
      )}
      {canEdit && inventoryQuery.isSuccess && products.length === 0 && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          El inventario está vacío. Añade productos en la pestaña Inventario
          para poder vincularlos. Puedes quitar las relaciones anteriores desde
          cada selector.
        </p>
      )}
      {loading ? (
        <Card className="border-sky-200 bg-white">
          <CardContent
            role="status"
            className="flex items-center gap-2 text-sm text-slate-600"
          >
            <Loader2 className="h-5 w-5 animate-spin text-sky-600" /> Cargando
            catálogo Costco…
          </CardContent>
        </Card>
      ) : !catalogUnavailable && filteredArticles.length === 0 ? (
        <Card className="border-slate-200 bg-white">
          <CardContent className="space-y-2 text-sm text-slate-600">
            <p className="font-medium text-slate-800">
              {articles.length === 0
                ? "No hay artículos Costco disponibles."
                : "No hay artículos que coincidan con la búsqueda."}
            </p>
            {articles.length === 0 ? (
              <p>
                No se muestran artículos de ejemplo. Reintenta cargar el
                catálogo suministrado.
              </p>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={() => setSearch("")}
              >
                Limpiar búsqueda
              </Button>
            )}
          </CardContent>
        </Card>
      ) : !catalogUnavailable ? (
        <>
          <Card className="hidden min-w-0 overflow-hidden border-sky-200 bg-white py-0 lg:block">
            <table className="w-full table-fixed text-sm">
              <caption className="sr-only">
                Catálogo Costco, coste suministrado y relación con el inventario
                local
              </caption>
              <colgroup>
                <col className="w-[27%]" />
                <col className="w-[13%]" />
                <col className="w-[13%]" />
                <col className="w-[33%]" />
                <col className="w-[14%]" />
              </colgroup>
              <thead className="border-b border-sky-100 bg-sky-50 text-slate-700">
                <tr>
                  <th scope="col" className="p-4 text-left font-semibold">
                    Artículo
                  </th>
                  <th scope="col" className="p-4 text-left font-semibold">
                    Código Costco
                  </th>
                  <th scope="col" className="p-4 text-right font-semibold">
                    Precio Coste
                  </th>
                  <th scope="col" className="p-4 text-left font-semibold">
                    Artículo Inventario
                  </th>
                  <th scope="col" className="p-4 text-right font-semibold">
                    Stock Inventario
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredArticles.map(article => (
                  <tr
                    key={article.id}
                    className="align-top hover:bg-slate-50/70"
                  >
                    <th
                      scope="row"
                      className="break-words p-4 text-left font-medium [overflow-wrap:anywhere]"
                    >
                      {article.name}
                    </th>
                    <td className="break-words p-4 font-mono text-xs text-slate-600 [overflow-wrap:anywhere]">
                      {article.costcoCode}
                    </td>
                    <td className="p-4 text-right font-medium tabular-nums">
                      {costLabel(article.cost)}
                    </td>
                    <td className="p-4">{renderBinding(article)}</td>
                    <td
                      className={`break-words p-4 text-right tabular-nums ${article.inventoryProductId === null || article.bindingMissing ? "text-xs text-slate-500" : "font-semibold text-sky-800"}`}
                    >
                      {stockLabel(article)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 lg:hidden">
            {filteredArticles.map(article => (
              <Card
                key={article.id}
                className="min-w-0 gap-0 border-sky-200 bg-white py-4"
              >
                <CardContent className="min-w-0 space-y-4 px-4">
                  <h3 className="break-words font-semibold leading-relaxed [overflow-wrap:anywhere]">
                    {article.name}
                  </h3>
                  <dl className="grid min-w-0 grid-cols-2 gap-3">
                    <div className="min-w-0">
                      <dt className="text-xs text-slate-500">Código Costco</dt>
                      <dd className="mt-1 break-words font-mono text-sm [overflow-wrap:anywhere]">
                        {article.costcoCode}
                      </dd>
                    </div>
                    <div className="min-w-0 text-right">
                      <dt className="text-xs text-slate-500">Precio Coste</dt>
                      <dd className="mt-1 text-sm font-semibold tabular-nums">
                        {costLabel(article.cost)}
                      </dd>
                    </div>
                  </dl>
                  <div className="min-w-0 space-y-2 border-t border-slate-100 pt-3">
                    <p className="text-xs font-medium text-slate-500">
                      Artículo Inventario
                    </p>
                    {renderBinding(article)}
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 p-3">
                    <span className="text-xs text-slate-600">
                      Stock Inventario
                    </span>
                    <span
                      className={`min-w-0 break-words text-right tabular-nums ${article.inventoryProductId === null || article.bindingMissing ? "text-xs text-slate-500" : "text-sm font-semibold text-sky-800"}`}
                    >
                      {stockLabel(article)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}

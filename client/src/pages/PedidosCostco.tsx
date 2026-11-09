import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Plus,
  Minus,
  Copy,
  Download,
  RefreshCw,
  RotateCcw,
  Trash2,
  Loader2,
  ShoppingCart,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { InventoryProductPicker } from "./ArticulosCostco";
import {
  calculateCostcoOrderItem,
  calculateCostcoOrderTotal,
} from "@shared/costcoOrders";
import {
  costcoCurrency,
  costcoOrderCsv,
  costcoOrderEmailHtml,
  costcoOrderEmailText,
} from "@shared/costcoOrderExport";
import { copyCostcoOrderClipboard } from "@/lib/costcoClipboard";

function IntegerField({
  value,
  min,
  label,
  disabled,
  onSave,
}: {
  value: number;
  min: number;
  label: string;
  disabled: boolean;
  onSave: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  const cancelled = useRef(false);
  useEffect(() => setDraft(String(value)), [value]);
  const commit = () => {
    if (cancelled.current) {
      cancelled.current = false;
      return;
    }
    const parsed = Number(draft);
    if (
      !draft.trim() ||
      !Number.isInteger(parsed) ||
      parsed < min ||
      parsed > 100000
    ) {
      toast.error(`${label}: indica un entero entre ${min} y 100000.`);
      setDraft(String(value));
      return;
    }
    if (parsed !== value) onSave(parsed);
  };
  return (
    <Input
      aria-label={label}
      type="number"
      inputMode="numeric"
      min={min}
      max={100000}
      step={1}
      value={draft}
      disabled={disabled}
      onChange={event => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={event => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") {
          cancelled.current = true;
          setDraft(String(value));
          event.currentTarget.blur();
        }
      }}
      className="h-10 min-w-0 px-1 text-center text-base tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none sm:text-sm"
    />
  );
}

const stockText = (value: string | null) =>
  value === null
    ? "—"
    : new Intl.NumberFormat("es-ES", { maximumFractionDigits: 3 }).format(
        Number(value)
      );

export default function PedidosCostco() {
  const utils = trpc.useUtils();
  const order = trpc.costco.order.useQuery();
  const catalog = trpc.costco.list.useQuery();
  const inventory = trpc.inventoryProducts.list.useQuery();
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [addSearch, setAddSearch] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const [copyFallback, setCopyFallback] = useState<{
    html: string;
    text: string;
  } | null>(null);
  const [copying, setCopying] = useState(false);
  const copyLock = useRef(false);
  const copyTableRef = useRef<HTMLDivElement>(null);
  const refresh = async () => {
    await Promise.all([
      utils.costco.order.invalidate(),
      utils.costco.list.invalidate(),
      utils.inventoryProducts.list.invalidate(),
    ]);
  };
  const update = trpc.costco.setOrderItem.useMutation({
    onMutate: async input => {
      await utils.costco.order.cancel();
      const previous = utils.costco.order.getData();
      utils.costco.order.setData(undefined, current =>
        current?.map(row => {
          if (row.id !== input.id) return row;
          const next = { ...row, ...input };
          return { ...next, ...calculateCostcoOrderItem(next) };
        })
      );
      return { previous };
    },
    onError: (error, _input, context) => {
      if (context?.previous)
        utils.costco.order.setData(undefined, context.previous);
      toast.error(error.message);
    },
    onSettled: () => utils.costco.order.invalidate(),
  });
  const link = trpc.costco.setBinding.useMutation({
    onSuccess: () => {
      refresh();
      toast.success("Relación con inventario guardada");
    },
    onError: error => toast.error(error.message),
  });
  const add = trpc.costco.addOrderItem.useMutation({
    onSuccess: () => {
      utils.costco.order.invalidate();
      setAddOpen(false);
      setAddSearch("");
      toast.success("Artículo añadido a la plantilla");
    },
    onError: error => toast.error(error.message),
  });
  const remove = trpc.costco.removeOrderItem.useMutation({
    onSuccess: () => utils.costco.order.invalidate(),
    onError: error => toast.error(error.message),
  });
  const reset = trpc.costco.resetOrder.useMutation({
    onSuccess: () => {
      utils.costco.order.invalidate();
      setResetOpen(false);
      toast.success("Cantidades a pedir reiniciadas a 0");
    },
    onError: error => toast.error(error.message),
  });
  const sync = trpc.inventoryProducts.syncLoyverse.useMutation({
    onSuccess: result => {
      refresh();
      toast.success(`Stock actualizado: ${result.total} artículos`);
    },
    onError: error => toast.error(error.message),
  });
  const busy =
    update.isPending ||
    link.isPending ||
    add.isPending ||
    remove.isPending ||
    reset.isPending ||
    sync.isPending;
  const rows = order.data ?? [];
  const total = calculateCostcoOrderTotal(rows);
  const selectedCount = rows.filter(row => row.quantity > 0).length;
  const filtered = rows.filter(row =>
    `${row.name} ${row.costcoCode} ${row.inventoryProductName ?? ""}`
      .toLocaleLowerCase("es")
      .includes(search.toLocaleLowerCase("es"))
  );
  const available = (catalog.data ?? []).filter(
    row =>
      !rows.some(current => current.id === row.id) &&
      `${row.name} ${row.costcoCode}`
        .toLocaleLowerCase("es")
        .includes(addSearch.toLocaleLowerCase("es"))
  );
  const copy = async () => {
    if (copyLock.current) return;
    copyLock.current = true;
    setCopying(true);
    const payload = {
      html: costcoOrderEmailHtml(rows),
      text: costcoOrderEmailText(rows),
    };
    try {
      const format = await copyCostcoOrderClipboard(payload);
      if (format === "table")
        toast.success(
          "Tabla copiada: pega normalmente en el correo para conservar el formato"
        );
      else if (format === "text")
        toast.info(
          "Pedido copiado en texto legible. Este navegador no ha permitido copiar la tabla."
        );
      else setCopyFallback(payload);
    } catch (error) {
      setCopyFallback(payload);
    } finally {
      copyLock.current = false;
      setCopying(false);
    }
  };
  const selectCopyTable = () => {
    if (!copyTableRef.current) return;
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    range.selectNodeContents(copyTableRef.current);
    selection.removeAllRanges();
    selection.addRange(range);
  };
  const download = () => {
    const url = URL.createObjectURL(
      new Blob(["\uFEFF", costcoOrderCsv(rows)], {
        type: "text/csv;charset=utf-8;",
      })
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "pedido-costco.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };
  if (order.isLoading)
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-12">
          <Loader2 className="h-5 w-5 animate-spin" />
          Cargando pedido Costco…
        </CardContent>
      </Card>
    );
  if (order.error)
    return (
      <Card>
        <CardContent className="space-y-3 py-6">
          <p className="text-destructive">
            No se pudo cargar el pedido: {order.error.message}
          </p>
          <Button variant="outline" onClick={() => order.refetch()}>
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );

  const quantities = (row: (typeof rows)[number]) => (
    <div className="flex items-center gap-1">
      <Button
        size="icon"
        variant="outline"
        className="h-10 w-9 shrink-0"
        aria-label={`Quitar un paquete de ${row.name}`}
        disabled={busy || row.quantity === 0}
        onClick={() =>
          update.mutate({ id: row.id, quantity: row.quantity - 1 })
        }
      >
        <Minus className="h-4 w-4" />
      </Button>
      <IntegerField
        value={row.quantity}
        min={0}
        disabled={busy}
        label={`Cantidad a pedir de ${row.name}`}
        onSave={quantity => update.mutate({ id: row.id, quantity })}
      />
      <Button
        size="icon"
        variant="outline"
        className="h-10 w-9 shrink-0"
        aria-label={`Añadir un paquete de ${row.name}`}
        disabled={busy || row.quantity >= 100000}
        onClick={() =>
          update.mutate({ id: row.id, quantity: row.quantity + 1 })
        }
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
  const picker = (row: (typeof rows)[number]) => (
    <InventoryProductPicker
      products={inventory.data ?? []}
      value={row.inventoryProductId}
      disabled={busy || inventory.isLoading || !!inventory.error}
      bindingMissing={row.bindingMissing}
      label={`Artículo de inventario para ${row.name}`}
      onChange={inventoryProductId =>
        link.mutate({ id: row.id, inventoryProductId })
      }
    />
  );
  const units = (row: (typeof rows)[number]) => (
    <IntegerField
      value={row.unitsPerPackage}
      min={1}
      disabled={busy}
      label={`Unidades por paquete de ${row.name}`}
      onSave={unitsPerPackage => update.mutate({ id: row.id, unitsPerPackage })}
    />
  );
  const removeButton = (row: (typeof rows)[number]) => (
    <Button
      size="icon"
      variant="ghost"
      className="h-10 w-10 text-muted-foreground hover:text-destructive"
      aria-label={`Quitar ${row.name} de la plantilla`}
      disabled={busy}
      onClick={() => remove.mutate({ id: row.id })}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );

  return (
    <div className="min-w-0 space-y-4">
      <Card className="border-sky-200 bg-sky-50/40">
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-bold">
                <ShoppingCart className="h-5 w-5 text-sky-700" />
                Pedidos Costco
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Las cantidades y relaciones se guardan automáticamente. El
                precio unitario corresponde al artículo o paquete de Costco.
              </p>
            </div>
            <div className="shrink-0 rounded-xl border border-sky-200 bg-background px-5 py-3">
              <p className="text-xs font-medium text-muted-foreground">
                TOTAL PEDIDO · {selectedCount} artículos
              </p>
              <p className="text-2xl font-bold tabular-nums text-sky-800">
                {costcoCurrency(total)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setAddOpen(true)}
              disabled={busy || catalog.isLoading || !!catalog.error}
            >
              <Plus className="mr-2 h-4 w-4" />
              Añadir artículo Costco
            </Button>
            <Button
              onClick={copy}
              disabled={busy || copying || selectedCount === 0}
              className="bg-sky-700 hover:bg-sky-800"
            >
              {copying ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              Copiar pedido
            </Button>
            <Button
              variant="outline"
              onClick={download}
              disabled={busy || selectedCount === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
            <Button
              variant="outline"
              onClick={refresh}
              disabled={busy || order.isFetching}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${order.isFetching ? "animate-spin" : ""}`}
              />
              Actualizar stock
            </Button>
            <Button
              variant="outline"
              onClick={() => sync.mutate()}
              disabled={busy}
            >
              {sync.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Sincronizar Loyverse
            </Button>
            <Button
              variant="outline"
              onClick={() => setResetOpen(true)}
              disabled={busy || selectedCount === 0}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reiniciar cantidades
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Copia una tabla lista para pegar en un correo: Item, Descripción y
            Cantidad, sin precios, totales ni artículos con cantidad 0. Pega
            normalmente (Ctrl+V), no como texto sin formato, para conservar los
            bordes y las columnas. «Hay» es el stock actual; «Total previsto» =
            Hay + Cantidad × Unidad/Paquete.
          </p>
          {busy && (
            <p
              role="status"
              className="flex items-center gap-2 text-xs text-sky-800"
            >
              <Loader2 className="h-3 w-3 animate-spin" />
              Guardando o actualizando…
            </p>
          )}
        </CardContent>
      </Card>
      {(inventory.error || catalog.error) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          {inventory.error
            ? `No se pudo cargar el selector del inventario: ${inventory.error.message}`
            : `No se pudo cargar el catálogo: ${catalog.error?.message}`}
          <Button
            variant="link"
            onClick={() => {
              inventory.refetch();
              catalog.refetch();
            }}
          >
            Reintentar
          </Button>
        </div>
      )}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          aria-label="Buscar en pedido Costco"
          placeholder="Buscar artículo, código o inventario…"
          value={search}
          onChange={event => setSearch(event.target.value)}
          className="pl-9"
        />
      </div>
      <div className="hidden overflow-x-auto rounded-xl border bg-background xl:block">
        <table className="w-full min-w-[1200px] text-sm">
          <thead className="bg-slate-50 text-xs text-muted-foreground">
            <tr>
              {[
                "Item",
                "Descripción",
                "Producto en inventario",
                "Pedir (Cantidad)",
                "Unidad/Paquete",
                "Hay",
                "Total previsto",
                "PVP unidad",
                "PVP total",
                "",
              ].map((heading, index) => (
                <th key={index} className="px-3 py-3 text-left font-medium">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(row => (
              <tr
                key={row.id}
                className="border-t align-middle hover:bg-slate-50/50"
              >
                <td className="px-3 py-3 font-mono text-xs">
                  {row.costcoCode}
                </td>
                <td className="max-w-[220px] px-3 py-3 font-medium">
                  {row.name}
                </td>
                <td className="w-[250px] px-3 py-3">{picker(row)}</td>
                <td className="w-[150px] px-3 py-3">{quantities(row)}</td>
                <td className="w-[105px] px-3 py-3">{units(row)}</td>
                <td className="px-3 py-3 text-right tabular-nums">
                  {stockText(row.inventoryStock)}
                </td>
                <td className="px-3 py-3 text-right font-medium tabular-nums">
                  {stockText(row.totalExpected)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                  {costcoCurrency(row.cost)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums">
                  {costcoCurrency(row.totalCost)}
                </td>
                <td>{removeButton(row)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t bg-sky-50">
            <tr>
              <td colSpan={8} className="px-3 py-4 text-right font-semibold">
                TOTAL PEDIDO (todos los artículos)
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-right font-bold text-sky-800">
                {costcoCurrency(total)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:hidden">
        {filtered.map(row => (
          <Card key={row.id} className="min-w-0">
            <CardContent className="space-y-4 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="mb-1 font-mono text-xs text-muted-foreground">
                    Item {row.costcoCode}
                  </p>
                  <h3 className="break-words text-sm font-semibold">
                    {row.name}
                  </h3>
                </div>
                {removeButton(row)}
              </div>
              <div>
                <p className="mb-1.5 text-xs text-muted-foreground">
                  Producto en inventario
                </p>
                {picker(row)}
                {row.bindingMissing && (
                  <p className="mt-1 text-xs text-amber-700">
                    El artículo vinculado ya no está en el inventario.
                    Selecciona otro.
                  </p>
                )}
              </div>
              <div className="grid min-w-0 grid-cols-2 gap-3">
                <div className="min-w-0">
                  <p className="mb-1.5 text-xs text-muted-foreground">
                    Pedir (Cantidad)
                  </p>
                  {quantities(row)}
                </div>
                <div className="min-w-0">
                  <p className="mb-1.5 text-xs text-muted-foreground">
                    Unidad/Paquete
                  </p>
                  {units(row)}
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Hay</dt>
                  <dd className="mt-1 tabular-nums">
                    {stockText(row.inventoryStock)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Total previsto
                  </dt>
                  <dd className="mt-1 font-semibold tabular-nums">
                    {stockText(row.totalExpected)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">PVP unidad</dt>
                  <dd className="mt-1 tabular-nums">
                    {costcoCurrency(row.cost)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">PVP total</dt>
                  <dd className="mt-1 font-bold tabular-nums text-sky-800">
                    {costcoCurrency(row.totalCost)}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
          {rows.length
            ? "No hay artículos que coincidan con la búsqueda."
            : "La plantilla está vacía. Añade artículos del catálogo Costco."}
        </p>
      )}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[85dvh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Añadir artículo Costco</DialogTitle>
            <DialogDescription>
              Selecciona un artículo del catálogo. Se añade con cantidad 0 para
              preparar el pedido.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Buscar nombre o código…"
            aria-label="Buscar artículo Costco para añadir"
            value={addSearch}
            onChange={event => setAddSearch(event.target.value)}
          />
          <div className="max-h-[50dvh] space-y-1 overflow-y-auto">
            {available.map(row => (
              <Button
                key={row.id}
                variant="ghost"
                disabled={busy}
                className="h-auto w-full justify-start whitespace-normal py-3 text-left"
                onClick={() => add.mutate({ id: row.id })}
              >
                <Plus className="mr-2 h-4 w-4 shrink-0" />
                <span>
                  <span className="block text-sm">{row.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {row.costcoCode} · {costcoCurrency(row.cost)}
                  </span>
                </span>
              </Button>
            ))}
            {available.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground">
                No quedan artículos que coincidan o ya están en la plantilla.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reiniciar cantidades a 0</DialogTitle>
            <DialogDescription>
              Se conservan todos los artículos, sus relaciones con el inventario
              y las unidades por paquete. Solo se pone a cero la cantidad a
              pedir.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setResetOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={busy} onClick={() => reset.mutate()}>
              Reiniciar cantidades
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={copyFallback !== null}
        onOpenChange={open => !open && setCopyFallback(null)}
      >
        <DialogContent className="flex max-h-[calc(100dvh_-_2rem)] w-[calc(100vw_-_2rem)] max-w-[calc(100vw_-_2rem)] flex-col overflow-hidden sm:max-w-2xl">
          <DialogHeader className="shrink-0 text-left">
            <DialogTitle>Pedido para copiar en un correo</DialogTitle>
            <DialogDescription>
              El navegador ha bloqueado el copiado automático. Pulsa Seleccionar
              tabla, copia con Ctrl+C (o Copiar en el móvil) y pégala
              normalmente en el correo.
            </DialogDescription>
          </DialogHeader>
          <Button
            type="button"
            variant="outline"
            onClick={selectCopyTable}
            className="min-h-11 shrink-0 self-start"
          >
            <Copy className="mr-2 h-4 w-4" /> Seleccionar tabla
          </Button>
          <div className="min-h-0 overflow-y-auto overscroll-contain space-y-4">
            <div
              ref={copyTableRef}
              aria-label="Tabla del pedido para correo"
              className="select-text bg-white text-slate-900"
              dangerouslySetInnerHTML={{ __html: copyFallback?.html ?? "" }}
            />
            <details className="rounded-md border p-3">
              <summary className="cursor-pointer text-sm font-medium">
                Alternativa en texto sin formato
              </summary>
              <textarea
                aria-label="Texto del pedido para copiar"
                readOnly
                value={copyFallback?.text ?? ""}
                onFocus={event => event.currentTarget.select()}
                className="mt-3 h-64 w-full rounded-md border p-3 text-base sm:text-sm"
              />
            </details>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

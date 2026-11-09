import { useId, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, PackagePlus, Pencil } from "lucide-react";
import { toast } from "sonner";
import type { CostcoCatalogRow } from "@shared/costcoOrders";

export function CostcoArticleEditor({
  article,
  onClose,
  onSaved,
}: {
  article: CostcoCatalogRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const utils = trpc.useUtils();
  const create = trpc.costco.create.useMutation();
  const update = trpc.costco.update.useMutation();
  const [name, setName] = useState(article?.name ?? "");
  const [code, setCode] = useState(article?.costcoCode ?? "");
  const [cost, setCost] = useState(article?.cost.replace(".", ",") ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);
  const formId = useId();
  const editing = article !== null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (inFlight.current) return;
    const normalizedName = name.trim();
    const normalizedCode = code.trim();
    const normalizedCost = cost.trim().replace(",", ".");
    if (!normalizedName || normalizedName.length > 255) {
      setError("Indica un nombre de artículo de entre 1 y 255 caracteres.");
      return;
    }
    if (!normalizedCode || normalizedCode.length > 50) {
      setError("Indica un código Costco de entre 1 y 50 caracteres.");
      return;
    }
    if (!/^\d{1,8}(?:\.\d{1,2})?$/.test(normalizedCost)) {
      setError(
        "Indica un precio de coste válido, de 0 a 99.999.999,99 €, con un máximo de dos decimales. Puedes usar coma o punto."
      );
      return;
    }
    const [integer, fraction = ""] = normalizedCost.split(".");
    const payload = {
      name: normalizedName,
      costcoCode: normalizedCode,
      cost: `${integer}.${fraction.padEnd(2, "0")}`,
    };
    inFlight.current = true;
    setSaving(true);
    setError(null);
    try {
      if (article) await update.mutateAsync({ id: article.id, ...payload });
      else await create.mutateAsync(payload);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "No se pudo guardar el artículo. Inténtalo de nuevo."
      );
      inFlight.current = false;
      setSaving(false);
      return;
    }
    // El guardado ya está confirmado. Un fallo de refresco no debe repetir el alta.
    const refreshes = await Promise.allSettled([
      utils.costco.list.invalidate(),
      utils.costco.order.invalidate(),
    ]);
    toast.success(
      editing ? "Artículo Costco actualizado" : "Artículo Costco añadido"
    );
    if (refreshes.some(result => result.status === "rejected")) {
      toast.warning(
        "El artículo está guardado, pero falta refrescar la lista. Pulsa Refrescar stock local."
      );
    }
    onSaved();
    onClose();
  };

  return (
    <Dialog
      open
      onOpenChange={open => {
        if (!open && !inFlight.current) onClose();
      }}
    >
      <DialogContent
        className="flex max-h-[calc(100dvh_-_2rem)] w-[calc(100vw_-_2rem)] max-w-[calc(100vw_-_2rem)] flex-col gap-0 overflow-hidden p-0 transition-[opacity,transform] sm:max-w-lg"
        showCloseButton={!saving}
        onInteractOutside={event => {
          if (saving) event.preventDefault();
        }}
        onEscapeKeyDown={event => {
          if (saving) event.preventDefault();
        }}
      >
        <DialogHeader className="shrink-0 border-b px-5 py-5 pr-12 text-left sm:px-6">
          <DialogTitle className="flex items-center gap-2 text-xl leading-snug">
            {editing ? (
              <Pencil className="h-5 w-5 shrink-0 text-sky-600" />
            ) : (
              <PackagePlus className="h-5 w-5 shrink-0 text-sky-600" />
            )}
            {editing ? "Editar artículo Costco" : "Nuevo artículo Costco"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Modifica los datos del artículo. Su relación con el inventario y las cantidades del pedido se conservan."
              : "Añade un artículo al catálogo. Después podrás vincularlo con el inventario y añadirlo a Pedidos Costco."}
          </DialogDescription>
        </DialogHeader>
        <form
          id={formId}
          onSubmit={submit}
          aria-busy={saving}
          className="min-h-0 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6"
        >
          <fieldset disabled={saving} className="min-w-0 space-y-5">
            <div className="space-y-2">
              <Label htmlFor={`${formId}-name`}>
                Artículo <span aria-hidden="true">*</span>
              </Label>
              <Input
                id={`${formId}-name`}
                value={name}
                onChange={event => setName(event.target.value)}
                required
                maxLength={255}
                placeholder="Nombre del artículo en Costco"
                autoComplete="off"
                className="h-11 min-w-0 text-base sm:text-sm"
              />
            </div>
            <div className="grid min-w-0 gap-5 sm:grid-cols-2">
              <div className="min-w-0 space-y-2">
                <Label htmlFor={`${formId}-code`}>
                  Código Costco <span aria-hidden="true">*</span>
                </Label>
                <Input
                  id={`${formId}-code`}
                  value={code}
                  onChange={event => setCode(event.target.value)}
                  required
                  maxLength={50}
                  placeholder="Código del producto"
                  autoComplete="off"
                  className="h-11 min-w-0 text-base sm:text-sm"
                />
              </div>
              <div className="min-w-0 space-y-2">
                <Label htmlFor={`${formId}-cost`}>
                  Precio Coste (€) <span aria-hidden="true">*</span>
                </Label>
                <Input
                  id={`${formId}-cost`}
                  value={cost}
                  onChange={event => setCost(event.target.value)}
                  required
                  inputMode="decimal"
                  maxLength={11}
                  placeholder="0,00"
                  autoComplete="off"
                  aria-describedby={`${formId}-price-hint`}
                  className="h-11 min-w-0 text-base tabular-nums sm:text-sm"
                />
              </div>
            </div>
            <p
              id={`${formId}-price-hint`}
              className="text-xs leading-relaxed text-slate-500"
            >
              Precio del artículo o paquete de Costco. Los cambios de coste se
              reflejan también en los cálculos del pedido.
            </p>
            {error && (
              <p
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 [overflow-wrap:anywhere]"
              >
                {error}
              </p>
            )}
          </fieldset>
        </form>
        <DialogFooter className="shrink-0 border-t bg-slate-50 px-5 py-4 sm:px-6">
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={onClose}
            className="min-h-11"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form={formId}
            disabled={saving}
            className="min-h-11 gap-2"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving
              ? "Guardando…"
              : editing
                ? "Guardar cambios"
                : "Añadir artículo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

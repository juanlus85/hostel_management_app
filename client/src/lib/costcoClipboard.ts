export type CostcoClipboardPayload = { html: string; text: string };
export type CostcoClipboardFormat = "table" | "text" | "manual";

/** Copia HTML y texto en navegadores con la API antigua; se invoca desde un clic. */
export function legacyCopyCostcoTable({
  html,
  text,
}: CostcoClipboardPayload): boolean {
  if (
    typeof document === "undefined" ||
    typeof document.execCommand !== "function"
  )
    return false;
  const selection = document.getSelection();
  if (!selection) return false;
  const previousRanges: Range[] = [];
  for (let index = 0; index < selection.rangeCount; index++)
    previousRanges.push(selection.getRangeAt(index).cloneRange());
  const focused = document.activeElement;
  const container = document.createElement("div");
  container.setAttribute("aria-hidden", "true");
  container.style.cssText =
    "position:fixed;left:-10000px;top:0;width:640px;background:white;";
  // El HTML procede únicamente del generador que escapa todos los datos del pedido.
  container.innerHTML = html;
  let wroteHtml = false;
  const onCopy = (event: ClipboardEvent) => {
    if (!event.clipboardData) return;
    try {
      event.clipboardData.setData("text/html", html);
      event.clipboardData.setData("text/plain", text);
      event.preventDefault();
      wroteHtml = true;
    } catch {
      wroteHtml = false;
    }
  };
  try {
    document.body.appendChild(container);
    const range = document.createRange();
    range.selectNodeContents(container);
    selection.removeAllRanges();
    selection.addRange(range);
    document.addEventListener("copy", onCopy);
    return document.execCommand("copy") && wroteHtml;
  } catch {
    return false;
  } finally {
    document.removeEventListener("copy", onCopy);
    container.remove();
    selection.removeAllRanges();
    for (const range of previousRanges) {
      try {
        selection.addRange(range);
      } catch {
        /* El nodo pudo desaparecer. */
      }
    }
    if (typeof HTMLElement !== "undefined" && focused instanceof HTMLElement)
      focused.focus({ preventScroll: true });
  }
}

/** Ofrece ambos formatos para que el editor de correo pegue una tabla real. */
export async function copyCostcoOrderClipboard(
  payload: CostcoClipboardPayload
): Promise<CostcoClipboardFormat> {
  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard?.write &&
    typeof ClipboardItem !== "undefined"
  ) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([payload.html], { type: "text/html" }),
          "text/plain": new Blob([payload.text], { type: "text/plain" }),
        }),
      ]);
      return "table";
    } catch {
      // Permisos o soporte parcial: probar una copia tradicional antes de perder la tabla.
    }
  }
  if (legacyCopyCostcoTable(payload)) return "table";
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(payload.text);
      return "text";
    } catch {
      // No se informa de éxito si el portapapeles está bloqueado.
    }
  }
  return "manual";
}

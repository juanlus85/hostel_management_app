import { afterEach, describe, expect, it, vi } from "vitest";
import {
  copyCostcoOrderClipboard,
  legacyCopyCostcoTable,
} from "../client/src/lib/costcoClipboard";

const payload = {
  html: "<table><tr><td>Agua</td></tr></table>",
  text: "Item: 1138180\nDescripción: Agua\nCantidad: 10",
};
class TestClipboardItem {
  constructor(public readonly data: Record<string, Blob>) {}
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function legacyDocument({ event = true, fail = false } = {}) {
  const listeners = new Map<string, (event: unknown) => void>();
  const container = {
    setAttribute: vi.fn(),
    style: { cssText: "" },
    innerHTML: "",
    remove: vi.fn(),
  };
  const previousRange = {};
  const selection = {
    rangeCount: 1,
    getRangeAt: vi.fn(() => ({ cloneRange: () => previousRange })),
    removeAllRanges: vi.fn(),
    addRange: vi.fn(),
  };
  const setData = vi.fn();
  const preventDefault = vi.fn();
  const removeEventListener = vi.fn((type: string) => listeners.delete(type));
  vi.stubGlobal("document", {
    getSelection: () => selection,
    activeElement: null,
    createElement: () => container,
    createRange: () => ({ selectNodeContents: vi.fn() }),
    body: { appendChild: vi.fn() },
    addEventListener: (type: string, handler: (event: unknown) => void) =>
      listeners.set(type, handler),
    removeEventListener,
    execCommand: () => {
      if (fail) throw new Error("Bloqueado");
      if (event)
        listeners.get("copy")?.({ clipboardData: { setData }, preventDefault });
      return true;
    },
  });
  return {
    container,
    selection,
    previousRange,
    setData,
    preventDefault,
    removeEventListener,
  };
}

describe("Costco: portapapeles para correo", () => {
  it("escribe HTML y texto en una misma entrada del portapapeles", async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn();
    vi.stubGlobal("navigator", { clipboard: { write, writeText } });
    vi.stubGlobal("ClipboardItem", TestClipboardItem);
    expect(await copyCostcoOrderClipboard(payload)).toBe("table");
    const item = write.mock.calls[0][0][0] as TestClipboardItem;
    expect(Object.keys(item.data)).toEqual(["text/html", "text/plain"]);
    expect(await item.data["text/html"].text()).toBe(payload.html);
    expect(await item.data["text/plain"].text()).toBe(payload.text);
    expect(writeText).not.toHaveBeenCalled();
  });
  it("usa texto legible si el navegador no admite HTML", async () => {
    vi.stubGlobal("ClipboardItem", undefined);
    vi.stubGlobal("document", undefined);
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    expect(await copyCostcoOrderClipboard(payload)).toBe("text");
    expect(writeText).toHaveBeenCalledWith(payload.text);
  });
  it("ofrece selección manual cuando el portapapeles está bloqueado", async () => {
    vi.stubGlobal("ClipboardItem", TestClipboardItem);
    vi.stubGlobal("document", undefined);
    const write = vi.fn().mockRejectedValue(new Error("Permiso denegado"));
    const writeText = vi.fn().mockRejectedValue(new Error("Permiso denegado"));
    vi.stubGlobal("navigator", { clipboard: { write, writeText } });
    expect(await copyCostcoOrderClipboard(payload)).toBe("manual");
  });
  it("ofrece selección manual sin API de portapapeles", async () => {
    vi.stubGlobal("ClipboardItem", undefined);
    vi.stubGlobal("document", undefined);
    vi.stubGlobal("navigator", {});
    expect(await copyCostcoOrderClipboard(payload)).toBe("manual");
  });
  it("conserva la tabla con copia tradicional si falla la API moderna", async () => {
    const doc = legacyDocument();
    vi.stubGlobal("ClipboardItem", TestClipboardItem);
    const writeText = vi.fn();
    vi.stubGlobal("navigator", {
      clipboard: {
        write: vi.fn().mockRejectedValue(new Error("No soportado")),
        writeText,
      },
    });
    expect(await copyCostcoOrderClipboard(payload)).toBe("table");
    expect(doc.setData).toHaveBeenCalledWith("text/html", payload.html);
    expect(doc.setData).toHaveBeenCalledWith("text/plain", payload.text);
    expect(doc.preventDefault).toHaveBeenCalled();
    expect(doc.container.remove).toHaveBeenCalled();
    expect(doc.selection.addRange).toHaveBeenLastCalledWith(doc.previousRange);
    expect(doc.removeEventListener).toHaveBeenCalledWith(
      "copy",
      expect.any(Function)
    );
    expect(writeText).not.toHaveBeenCalled();
  });
  it("no anuncia éxito si la copia tradicional no escribió el formato HTML", () => {
    const doc = legacyDocument({ event: false });
    expect(legacyCopyCostcoTable(payload)).toBe(false);
    expect(doc.container.remove).toHaveBeenCalled();
  });
  it("limpia selección temporal y listeners si la copia tradicional falla", () => {
    const doc = legacyDocument({ fail: true });
    expect(legacyCopyCostcoTable(payload)).toBe(false);
    expect(doc.container.remove).toHaveBeenCalled();
    expect(doc.selection.addRange).toHaveBeenLastCalledWith(doc.previousRange);
    expect(doc.removeEventListener).toHaveBeenCalledWith(
      "copy",
      expect.any(Function)
    );
  });
});

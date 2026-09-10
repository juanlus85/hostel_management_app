import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  deleteLocalInvoiceAttachment,
  deleteInvoiceWithLocalAttachment,
  resolveLocalInvoiceAttachmentPath,
} from "./localInvoiceAttachments";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe("local invoice attachments", () => {
  it("resolves and deletes only a local invoice attachment", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "invoice-file-"));
    temporaryDirectories.push(directory);
    const fileName = "Proveedor - 3T 2026 - 300826.pdf";
    const filePath = path.join(directory, fileName);
    fs.writeFileSync(filePath, "invoice");
    const url = `/uploads/invoices/${encodeURIComponent(fileName)}`;

    expect(resolveLocalInvoiceAttachmentPath(url, directory)).toBe(filePath);
    expect(deleteLocalInvoiceAttachment(url, directory)).toBe(true);
    expect(fs.existsSync(filePath)).toBe(false);
  });

  it("does not resolve remote URLs or paths outside the invoices directory", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "invoice-file-"));
    temporaryDirectories.push(directory);

    expect(resolveLocalInvoiceAttachmentPath("https://example.com/file.pdf", directory)).toBeNull();
    expect(resolveLocalInvoiceAttachmentPath("/uploads/invoices/%2E%2E%2Fsecret.pdf", directory)).toBeNull();
  });

  it("restores the attachment when deleting the invoice record fails", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "invoice-file-"));
    temporaryDirectories.push(directory);
    const fileName = "factura.pdf";
    const filePath = path.join(directory, fileName);
    fs.writeFileSync(filePath, "original");

    await expect(
      deleteInvoiceWithLocalAttachment(
        `/uploads/invoices/${fileName}`,
        async () => {
          throw new Error("database unavailable");
        },
        directory
      )
    ).rejects.toThrow("database unavailable");

    expect(fs.readFileSync(filePath, "utf8")).toBe("original");
  });
});

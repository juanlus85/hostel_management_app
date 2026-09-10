import fs from "node:fs";
import path from "node:path";

const LOCAL_INVOICE_URL_PREFIX = "/uploads/invoices/";

export function resolveLocalInvoiceAttachmentPath(
  fileUrl: string | null | undefined,
  uploadsDirectory: string
): string | null {
  if (!fileUrl?.startsWith(LOCAL_INVOICE_URL_PREFIX)) return null;

  const fileName = decodeURIComponent(
    fileUrl.slice(LOCAL_INVOICE_URL_PREFIX.length)
  );
  if (!fileName || path.basename(fileName) !== fileName) return null;

  const resolvedDirectory = path.resolve(uploadsDirectory);
  const resolvedFile = path.resolve(resolvedDirectory, fileName);
  return resolvedFile.startsWith(`${resolvedDirectory}${path.sep}`)
    ? resolvedFile
    : null;
}

export function deleteLocalInvoiceAttachment(
  fileUrl: string | null | undefined,
  uploadsDirectory = path.join(process.cwd(), "uploads", "invoices")
): boolean {
  const filePath = resolveLocalInvoiceAttachmentPath(fileUrl, uploadsDirectory);
  if (!filePath || !fs.existsSync(filePath)) return false;

  fs.unlinkSync(filePath);
  return true;
}

export async function deleteInvoiceWithLocalAttachment<T>(
  fileUrl: string | null | undefined,
  deleteInvoiceRecord: () => Promise<T>,
  uploadsDirectory = path.join(process.cwd(), "uploads", "invoices")
): Promise<T> {
  const filePath = resolveLocalInvoiceAttachmentPath(fileUrl, uploadsDirectory);
  const attachmentBackup =
    filePath && fs.existsSync(filePath) ? fs.readFileSync(filePath) : null;

  if (filePath && attachmentBackup) {
    fs.unlinkSync(filePath);
  }

  try {
    return await deleteInvoiceRecord();
  } catch (error) {
    if (filePath && attachmentBackup && !fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, attachmentBackup);
    }
    throw error;
  }
}

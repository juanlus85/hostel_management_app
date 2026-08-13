export type SupplierMatchCandidate = {
  name: string;
  legalName?: string | null;
};

export function normalizeSupplierName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/\b(s\.?a\.?u?\.?|s\.?l\.?u?\.?|sociedad anonima|sociedad limitada)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function findCommercialSupplier<T extends SupplierMatchCandidate>(
  suppliers: T[] | undefined,
  recognisedName: string,
) {
  const recognised = normalizeSupplierName(recognisedName);
  if (!recognised) return undefined;

  return suppliers?.find((supplier) => {
    const commercialName = normalizeSupplierName(supplier.name);
    const legalName = supplier.legalName ? normalizeSupplierName(supplier.legalName) : "";

    return commercialName === recognised || legalName === recognised ||
      (legalName.length > 4 && (recognised.includes(legalName) || legalName.includes(recognised)));
  });
}

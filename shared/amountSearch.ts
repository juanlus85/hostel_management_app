function compactCurrency(value: string): string {
  return value
    .toLowerCase()
    .replace(/[€\s]/g, "")
    .replace(/[.,]/g, "");
}

/** Permite buscar importes con punto o coma decimal, con o sin el símbolo euro. */
export function amountMatchesSearch(amount: string | number | null | undefined, term: string): boolean {
  const compactTerm = compactCurrency(term.trim());
  if (!compactTerm) return true;

  const numericAmount = Number.parseFloat(String(amount ?? "0"));
  if (!Number.isFinite(numericAmount)) return false;

  const variants = [
    numericAmount.toFixed(2),
    numericAmount.toFixed(2).replace(".", ","),
    String(numericAmount),
  ];

  return variants.some((variant) => compactCurrency(variant).includes(compactTerm));
}

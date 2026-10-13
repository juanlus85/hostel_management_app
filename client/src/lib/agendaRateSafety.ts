export type RateDraftLike = {
  previousRate: number;
  rateText: string;
};

export function parseAgendaRate(value: string) {
  const amount = Number(value.replace(",", "."));
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

export function hasAgendaRateChanged(draft: RateDraftLike) {
  const amount = parseAgendaRate(draft.rateText);
  return amount !== null && Math.abs(amount - draft.previousRate) > 0.004;
}

export function isLargeAgendaRateChange(draft: RateDraftLike) {
  const amount = parseAgendaRate(draft.rateText);
  if (amount === null || !hasAgendaRateChanged(draft)) return false;
  const absoluteDifference = Math.abs(amount - draft.previousRate);
  const relativeDifference = draft.previousRate > 0 ? absoluteDifference / draft.previousRate : 0;
  return absoluteDifference >= 50 || relativeDifference >= 0.5;
}

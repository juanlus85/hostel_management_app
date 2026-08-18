export type ClosingForDashboard = { status: string; zReading?: string | null; difference?: string | null; withdrawnCash?: string | null; withdrawnCards?: string | null; prepaidBooking?: string | null };

export function aggregateClosedCashSummary(closings: ClosingForDashboard[]) {
  return closings.filter((closing) => closing.status === "closed").reduce((summary, closing) => ({
    totalIncomeZ: summary.totalIncomeZ + Number(closing.zReading || 0),
    totalDifference: summary.totalDifference + Number(closing.difference || 0),
    withdrawnCash: summary.withdrawnCash + Number(closing.withdrawnCash || 0),
    withdrawnCards: summary.withdrawnCards + Number(closing.withdrawnCards || 0),
    prepaidBooking: summary.prepaidBooking + Number(closing.prepaidBooking || 0),
  }), { totalIncomeZ: 0, totalDifference: 0, withdrawnCash: 0, withdrawnCards: 0, prepaidBooking: 0 });
}

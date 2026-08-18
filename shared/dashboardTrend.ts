export type DashboardTrendRow = { date: string; income: number; expenses: number; balance: number };
export type DashboardTrendSource = { date: string; amount: string | number | null | undefined; type?: "income" | "expense" };

export function aggregateDashboardTrend(incomeSources: DashboardTrendSource[], expenseSources: DashboardTrendSource[]): DashboardTrendRow[] {
  const entries = new Map<string, { income: number; expenses: number }>();
  const add = (date: string, field: "income" | "expenses", amount: string | number | null | undefined) => {
    const current = entries.get(date) || { income: 0, expenses: 0 };
    current[field] += Number(amount || 0);
    entries.set(date, current);
  };
  incomeSources.forEach((row) => add(row.date, "income", row.amount));
  expenseSources.forEach((row) => add(row.date, "expenses", row.amount));
  return Array.from(entries.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, ...value, balance: value.income - value.expenses }));
}

export function mergeDashboardTrends(...series: DashboardTrendRow[][]): DashboardTrendRow[] {
  return aggregateDashboardTrend(series.flat().map((row) => ({ date: row.date, amount: row.income })), series.flat().map((row) => ({ date: row.date, amount: row.expenses })));
}

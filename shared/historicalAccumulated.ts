export function cumulativeMonthlySeries(values: Array<string | number | null | undefined>): number[] {
  return values.reduce<number[]>((series, value) => {
    series.push((series.at(-1) || 0) + Number(value || 0));
    return series;
  }, []);
}

export function toggleSelectedYear(years: number[], year: number): number[] {
  return years.includes(year) ? years.filter((item) => item !== year) : [...years, year].sort((a, b) => a - b);
}

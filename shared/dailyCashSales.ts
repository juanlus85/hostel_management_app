export type DailyCashClosing = {
  businessId: number;
  date: string;
  zReading: string | number;
  totalCash: string | number;
  totalCards: string | number;
};

export type DailyCashSales = {
  date: string;
  hostelZ: number;
  hostelCash: number;
  hostelCards: number;
  tiendaZ: number;
  tiendaCash: number;
  tiendaCards: number;
};

const asAmount = (value: string | number) => Number.parseFloat(String(value)) || 0;

export function aggregateDailyCashSales(
  closings: DailyCashClosing[],
  hostelBusinessId: number | undefined,
  tiendaBusinessId: number | undefined,
): DailyCashSales[] {
  const daily = new Map<string, DailyCashSales>();

  for (const closing of closings) {
    const isHostel = closing.businessId === hostelBusinessId;
    const isTienda = closing.businessId === tiendaBusinessId;
    if (!isHostel && !isTienda) continue;

    if (!daily.has(closing.date)) {
      daily.set(closing.date, {
        date: closing.date,
        hostelZ: 0,
        hostelCash: 0,
        hostelCards: 0,
        tiendaZ: 0,
        tiendaCash: 0,
        tiendaCards: 0,
      });
    }

    const row = daily.get(closing.date)!;
    if (isHostel) {
      row.hostelZ += asAmount(closing.zReading);
      row.hostelCash += asAmount(closing.totalCash);
      row.hostelCards += asAmount(closing.totalCards);
    } else {
      row.tiendaZ += asAmount(closing.zReading);
      row.tiendaCash += asAmount(closing.totalCash);
      row.tiendaCards += asAmount(closing.totalCards);
    }
  }

  return Array.from(daily.values()).sort((a, b) => b.date.localeCompare(a.date));
}

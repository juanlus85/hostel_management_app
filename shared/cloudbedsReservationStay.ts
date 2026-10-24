export function preserveImportedStayDates(
  existing: { checkInDate: string; checkOutDate: string | null },
  incoming: { checkInDate: string; checkOutDate: string | null }
) {
  return {
    // Las asignaciones diarias pueden no repetir la llegada original. Una carga
    // posterior nunca debe desplazarla hacia delante y ocultar noches ya visibles.
    checkInDate:
      existing.checkInDate <= incoming.checkInDate
        ? existing.checkInDate
        : incoming.checkInDate,
    // De igual modo, conservamos la salida más amplia conocida mientras Cloudbeds
    // devuelve un detalle parcial en una consulta por día.
    checkOutDate: latestKnownCheckoutDate(
      existing.checkOutDate,
      incoming.checkOutDate
    ),
  };
}

function latestKnownCheckoutDate(
  existing: string | null,
  incoming: string | null
) {
  if (!existing) return incoming;
  if (!incoming) return existing;
  return existing >= incoming ? existing : incoming;
}


## Formato de respuesta aplicado

El contrato oficial de `getRatePlans` devuelve una lista `data[]`: cada fila incluye `rateID`, `isDerived`, `roomTypeID`, `roomTypeName`, `roomRate`, `roomsAvailable`, el nombre de plan y `roomRateDetailed[]`. Cada fecha de `roomRateDetailed` aporta `date`, `rateBase`, `totalRate`, `roomsAvailable`, `minLos` y restricciones. El lector usa ahora `rateID` de la fila y `roomRateDetailed` para habilitar exclusivamente cambios de tarifas no derivadas.

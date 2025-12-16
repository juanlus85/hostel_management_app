# Análisis del Bug del Calendario

## Datos de las capturas de pantalla

### Vista Semanal (15-21 dic, 2025)
- **Juan**: Sáb 20 - 10:15-18:00, Dom 21 - 17:00-02:00
- **Maylin**: Vie 19 - 10:00-14:00, Sáb 20 - 10:00-14:00
- **Regis**: Vie 19 - 20:00-04:00

### Vista Mensual (Diciembre 2025)
- **Sáb 20**: Maylin 10:00, Regis 20:00
- **Dom 21**: Maylin 10:00, Juan 10:15, Juan 17:00

## Discrepancias encontradas

1. **Regis Vie 19 (20:00-04:00)**: Aparece en vista semanal pero NO en vista mensual
2. **Maylin Vie 19 (10:00-14:00)**: Aparece en vista semanal pero NO en vista mensual
3. **Juan Sáb 20 (10:15-18:00)**: Aparece en vista semanal pero NO en vista mensual
4. **Regis Sáb 20**: Aparece en vista mensual pero NO en vista semanal

## Posible causa

El problema podría estar en:
1. La consulta de datos usa rangos de fecha diferentes
2. El formato de fecha (toISOString) puede generar fechas incorrectas por zona horaria
3. El filtrado de shiftsByDate puede estar usando claves de fecha inconsistentes

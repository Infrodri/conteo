# PR: Dashboard Electoral

## Descripción
Panel de visualización de resultados electorales en tiempo real.

## Archivos modificados

### Backend
- `src/controllers/dashboard.controller.ts` - APIs de dashboard

### Frontend
- `src/pages/DashboardPage.tsx` - Componente de dashboard
- `src/services/dashboard.service.ts` - Servicio de dashboard

## Funcionalidades

### 1. Tarjetas de Resumen
- **Votos Válidos**: Total de InscritosHabilitados de mesas
- **Blancos**: Suma de VotoBlanco
- **Nulos**: Suma de TotalVotoNulo
- **Emitidos**: Suma de VotoEmitidoReal

### 2. Filtro por Tipo
- Selector: ALCALDE / CONCEJALES
- Actualiza todos los datos según el tipo seleccionado

### 3. Barra de Progreso
- Muestra avance de digitación por tipo
- Porcentaje completado / total de mesas

### 4. Tabla de Resultados
- Lista de partidos con votos
- Porcentaje de votación
- Ordenado por cantidad de votos

## API Endpoints

```
GET /api/dashboard/resumen?tipo=ALCALDE
GET /api/dashboard/resultados?tipo=ALCALDE
```

## Estructura de Respuesta - Resumen

```json
{
  "success": true,
  "data": {
    "tipo": "ALCALDE",
    "totales": {
      "votoValido": 12480,
      "votoBlanco": 120,
      "totalVotoNulo": 85,
      "votoEmitido": 12685
    },
    "porcentajes": {
      "participacion": 52.3,
      "votoBlanco": 0.95,
      "votoNulo": 0.67
    },
    "actas": {
      "totalMesas": 52,
      "actasCompletadasAlcalde": 25,
      "progresoAlcalde": 48
    }
  }
}
```

# PR: Módulo de Digitación

## Descripción
Sistema de digitación de actas electorales con permisos por operador y bloqueo de mesas.

## Archivos modificados

### Backend
- `src/controllers/acta.controller.ts` - Guardar acta, permisos
- `src/routes/acta.routes.ts` - Rutas de actas

### Frontend
- `src/pages/DigitacionPage.tsx` - Formulario de digitación
- `src/services/mesa.service.ts` - Métodos de actas

## Funcionalidades

### 1. Formulario de Digitación
- Selector: Localidad → Recinto → Mesa
- Dos secciones: ALCALDE y CONCEJAL
- 13 campos de votos por partido
- Campos: Blancos, Nulos
- Validación: suma de votos = votos emitidos

### 2. Sistema de Permisos
- **OPERADOR**: Solo puede editar si NO hay digitador asignado
- **ADMIN**: Puede editar cualquier acta
- Mismo digitador puede continuar editando su mesa

### 3. Estados de Mesa
- `PENDIENTE` - Sin datos
- `PARCIAL` - En progreso (digitador asignado)
- `COMPLETADA` - Con votos confirmados

### 4. Indicadores Visuales
- Verde: Completada
- Amarillo: Pendiente
- Gris + Candado: Bloqueada (otro digitador)
- Muestra "✓ Disponible" o "🔒 Bloqueado"

## API Endpoints

```
GET  /api/actas/mesa?codigo=X     # Buscar mesa
GET  /api/actas/candidaturas?municipioId=X&tipo=ALCALDE
POST /api/actas/mesa/:id/acta     # Guardar acta
```

## Flujo de Digitación

1. Seleccionar Localidad → Recinto → Mesa
2. Verificar estado (disponible/bloqueada)
3. Ingresar votos por partido
4. Ingresar Blancos y Nulos
5. Guardar (parcial) o Confirmar
6. Mesa marcada como bloqueada para ese digitador

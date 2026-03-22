# PR: Panel de Administración

## Descripción
Panel administrativo para gestión de usuarios, importación de datos y observación de mesas.

## Archivos modificados

### Backend
- `src/controllers/admin.controller.ts` - CRUD admin, stats
- `src/routes/admin.routes.ts` - Rutas admin
- `src/controllers/acta.controller.ts` -getMesasObservadas, desbloquear

### Frontend
- `src/pages/AdminPage.tsx` - Panel admin con tabs
- `src/pages/ObservacionPage.tsx` - Observación de mesas
- `src/services/admin.service.ts` - Servicio admin

## Funcionalidades

### 1. AdminPage - Pestañas
- **Estadísticas**: Dashboard con conteos
- **Partidos**: Lista de partidos
- **Candidaturas**: Lista de candidaturas  
- **Mesas**: Gestión de mesas
- **Carga CSV**: Importación con drag & drop

### 2. Botón "Limpiar Todo"
- Ubicación: Pestaña "Carga CSV"
- Modal de confirmación
- Borra todos los datos electorales
- Mantiene usuarios

### 3. ObservacionPage - Tabla de Mesas
- Filtros: Localidad, Recinto, Estado
- Columnas: Mesa, Localidad, Recinto, Alcaldía, Concejos
- Badge de estado con color
- Botón "Desbloquear" por sección
- Botón "Ver" para ir a digitación

### 4. Endpoint de Desbloqueo
```
POST /api/actas/mesa/:id/desbloquear
Body: { tipo: "ALCALDE" | "CONCEJAL" }
```

## API Endpoints

```
GET  /api/admin/stats                    # Estadísticas
POST /api/admin/limpiar-datos           # Limpiar BD
GET  /api/admin/ubicacion/localidades    # Lista localidades
GET  /api/admin/ubicacion/recintos       # Lista recintos
GET  /api/admin/ubicacion/mesas          # Lista mesas
GET  /api/actas/mesas-observadas        # Mesas con filtros
POST /api/actas/mesa/:id/desbloquear    # Desbloquear sección
```

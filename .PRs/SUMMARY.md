# Resumen de Pull Requests - SCEM

Sistema de Cómputo Electoral Municipal

## Lista de PRs

| # | Módulo | Descripción | Prioridad |
|---|--------|-------------|-----------|
| 1 | **auth** | Sistema de autenticación con JWT | Alta |
| 2 | **models** | Esquemas de MongoDB | Alta |
| 3 | **import-csv** | Importación de datos CSV | Alta |
| 4 | **digitacion** | Módulo de digitación de actas | Alta |
| 5 | **admin** | Panel de administración | Alta |
| 6 | **dashboard** | Panel de resultados electorales | Media |
| 7 | **general** | Mejoras de UX y responsive | Baja |

---

## PR #1: Sistema de Autenticación (`auth/`)

### Archivos
```
backend/src/controllers/auth.controller.ts
backend/src/middleware/auth.middleware.ts
backend/src/routes/auth.routes.ts
backend/src/models/user.model.ts
frontend/src/pages/LoginPage.tsx
frontend/src/stores/auth.store.ts
```

### Endpoints
- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/auth/me`

### Roles
- ADMIN: Acceso total
- OPERADOR: Solo digitación

---

## PR #2: Modelos de Datos (`models/`)

### Esquemas
- **Mesa**: codigoMesa (único), numeroMesa, estadoAlcalde/Concejal
- **ActaDigitada**: votos por candidato, status
- **Candidatura**: partidoId, municipioId, tipo, numeroPapeleta
- **Partido**: nombre, sigla, color
- **User**: email, password, rol

### Índices únicos
- Mesa: `codigoMesa`
- Candidatura: `municipioId + tipo + numeroPapeleta`
- Partido: `sigla`

---

## PR #3: Importación CSV (`import-csv/`)

### Formatos soportados
- **ALCALDES.csv**: Partidos y candidaturas
- **DATOS.csv**: Mesas con votos (CodigoMesa único)

### Características
- Encoding Windows-1252
- Separador auto-detectado (`;`, `,`, `\t`)
- Búsqueda case-insensitive
- Limpieza antes de importar

### Endpoints
- `POST /api/admin/import/candidaturas`
- `POST /api/admin/import/mesas`
- `POST /api/admin/limpiar-datos`

---

## PR #4: Módulo de Digitación (`digitacion/`)

### Flujo
1. Seleccionar Localidad → Recinto → Mesa
2. Verificar estado (disponible/bloqueada)
3. Ingresar votos por partido
4. Guardar o Confirmar

### Permisos
- OPERADOR: Solo puede editar si no hay digitador
- ADMIN: Puede editar cualquier acta

### Estados
- PENDIENTE → PARCIAL → COMPLETADA

---

## PR #5: Panel Admin (`admin/`)

### Funcionalidades
- Estadísticas del sistema
- Gestión de partidos y candidaturas
- Importación de CSV con drag & drop
- Observación de mesas con filtros
- Desbloqueo de secciones

### Endpoints
- `GET /api/admin/stats`
- `GET /api/actas/mesas-observadas`
- `POST /api/actas/mesa/:id/desbloquear`

---

## PR #6: Dashboard (`dashboard/`)

### Tarjetas
- Votos Válidos (Inscritos)
- Blancos
- Nulos
- Emitidos

### Filtro
- ALCALDE / CONCEJALES

---

## PR #7: Mejoras Generales (`general/`)

### UX
- Diseño responsive
- Hamburger menu
- Loading states
- Confirmaciones

---

## Orden de aplicación recomendado

1. **models** (base de todo)
2. **auth** (necesario para acceder)
3. **import-csv** (importar datos)
4. **digitacion** (usar datos)
5. **admin** (gestión)
6. **dashboard** (visualización)
7. **general** (mejoras)

---

## Scripts útiles

```bash
# Limpiar base de datos
cd backend && npx ts-node scripts/clean-db.ts

# Crear usuarios por defecto
cd backend && npx ts-node scripts/create-users.ts

# Ver estado de archivos
git status
```

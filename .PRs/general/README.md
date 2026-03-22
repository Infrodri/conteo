# PR: Mejoras Generales

## Descripción
Mejoras de UX, diseño responsive y fixes varios.

## Cambios

### 1. Diseño Responsive
- Hamburger menu para móvil
- Grid adaptativo en tablas
- Inputs más grandes para touch
- Breakpoints: sm, md, lg, xl

### 2. Layout Principal
- Header con logo y navegación
- Menú hamburguesa en móvil
- Footer con info

### 3. Scripts de Mantenimiento

#### clean-db.ts
```bash
npx ts-node scripts/clean-db.ts
```
Limpia todas las colecciones excepto users.

#### create-users.ts
```bash
npx ts-node scripts/create-users.ts
```
Crea admin y operador por defecto.

## Archivos UI

### Frontend
- `src/components/Layout.tsx` - Layout con navegación
- `src/App.tsx` - Router con rutas protegidas
- `src/main.tsx` - Entry point

### Rutas
```
/             → Dashboard (requiere auth)
/login        → Login
/admin        → Panel admin (ADMIN only)
/digitacion   → Digitação (requiere auth)
/observacion  → Observación (ADMIN only)
```

## Mejoras de UX
- Loading spinners en estados de carga
- Mensajes de error con íconos
- Toast notifications para éxito/error
- Confirmación antes de acciones destructivas

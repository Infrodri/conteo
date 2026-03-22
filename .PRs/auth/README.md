# PR: Sistema de Autenticación

## Descripción
Sistema de login y registro con JWT y control de roles.

## Archivos

### Backend
- `src/controllers/auth.controller.ts`
- `src/middleware/auth.middleware.ts`
- `src/routes/auth.routes.ts`
- `src/models/user.model.ts`

### Frontend
- `src/pages/LoginPage.tsx`
- `src/stores/auth.store.ts`
- `src/services/api.ts`

## Funcionalidades

### 1. Login
- Email + Password
- Retorna JWT token
- Token guardado en localStorage
- Middleware valida token en cada request

### 2. Roles
- **ADMIN**: Acceso total
- **OPERADOR**: Solo puede digitação

### 3. Middleware de Permisos
```typescript
authenticate  // Verifica JWT
requireAdmin  // Verifica rol ADMIN
```

## API Endpoints

```
POST /api/auth/login
POST /api/auth/register
GET  /api/auth/me
```

## Credenciales por defecto

```
ADMIN:
  Email:    admin@scem.gob.bo
  Password: admin123

OPERADOR:
  Email:    operador@scem.gob.bo
  Password: operador123
```

## Flujo de Auth

1. Login → recibe `{ token, user }`
2. Token guardado en localStorage
3. Cada request incluye `Authorization: Bearer <token>`
4. Middleware extrae user del token
5. `req.user` disponible en todos los controllers

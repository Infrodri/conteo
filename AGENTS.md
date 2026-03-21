# AGENTS.md - Sistema de Cómputo Electoral Municipal (SCEM)

## Project Overview
MERN Stack application for real-time electoral vote counting and visualization (OEP Bolivia style).

---

## Build / Lint / Test Commands

### Backend (./backend)
```bash
npm install          # Install dependencies
npm run dev          # Start dev server (nodemon)
npm run build        # Build for production
npm start            # Run production build
npm run lint         # ESLint check
npm run lint:fix     # ESLint + auto-fix
npm test             # Run tests (Jest)
npm run test:watch   # Watch mode
npm run test:single  # Run single test file (npx jest path/to/test.ts)
```

### Frontend (./frontend)
```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # ESLint check
npm run lint:fix     # ESLint + auto-fix
npm run test         # Run tests (Vitest)
npm run test:watch   # Watch mode
npm run test:single  # Run single test: npx vitest run path/to/test.tsx
```

---

## Code Style Guidelines

### TypeScript Configuration
- **Strict mode ON** (`strict: true` in tsconfig)
- No `any` — use `unknown` + type guards when necessary
- Prefer `interface` for object shapes, `type` for unions/intersections
- Always annotate return types on public functions

### Naming Conventions
| Entity | Convention | Example |
|--------|------------|---------|
| Files | kebab-case | `user-model.ts`, `auth-controller.ts` |
| Classes/Interfaces | PascalCase | `UserModel`, `IAuthPayload` |
| Variables/Functions | camelCase | `getUserById`, `isValidEmail` |
| Constants | SCREAMING_SNAKE | `MAX_RETRY_COUNT`, `JWT_EXPIRY` |
| Enum values | UPPER_SNAKE | `UserRole.ADMIN`, `ActaStatus.VALIDA` |
| DB collections | PascalCase singular | `User`, `Acta`, `Municipio` |

### Imports Order
```ts
// 1. Node built-ins
import fs from 'fs';
import path from 'path';

// 2. External packages
import express from 'express';
import mongoose from 'mongoose';

// 3. Internal aliases (@/...)
import { UserModel } from '@/models';
import { authMiddleware } from '@/middleware';

// 4. Relative imports
import { helperFunc } from './helpers';
```

### Formatting (Prettier)
```json
{
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "bracketSpacing": true,
  "arrowParens": "avoid"
}
```

### Error Handling
```ts
// Backend: Use custom error classes
class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
  }
}

// Example usage
throw new AppError(400, 'Mesa no encontrada');

// Wrap async controllers
const asyncHandler = (fn: RequestHandler) => 
  (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
```

### MongoDB/Mongoose Conventions
- Use `Schema` with explicit typing
- Always define `timestamps: true`
- Use `ref` for ObjectId relationships
- Create indexes for query-heavy fields
- Validate at schema level, not just controller

```ts
const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    role: { type: String, enum: ['ADMIN', 'OPERADOR'], default: 'OPERADOR' }
  },
  { timestamps: true }
);

userSchema.index({ email: 1 });
```

### React Patterns
- Functional components with hooks only
- One component per file (export default)
- Colocate tests: `Component.test.tsx` next to `Component.tsx`
- Use TypeScript interfaces for props
- Prefer composition over prop drilling

```tsx
interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  onClick?: () => void;
}

export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary' }) => {
  return <button className={cn('btn', `btn-${variant}`)}>{children}</button>;
};
```

### File Structure
```
scem/
├── AGENTS.md
├── backend/
│   ├── src/
│   │   ├── config/         # DB, env, constants
│   │   ├── controllers/    # Route handlers
│   │   ├── middleware/     # Auth, validation, error handling
│   │   ├── models/         # Mongoose schemas
│   │   ├── routes/         # Express routes
│   │   ├── services/       # Business logic
│   │   ├── types/          # TypeScript types
│   │   ├── utils/          # Helper functions
│   │   └── app.ts          # Express app setup
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Route pages
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/        # API calls
│   │   ├── stores/         # State management
│   │   ├── types/          # TypeScript types
│   │   └── main.tsx
│   └── package.json
└── package.json            # Root workspace
```

---

## Security Rules
- Never commit `.env` files
- Use environment variables for all secrets
- Validate and sanitize ALL user input
- Hash passwords with bcrypt (min 10 rounds)
- JWT tokens expire in 24h, refresh in 7d
- RBAC checks on every protected route

---

## Git Conventions
- Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`
- Branch naming: `feature/功能名`, `fix/bug描述`
- PR description must include: What, Why, How to test

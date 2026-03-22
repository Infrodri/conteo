# PR: Modelos de Datos

## Descripción
Esquemas de MongoDB para el sistema electoral.

## Modelos

### 1. Mesa (`mesa.model.ts`)
```typescript
interface IMesa {
  _id: ObjectId;
  codigoMesa: string;      // Código único TSE (ej: 5019061)
  numeroMesa: number;     // Número de mesa (1-26)
  provinciaId: ObjectId;
  municipioId: ObjectId;
  localidadId?: ObjectId;
  recintoId: ObjectId;
  inscritosHabilitados: number;
  estadoAlcalde: 'PENDIENTE' | 'PARCIAL' | 'COMPLETADA' | 'ANULADA';
  estadoConcejal: 'PENDIENTE' | 'PARCIAL' | 'COMPLETADA' | 'ANULADA';
  digitadorIdAlcalde?: ObjectId;  // Quién digitó ALCALDE
  digitadorIdConcejal?: ObjectId;  // Quién digitó CONCEJAL
}
```

### 2. ActaDigitada (`acta-digitada.model.ts`)
```typescript
interface IActaDigitada {
  _id: ObjectId;
  mesaId: ObjectId;
  tipo: 'ALCALDE' | 'CONCEJAL';
  voto1-voto13: number;           // Votos por partido
  votoValido: number;              // Suma de votos
  votoBlanco: number;
  votoNuloDirecto: number;
  votoNuloDeclinacion: number;
  totalVotoNulo: number;
  votoEmitido: number;
  status: 'PARCIAL' | 'VALIDA' | 'OBSERVADA';
  digitadorId?: ObjectId;           // Quién digitó
}
```

### 3. Candidatura (`candidatura.model.ts`)
```typescript
interface ICandidatura {
  _id: ObjectId;
  partidoId: ObjectId;
  municipioId: ObjectId;
  tipo: 'ALCALDE' | 'CONCEJAL';
  nombreCandidato: string;
  numeroPapeleta: number;
  esTitular: boolean;
}
```

### 4. Partido (`partido.model.ts`)
```typescript
interface IPartido {
  _id: ObjectId;
  nombre: string;
  sigla: string;           // Ej: ADN, MOP, UCS
  color: string;           // Hex color para UI
  logo?: string;
}
```

### 5. Ubicación
- `Provincia` - José María Linares
- `Municipio` - Puna
- `Localidad` - 24 localidades
- `Recinto` - 26 recintos

### 6. Usuario (`user.model.ts`)
```typescript
interface IUser {
  _id: ObjectId;
  email: string;
  password: string;         // bcrypt hashed
  nombre: string;
  rol: 'ADMIN' | 'OPERADOR';
  activo: boolean;
}
```

## Índices
- Mesa: `codigoMesa` (único)
- Candidatura: `municipioId + tipo + numeroPapeleta` (único)
- Partido: `sigla` (único)

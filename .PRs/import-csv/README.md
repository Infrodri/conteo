# PR: Importación de Datos CSV

## Descripción
Sistema de importación de datos electorales desde archivos CSV (Windows-1252 encoding).

## Archivos modificados

### Backend
- `src/controllers/admin.controller.ts` - Controlador de importación
- `src/models/mesa.model.ts` - Modelo de mesa con codigoMesa
- `src/models/recinto.model.ts` - Modelo de recinto con localidadId

### Frontend
- `src/services/admin.service.ts` - Servicio con limpiarDatos()
- `src/pages/AdminPage.tsx` - Botón de limpiar datos

## Funcionalidades

### 1. Importación de Candidaturas (ALCALDES.csv)
- Formato: `Nombre Partido;Provincia;Municipio;Candidato;Posición;Titularidad;Nombre Completo`
- Separador: `;`
- Encoding: Windows-1252
- Genera siglas únicas por partido
- Crea 13 partidos y 26 candidaturas (13 ALCALDE + 13 CONCEJAL)

### 2. Importación de Mesas (DATOS.csv)
- Formato: `CodigoMesa;Descripcion;...;Voto1...Voto13;VotoEmitido`
- Identificador único: `CodigoMesa` (ej: 5019061)
- 52 mesas únicas
- 104 actas (52 ALCALDE + 52 CONCEJAL)
- Detecta automáticamente separador (`;`, `,`, `\t`)

### 3. Limpieza de Datos
- Endpoint: `POST /admin/limpiar-datos`
- Borra: actas, candidaturas, partidos, mesas, ubicación
- Mantiene: usuarios

## API Endpoints

```
POST /api/admin/import/candidaturas  # Importar ALCALDES.csv
POST /api/admin/import/mesas         # Importar DATOS.csv
POST /api/admin/limpiar-datos       # Limpiar todo
```

## Commits relacionados
- `65f6fd0` - fix: clear all data before importing official CSV

# Pull Requests - SCEM

Sistema de Cómputo Electoral Municipal

## Estructura de PRs

```
.PRs/
├── README.md                    # Este archivo
├── dashboard/                   # PR: Dashboard con métricas
├── digitacion/                  # PR: Módulo de digitación
├── admin/                       # PR: Panel de administración
├── auth/                        # PR: Sistema de autenticación
├── import-csv/                  # PR: Importación de datos CSV
├── models/                      # PR: Modelos de datos
└── general/                     # PR: Mejoras generales
```

## Cómo crear los PRs

1. Revisar el contenido de cada carpeta `.PR/<modulo>/`
2. Aplicar los cambios usando `git cherry-pick` o manualmente
3. Crear el PR en GitHub

## Comandos útiles

```bash
# Ver archivos modificados en un commit
git show <commit-hash> --stat

# Crear rama para un PR
git checkout -b feat/<modulo>

# Aplicar cambios de un commit
git cherry-pick <commit-hash>
```

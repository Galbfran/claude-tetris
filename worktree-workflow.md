# Flujo de trabajo: Worktrees con revisión

## Visión general

```
/worktree-init (si hay .trees/ sin configurar)
       ↓
/worktree → revisar manualmente → /worktree-commit → /worktree-merge → /worktree-clean
```

---

## Paso 0 — Inicializar worktrees existentes: `/worktree-init`

> Usá este paso si ya tenés directorios en `.trees/` sin su archivo de estado, o cuando quieras asegurarte de que el índice central esté sincronizado.

```
/worktree-init
```

Realiza dos acciones:

1. **Inicializa los `.worktree-status.yaml` faltantes** — detecta worktrees en `.trees/` que no tienen configuración, infiere su descripción y fecha desde el historial de git, y crea el archivo en cada uno.

2. **Sincroniza el índice central `.trees-index.yaml`** — siempre se ejecuta, incluso si no hubo worktrees nuevos. Compara el estado actual de `.trees/` con el índice y:
   - Agrega ramas que están en `.trees/` pero faltan en el índice
   - Elimina ramas que ya no tienen directorio en `.trees/`
   - Actualiza entradas con datos desactualizados

El archivo `.trees-index.yaml` en el directorio raíz del proyecto refleja en todo momento el estado real de todos los worktrees activos:

```yaml
# Índice central de worktrees activos
updated: '2026-06-09'
worktrees:
  - branch: nombre-rama
    description: 'Descripción breve'
    reviewed: false
    created: '2026-06-09'
```

**Resultado:** cada worktree queda listo para entrar al flujo de revisión, y `.trees-index.yaml` queda sincronizado con la realidad.

---

## Paso 1 — Crear worktrees: `/worktree`

Crea ramas aisladas en `.trees/` para implementar funcionalidades en paralelo sin tocar el directorio principal del proyecto.

```
/worktree <descripción de la tarea>
```

Para múltiples tareas en paralelo, separá con `---`:

```
/worktree
Primera tarea aquí
---
Segunda tarea aquí
---
Tercera tarea aquí
```

**Resultado:** se crean directorios en `.trees/<nombre-rama>/` con el código implementado. Cada worktree incluye un archivo `.worktree-status.yaml`:

```yaml
branch: nombre-rama
description: 'Descripción breve'
reviewed: false
created: '2026-06-09'
```

---

## Paso 2 — Revisar manualmente

Inspeccioná los cambios en cada worktree antes de aprobarlos:

```bash
# Ver qué cambió respecto a la rama base
git -C .trees/<nombre-rama> diff HEAD

# Abrir en el editor
code .trees/<nombre-rama>/
```

Cuando apruebes una rama, **editá su `.worktree-status.yaml`** y cambiá:

```yaml
reviewed: false  →  reviewed: true
```

Podés aprobar solo las ramas que estén listas y dejar las demás como pendientes.

---

## Paso 3 — Commitear aprobados: `/worktree-commit`

Hace commit automático de todas las ramas con `reviewed: true`. Las ramas pendientes se omiten sin error.

```
/worktree-commit
```

Con mensaje de commit personalizado:

```
/worktree-commit feat: implementar features principales
```

**Resultado:**

| Rama         | Descripción            | Resultado                |
|--------------|------------------------|--------------------------|
| `pause-menu` | Menú de pausa completo | ✓ commiteado             |
| `highscores` | Tabla de récords       | ✓ commiteado             |
| `skins`      | Temas visuales         | ⏭ pendiente de revisión |

---

## Paso 4 — Mergear a rama principal: `/worktree-merge`

Mergea todas las ramas aprobadas y commiteadas a la rama destino (por defecto, la rama actual).

```
/worktree-merge
```

Con rama destino específica:

```
/worktree-merge main
```

Se detiene automáticamente si hay conflictos en alguna rama. Al finalizar, pregunta si querés limpiar los worktrees ya mergeados.

**Resultado:**

| Rama         | Descripción            | Resultado                |
|--------------|------------------------|--------------------------|
| `pause-menu` | Menú de pausa completo | ✓ mergeado en `main`     |
| `highscores` | Tabla de récords       | ✓ mergeado en `main`     |
| `skins`      | Temas visuales         | ⏭ pendiente de revisión |

---

## Paso 5 — Limpiar worktrees mergeados: `/worktree-clean`

Elimina los directorios `.trees/<rama>/` y las ramas git que ya fueron mergeadas. Archiva el historial en `.trees-archive/` antes de borrar.

```
/worktree-clean
```

Siempre pide confirmación explícita antes de eliminar. Las ramas no mergeadas se omiten sin tocar.

---

## Diagrama de estados

```
          ┌──────────────────────────────────────────────────┐
          │  .trees/<rama>/ existe sin .yaml                │
          │  → /worktree-init crea .worktree-status.yaml    │
          │    y sincroniza .trees-index.yaml en la raíz    │
          └───────────────────┬──────────────────────────────┘
                              │
          ┌───────────────────▼─────────────────────────┐
          │  /worktree <tarea>                           │
          │  Crea rama + implementa + genera status.yaml │
          └───────────────────┬─────────────────────────┘
                              │
                         reviewed: false
                              │
          ┌───────────────────▼─────────────────────────┐
          │  Revisión manual del código                  │
          │  git diff / abrir archivos / inspeccionar    │
          └───────────────────┬─────────────────────────┘
                              │
               ┌──────────────┴──────────────┐
               │ aprobada                     │ rechazada / pendiente
               ▼                              ▼
       reviewed: true                  reviewed: false
               │                        (se omite en los
               │                         siguientes pasos)
               ▼
      /worktree-commit
      (commit de cambios)
               │
               ▼
      /worktree-merge
      (merge a rama principal)
               │
               ▼
      /worktree-clean
      (elimina worktree, archiva historial en .trees-archive/)
               │
               ▼
           ✓ listo
```

---

## Referencia rápida de comandos

| Comando | Cuándo usarlo |
|---------|--------------|
| `/worktree-init` | Hay `.trees/` sin archivos de estado YAML, o para sincronizar `.trees-index.yaml` |
| `/worktree <tarea>` | Crear nueva rama aislada para implementar |
| `/worktree-commit` | Commitear ramas con `reviewed: true` |
| `/worktree-merge` | Mergear commits aprobados a la rama principal |
| `/worktree-clean` | Limpiar ramas ya mergeadas y archivar su historial |

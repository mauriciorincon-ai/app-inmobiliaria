---
description: Planea el trabajo del sprint activo leyendo la orden de construcción emitida por la casa planeadora.
---

# /plan-sprint

Prepara el plan de ejecución del sprint a partir de la **orden de construcción** que el usuario
indique (o la más reciente en `portafolio/<slug>/ordenes/` de la planeadora,
`~/Code/hr01-develop-ai-apps/`, agregada como directorio adicional de solo lectura).

## Pasos

1. Lee la orden de construcción completa.
2. Lee sus referencias: `portafolio/<slug>/sprints/SPRINT_NNN.md` (con `status: open`), el brief,
   y el prototipo READ-ONLY si la orden lo referencia.
3. Lee los estándares del pipeline (`estandares/estandares.md` de la planeadora) — los 6+1 gates.
4. Analiza el estado actual del código de **este** repo.
5. Propón un plan de ejecución por fases:
   - **Fase 0 — Setup:** deps, config, scaffolding si falta.
   - **Fase 1 — Motor/núcleo:** lógica pura con tests (y `lib/ia/` si el sprint toca LLM — skill `ia-embebida`).
   - **Fase 2 — UI:** integración visual (paleta/microcopy del prototipo, construido desde cero).
   - **Fase 3 — Integración + e2e:** tests end-to-end + axe.
   - **Fase 4 — Calidad:** gates de los 6+1 estándares (`/deploy-check`).
6. Para cada fase: archivos a crear/modificar, tests a escribir, criterio observable de "fase completa".
7. Presenta el plan y espera su aprobación (plan mode). **La aprobación del plan significa SOLO
   "el plan es correcto" — NO es la orden de arranque.**
8. **Gate de arranque (obligatorio, kit v1.6.2):** tras la aprobación del plan, NO escribas
   código. Emite el **bloque de arranque**:
   - (a) Tu **recomendación de modelo y esfuerzo para ESTE sprint**, con su razón — por fase si
     difiere (motor puro vs. UI/motion vs. integración). Tú recomiendas; **el usuario decide**
     (modelo y esfuerzo son comandos suyos: `/model`).
   - (b) El recordatorio operativo: *"fija modelo y esfuerzo con `/model` y dime cualquier
     ajuste al plan"*.
   - (c) Espera la palabra explícita **«construye»** del usuario. Si responde con ajustes,
     incorpóralos y vuelve a esperar.
   **Prohibido crear o editar archivos antes del «construye».**

## Output esperado

Un plan en markdown con la estructura de arriba. Recuerda: **nunca escribes en la planeadora**; si
detectas que el plan del sprint necesita cambio, anótalo como `## Desviación del plan` en tu
bitácora y decláralo en el plan propuesto.

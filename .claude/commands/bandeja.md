---
description: Procesa la bandeja de IA de la app (contrato bandeja-ia v0.1.0) - lista lo pendiente, lo procesa con Claude Code, valida con el código, entrega y resume.
---

# /bandeja

Corre la bandeja de IA de Innmobiliaria. Sigue **la skill `.claude/skills/bandeja.md`** al pie de la letra: ahí están la
frontera de los términos (solo trabajo del usuario o de operador, jamás de un tercero, sin API de pago), la corrida paso a
paso y las reglas de cada tipo.

## Pasos

1. Lee `.claude/skills/bandeja.md`.
2. `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/bandeja/bandeja.mjs listar` y muestra lo pendiente al
   usuario (id, estado, vence). Si no hay nada, termina con el resumen.
3. Con el trabajo que el usuario elija: procesa, entrega con `bandeja.mjs entregar …`, pide la revisión de la muestra del
   tipo antes de publicar y cierra con el **resumen de la corrida**.

Un trabajo vencido no se procesa sin el «sí» del usuario. Al segundo intento fallido sobre lo mismo, relevo (regla 29).

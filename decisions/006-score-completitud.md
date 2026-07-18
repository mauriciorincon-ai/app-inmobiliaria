# ADR 006 — Score de completitud: pesos y ancla 55%

- **Estado:** Aceptado
- **Fecha:** 2026-07-18
- **Sprint:** 002

## Contexto

El score de completitud (goal-gradient) motiva al vendedor a completar su anuncio. El plan fija
un único dato: "subir la primera foto → ~55%". El resto de pesos queda a la implementación.

## Decisión

**Score 40..100 (`engine/score`):**

| Componente            | Puntos                    |
| --------------------- | ------------------------- |
| Base (registrado)     | 40                        |
| Fotos (decreciente)   | [15, 5, 4, 3, 3] → máx 30 |
| Descripción ≥80 chars | 15                        |
| Portada elegida       | 5                         |
| Opt-in de contacto    | 10                        |

- **Ancla cumplida:** 40 + 15 (primera foto) = **55%**.
- **Goal-gradient:** `siguientePaso()` siempre ofrece un paso pequeño y alcanzable; los puntos por
  foto decrecen (15→5→4→3→3) para reflejar rendimientos marginales.
- **Portada NO se auto-marca:** elegir portada es una acción puntuable (+5); la ficha usa la foto
  de `orden` 0 como fallback mientras tanto.
- **Opt-in +10, justificado:** el score mide "listo para compradores" y un anuncio sin canal de
  contacto no lo está. El checkbox sigue siendo libre y reversible (Ley 1581: incentivo ≠
  requisito). Máximo sin opt-in: 90%.

## El 100% NO exige verificación nivel 2

El sello ⭐ "Propietario verificado" es **insignia aparte**, no parte del score. Razón: el
goal-gradient solo funciona si la meta depende del propio vendedor desde su teléfono; la
verificación depende del operador + CTL (fuera de su control) y dejaría el 100% inalcanzable en el
momento. El ⭐ ya tiene su recompensa propia (sello en la ficha + posición destacada al
lanzamiento).

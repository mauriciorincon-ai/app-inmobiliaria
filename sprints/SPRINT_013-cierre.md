---
sprint: 013
app: inmobiliaria
hito: H-2
opened: 2026-10-21
closed: 2026-10-25
branch: sprint-013/nuevo-o-usado
pr: "#38"
---

# Sprint 013 «Nuevo o usado, con la misma plata» — cierre ejecutivo

- **Objetivo planeado:** las tres pantallas que cierran el módulo de vivienda nueva (03 ¿Nuevo o usado?, 04 ¿Te alcanza con subsidio?, 05 visita a la sala de ventas), la cola del operador, y las deudas del S12 que tocan el módulo; la edición 188 entra sin tocar código.
- **Resultado y estado:** **Sí en local; la CI se lee en el PR.** Migración 16 en la nube **con tu «sí»** (2026-10-22; `migration list --linked` re-leído hoy: 16/16) y humo anónimo 18 de 18. 1190 unitarias (78 archivos) y 508 e2e en verde, 0 fallos. Lighthouse local (3 corridas por ruta): `/nuevo-o-usado`, `/te-alcanza` y la visita pesan 268,8–274,6 KB de script (tope por ruta 285–295), LCP 2,6–2,8 s, rendimiento 0,96–0,97, las otras tres categorías 1. CPU de las vistas con 143 proyectos y 2.000 usados: 0,19 y 0,30 ms (Worker: 10 ms). Demo en rojo del presupuesto por ruta: un tope de 100 KB en `/te-alcanza` falla solo esa ruta (corrida local).
- **Fases (est. 3,25 h → real 3,3 h):** F1 base y nube (1,0 → 1,5 h; +50 %: migración con 9 funciones, 7 deudas y la nube en la misma fase) · F2 comparaciones (1,0 → 0,5 h) · F3 pantallas, visita, panel, e2e, textos, auditoría (1,25 → 1,3 h).
- **Entregables:** migración `20261027000001_*`, `src/engine/{agenda/plazo-salas,vivienda-nueva/te-alcanza,visita/*,operador/allowlist}.ts`, `src/components/{nuevos,visita,operador}/*`, `/nuevo-o-usado`, `/te-alcanza`, `/nuevos/[slug]/visita`, `/operador/salas` y sus rutas, `scripts/guarda-despliegue.mjs`, presupuesto por ruta, bandeja con metadatos del archivo, textos `{es, en}`, manual, guía v10 (96 pruebas, bloque P), READMEs.
- **No completado:** «marcar asistencia» a una sala · festivos en el plazo de dos días hábiles · aviso al operador de una solicitud nueva (abre el panel).
- **Desviaciones y causas:** (1) los contactos de las salas los escribe el operador en el panel: el S11 prohíbe transcribirlos (decidido por ti). (2) La dirección la manda el operador por WhatsApp, no por correo (manda la maqueta; el S8 nunca la mandó). (3) El plazo de 2 días hábiles y su correo «sin respuesta» no existían en el S8: se construyeron. (4) La vigencia de una edición sale del nombre del PDF (15→15) o de `--desde/--hasta`, no de una transcripción de la portada como pedía el plan; `revision-N.html` la muestra para compararla. (5) Los usados son apartamentos vivos hoy en Innmobiliaria, no «verificados»; la Sabana dice «sin usados». (6) La «inicial durante la obra» no se muestra: la revista no la imprime. (7) Plan en Sonnet (la tabla pide Opus). (8) Subsidios releídos el 2026-10-24 sin cambios; el JSON sigue «consulta 2026-10-21». (9) Extra: candado de edición en los e2e, guarda de `seed-demo`, arreglos de LCP, axe y de la tabla en el teléfono.
- **Decisiones:** un programa nunca se suma a otro (`mejorCaso` = el mayor); lo no verificado se nombra sin monto; el ingreso y el arriendo viven solo en el teléfono y ninguna petición los lleva; ningún WhatsApp sale solo, el operador abre el enlace con el mensaje escrito; el mensaje a la sala no lleva datos del comprador.
- **Deuda al lote del hito:** `vista.ts:693-708` + `TablaProgramas.tsx:69-83` la tabla omite las salvedades del JSON (Reduce tu Cuota «cupos sin verificar», Mi Casa Ya «montos aproximados») · `indice.ts:136` la franja deja en su franja al de precio en conflicto (cifra aprobada, 39) y la lista lo manda a «sin precio»: decidir · `…salas_y_muestra.sql:489` `salas_panel` corta a 100 filas · `GuardarSala.tsx:38` + migración 670-683 las RPC del operador no pasan por la allowlist (dependen del registro apagado) · `avisos.ts` (`PLAN_SALA`) y `MANUAL:331` nadie avisa al operador · `HogarResultado.tsx` tope sin citar el Decreto 583 · `plazo-salas.ts:6` y `operador.ts:91` «nunca después» ignora el desfase del cron · `scripts/vivienda-nueva/README.md:21` y `bandeja.mjs:300` rótulos · `LECTOR.md` no pide la vigencia · `tarifas-escrituracion.json:18,33,187` segunda fuente · `datos.ts` sin caché · M y B del S11.
- **Aprendizajes:** una BD compartida entre specs paralelas necesita un candado: la edición vigente es una sola. Una frase «nunca» en un texto legal caduca con la primera función que la contradice: se busca por la promesa, no por la feature. El LCP nace estático si el texto de entrada se pinta en el servidor.
- **Siguiente · esfuerzo-beneficio:** S14 (papeleo). La 188 (15 de noviembre) entra con `entregar`, `cargar` y `publicar --revisada`, sin PR de código. Alto: el comprador ya ve cuánto le alcanza y puede pedir la sala; el costo es una sesión mensual de revisión.
- **Auditoría (Sonnet · high, solo lectura):** alcance, calidad, seguridad (limpia: sin secretos, enlaces ni contactos fuera del panel) y frases caducadas · **C 0 · A 1 · M 5 · B 12** · A pagado `2ca6624` (política de privacidad); M pagados `2ca6624` (precio máximo, «nunca» de las alertas), `bf3b929` (aviso a la sala), `d7f2bf5` (vigencia en la revisión); B pagados `6a98c4c`, `2ca6624`, `d7f2bf5`; el resto, arriba como deuda · veredicto «listo para cierre».
- **Modelo y relevos:** F1 Sonnet 5.5 (req. Sonnet; la nube, en F1) · F2 Opus 5.5 (req. Opus) · F3 y auditor Sonnet 5.5 (req. Sonnet); único desvío: el plan en Sonnet. Haiku no se usó. Relevos: ninguno.

### Horas del sprint (`scripts/horas-sprint.mjs`, rango `origin/main..HEAD`, heurística git-hours: huecos ≤ 2 h + 0,5 h por sesión)

| Commits | Sesiones | Horas activas | Span (primer → último commit)                |
| ------: | -------: | ------------: | -------------------------------------------- |
|      28 |        4 |         3,3 h | 2026-10-21 22:03 → 2026-10-25 10:22 (84,3 h) |

| Fase | Commits | Horas activas |
| ---- | ------: | ------------: |
| F1   |       8 |         1,5 h |
| F2   |       3 |         0,5 h |
| F3   |      17 |         1,3 h |

**Para mergear:** squash y borrar la rama · el producto cambia (`src/`): después yo corro `git pull && pnpm deploy:cf` (la nube ya tiene la migración 16; sin secretos nuevos; `NUEVOS_SIMULACRO` NO se define en el Worker y la guarda de despliegue lo comprueba) · luego `/cierre-sprint inmobiliaria`.

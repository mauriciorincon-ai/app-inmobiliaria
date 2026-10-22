---
sprint: 012
app: inmobiliaria
hito: H-2
opened: 2026-10-21
closed: 2026-10-21
branch: sprint-012/nuevos-con-lo-que-pagas
pr: "#37"
---

# Sprint 012 «Nuevos, con lo que pagas de verdad» — cierre ejecutivo

- **Objetivo planeado:** la vivienda nueva en el producto: la edición en la base (cargada sin publicar, publicada tras revisar una muestra), «Usados | Nuevos» en Buscar, «pagas al menos», la espera con el arriendo solo en el teléfono, la ficha honesta, «lo que puedes pagar» sobre los nuevos y los 4 medios del S11.
- **Resultado y estado:** **Sí en local; la CI se lee en el PR.** Migración 15 en la nube **con tu «sí»** (15/15) y la 187 publicada (143 proyectos, muestra de 5 con semilla 187); humo anónimo 9 de 9. 1068 unitarias en verde (vivienda nueva 99,1 %, `vista.ts` 100 % de ramas); e2e: 12 de UI, 29 de base y permisos. Lighthouse local de las dos rutas: script 316,9 y 272,4 KB (tope 350), rendimiento 0,94–1, accesibilidad 1; la isla del arriendo pesa +2,4 KB. El cálculo del servidor mide 1,4 ms (lista e índice) y 0,014 ms (una ficha) frente a los 10 ms del Worker.
- **Fases (est. 3,25 h → piso 2,2 h):** F1 base, bandeja y 4 medios (1 h → 1,2 h) · F2 números en el servidor (1 h → 0,3 h) · F3 pantallas, e2e, manual, guía v9, auditoría (1,25 h → 0,7 h). El script mide un piso: no ve lecturas ni paradas.
- **Entregables:** `supabase/migrations/20261026000001_*`, `src/engine/vivienda-nueva/{filas,vista,arriendo-local}.ts`, `src/components/nuevos/*`, `/nuevos/[slug]`, bandeja con `cargar/publicar/estado/retirar`, `scripts/humo-anonimo.mjs`, siembra 9000, textos `{es, en}`, manual, guía v9 (91 pruebas, bloque O), ADR 019 (adenda).
- **No completado:** nuevo o usado, subsidio y la visita (S13); índice agregado si la editorial objeta (diseñado, no construido).
- **Desviaciones y causas:** (1) la nube (`db push`, carga, publicación) la corrí en **Opus** tras la F2; era un paso de F1 (Sonnet). (2) La segunda fuente es **primaria** solo para registro y topes VIS; UVB, SMMLV y notariales se corroboran con gremio y portales (Camacol, Fenalco, DMS, Gerencie); Reactiva tu Compra pasó a `no_verificado`. (3) «Cada mes sin PR» no se cumple del todo: `cargar` lee `EDICION` y `PAGINAS_EDICION` de `edicion.ts` (un PR pequeño, sin despliegue). (4) Reserva de Cajicá pierde «pagas al menos» por un precio impreso que difiere en $900 (alternativa: usar el menor, una línea). (5) Lighthouse no tiene presupuesto por ruta: vale el global `/*`, medido. (6) El plan lo corrí en Sonnet (la tabla pide Opus). (7) S11: dije «sin deploy» y era falso (`Simulador.tsx`); se desplegó y se corrigió.
- **Decisiones:** tarifa no vigente ⇒ se **nombra sin monto**, jamás se omite ni se suma; un campo en conflicto no entra a la cuenta (usa el caso más barato y se nombra); el tope de arriendo no viaja a «Nuevos»; `publicar` recalcula la muestra desde el archivo revisado.
- **Deuda al lote del hito:** `vista.ts:franjaDe`/`entregaCumple` y `espera.ts` aún usan entrega y etapa en conflicto · `…vivienda_nueva.sql:171-192` no valida que la muestra sea ≥ 5 y subconjunto (migración 16) · `bandeja.mjs:289-316` y `edicion.ts` (metadatos desde `crudo/`) · `tarifas-escrituracion.json:18,33,187` segunda fuente oficial de UVB, SMMLV y notariales · `README.md:49` rutas · `datos.ts` baja las 143 sin caché · `seed-demo.mjs:16-24` sin guarda local en los demos viejos · `privacidad.ts` no nombra el ingreso ni el arriendo del teléfono · sin guarda de despliegue contra `*_SIMULACRO` y mocks en `.env.local` · M y B del S11.
- **Aprendizajes:** una comprobación de «muestra exacta» que lee su propio dato no puede fallar: se recalcula de otra fuente. Un gate que ata lo publicado al motor cazó el cambio de Natura. Un spec que depende de una perilla del servidor la exige en su entorno. `browser.newContext` no hereda `baseURL`. Los e2e locales corren contra el build, no `next dev`.
- **Siguiente · esfuerzo-beneficio:** S13 (nuevo o usado, subsidio, visita) y el metadato de `cargar` antes de la edición 188 (15 de noviembre). Alto: ya se ve lo que el aviso calla; el costo mensual es una sesión de revisión de 5 proyectos.
- **Auditoría (Sonnet · high, solo lectura):** alcance, calidad, seguridad y frases caducadas · **C 0 · A 0 · M 7** (pagados M1 arriendo→Nuevos, M2 en precio/parqueadero/clase, M3, M6, M7; declarados M4 y M5) · **B 12** (pagados B1, B2, B8, B9, B10) · veredicto «listo para cierre».
- **Modelo y relevos:** F1 Sonnet 5.5 (req. Sonnet; la nube en Opus, desvío 1) · F2 Opus 5.5 (req. Opus) · F3 y auditor Sonnet 5.5 (req. Sonnet). Haiku no se usó. Relevos: ninguno.

### Horas del sprint (`scripts/horas-sprint.mjs`, rango `origin/main..HEAD`, sin el commit del cierre)

| Commits | Sesiones | Horas activas | Span (primer → último commit)               |
| ------: | -------: | ------------: | ------------------------------------------- |
|      23 |        1 |         2,2 h | 2026-10-21 19:42 → 2026-10-21 21:24 (1,7 h) |

| Fase | Commits | Horas activas |
| ---- | ------: | ------------: |
| F1   |      10 |         1,2 h |
| F2   |       3 |         0,3 h |
| F3   |      10 |         0,7 h |

**Para mergear:** squash y borrar la rama · después yo corro `git pull && pnpm deploy:cf` (el producto cambia; la nube ya tiene la migración 15 y la 187; no hay secretos nuevos y `NUEVOS_SIMULACRO` NO se define en el Worker) · luego `/cierre-sprint inmobiliaria`.

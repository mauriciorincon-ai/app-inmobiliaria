---
sprint: 014
app: inmobiliaria
hito: H-2
opened: 2026-10-25
closed: 2026-10-25
branch: sprint-014/papeleo-sin-sorpresas
pr: "#39"
---

# Sprint 014 «El papeleo, sin sorpresas» — cierre ejecutivo

- **Objetivo planeado:** el asistente `/papeleo` (maqueta 11): gastos de escriturar por actor con su norma y año, qué pedir, plazos y «qué dice cada documento» (cláusulas de texto fijo con su artículo, sin IA), con enlace desde las dos fichas. El lector de CTL queda fuera (decisión 1c → S15).
- **Resultado y estado:** **Sí en local; la CI se lee en el PR.** 1274 unitarias (84 archivos) y 528 e2e en verde, 0 fallos; el motor `engine/papeleo` al 100 % de ramas (gastos 123/123). Tres casos recalculados a mano de la norma y, por separado, por el auditor (Bogotá VIS 200 M, Bogotá 1.150 M, Medellín 400 M). Lighthouse local (3 corridas): script 284,9 KB (tope propio 290), rendimiento 0,95, otras categorías 1, LCP 2,9 s (el elemento es la bajada, estática); demo en rojo: un tope de 250 KB falla solo `/papeleo`. Sin migración, sin secretos, sin nube (US$0); `pnpm audit --audit-level high` sin altos.
- **Fases (est. 2,5 h → real 1,9 h, script):** F1 motor, datos y guía (1,25 → 0,5 h) · F2 cláusulas (0,5 → 0,3 h) · F3 pantalla, enlaces, Lighthouse, e2e, docs, auditoría y pagos (0,75 → 1,0 h; +33 %, bajo el 50 %).
- **Entregables:** `src/engine/papeleo/{gastos,formulario,guia}.ts`, `src/data/{tarifas-papeleo,normas-clausulas}.json`, `src/textos/{papeleo,papeleo-clausulas,herramientas}.ts`, `src/components/papeleo/*` (isla sin zod, base ni almacén), `/papeleo`, selector Simulador | Papeleo, enlaces en `FichaNuevo` y `/i/[slug]`, presupuesto por ruta, gates (`papeleo-isla`, `-datos`, `-guia`, `-clausulas`, `-envejecimiento`) con su demo en rojo, e2e `papeleo-ui`, manual, guía v11 (103 pruebas, bloque Q), READMEs.
- **No completado:** lector de CTL (S15) · BLUEPRINT as-built (es por hito; sin tocar desde el S4) · hipoteca con cifras · ganancia ocasional · IVA de la notaría (sin norma clara: se nombra sin cifra).
- **Desviaciones y causas:** (1) un solo impuesto de registro de 1 % por mitades (Ord. 039/2020 arts. 208–218 y 0105/2023 art. 38), no «1,67–2 % todo al comprador»: la «beneficencia» es ese mismo impuesto. (2) «2 meses» es de la Ord. 039 art. 218, no de la Ley 1579; la oficina registra en 5 días hábiles (art. 27). (3) El «30 días» del CTL es criterio del portal de la SNR. (4) «Devuelve el doble» es retractarse (CC 1859), no incumplir. (5) Más entradas (ciudad, tipo, subsidio, vende, reparto, avalúo, crédito) y una línea de recaudos (Res. 964 art. 50), porque cada una cambia una norma. (6) La mitad VIS del registro exige subsidio (Res. 1726 art. 17 par. 2). (7) La 4.ª pestaña son las cláusulas. (8) Plan en Sonnet (la tabla pide Opus). (9) La F1 reescribió el faltante «impuesto de registro» de la ficha nueva; su e2e seguía afirmando «no lo pudimos verificar» y cayó al correr el suite: actualizado.
- **Decisiones:** lo no verificado se nombra sin cifra y el total es una cota inferior que dice cuántos faltan · las tarifas de 2026 se apagan solas el 2027-01-01 (la fecha es parámetro) · cada cláusula cita solo artículos leídos en su texto oficial, registrados con fecha en `normas-clausulas.json` · el precio que se escribe no sale del teléfono (gate de código + e2e).
- **Deuda al lote del hito:** `gastos.ts:322-336` el tope de la VIP usa el de la VIS (el de la VIP, menor, no se leyó) · `precio-verdadero.ts:178` (S12) aplica la mitad VIS al registro sin subsidio y no mira el año · `Papeleo.tsx:131` «viene del anuncio» sigue tras editar el precio · `papeleo-clausulas.ts:112,126,177` pena mercantil sin la condición del art. 867 y «contrato entre dos partes» por «bilateral» · `tarifas-papeleo.json` ET 398 es de activos fijos de personas naturales (no se dice) y el IVA dice «lo cobra la notaría» pese a su nota · `gastos.ts:487-497` la retención de empresa cita el art. 398 de la persona natural · `papeleo.ts:66` ¿una VIP sin subsidio es VIS para el art. 31 notarial? (consultar a la planeadora) · `tarifas-escrituracion.json:18,34,189,190` prensa y gremios como apoyo y `consultado` sin actualizar · `FichaNuevo.tsx:87-98` el enlace usa el «desde» de la unidad más barata y dice «este» · `nav-comprador.ts:2`, `precio-verdadero.ts:8` comentarios · `BROCHURE.html:1645` costos sin norma · BLUEPRINT al día en el cierre de H-2.
- **Aprendizajes:** un barrido de absolutos busca palabras; la frase «la última anotación debe ser tu compraventa» no tenía ninguna y era falsa con crédito: cada afirmación se contrasta con el caso con hipoteca y con afectación. Una edición de prueba sobre una base compartida debe llevar un número menor que el de las demás y una ventana que no contenga el día real, o tapa a las otras specs. Cambiar el texto de una función vieja exige correr su e2e.
- **Siguiente · esfuerzo-beneficio:** S15 (lector de CTL y reportar). **Antes del 2027-01-01 hay que renovar las tarifas** (UVB, salario mínimo y resoluciones): sin eso `/papeleo` dice «tarifas vencidas». Alto: el comprador ve qué paga cada parte, con su norma, antes de la promesa; el costo es una revisión anual de tarifas.
- **Auditoría (Sonnet · high, solo lectura):** alcance, calidad, seguridad (limpia: sin secretos, enlaces ni datos; el precio no sale del teléfono) y frases caducadas · **C 0 · A 2 · M 9 · B 13** · A1 `eb19ec4` (enlace solo en venta y con la ciudad del anuncio), A2 `9497b48` (cláusula del registro); M pagados `d35fc06` (recaudos VIP, «Bogotá D.C.»), `acba135` (retención, VIS, privacidad, manual), `eb19ec4` (e2e); M6 descartado en su parte «por escrito» (CC 1861 inc. 2 lo dice) y pagado el matiz `9497b48`; M3 y los B restantes, arriba · veredicto «listo para cierre».
- **Modelo y relevos:** F1 Sonnet 5.5 (req. Sonnet) · F2 Opus 5.5 (req. Opus) · F3 y auditor Sonnet 5.5 (req. Sonnet); único desvío: el plan en Sonnet. Haiku no se usó. Relevos: ninguno.

### Horas del sprint (`scripts/horas-sprint.mjs`, rango `origin/main..HEAD`, heurística git-hours: huecos ≤ 2 h + 0,5 h por sesión)

| Commits | Sesiones | Horas activas | Span (primer → último commit)               |
| ------: | -------: | ------------: | ------------------------------------------- |
|      13 |        1 |         1,9 h | 2026-10-25 11:57 → 2026-10-25 13:18 (1,4 h) |

| Fase | Commits | Horas activas |
| ---- | ------: | ------------: |
| F1   |       3 |         0,5 h |
| F2   |       1 |         0,3 h |
| F3   |       9 |         1,0 h |

**Para mergear:** squash y borrar la rama · el producto cambia (`src/`): después yo corro, en orden, `git pull && pnpm deploy:cf` (sin migración ni secretos nuevos) · luego `/cierre-sprint inmobiliaria`.

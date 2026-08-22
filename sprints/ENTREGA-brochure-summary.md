---
entrega: brochure-conoce
app: inmobiliaria
tipo: entrega-puntual
modo: INICIAL
status: en-revision
abierta: 2026-08-22
branch: entrega/brochure-conoce
---

# Summary — El brochure vivo de Innmobiliaria (`/conoce`)

## Outcome

**Sí.** El ciclo 1 de Innmobiliaria tiene su brochure vivo en modo **INICIAL**: `docs/BROCHURE.html`
(autocontenido, canónico), la ruta pública **`/conoce`** que sirve esa misma copia, y
`docs/brochure-export.json` conforme al **contrato v1.0.0** del portafolio.

## Qué se entregó

| Pieza                                    | Qué es                                                                       |
| ---------------------------------------- | ---------------------------------------------------------------------------- |
| `docs/BROCHURE.html`                     | 8 escenas, autocontenido (**0 scripts externos**, 151 KB transferidos con las capturas embebidas) |
| `/conoce`                                | asset estático + rewrite; `build:brochure` encadenado en `dev` y `build`     |
| `docs/brochure-export.json`              | contrato v1.0.0, generado **de último** para que sus cifras cuadren          |
| `sprints/ENTREGA-brochure-storyboard.md` | el guion aprobado (regla cero)                                               |
| `tests/unit/brochure-export.test.ts`     | 11 pruebas del contrato, **con sus rojos demostrados**                       |
| `tests/e2e/brochure.spec.ts`             | 8 pruebas × 2 navegadores                                                    |

## FASE 0 — verificación de cero enlaces (registro)

**El inventario de la planeadora daba LIMPIO; el comando encontró fugas.** Es la lección de `ds`
confirmada por segunda vez: _el inventario es punto de partida, el gate es EL COMANDO._

| Chequeo                                             | Antes                       | Después  |
| --------------------------------------------------- | --------------------------- | -------- |
| `grep -rn "vercel\.app\|workers\.dev" md/html/json` | **10 líneas en 4 archivos** | ✅ vacío |
| `gh repo view --json homepageUrl`                   | `""`                        | ✅ `""`  |

Archivos scrubbeados conservando el sentido operativo: `sprints/SPRINT_001-implementation-log.md`,
`SPRINT_001-summary.md`, `SPRINT_001-retrospectiva.md` y `docs/APROVISIONAMIENTO.md`.
**La limpieza es RECURRENTE** (la GitHub App del hosting reescribe `homepage` tras cada deploy de
producción): re-verificar tras el deploy del merge.

**Hallazgo extra, ya resuelto:** `wrangler.jsonc` versionaba la URL de producción en
`NEXT_PUBLIC_APP_URL` (el grep de la orden no la cubría: `.jsonc` no está en su lista de
extensiones). **Se quitó**, y el argumento es que era **redundante**: Next hornea las
`NEXT_PUBLIC_*` en tiempo de BUILD desde `.env.local`, y el build corre en la máquina de quien
despliega, así que esa variable de runtime nunca se consultaba. Verificado con un build real: el
literal sigue apareciendo 3 veces en el bundle después de quitarla → **cero cambio de
comportamiento**, que era la condición para poder tocarla.

## Deltas del kit

Reglas **14** (brochure vivo: estados INICIAL/SELLADO + export) y **15** (cero enlaces) añadidas al
`CLAUDE.md` de la app — son las 13 y 17 del kit, renumeradas al esquema propio (la app ya usaba
1–13). `design-sync/` no entra en esta entrega (retrofit del portafolio).

## El conteo — N = 13, mapeo 1:1 con el MANUAL

**Decisión del usuario:** una feature por sección del manual. Es auditable en un comando
(`grep -c '^### ' docs/MANUAL-DE-USO.md` → 13) y no invita a la pregunta «¿inflaste el número?».
El storyboard nació con 16 (partía cosas que el manual agrupa) y **se corrigió a 13** al actualizar
el manual.

| Tarjeta (grupo)                 | Feature                         | Sección del MANUAL                                   |
| ------------------------------- | ------------------------------- | ---------------------------------------------------- |
| **1 · La campaña** (estrella)   | Cupos de fundador por zona      | Cupos de fundador por zona · S3                      |
|                                 | Invita a otro dueño             | Invita a otro dueño (referido por WhatsApp) · S3     |
|                                 | Tu anuncio siempre vivo         | Tu anuncio siempre vivo (vigencia y renovación) · S3 |
|                                 | Paquete de fundador             | Paquete de fundador (4 guías gratis) · S3            |
| **2 · Publicar sin fricción**   | La página de inicio             | Landing de expectativa (seller-first) · S1           |
|                                 | Publicar = registro, en 3 pasos | Publicar = registro (flujo de 3 pasos) · S1          |
|                                 | Confirmación y enlace privado   | Confirmación de fundador · S1 (mejorado en S2)       |
| **3 · Tu anuncio, completo**    | Fotos, descripción y medidor    | Completar tu anuncio: fotos + descripción · S2       |
|                                 | Ficha pública compartible       | Ficha pública compartible · S2                       |
| **4 · Confianza y quién opera** | Política de privacidad          | Política de privacidad (Ley 1581) · S1               |
|                                 | Panel del operador              | Panel del operador · S1 (ampliado en S2)             |
|                                 | Panel de campaña                | Panel de campaña del operador · S3                   |
|                                 | Zonas, cupos y densidad         | Zonas, cupos y densidad · S3                         |
|                                 | **Total**                       | **13**                                               |

**Qué NO cuenta y por qué:** la analítica PostHog es interna (sin datos personales, sin autocapture,
sin grabación de pantalla) y no es feature de cara al usuario — se declara en privacidad y en el
export, no en el conteo. `/conoce` sirve el brochure y no es pantalla del producto.

**El MANUAL se actualizó a S3 en este mismo PR** (traía solo S1/S2): +6 secciones nuevas, el correo
opcional y la captura de `?ref` en el wizard, la limitación obsoleta «sin contadores ni cupos»
corregida, y la fila S003 del historial. Cierra deuda de la regla 9 que quedó al saltarse la fase 6
del S3.

## Decisiones de la entrega

1. **`/conoce` como asset estático + rewrite, no `page.tsx`.** El brochure es un documento HTML
   completo; anidarlo en el layout de la app lo rompería. Mismo patrón que el piloto.
2. **Tipografía:** el molde cae a serif del sistema para autocontenerse, pero Innmobiliaria es
   Poppins — **no serif**. Se usa la pila sans del sistema con la misma jerarquía (extrabold,
   tracking cerrado). Cero webfonts remotas, cero CDNs.
3. **Clímax = la honestidad** (escena propia, paleta invertida). No es el ahorro de comisión —ese es
   el gancho de portada— sino el alma de marca en un vertical golpeado por el fraude. Y es 100%
   construida (verificación, anti-zombie, escasez real, Ley 1581): cumple «solo lo real».
4. **Riesgo registrado:** la escena 2 es el único momento de scroll→progreso. Mitigado con mapeo
   puro (~1 pantalla, sin pin), un solo `rAF` que se apaga al asentar, medidas cacheadas, y
   reduced-motion que lo colapsa a la ficha ya completa.

## Bugs encontrados y resueltos (pasada de capturas + axe)

1. **A11y — texto por debajo del contraste AA (serio).** El mecanismo de la escena 2 dejaba el texto
   de la ficha a **media opacidad** hasta que el scroll avanzaba: axe midió **1.32:1** contra el
   4.5:1 exigido en los chips. **No era artefacto del test** — quien llegara ahí veía texto lavado.
   Arreglado cambiando el mecanismo: las capas **se ensamblan con movimiento**, aquí no se desvanece
   texto. El relato de la escena se conserva.
2. **Coreografía mal calibrada.** El sello ⭐ —el pago de la escena— solo aparecía cuando la ficha ya
   se estaba yendo de pantalla. Umbrales bajados: ahora llega con la ficha centrada.
3. **Visual.** El icono de la tarjeta se centraba contra un bloque de texto de tres líneas y quedaba
   junto al gancho en vez del título. Y el gancho heredaba `font-weight: 800` del `h3` que envuelve
   al botón (patrón a11y correcto), viéndose más pesado de lo debido.

## Verificación

| Gate                           | Resultado                                                                                           |
| ------------------------------ | --------------------------------------------------------------------------------------------------- |
| Unit                           | **172 verdes** (21 archivos), 11 del contrato del export                                            |
| Rojos del contrato demostrados | ✅ total desincronizado · métrica sin `fuente` · enlace de producción colado                        |
| e2e                            | **76 verdes** contra Postgres real, incluidas 8 del brochure × 2 navegadores                        |
| Reduced-motion                 | ✅ sello en pose final · 0 bloques ocultos · conteo presente · **0 animaciones corriendo**          |
| A11y                           | ✅ axe sin violaciones · cerrado fuera del árbol (CDP) · teclado alterna · `aria-expanded` correcto |
| Performance                    | ✅ `/conoce`: **0 scripts externos**, 17,9 KB gzip. `/` sigue bajo presupuesto                      |
| Mapa de rutas                  | ✅ un e2e comprueba que cada ruta listada existe de verdad                                          |
| Cero enlaces                   | ✅ grep vacío · `homepageUrl` vacío                                                                 |
| Datos                          | ✅ solo sintéticos (inmueble inventado; sin nombre, sin WhatsApp, sin matrícula)                    |

## Seguridad — avisos que aparecieron durante la entrega (no los trajo este cambio)

La primera CI del PR falló en `pnpm audit --audit-level high`. **No lo causó esta entrega**: el diff
de `package.json` solo tocaba scripts, cero dependencias. Son avisos publicados entre la CI del S3
(2026-07) y hoy (2026-08) — `main` fallaba igual.

**Lo importante:** entre ellos había **4 vulnerabilidades altas de Next.js** (16.2.10), y una era
**«SSRF in rewrites via attacker-controlled destination hostname»** — justo la primitiva que esta
entrega estrena para servir `/conoce`. Nuestro rewrite tiene destino **estático** (`/conoce.html`),
así que no éramos explotables por ese vector, pero corriendo una versión vulnerable.

| Acción                                 | Detalle                                                                                                                                                                                                                                                                        |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Next 16.2.10 → 16.2.12**             | último parche de la MISMA línea menor (menor riesgo). Cierra los 4 avisos altos.                                                                                                                                                                                               |
| **Overrides en `pnpm-workspace.yaml`** | `brace-expansion`, `js-yaml`, `fast-uri`, `sharp`, `undici`, `nanoid` — todas transitivas de herramientas de desarrollo (wrangler, vitest/jsdom, postcss, eslint), ninguna corre en producción. Cada parche va **dentro de su misma línea mayor**: sin saltos que rompan APIs. |

Resultado: `pnpm audit --audit-level high` limpio (quedan 2 moderadas, bajo el umbral del gate).
Verificado tras el cambio: typecheck, lint, build, **172 unit y 76 e2e verdes**.

**Nota de pnpm 11:** los overrides van en `pnpm-workspace.yaml`, **no** en `package.json` (pnpm ya
no lee ese campo y lo ignora en silencio con un warning). Es la misma lección del gate de builds del
S3.

## Ronda 2 del gate visual — lo que pediste y qué se hizo

| Tu observación | Qué se hizo |
| --- | --- |
| Las tarjetas deberían tener elementos visuales, no solo texto | Cada una gana su **tira visual** diagramática con los tokens de la marca (cupos e invitación · los 3 pasos · miniaturas y medidor · escudo y sello). Es esquemática a propósito: no finge ser una captura. |
| «Así se publica» tiene interfaces que **nada que ver con la app real** — sin imágenes reales es desperdicio de espacio | **Tenías razón, y además contradecía «solo lo real».** Ahora son **4 capturas de la app corriendo** (registro, medidor, ficha, panel), tomadas con Playwright a 390px y embebidas como data: URIs en WebP. Datos 100% sintéticos y fotos que son ilustraciones rotuladas «imagen de demostración». |
| El paquete de guías es aburrido: más información o mejor animación | Entra el **comparador de plata**, la cifra que de verdad pega: comisión del 3% = **$12.000.000** en una vivienda de $400M **frente a $0**, con barras que crecen (`scaleX`). Y cada guía dice **qué trae por dentro**, con los costos notariales reales. |
| Los tres cuadros del clímax no dicen nada | Fuera. Ahora cada verdad tiene **su propio micro-visual y el dibujo ES el argumento**: el sello se **dibuja** (se gana), el anuncio vencido se **tacha** mientras el vivo **late**, el contador real se asienta y el fabricado se **tacha**, y el documento pasa por un **ojo** y llega a un archivador **tachado** (se ve, no se guarda). |

**Bug cazado en esta ronda:** una tarjeta podía quedar **invisible para siempre**. El
`IntersectionObserver` usaba `threshold: 0.1` y un bloque más alto que la pantalla puede no
alcanzarlo nunca; además la apertura por lectura cambia el alto de la página bajo un scroll rápido.
Se bajó a `threshold: 0` y se añadió una **red de seguridad determinista**: lo que ya quedó por
encima del borde inferior de la pantalla se muestra siempre. Verificado a tres velocidades de
scroll (400/900/1800 px) — cero bloques ocultos en las tres.

## Deudas declaradas

1. **`docs/BLUEPRINT.html` NO existe** (solo la plantilla). Era entregable del cierre de ciclo del
   S3 y no llegó con el merge. **Esta entrega no lo produce** (la orden lo anticipa); queda pendiente.
2. **El S3 se mergeó sin summary** (`sprints/SPRINT_003-summary.md` no existe): su fase 6 se saltó.
   La bitácora sí está. Por eso el manual llegó desactualizado a esta entrega.
3. **G-Release pendiente** (fase 5 del S3): sin dominio propio, `noindex` global sigue puesto, sin
   Sentry con DSN, sin `/terminos` ni `/accesibilidad`, sin `sitemap.ts`/`robots.ts`. Se documenta
   **sin URL**. No bloquea el brochure.
4. **`wrangler.jsonc` versiona la URL de producción** (ver Fase 0). Requiere decisión: moverla a
   variable de entorno del build (`.env.local` ya la tiene, y `NEXT_PUBLIC_*` se inlinea en build,
   que corre en la máquina del usuario) o aceptarla como excepción declarada. **No se tocó** para no
   cambiar comportamiento en una entrega que lo tiene prohibido.
5. **Deploy manual.** No hay auto-deploy al mergear: la última milla exige `pnpm deploy:cf` a mano,
   y el resto de la app en producción necesita el **Supabase Restore**.

## Última milla (pendiente del usuario)

Tras el merge: `pnpm deploy:cf` → abrir `/conoce` **desde afuera y sin sesión** → re-verificar el
grep de enlaces y el campo `homepage` (que el deploy puede reescribir). **La URL no se publica en
ningún archivo del repo.**

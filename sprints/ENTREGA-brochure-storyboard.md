---
entrega: brochure-conoce
app: inmobiliaria
tipo: entrega-puntual
modo: INICIAL
storyboard_aprobado_por: Mauricio Rincón
storyboard_aprobado_el: 2026-08-22
branch: entrega/brochure-conoce
---

# Storyboard — El brochure vivo de Innmobiliaria (`/conoce`)

> **Guion aprobado (regla cero del molde v2).** Ni una línea de HTML se escribió antes de esta
> aprobación. El brochure obedece este documento; cualquier cambio posterior se anota aquí.

## Decisiones del usuario ya selladas

- **MOTION_INTENSITY = "Media"** ("cine sereno"): coreografía elegante, sin secuestrar el scroll,
  con un único loop ambiental reservado al clímax.
- **Conteo N = 13**, mapeo **1:1 con las secciones de `docs/MANUAL-DE-USO.md`** (la decisión de
  agrupar como agrupa el manual; auditable contando los `###` del manual).
- **El MANUAL se actualiza a S3 en este mismo PR** (traía solo S1/S2): +6 secciones nuevas y la
  limitación obsoleta «sin contadores ni cupos» corregida. Cierra deuda de la regla 9.
- **Estructura "capas + escenas":** la progressive disclosure es sagrada; el cine la rodea.

## Identidad en una frase

> **Innmobiliaria es la app hablándole al dueño que vende solo: publica directo, sin comisión, y
> queda listo y verificado — aquí todo lo que ves es verdad.**

Tono es-CO de "tú", cálido y honesto. **Cero urgencia falsa, cero contadores fabricados.** Móvil
primero (360–420px). La palabra "manual" no aparece en el texto visible.

## Dirección de arte en una frase

> **La página se abre como se abre una casa: con calma, enseñando lo verdadero, sin apuros de
> vendedor.**

## Sistema de motion (dial "Media")

- **Gramáticas:** **G3 dominante** (coreografía temporizada + IntersectionObserver, sin secuestrar
  scroll) · **un momento G1 justificado** (E02, el riesgo registrado) · **G2** en las tarjetas +
  **modelo de disclosure §7 adoptado ENTERO** (una tarjeta está abierta mientras está a la vista;
  el toque es el control, no el peaje; el toque la saca del automático para el resto de la visita).
- **Tokens derivados del design-system** (sin números mágicos): `--ease-asentar:
cubic-bezier(.16,1,.3,1)` (decelera largo, sin rebote) · `--dur-media 220ms` · `--dur-lenta 380ms`
  · `--dur-escena 600ms` · `--dur-apertura 1100ms`.
- **Stagger jerárquico, nunca uniforme:** la tarjeta estrella entra un beat antes; el resto a ~70ms.
- **Vocabulario nombrado:** _enfocar · alzar · dibujar · asentar · abrir · latir_.
- **Reposo = pose final:** en `:root` toda variable se escribe en su valor final. Si el JS no corre,
  la pieza ya está correcta. **LCP nace pintado** (el h1 se enfoca desde blur con opacidad 1).

### Excepciones declaradas a solo-`transform`/`opacity` (comentadas en su sitio)

1. `grid-template-rows: 0fr→1fr` — apertura de tarjeta (un disparo por interacción/§7).
2. `stroke-dashoffset` — "dibujar" el sello de verificación y los iconos de trazo (SVG `aria-hidden`).
3. `filter: blur` — solo el "enfocar" del titular de apertura, jamás ligado a scroll.

### Tipografía autocontenida

El molde cae a serif del sistema para autocontenerse, pero **Innmobiliaria es Poppins, no serif**.
Decisión: **subset mínimo de Poppins embebido (woff2 base64, pesos display)** para titulares +
`system-ui` en el cuerpo. Cero CDNs. Si el subset pesa de más, fallback a `ui-sans-serif, system-ui`
con la misma jerarquía — **nunca serif**.

## Las 8 escenas

Arco: gancho → tu viaje → catálogo → demo → regalo → **clímax** → letra chica → cierre.
Presupuesto móvil: ~1 pantalla extra de scroll. Cada escena declara su **variante reduced-motion =
experiencia COMPLETA** (pose final visible, jamás versión degradada).

| #       | Escena · cabecera                                     | Mensaje                                                                                                                                                                                                                        | Gramática · técnica                                                                                                                                                                                                                          | Reduced-motion                                                                  |
| ------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **E01** | **Apertura** (portada)                                | «Vende tu casa directo. **Sin comisión.**» + «El marketplace del dueño que vende solo, no de la inmobiliaria.» Píldora rotada −1.5° sobre «Sin comisión».                                                                      | Cascada **blur→enfoque** del h1 palabra a palabra (`--i` por span; opacidad 1 = LCP).                                                                                                                                                        | Titular nítido y quieto; flecha ↓ sin latido.                                   |
| **E02** | **De dueño solo a fundador** — **riesgo registrado**  | «No te pedimos un correo. Te pedimos tu casa. **Publicar es unirte.**» Una ficha que al bajar se completa: datos → fotos → **sello ⭐** → "listo y esperando".                                                                 | **Único G1**: scroll→progreso puro (`translateY`/`opacity` por capa + `stroke-dashoffset` que dibuja el sello). ~1 pantalla, sin pin, rAF que se apaga.                                                                                      | La ficha aparece **ya completa** con su sello; escena estática (`height:auto`). |
| **E03** | **Las 4 puertas** · `01 · Qué hace`                   | Qué hace la app, en 4 grupos. «Ninguna se abre sola» (anti-manual). Estrella 1ª = **La campaña**.                                                                                                                              | **G2 + §7**: botón real `aria-expanded`/`aria-controls`; entran con **alzar y asentar** (estrella un beat antes).                                                                                                                            | Tarjetas en pose final; abren sin transición (contenido, no decoración).        |
| **E04** | **La tarjeta abierta** (dentro de E03)                | «Nadie lee lo que no pidió; cuando lo pides, llega ordenado.»                                                                                                                                                                  | **§7 completo**: `grid-template-rows` + `visibility` (saca lo cerrado del árbol a11y); features interiores **alzan** en fila (`--j`, ~40ms).                                                                                                 | Abre sin transición; features visibles en orden.                                |
| **E05** | **Así se ve** · `02 · Así se ve` (respiro)            | «Así se publica de verdad»: mockups de pantallas reales con **datos sintéticos seeded** (wizard 3 pasos · barra de anuncio completo · ficha compartible · panel del operador).                                                 | **Alzar/asentar** por mockup al entrar (IO). SVG `aria-hidden` + `figcaption` que carga el sentido.                                                                                                                                          | Mockups en su cuadro final, quietos.                                            |
| **E06** | **El guante blanco** · `03 · De regalo`               | «Lo que la inmobiliaria cobraba con su comisión, gratis por ser fundador.» Las 4 guías del paquete fundador.                                                                                                                   | **Dibujar el trazo** en los 4 iconos (`stroke-dashoffset`, un disparo). Acento cálido (mint/lila).                                                                                                                                           | Iconos ya dibujados; guías listadas, quietas.                                   |
| **E07** | **CLÍMAX — Aquí, todo es verdad** · `04 · La promesa` | **La honestidad**, 4 verdades REALES: propietario verificado (CTL **visto, jamás almacenado**) · **cero anuncios zombie** (vigencia con un clic) · **escasez REAL** (cupos de la BD o nada) · **datos protegidos** (Ley 1581). | **Paleta propia** (tinta `#191A1D`). **El motion ES el argumento**: el sello **se dibuja** (se gana, no se declara); los zombies se **apagan**, el vivo queda. **Único loop ambiental** (pausado fuera de viewport y con `document.hidden`). | Sello dibujado, vivo encendido y zombies apagados en pose final; sin loop.      |
| **E08** | **El cierre** (footer)                                | **SELLO**: «cubre las **13 funcionalidades**» (contador 0→13; el DOM dice 13 desde el 1er byte) + «aquí no se escogieron las bonitas; está todo». **HISTORIAL** en bloque aparte. Cabecera declara **BROCHURE INICIAL**.       | Contador rAF una vez en viewport (`tabular-nums`). Marquesina `transform` (`aria-hidden`).                                                                                                                                                   | «13» fijo; marquesina sin animación.                                            |

**Doble cabecera:** (A) comentario-documento en `<head>` — archivo CANÓNICO, `/conoce` sirve la misma
copia, guion aprobado, REGLAS NO NEGOCIABLES verificadas por e2e/Lighthouse, estado **INICIAL**;
(B) portada visual E01 con eyebrow «Innmobiliaria» + h1 partido en spans.

### Por qué el clímax es E07 (argumento)

La promesa mayor **no** es una feature vistosa ni el ahorro de comisión — ese es el **gancho de
portada**, racional y de entrada. Es la **honestidad**: el alma de marca en un vertical golpeado por
el fraude («como el grupo de Facebook, pero verificado»). Y es **100% construida** — verificación de
dos niveles, anti-zombie, escasez real, Ley 1581 — así que cumple «solo lo real» sin una sola
promesa de roadmap. Igual que en el piloto la privacidad (no el juego más llamativo) fue el clímax.
Tras E07 la pieza **baja la voz** deliberadamente: _toda escena es clímax = ninguna lo es_.

### Riesgo registrado

**E02 es el único momento G1 (scroll→progreso).** Riesgo: que se sienta como scroll-jack o rig
largo. Mitigación: mapeo puro (~1 pantalla, sin pin, sin scrub-jack), **un solo `rAF` que se apaga al
asentar**, medidas cacheadas en resize, y **reduced-motion lo colapsa a la ficha ya completa**. Se
valida con e2e.

## Cuadre contra el MANUAL — 13/13 (agrupar sí, omitir jamás)

Las 4 tarjetas de E03/E04 cubren las 13; las escenas dramatizan un subconjunto.

| Tarjeta (grupo)                 | Feature del brochure           | Sección del MANUAL                                   |
| ------------------------------- | ------------------------------ | ---------------------------------------------------- |
| **1 · La campaña** (estrella)   | Cupos de fundador por zona     | Cupos de fundador por zona · S3                      |
|                                 | Invita a otro dueño (referido) | Invita a otro dueño (referido por WhatsApp) · S3     |
|                                 | Tu anuncio siempre vivo        | Tu anuncio siempre vivo (vigencia y renovación) · S3 |
|                                 | Paquete de fundador (4 guías)  | Paquete de fundador (4 guías gratis) · S3            |
| **2 · Publicar sin fricción**   | Landing seller-first           | Landing de expectativa (seller-first) · S1           |
|                                 | Publicar = registro (3 pasos)  | Publicar = registro (flujo de 3 pasos) · S1          |
|                                 | Confirmación + enlace privado  | Confirmación de fundador · S1 (mejorado en S2)       |
| **3 · Tu anuncio, completo**    | Completar anuncio (fotos+desc) | Completar tu anuncio: fotos + descripción · S2       |
|                                 | Ficha pública compartible      | Ficha pública compartible · S2                       |
| **4 · Confianza y quién opera** | Política de privacidad         | Política de privacidad (Ley 1581) · S1               |
|                                 | Panel del operador             | Panel del operador · S1 (ampliado en S2)             |
|                                 | Panel de campaña               | Panel de campaña del operador · S3                   |
|                                 | Zonas, cupos y densidad        | Zonas, cupos y densidad · S3                         |
|                                 | **Total**                      | **13**                                               |

**Qué NO cuenta y por qué:** la **analítica PostHog** es interna (sin PII, sin autocapture, sin
session recording) y no es una feature de cara al usuario — se declara en el bloque de privacidad y
en el export, no en el conteo. La ruta **`/conoce`** sirve este brochure y no es pantalla del
producto.

## Datos de las muestras

**Solo demo/sintéticos**, seeded y re-ejecutables. Cero datos reales de personas o inmuebles: los
mockups usan un inmueble inventado en una localidad real, sin nombre, sin WhatsApp, sin matrícula.

## Historial del storyboard

| Fecha      | Cambio                                                                                                               |
| ---------- | -------------------------------------------------------------------------------------------------------------------- |
| 2026-08-22 | Guion inicial aprobado (8 escenas, MOTION «Media», clímax E07).                                                      |
| 2026-08-22 | **Conteo corregido 16 → 13** al actualizar el MANUAL: mapeo 1:1 con sus secciones (decisión del usuario, auditable). |

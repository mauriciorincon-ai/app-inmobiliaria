# Sistema de diseño — Innmobiliaria

> Fuente de verdad visual de la app. Portado de la página base del usuario
> (`ts01-pagina-real-estate`, excepción F0 #5): se hereda lo VISUAL, no sus gaps (tests/a11y/CI).
> El wordmark **Habita murió**: la marca es **Innmobiliaria**. Toda pantalla obedece este archivo;
> cada sprint con UI cierra con el checklist del skill `diseno-ui` + aprobación visual del usuario.

## Marca

- **Wordmark:** Innmobiliaria (Innovation + Inmobiliaria, con doble N). Logo = chip morado con
  ícono de casa + palabra. Nunca "Habita".
- **Voz:** español colombiano (es-CO) llano, cálido y directo. Le hablamos al **vendedor directo
  de Bogotá**. Mensaje liderado por **venta** (arriendo se menciona, no encabeza). Ni compradores
  ni inmobiliarias en el copy de fase 1.
- **Tono:** honesto sobre el estado (expectativa: fotos en la siguiente etapa, verificación
  después, lanzamiento ~oct). Cero promesas infladas, cero urgencia falsa.

## Tokens de color (Tailwind v4 `@theme`, en `globals.css`)

| Token                 | Valor     | Uso                                                     |
| --------------------- | --------- | ------------------------------------------------------- |
| `--color-ink`         | `#191a1d` | Tinta: titulares, texto fuerte, footer                  |
| `--color-gray`        | `#424854` | Texto de párrafo                                        |
| `--color-mute`        | `#6b7280` | Texto secundario (oscurecido vs. base `#7b8190` por AA) |
| `--color-purple`      | `#7b5dd6` | **Acento**: CTAs, píldoras, énfasis                     |
| `--color-purple-600`  | `#6b4bd0` | Hover del acento                                        |
| `--color-purple-soft` | `#bda1f2` | Acento suave                                            |
| `--color-purple-200`  | `#cdbaf2` | Bordes/realces suaves                                   |
| `--color-purple-tint` | `#ebe9fc` | Fondos de chip, píldoras de toggle                      |
| `--color-lilac`       | `#e8dcff` | Bandas pastel                                           |
| `--color-cream`       | `#fbf9f6` | Fondos suaves (`.section-soft`)                         |
| `--color-mint`        | `#e6f4ee` | Bandas pastel                                           |
| `--color-sky`         | `#e7eefb` | Fondos fríos                                            |

Blob decorativo del hero: `#FFD23F` (amarillo). No tokenizado (uso único).

## Tipografía

- Familia única: **Poppins** (`next/font/google`), pesos 400/500/600/700/800, `display: swap`.
  Expuesta como `--font-sans` y `--font-display`.
- Titulares: `font-extrabold`, `tracking-tight`, `leading-[1.05]`. H1 hero
  `text-5xl → sm:text-6xl → lg:text-[4.2rem]`. H2 sección `text-3xl → sm:text-4xl`.

## Sombras y radios

- `--shadow-card`: `0 18px 40px -18px rgba(25,26,29,.18)` · `--shadow-soft`: `0 10px 30px -12px rgba(25,26,29,.12)`.
- Radios amplios: `rounded-full` (botones, píldoras, chips), `rounded-2xl` (cards),
  `rounded-[2rem]`/`rounded-[2.5rem]` (imágenes, mockups).

## Clases de marca (utilidades en `globals.css`)

- `.pill` — píldora morada rotada -1.5° para resaltar una palabra en un titular.
- `.underline-doodle` — subrayado a mano (SVG inline) bajo una palabra.
- `.pastel-band` — banda con gradiente mint → lila.
- `.section-soft` — gradiente blanco → crema.

## Espaciado y layout

- Contenedor: `max-w-7xl` (nav/hero/footer), `max-w-3xl`–`max-w-6xl` (contenido). Padding lateral
  `px-6 lg:px-10`. Ritmo vertical `py-24 lg:py-28` (secciones), `py-24 lg:py-32` (bandas).
- **Móvil primero (360–420px):** el vendedor llega por WhatsApp desde el teléfono. Desktop ≥1024px.

## Motion (GSAP + Lenis) — reglas duras

1. **LCP nace estático** (patrón `lcp-nace-estatico`): el candidato LCP de cada ruta (hero, heading
   del paso) **nace visible** — jamás envuelto en un wrapper que arranque en `opacity: 0` ni con
   máscara. El motion de entrada GSAP vive **solo bajo el fold**.
   - En el hero: h1, subtítulo, CTA e imagen se renderizan visibles. Solo el blob decorativo tiene
     float (CSS `transform`, no ligado a LCP).
2. **`prefers-reduced-motion` siempre respetado**, en tres capas: `SmoothScroll` no inicia Lenis;
   `Reveal` hace early-return (matchMedia) y marca `.reveal` (fallback CSS); animaciones decorativas
   se apagan por media query.
3. **Reveal** (`components/motion/Reveal.tsx`) es el único mecanismo de reveal-on-scroll para
   secciones bajo el fold. Corrige el gap de la base (allí el fallback reduced-motion no aplicaba).

## Accesibilidad (gate)

- Contraste AA. **Labels reales en TODOS los inputs** (el formulario ES el producto). Errores por
  campo con `aria-describedby`, no toasts genéricos.
- Navegación por teclado completa; `:focus-visible` visible (anillo morado). `aria-expanded`/
  `aria-controls` en el acordeón de FAQ. Estados vacío/cargando/error/éxito explícitos.

## Cifras en UI/copy — regla dura (investigación de mercado)

**PERMITIDAS (evidencia dura, citables):**

- Comisión **3% urbano** (≈**$12M** en una vivienda de $400M).
- **7–7,5 meses** de venta promedio (Bogotá/Medellín).
- **+35% denuncias** de estafas inmobiliarias (Camacol 2024).
- **CTL $23.000** (solo como referencia; el CTL NUNCA se pide en el registro de S1).

**PROHIBIDAS (evidencia débil — jamás en la UI):** "32% más rápido", "+118% vistas",
"3× contactos", tours 3D "31% más rápido/9% más precio", staging "98,5–99%", "Habi 20–25% bajo
mercado", "suplantada 300 veces". El teaser de fotos (T1) se comunica **cualitativo**, sin números.

**Sin contadores ni cupos fabricados.** La escasez/contadores llegan REALES en S3 (C7) o no existen.

## Fuera de alcance S1 (extensiones futuras)

- **Dark mode:** no en S1 (documentado como extensión futura; los tokens ya están listos para ello).
- Fotos (S2), verificación/CTL (S3), contadores/cupos (S3).

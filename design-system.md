# Sistema de diseño — Innmobiliaria

> Fuente de verdad visual de la app. Portado de la página base del usuario
> (`ts01-pagina-real-estate`, excepción F0 #5): se hereda lo VISUAL, no sus gaps (tests/a11y/CI).
> El wordmark **Habita murió**: la marca es **Innmobiliaria**. Toda pantalla obedece este archivo;
> cada sprint con UI cierra con el checklist del skill `diseno-ui` + aprobación visual del usuario.

## Marca

- **Wordmark:** Innmobiliaria (Innovation + Inmobiliaria, con doble N). Logo = chip morado con
  ícono de casa + palabra. Nunca "Habita".
- **Voz:** español colombiano (es-CO) llano, cálido y directo; el inglés se **redacta**, no se traduce, y
  nombra en español lo de Bogotá (localidad, barrio, CTL, matrícula) con una línea que lo explica. Le
  hablamos al **vendedor directo de Bogotá** y, desde la VISION v2, al **comprador**. Mensaje liderado
  por **venta** (arriendo se menciona, no encabeza). **Inmobiliarias jamás**, ni como usuarias ni como
  público; las constructoras entran como dueñas de su proyecto.
- **Tono:** honesto sobre el estado y sobre lo que no sabe. Cero promesas infladas, cero urgencia falsa.
  Lo que no se pudo verificar **se nombra sin cifra**; una señal **no acusa** («un precio por debajo de la
  mediana de su zona», nunca «estafa»); un rango **no es un avalúo** y una cuota **no es una
  aprobación**. Lo que está en prueba lo dice a la vista («lectura en prueba»).
- **Todo texto nuevo nace `{es, en}`** en `src/textos/` (la paridad y el barrido de literales corren en
  la CI); jamás un literal en JSX.

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

Estados (S6, nacidos en la maqueta del comprador): el color **nunca va solo** — siempre con símbolo y texto.

| Token                 | Valor     | Uso                                                                   |
| --------------------- | --------- | --------------------------------------------------------------------- |
| `--color-ok`          | `#1f6f4a` | Verificado / vivo (texto e ícono sobre `mint`); contraste AA          |
| `--color-aviso`       | `#8a5300` | Pendiente / atención (texto e ícono sobre `aviso-tint`); contraste AA |
| `--color-aviso-tint`  | `#fff3d6` | Fondo de un aviso (sello «re-verificación pendiente», banners)        |
| `--color-aviso-borde` | `#f0c36d` | Borde de un aviso                                                     |

El error sigue usando el rojo de Tailwind (`red-50` / `red-600` / `red-700`) como en los formularios.

### Vocabulario de estado (símbolo + texto + color; nunca solo color)

| Estado                                 | Símbolo y texto                                                                              | Dónde                                 |
| -------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------- |
| Verificado / vivo                      | ⭐ Propietario verificado (con la fecha del CTL) · «Vivo hace N días»                        | Sello del dueño en tarjeta y ficha    |
| Pendiente / atención                   | «Re-verificación pendiente», «Fundador: aún sin CTL verificado»                              | Sello del dueño, avisos del equipo    |
| Norma leída · práctica · no verificado | ✓ Norma leída · ● Práctica, no norma · ▲ No verificado                                       | Papeleo (cifras, documentos y plazos) |
| Programa de subsidio                   | Aplica · Por confirmar · No aplica · Sin cupos                                               | «¿Te alcanza con subsidio?»           |
| Dato de un aviso                       | Lo dice · No lo dice · Ilegible · Dos páginas imprimen distinto                              | «La ficha honesta»                    |
| Respuesta de «¿Está caro?»             | En rango · Por encima del rango · Sospechosamente barato · Sin datos                         | Ficha, comparar y publicar            |
| Lectura del CTL (en prueba)            | «Lectura en prueba», «El texto parece incompleto» y **ningún ✓ verde** si faltan anotaciones | Lector de CTL                         |

Una cifra que no se pudo verificar **no se pinta**: se nombra con quién la cobra y el total dice cuántos faltan.

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

## Componentes propios y patrones (desde el S4)

`src/components/ui/` (shadcn/ui no está instalado y no se instala): `Boton`, `Campo` (label real + error por
campo), `Logo`, `EncabezadoInterior`, `NavComprador` (Buscar · Guardados · Alertas · Herramientas: arriba en
el computador, barra de abajo en el teléfono) y `SelectorIdioma` (ES | EN con cookie; cada botón mide **al menos
24 × 24 px**, lo mide un e2e). Los patrones nacidos en las pantallas de H-2:

- **Un solo sello del dueño** por anuncio, con criterio objetivo: no se coleccionan insignias.
- **Tarjeta de resultado con estado** (¿Está caro?, programa de subsidio): título, estado con símbolo, el dato
  con su número, su fecha y su fuente, y «cómo lo calculamos» a un toque.
- **Lo que escribes no sale de tu teléfono:** ingresos, precio del papeleo, arriendo y texto de un CTL se
  guardan solo en el teléfono y la pantalla lo dice junto al campo.
- **Mapa de zona dibujada:** esquinas por toque o, con el teclado, con las flechas del mapa y el botón
  «Esquina en la cruz»; el panel de dibujo no tapa más de lo necesario en el teléfono (104 px de un mapa de
  585 en un Pixel 7) y la pista del teclado aparece solo cuando se usa.
- **Estados vacío, cargando, error y éxito explícitos** en cada pantalla; un mapa caído deja la lista viva.
- **Tablas** con encabezados reales (comparar, programas, ficha honesta); la de comparar se desliza de lado
  en el teléfono.

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
- **CTL $23.000** (solo como referencia; el CTL NUNCA se pide en el registro de S1).

**PROHIBIDAS (evidencia débil — jamás en la UI):** "+35% denuncias de estafa (Camacol 2024)" (informe
original no accedido; se retiró en el S5), "32% más rápido" (**en cualquiera de sus formas**: «un tercio más
rápido», «89 días frente a 123»; el S16 las halló escritas de tres maneras), "+118% vistas",
"3× contactos", tours 3D "31% más rápido/9% más precio", staging "98,5–99%", "Habi 20–25% bajo
mercado", "suplantada 300 veces". El teaser de fotos (T1) se comunica **cualitativo**, sin números.

**Sin contadores ni cupos fabricados.** La escasez/contadores llegan REALES en S3 (C7) o no existen.

**Las prohibidas las vigila un gate:** `tests/unit/cifras-prohibidas.test.ts` busca cada cifra en sus variantes
en los textos, las guías del paquete, el brochure, su export, el manual y el README (con su demo en rojo). Las
tarifas y las normas citan su artículo y la fecha en que se leyeron en su texto oficial; lo que no se leyó se
dice «sin segunda fuente» y no lleva cifra.

## Pendiente (extensiones futuras)

- **Dark mode:** la app no lo tiene (los tokens ya están listos para ello); el BLUEPRINT sí sigue la
  preferencia del sistema.
- **Cierre del hito H-3/H-4:** `design-sync/` y el checklist de diseño por pantalla se actualizan al cierre
  del hito de robustez; la CSP y las cabeceras llegan con producción.

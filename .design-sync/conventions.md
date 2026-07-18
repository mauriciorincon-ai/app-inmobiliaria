# Innmobiliaria — convenciones de uso

Marketplace inmobiliario seller-first (Bogotá, es-CO). Todo el copy va en **español colombiano
llano**, hablándole al vendedor directo. Tono honesto: cero urgencia falsa, cero contadores
inventados. **Cifras en el copy: SOLO las permitidas en `guidelines/design-system.md`
(§ "Cifras en UI/copy")** — jamás inventes estadísticas, porcentajes ni cupos.

## Envoltura obligatoria

Los componentes con enlaces (`Logo`, `EncabezadoInterior`, `Boton` con `href`) renderizan
`next/link` y necesitan el contexto del router. Envuelve CADA pantalla una vez en `DSProvider`
o esos componentes fallarán al montar:

```jsx
<DSProvider>
  <EncabezadoInterior />
  {/* ...tu pantalla... */}
</DSProvider>
```

## Idioma de estilos: utilidades Tailwind con los tokens de la marca

Estilo con clases utilitarias (nunca CSS nuevo). La paleta REAL (definida como `--color-*` en
`styles.css`) se usa en las caras `bg-* / text-* / border-*`:

| Familia | Valores disponibles                                                                                                                                                                                                              |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Color   | `ink` (tinta #191a1d) · `gray` (párrafo) · `mute` (secundario) · `purple` (ACENTO #7b5dd6) · `purple-600` (hover) · `purple-soft` · `purple-200` (bordes) · `purple-tint` (chips) · `lilac` · `cream` · `mint` · `sky` · `white` |
| Sombra  | `shadow-card` (cards/CTA) · `shadow-soft`                                                                                                                                                                                        |
| Radio   | `rounded-full` (botones/píldoras) · `rounded-2xl` (cards/inputs) · `rounded-3xl` · `rounded-xl`                                                                                                                                  |
| Tipo    | Poppins única; titulares `font-extrabold tracking-tight`; tamaños `text-xs…text-5xl`; pesos `font-medium/semibold/bold/extrabold`                                                                                                |
| Layout  | `flex/grid`, `grid-cols-1…4`, `gap-1…10`, `p*/m*-0…12`, `max-w-md…7xl`, `mx-auto`, `w-full`                                                                                                                                      |

Clases de marca (CSS propio, ya incluido): `pill` (píldora morada rotada para UNA palabra del
titular) · `underline-doodle` (subrayado a mano) · `pastel-band` (banda gradiente mint→lila) ·
`section-soft` (fondo blanco→crema) · `flota` (float decorativo).

**Ojo:** la hoja compilada solo contiene las utilidades enumeradas arriba (más las usadas por
los componentes). Para glue de layout fuera de esa lista usa estilos inline (`style={{…}}`),
no inventes clases.

## Dónde está la verdad

- `styles.css` → tokens `--color-*`, `--shadow-*` y todas las utilidades disponibles.
- `guidelines/design-system.md` → sistema completo: voz, motion, a11y y las cifras permitidas/prohibidas.
- `components/<grupo>/<Nombre>/<Nombre>.prompt.md` → API y ejemplos por componente.

## Ejemplo idiomático

```jsx
<DSProvider>
  <section className="section-soft py-12">
    <div className="mx-auto max-w-3xl flex flex-col items-center gap-6 text-center">
      <h1 className="text-4xl font-extrabold tracking-tight text-ink">
        Vende tu casa <span className="pill">sin comisión</span>
      </h1>
      <p className="text-lg text-gray">
        Publica gratis y habla directo con los interesados.
      </p>
      <Boton href="/publicar">Publica tu inmueble como fundador</Boton>
    </div>
  </section>
</DSProvider>
```

Accesibilidad no negociable: todo input va en `Campo` (label real + error por campo), foco
visible ya incluido, contraste AA con los pares de arriba (`text-mute` mínimo sobre blanco).

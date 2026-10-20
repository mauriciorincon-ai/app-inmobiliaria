"use client";

import {
  IDIOMAS,
  NOMBRE_PROPIO,
  recordarIdioma,
  type Idioma,
} from "@/i18n/idiomas";

// Selector ES/EN. Escribe la cookie `idioma` y recarga: la reescritura de `next.config.ts` entrega
// entonces la otra versión de la MISMA URL. Se recarga en vez de navegar porque (1) la URL no
// cambia y (2) el fragmento `#t=` de /mi-anuncio y /renovar sobrevive a una recarga, y un redirect
// de servidor lo perdería. Cada idioma se nombra en sí mismo (`lang` en el botón) para que se
// reconozca sin leer el idioma actual; el nombre accesible empieza por el texto visible («ES, Español»)
// porque axe 4.14 (WCAG 2.5.3, etiqueta en el nombre) lo exige. Vive en la cabecera de la portada y de las pantallas
// interiores; el pie no lo repite.
export default function SelectorIdioma({
  idioma,
  etiqueta,
}: {
  idioma: Idioma;
  etiqueta: string;
}) {
  function elegir(nuevo: Idioma) {
    if (nuevo === idioma) return;
    recordarIdioma(nuevo);
    window.location.reload();
  }

  return (
    <div role="group" aria-label={etiqueta} className="flex items-center gap-1">
      {IDIOMAS.map((i, n) => (
        <span key={i} className="flex items-center gap-1">
          {n > 0 && (
            <span aria-hidden="true" className="text-mute">
              |
            </span>
          )}
          <button
            type="button"
            lang={i}
            aria-pressed={i === idioma}
            aria-label={`${NOMBRE_PROPIO[i].corto}, ${NOMBRE_PROPIO[i].completo}`}
            onClick={() => elegir(i)}
            className="rounded px-1.5 py-1 text-sm font-semibold text-gray underline-offset-4 aria-pressed:text-ink aria-pressed:underline"
          >
            {NOMBRE_PROPIO[i].corto}
          </button>
        </span>
      ))}
    </div>
  );
}

// Export nombrado además del default: `export *` (barriles, design-sync) no re-exporta defaults.
export { SelectorIdioma };

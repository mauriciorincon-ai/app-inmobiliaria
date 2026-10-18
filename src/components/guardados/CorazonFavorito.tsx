"use client";

import { useSyncExternalStore } from "react";
import { alternarFavorito, leerFavoritos } from "@/engine/guardados/favoritos";
import type { Proyectado } from "@/i18n/textos";
import {
  avisarFavorito,
  favoritosLocales,
  guardarFavoritosLocales,
  instantaneaFavoritos,
  suscribirFavoritos,
} from "@/lib/favoritos-cliente";
import type { COMUN } from "@/textos/comun";

export type TextosFavorito = Proyectado<typeof COMUN.favorito>;

const SIN_FAVORITOS = "";

function Corazon({ lleno }: { lleno: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill={lleno ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20.5S3.5 15 3.5 8.9A4.4 4.4 0 0 1 12 7.3a4.4 4.4 0 0 1 8.5 1.6C20.5 15 12 20.5 12 20.5Z" />
    </svg>
  );
}

// El corazón: guarda el anuncio en este teléfono, sin cuenta, y lo quita al tocarlo de nuevo. Es una isla
// diminuta HERMANA del enlace de la tarjeta (nunca dentro de él). Si el navegador ya verificó su WhatsApp, el
// cambio también llega a la cuenta; si no, queda solo en el teléfono (ADR 017). El botón cambia de nombre
// («Guardar» ↔ «Quitar»), así que no lleva además `aria-pressed`: dos avisos del mismo estado se contradicen.
export default function CorazonFavorito({
  slug,
  t,
  conTexto = false,
}: {
  slug: string;
  t: TextosFavorito;
  /** En la ficha el botón dice qué hace; en la tarjeta es solo el corazón. */
  conTexto?: boolean;
}) {
  const crudo = useSyncExternalStore(
    suscribirFavoritos,
    instantaneaFavoritos,
    () => SIN_FAVORITOS,
  );
  const guardado = leerFavoritos(crudo).includes(slug);

  function alternar() {
    const r = alternarFavorito(favoritosLocales(), slug);
    guardarFavoritosLocales(r.slugs);
    void avisarFavorito(slug, r.guardado);
  }

  const etiqueta = guardado ? t.quitar : t.guardar;
  const clase = conTexto
    ? "inline-flex items-center gap-2 rounded-full border border-purple-200 px-5 py-2.5 text-sm font-semibold text-purple-600 transition-colors hover:bg-purple-tint"
    : "absolute right-5 top-5 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-purple-600 shadow-card transition-colors hover:bg-purple-tint";

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={conTexto ? undefined : etiqueta}
      className={clase}
    >
      <Corazon lleno={guardado} />
      {conTexto && <span>{etiqueta}</span>}
    </button>
  );
}

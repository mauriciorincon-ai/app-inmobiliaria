import type { Proyectado } from "@/i18n/textos";
import type { MI_ANUNCIO } from "@/textos/mi-anuncio";

export type TextosSubidor = Proyectado<typeof MI_ANUNCIO.subidor>;

// Sugerencia de espacios a fotografiar (no obligatorio, solo guía de calidad). Determinista.
export default function ChecklistEspacios({ t }: { t: TextosSubidor }) {
  return (
    <div className="mt-3 rounded-2xl bg-sky/60 px-4 py-3">
      <p className="text-xs font-semibold text-ink">{t.ideas}</p>
      <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray">
        {t.espacios.map((e) => (
          <li key={e}>· {e}</li>
        ))}
      </ul>
    </div>
  );
}

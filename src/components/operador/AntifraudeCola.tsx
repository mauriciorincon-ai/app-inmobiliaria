import Link from "next/link";
import AccionesAntifraude from "./AccionesAntifraude";
import { partesBogota } from "@/engine/agenda/bogota";
import { accionesPosibles, valoresDeBandera } from "@/engine/antifraude/cola";
import { enlaceAlDueno } from "@/engine/antifraude/mensajes";
import { formatearFecha } from "@/engine/format/fecha";
import { montoCorto } from "@/engine/precio/presentacion";
import type { Idioma } from "@/i18n/idiomas";
import { enIdioma, rellenar } from "@/i18n/textos";
import type { RevisionAntifraude } from "@/lib/supabase/types";
import { ANTIFRAUDE } from "@/textos/antifraude";
import { COMUN } from "@/textos/comun";

const ENLACE_WHATSAPP =
  "inline-flex items-center justify-center rounded-full border border-purple-200 px-4 py-2 text-sm font-semibold text-purple-600 transition-colors hover:bg-purple-tint";

// La cola antifraude (S15, maqueta 12): cada anuncio con sus banderas (qué vio cada regla) y lo que dicen los reportes (sin
// quién reportó). Las banderas usan símbolo y texto, nunca solo color. El enlace de WhatsApp abre la app del operador con el
// texto ya escrito, en el idioma del dueño: nada sale solo.
export default function AntifraudeCola({
  filas,
  lang,
}: {
  filas: readonly RevisionAntifraude[];
  lang: Idioma;
}) {
  const t = enIdioma(ANTIFRAUDE.cola, lang);
  const motivos: Record<string, string> = enIdioma(ANTIFRAUDE.motivos, lang);
  const tipos: Record<string, string> = enIdioma(COMUN.dominio.tipo, lang);
  const fecha = (iso: string) =>
    formatearFecha(partesBogota(new Date(iso)).fecha, lang);

  return (
    <ul className="mt-6 space-y-4">
      {filas.map((r) => {
        const nB = r.banderas.length;
        const nR = r.reportes.length;
        const dueno = { ...r.dueno };
        const anuncio = { tipo: r.tipo, barrio: r.barrio };
        return (
          <li
            key={r.id}
            data-testid="fila-antifraude"
            data-slug={r.slug}
            className="rounded-2xl border border-purple-200 bg-white p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-extrabold text-ink">
                  {tipos[r.tipo] ?? tipos.inmueble}
                  {" · "}
                  {r.barrio}
                  {" · "}
                  {montoCorto(r.precio_esperado, lang)}
                </h3>
                <p className="text-sm text-mute">
                  {rellenar(t.publicado, {
                    fecha: fecha(r.creado),
                    nivel: t.nivel[r.nivel_verificacion],
                  })}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {nB > 0 && (
                  <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                    <span aria-hidden="true">! </span>
                    {nB === 1
                      ? t.cuenta.banderaUna
                      : rellenar(t.cuenta.banderas, { n: nB })}
                  </span>
                )}
                {nR > 0 && (
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-aviso">
                    <span aria-hidden="true">! </span>
                    {nR === 1
                      ? t.cuenta.reporteUno
                      : rellenar(t.cuenta.reportes, { n: nR })}
                  </span>
                )}
              </div>
            </div>

            {(r.pausado_at || r.ctl_pedido_at) && (
              <div className="mt-3 space-y-2">
                {r.pausado_at && (
                  <p className="text-sm font-semibold text-ink">
                    <span aria-hidden="true">⏸ </span>
                    {rellenar(t.estado.pausado, { fecha: fecha(r.pausado_at) })}
                  </p>
                )}
                {r.ctl_pedido_at && (
                  <p className="text-sm font-semibold text-ink">
                    <span aria-hidden="true">◷ </span>
                    {rellenar(t.estado.ctlPedido, {
                      fecha: fecha(r.ctl_pedido_at),
                    })}
                  </p>
                )}
              </div>
            )}

            {nB > 0 && (
              <ul className="mt-4 space-y-3">
                {r.banderas.map((b) => {
                  const valores = valoresDeBandera(b);
                  const ambitos: Record<string, string> = t.ambito;
                  return (
                    <li key={b.regla} className="flex items-start gap-3 text-sm">
                      <span
                        aria-hidden="true"
                        className="grid size-6 shrink-0 place-items-center rounded-full bg-red-50 text-xs font-bold text-red-700"
                      >
                        !
                      </span>
                      <span>
                        <strong className="text-ink">
                          {rellenar(t.bandera[b.regla], valores)}
                        </strong>{" "}
                        <span className="text-mute">
                          {b.regla === "precio"
                            ? rellenar(t.bandera.precioRegla, {
                                ...valores,
                                ambito: ambitos[String(valores.ambito)] ?? "",
                              })
                            : rellenar(
                                t.bandera[`${b.regla}Detalle`],
                                valores,
                              )}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}

            {nR > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-bold text-ink">{t.reportes.titulo}</h4>
                <ul className="mt-2 space-y-2">
                  {r.reportes.map((rep, i) => (
                    <li key={`${rep.creado}-${i}`} className="text-sm text-gray">
                      {rellenar(t.reportes.fila, {
                        motivos: rep.motivos.map((m) => motivos[m]).join(" · "),
                        fecha: fecha(rep.creado),
                      })}
                      {rep.detalle && (
                        <span className="mt-1 block rounded-xl bg-cream px-3 py-2 text-ink">
                          {rep.detalle}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <AccionesAntifraude
              inmuebleId={r.id}
              posibles={accionesPosibles(r)}
              t={t}
            />

            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={`/i/${r.slug}`} className={ENLACE_WHATSAPP}>
                {t.acciones.verFicha}
              </Link>
              {(r.pausado_at || r.ctl_pedido_at) && (
                <a
                  href={enlaceAlDueno(
                    r.pausado_at ? "pausa" : "pedirCtl",
                    dueno,
                    anuncio,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={ENLACE_WHATSAPP}
                >
                  {t.acciones.escribir}
                </a>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

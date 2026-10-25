import Link from "next/link";
import AccionesSesion from "./AccionesSesion";
import { formatearHorario, partesBogota } from "@/engine/agenda/bogota";
import { enlaceAlDueno } from "@/engine/antifraude/mensajes";
import { accionesDeSesion } from "@/engine/antifraude/sesion";
import { formatearFecha } from "@/engine/format/fecha";
import type { Idioma } from "@/i18n/idiomas";
import { enIdioma, rellenar } from "@/i18n/textos";
import type { EstadoSesionFotos, SesionFotosPanel } from "@/lib/supabase/types";
import { COMUN } from "@/textos/comun";
import { MI_ANUNCIO } from "@/textos/mi-anuncio";
import { OPERADOR } from "@/textos/operador";

const ENLACE_WHATSAPP =
  "inline-flex items-center justify-center rounded-full border border-purple-200 px-4 py-2 text-sm font-semibold text-purple-600 transition-colors hover:bg-purple-tint";

// El estado se dice con símbolo Y texto (el color nunca va solo).
const SIMBOLO: Record<EstadoSesionFotos, string> = {
  solicitada: "◷",
  agendada: "✓",
  hecha: "✓",
  cancelada: "✕",
};

// Las sesiones de fotos que piden los dueños (S15). Por atender primero; las cerradas de los últimos 30 días, abajo. El enlace
// de WhatsApp abre la app del operador con el texto ya escrito, en el idioma del dueño: nada sale solo.
export default function SesionesCola({
  filas,
  lang,
}: {
  filas: readonly SesionFotosPanel[];
  lang: Idioma;
}) {
  const t = enIdioma(OPERADOR.sesiones, lang);
  const tipos: Record<string, string> = enIdioma(COMUN.dominio.tipo, lang);
  const fecha = (iso: string) =>
    formatearFecha(partesBogota(new Date(iso)).fecha, lang);
  const franjas: Record<string, string> = t.franja;

  const tarjeta = (s: SesionFotosPanel) => {
    const dueno = { ...s.dueno };
    const anuncio = { tipo: s.inmueble.tipo, barrio: s.inmueble.barrio };
    const franjaDelDueno: Record<string, string> = enIdioma(
      MI_ANUNCIO.sesionFotos.franja,
      dueno.idioma,
    );
    const enlace =
      s.estado === "solicitada"
        ? {
            texto: t.acciones.escribir,
            href: enlaceAlDueno("sesionPedida", dueno, anuncio, {
              franja: franjaDelDueno[s.franja] ?? "",
            }),
          }
        : s.estado === "agendada" && s.agendada_para
          ? {
              texto: t.acciones.confirmar,
              href: enlaceAlDueno("sesionAgendada", dueno, anuncio, {
                cuando: formatearHorario(s.agendada_para, dueno.idioma),
              }),
            }
          : s.estado === "cancelada" && s.cancelada_por === "operador"
            ? {
                texto: t.acciones.avisar,
                href: enlaceAlDueno("sesionCancelada", dueno, anuncio),
              }
            : null;
    return (
      <li
        key={s.id}
        data-testid="fila-sesion"
        data-slug={s.inmueble.slug}
        data-estado={s.estado}
        className="rounded-2xl border border-purple-200 bg-white p-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-extrabold text-ink">
              {tipos[s.inmueble.tipo] ?? tipos.inmueble}
              {" · "}
              {s.inmueble.barrio}
            </h3>
            <p className="text-sm text-mute">
              {rellenar(t.pedida, { fecha: fecha(s.creada) })}
              {" · "}
              {t.franja.etiqueta}: {franjas[s.franja]}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-white px-3 py-1 text-xs font-semibold text-ink">
            <span aria-hidden="true">{SIMBOLO[s.estado]}</span>
            {t.estado[s.estado]}
          </span>
        </div>

        {s.agendada_para && s.estado !== "cancelada" && (
          <p className="mt-3 text-sm font-semibold text-ink">
            {rellenar(t.agendadaPara, {
              cuando: formatearHorario(s.agendada_para, lang),
            })}
          </p>
        )}
        {s.estado === "cancelada" && s.cancelada_por && (
          <p className="mt-3 text-sm text-gray">
            {t.canceladaPor[s.cancelada_por]}
          </p>
        )}

        <AccionesSesion
          sesionId={s.id}
          posibles={accionesDeSesion(s.estado)}
          t={t}
          lang={lang}
        />

        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/i/${s.inmueble.slug}`} className={ENLACE_WHATSAPP}>
            {t.acciones.verFicha}
          </Link>
          {enlace && (
            <a
              href={enlace.href}
              target="_blank"
              rel="noopener noreferrer"
              className={ENLACE_WHATSAPP}
            >
              {enlace.texto}
            </a>
          )}
        </div>
      </li>
    );
  };

  // Una sola lista: la base ya entrega las abiertas primero y, después, las cerradas en los últimos 30 días. Así la tarjeta que
  // se cierra no cambia de sitio en el árbol y su aviso («Sesión marcada como hecha») no se pierde.
  return <ul className="mt-6 space-y-4">{filas.map(tarjeta)}</ul>;
}

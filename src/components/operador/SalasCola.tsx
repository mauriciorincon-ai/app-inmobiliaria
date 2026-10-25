import GuardarSala from "./GuardarSala";
import AccionesSala from "./AccionesSala";
import { formatearHorario, partesBogota } from "@/engine/agenda/bogota";
import { formatearFecha } from "@/engine/format/fecha";
import {
  agruparSalas,
  enlaceWhatsApp,
  mensajeParaComprador,
  mensajeParaSala,
  venceDe,
} from "@/engine/visita/salas-operador";
import type { Idioma } from "@/i18n/idiomas";
import { enIdioma, rellenar } from "@/i18n/textos";
import type { SolicitudSala } from "@/lib/supabase/types";
import { OPERADOR } from "@/textos/operador";

const SIMBOLO: Record<string, string> = {
  en_espera: "…",
  pendiente: "…",
  propuesta: "◷",
  confirmada: "✓",
  rechazada: "✕",
  cancelada: "✕",
};

const ENLACE_WHATSAPP =
  "inline-flex items-center justify-center rounded-full border border-purple-200 px-4 py-2 text-sm font-semibold text-purple-600 transition-colors hover:bg-purple-tint";

// La cola de visitas a salas de ventas (S13): cada solicitud con su proyecto y la página de la revista, el comprador como en el
// panel de los anuncios (nombre y los 4 últimos dígitos hasta confirmar), el plazo de la sala, el contacto que el operador
// guardó y las acciones. Los enlaces de WhatsApp abren la app con el mensaje YA escrito: nada sale solo.
export default function SalasCola({
  filas,
  lang,
}: {
  filas: readonly SolicitudSala[];
  lang: Idioma;
}) {
  const t = enIdioma(OPERADOR, lang).salas;
  const franjaEs: Record<string, string> = enIdioma(
    OPERADOR.salas.franja,
    "es",
  );
  const franjas: Record<string, string> = t.franja;
  const estados: Record<string, string> = t.estado;
  const grupos = agruparSalas(filas);
  const titulos: Record<string, string> = t.grupos;

  return (
    <>
      {grupos.map(({ grupo, filas: items }) => (
        <section
          key={grupo}
          aria-labelledby={`grupo-${grupo}`}
          className="mt-8"
        >
          <h2 id={`grupo-${grupo}`} className="text-xl font-extrabold text-ink">
            {titulos[grupo]}{" "}
            <span className="text-base font-semibold text-mute">
              ({items.length})
            </span>
          </h2>
          <ul className="mt-3 space-y-4">
            {items.map((s) => {
              const vence = venceDe(s);
              const paginas = s.proyecto.paginas?.join(", ") ?? "";
              const msgSala = mensajeParaSala(OPERADOR.salas.mensajes.sala, {
                proyecto: s.proyecto.nombre,
                franja: (franjaEs[s.franja] ?? "").toLocaleLowerCase("es"),
              });
              const waSala = enlaceWhatsApp(s.sala?.telefono ?? null, msgSala);
              const msgComprador =
                s.visita && s.whatsapp
                  ? mensajeParaComprador(OPERADOR.salas.mensajes.comprador, {
                      nombre: s.comprador.nombre,
                      proyecto: s.proyecto.nombre,
                      inicio: s.visita.inicio,
                      direccion: s.sala?.direccion ?? null,
                      idioma: s.comprador.idioma,
                    })
                  : null;
              const waComprador =
                msgComprador && s.whatsapp
                  ? enlaceWhatsApp(s.whatsapp, msgComprador)
                  : null;
              const viva = s.estado === "pendiente" || s.estado === "propuesta";
              return (
                <li
                  key={s.id}
                  data-testid="fila-sala"
                  data-estado={s.estado}
                  className="rounded-2xl border border-purple-200 bg-white p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-extrabold text-ink">
                        {s.proyecto.nombre}
                      </h3>
                      <p className="text-sm text-mute">
                        {s.proyecto.constructora ?? t.sinConstructora}
                        {paginas &&
                          ` · ${rellenar(t.fuente, { edicion: s.proyecto.edicion, paginas })}`}
                      </p>
                    </div>
                    <span className="rounded-full bg-purple-tint px-3 py-1 text-xs font-semibold text-purple-600">
                      <span aria-hidden="true">{SIMBOLO[s.estado]} </span>
                      {estados[s.estado]}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-gray">
                    {rellenar(t.comprador, {
                      nombre: s.comprador.nombre,
                      fin: s.comprador.telefono_fin,
                    })}
                    {" · "}
                    {s.comprador.identificado
                      ? t.identificado
                      : t.sinIdentificar}
                  </p>
                  <p className="text-sm text-gray">
                    {t.franja.etiqueta}: {franjas[s.franja]}
                    {" · "}
                    {rellenar(t.pedida, {
                      fecha: formatearFecha(
                        partesBogota(new Date(s.fecha)).fecha,
                        lang,
                      ),
                    })}
                  </p>
                  {vence && (
                    <p className="text-sm text-gray">
                      {rellenar(t.vence, {
                        fecha: formatearHorario(vence.toISOString(), lang),
                      })}
                    </p>
                  )}
                  {s.sin_respuesta && (
                    <p className="mt-1 text-sm font-semibold text-aviso">
                      <span aria-hidden="true">! </span>
                      {t.sinRespuesta}
                    </p>
                  )}
                  {s.ninguno && s.estado === "propuesta" && (
                    <p className="mt-1 text-sm font-semibold text-aviso">
                      <span aria-hidden="true">! </span>
                      {t.ninguno}
                    </p>
                  )}

                  {s.horarios.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-semibold text-ink">
                        {t.horarios.propuestos}
                      </p>
                      <ul className="text-sm text-gray">
                        {s.horarios.map((h) => (
                          <li key={h.id}>{formatearHorario(h.inicio, lang)}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {s.visita && s.visita.cancelada_por === null && (
                    <p className="mt-2 text-sm font-semibold text-ink">
                      {rellenar(t.horarios.visita, {
                        horario: formatearHorario(s.visita.inicio, lang),
                      })}
                    </p>
                  )}

                  {s.visita && s.visita.cancelada_por === "comprador" && (
                    <p className="mt-2 text-sm font-semibold text-ink">
                      {rellenar(t.horarios.canceladaComprador, {
                        horario: formatearHorario(s.visita.inicio, lang),
                      })}
                    </p>
                  )}

                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm font-semibold text-purple-600">
                      {s.sala
                        ? [s.sala.telefono, s.sala.direccion]
                            .filter(Boolean)
                            .join(" · ")
                        : t.contacto.faltante}
                    </summary>
                    <GuardarSala
                      slug={s.proyecto.slug}
                      telefono={s.sala?.telefono ?? null}
                      direccion={s.sala?.direccion ?? null}
                      t={t.contacto}
                    />
                  </details>

                  <div className="mt-3 flex flex-wrap gap-3">
                    {viva && waSala && (
                      <a
                        href={waSala}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={ENLACE_WHATSAPP}
                      >
                        {t.whatsapp.sala}
                      </a>
                    )}
                    {waComprador && (
                      <a
                        href={waComprador}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={ENLACE_WHATSAPP}
                      >
                        {t.whatsapp.comprador}
                      </a>
                    )}
                  </div>
                  {s.estado === "confirmada" &&
                    s.visita &&
                    s.visita.cancelada_por === null &&
                    msgComprador === null && (
                      <p className="mt-2 text-xs text-mute">
                        {t.whatsapp.sinDireccion}
                      </p>
                    )}
                  {(waSala || waComprador) && (
                    <p className="mt-2 text-xs text-mute">{t.whatsapp.nada}</p>
                  )}

                  {(viva || s.estado === "confirmada") && (
                    <AccionesSala
                      solicitudId={s.id}
                      puedeProponer={viva}
                      puedeRechazar={viva}
                      puedeCancelar={
                        s.estado === "confirmada" &&
                        s.visita !== null &&
                        s.visita.cancelada_por === null
                      }
                      tieneHorarios={s.horarios.length > 0}
                      t={t.acciones}
                      te={{ problemas: t.problemas, errores: t.errores }}
                      lang={lang}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}

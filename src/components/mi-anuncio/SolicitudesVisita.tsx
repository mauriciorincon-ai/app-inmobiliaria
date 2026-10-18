"use client";

import { useState } from "react";
import Campo from "@/components/ui/Campo";
import { formatearDia, formatearHorario } from "@/engine/agenda/bogota";
import { accionesDueno } from "@/engine/agenda/estados";
import {
  MAX_HORARIOS,
  PRIMERA_HORA,
  ULTIMA_HORA,
  validarHorarios,
} from "@/engine/agenda/horarios";
import { construirWaMe } from "@/engine/format/whatsapp";
import { presupuestoDicho } from "@/engine/format/presupuesto";
import { mascararTelefono } from "@/engine/verificacion/mascara";
import { localeIntl, type Idioma } from "@/i18n/idiomas";
import { rellenar, type Proyectado } from "@/i18n/textos";
import { crearClienteNavegador } from "@/lib/supabase/client";
import type { SolicitudRecibida } from "@/lib/supabase/types";
import type { SOLICITUDES } from "@/textos/solicitudes";
import type { VISITA } from "@/textos/visita";

// Todo lo que el bloque necesita de su idioma, proyectado por la página (el cliente no lleva el otro).
export type ContextoSolicitudes = {
  t: Proyectado<typeof SOLICITUDES>;
  intenciones: Proyectado<typeof VISITA.intencion>;
  formasPago: Proyectado<typeof VISITA.formasPago>;
  tipos: Record<string, string>;
};

type Abierto = "proponer" | "cancelar" | "rechazar" | "asistencia" | null;
type Fila = { fecha: string; hora: string };

const BOTON =
  "inline-flex items-center justify-center rounded-full bg-purple px-5 py-2.5 text-sm font-semibold text-white shadow-card transition-transform hover:bg-purple-600 hover:scale-[1.03] disabled:opacity-60";
const BOTON_SEC =
  "inline-flex items-center justify-center rounded-full border border-purple-200 px-5 py-2.5 text-sm font-semibold text-purple-600 transition-colors hover:bg-purple-tint disabled:opacity-60";
const CHIP = "rounded-full px-3 py-1 text-xs font-semibold";

// Las horas que se pueden proponer: de 6:00 a 21:00 cada media hora, en hora de Bogotá.
const HORAS: string[] = [];
for (let m = PRIMERA_HORA; m <= ULTIMA_HORA; m += 30) {
  HORAS.push(
    `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`,
  );
}

function etiquetaHora(hora: string, lang: Idioma): string {
  return new Intl.DateTimeFormat(localeIntl(lang), {
    timeZone: "UTC",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(`2000-01-01T${hora}:00Z`));
}

function iniciales(nombre: string): string {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
}

// «Solicitudes de visita» en Mi anuncio (S8, ADR 016, maquetas 05 y 06): el ajuste «solo identificados», la
// tarjeta del comprador antes de decir que sí, proponer hasta 3 horarios, aceptar una solicitud en espera,
// cancelar, escribirle por WhatsApp y marcar si asistió. Las acciones que avisan por correo pasan por la
// API; las demás van directo a la RPC con el token del dueño.
export default function SolicitudesVisita({
  lang,
  ctx,
  token,
  tipo,
  barrio,
  contactoAbierto,
  soloIdentificados,
  solicitudes,
  onCambio,
}: {
  lang: Idioma;
  ctx: ContextoSolicitudes;
  token: string;
  tipo: string;
  barrio: string;
  contactoAbierto: boolean;
  soloIdentificados: boolean;
  solicitudes: SolicitudRecibida[];
  onCambio: () => void | Promise<void>;
}) {
  const { t } = ctx;
  const [guardando, setGuardando] = useState(false);

  async function alternarAjuste() {
    if (guardando) return;
    setGuardando(true);
    await crearClienteNavegador().rpc("guardar_solo_identificados", {
      p_token: token,
      p_activo: !soloIdentificados,
    });
    await onCambio();
    setGuardando(false);
  }

  return (
    <div>
      <p className="mt-1 text-sm text-gray">{t.intro}</p>

      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl bg-cream px-4 py-3 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-purple">
        <input
          type="checkbox"
          checked={soloIdentificados}
          disabled={guardando}
          onChange={() => void alternarAjuste()}
          className="mt-1 h-5 w-5 accent-purple"
        />
        <span className="text-sm text-gray">
          <span className="font-semibold text-ink">{t.ajuste.titulo}</span>
          <br />
          {t.ajuste.texto}
        </span>
      </label>

      {solicitudes.length === 0 ? (
        <div className="mt-4 rounded-2xl bg-white p-5 shadow-card">
          <p className="font-semibold text-ink">{t.vacio.titulo}</p>
          <p className="mt-1 text-sm text-gray">{t.vacio.texto}</p>
          {!contactoAbierto && (
            <p className="mt-2 text-sm font-medium text-ink">
              {t.vacio.sinContacto}
            </p>
          )}
        </div>
      ) : (
        <ul className="mt-4 space-y-4">
          {solicitudes.map((s) => (
            <li key={s.id}>
              <Tarjeta
                lang={lang}
                ctx={ctx}
                token={token}
                tipo={tipo}
                barrio={barrio}
                s={s}
                onCambio={onCambio}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Tarjeta({
  lang,
  ctx,
  token,
  tipo,
  barrio,
  s,
  onCambio,
}: {
  lang: Idioma;
  ctx: ContextoSolicitudes;
  token: string;
  tipo: string;
  barrio: string;
  s: SolicitudRecibida;
  onCambio: () => void | Promise<void>;
}) {
  const { t } = ctx;
  const [abierto, setAbierto] = useState<Abierto>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filas, setFilas] = useState<Fila[]>([{ fecha: "", hora: "" }]);
  const [problema, setProblema] = useState<string | null>(null);

  const ahora = new Date();
  const acciones = accionesDueno(s, ahora);
  const nombrePila = s.comprador.nombre.split(/\s+/)[0] ?? s.comprador.nombre;
  const presupuesto = presupuestoDicho(
    s.presupuesto_min,
    s.presupuesto_max,
    lang,
  );
  const marcadas = s.comprador.marcadas;
  const vigente = s.estado === "confirmada" && s.visita?.cancelada_por === null;

  async function llamar(
    ruta: string,
    cuerpo: Record<string, unknown>,
  ): Promise<boolean> {
    setOcupado(true);
    setError(null);
    try {
      const res = await fetch(ruta, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, ...cuerpo }),
      });
      if (!res.ok) {
        const { error: codigo } = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        const errores = t.errores as Record<string, string>;
        setError(errores[codigo ?? ""] ?? t.errores.servidor);
        await onCambio();
        return false;
      }
      await onCambio();
      return true;
    } catch {
      setError(t.errores.servidor);
      return false;
    } finally {
      setOcupado(false);
    }
  }

  // Las acciones sin correo van directo a la RPC con el token del dueño.
  async function rpc(
    fn: "aceptar_en_espera" | "marcar_asistencia",
    args: Record<string, unknown>,
  ): Promise<boolean> {
    setOcupado(true);
    setError(null);
    const supabase = crearClienteNavegador();
    const { error: e } =
      fn === "aceptar_en_espera"
        ? await supabase.rpc("aceptar_en_espera", {
            p_token: token,
            p_solicitud_id: s.id,
          })
        : await supabase.rpc("marcar_asistencia", {
            p_token: token,
            p_solicitud_id: s.id,
            p_asistio: args.asistio === true,
          });
    if (e) {
      const errores = t.errores as Record<string, string>;
      const codigo = Object.keys(errores).find((c) => e.message.includes(c));
      setError(errores[codigo ?? "servidor"]);
    }
    await onCambio();
    setOcupado(false);
    return !e;
  }

  async function proponer() {
    setProblema(null);
    const validos = validarHorarios(filas, new Date());
    if (!validos.ok) {
      const problemas = t.problemas as Record<string, string>;
      return setProblema(problemas[validos.problema] ?? t.errores.servidor);
    }
    const ok = await llamar("/api/visitas/proponer", {
      solicitudId: s.id,
      horarios: filas,
    });
    if (ok) setAbierto(null);
  }

  function actualizarFila(i: number, campo: keyof Fila, valor: string) {
    setFilas((f) => f.map((x, j) => (j === i ? { ...x, [campo]: valor } : x)));
  }

  const tipoNombre = (ctx.tipos[tipo] ?? ctx.tipos.inmueble).toLocaleLowerCase(
    localeIntl(lang),
  );
  const mensajeDireccion = (inicio: string) =>
    rellenar(t.mensajeDireccion, {
      nombre: nombrePila,
      inmueble: rellenar(t.inmueble, { tipo: tipoNombre, barrio }),
      horario: formatearHorario(inicio, lang),
    });

  const chipEstado =
    s.estado === "en_espera" || s.estado === "pendiente"
      ? "bg-cream text-ink"
      : s.estado === "confirmada"
        ? "bg-purple-tint text-purple-600"
        : "bg-cream text-gray";

  return (
    <article
      aria-label={s.comprador.nombre}
      className="rounded-3xl bg-white p-5 shadow-card"
    >
      <header className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-purple-tint text-sm font-bold text-purple-600"
        >
          {iniciales(s.comprador.nombre)}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold text-ink">{s.comprador.nombre}</h3>
          <p className="text-xs text-mute">
            {rellenar(t.tarjeta.telefono, {
              fin: mascararTelefono(s.comprador.telefono_fin),
            })}
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            <li className={`${CHIP} bg-purple-tint text-purple-600`}>
              ✓ {t.tarjeta.whatsappVerificado}
            </li>
            <li
              className={`${CHIP} ${s.comprador.identificado ? "bg-purple-tint text-purple-600" : "bg-cream text-gray"}`}
            >
              {s.comprador.identificado
                ? `✓ ${t.tarjeta.identificado}`
                : `○ ${t.tarjeta.sinIdentificar}`}
            </li>
            <li className={`${CHIP} ${chipEstado}`}>{t.estados[s.estado]}</li>
          </ul>
        </div>
      </header>

      <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-mute">
            {t.tarjeta.busca}
          </dt>
          <dd className="text-ink">{ctx.intenciones[s.intencion]}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-mute">
            {t.tarjeta.presupuesto}
          </dt>
          <dd className="text-ink">
            {presupuesto.tipo === "rango" &&
              rellenar(t.tarjeta.presupuestoRango, {
                min: presupuesto.min,
                max: presupuesto.max,
              })}
            {presupuesto.tipo === "desde" &&
              rellenar(t.tarjeta.presupuestoDesde, { min: presupuesto.min })}
            {presupuesto.tipo === "hasta" &&
              rellenar(t.tarjeta.presupuestoHasta, { max: presupuesto.max })}
            {presupuesto.tipo === "ninguno" && t.tarjeta.presupuestoNoDijo}
          </dd>
          {presupuesto.tipo !== "ninguno" && (
            <dd className="text-xs text-mute">
              {t.tarjeta.presupuestoDeclarado}
            </dd>
          )}
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-mute">
            {t.tarjeta.pago}
          </dt>
          <dd className="text-ink">
            {s.forma_pago.length === 0
              ? t.tarjeta.pagoNoDijo
              : s.forma_pago.map((f) => ctx.formasPago[f]).join(" · ")}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-mute">
            {t.tarjeta.visitas}
          </dt>
          <dd className="text-ink">
            {marcadas === 0
              ? t.tarjeta.primeraVisita
              : marcadas === 1
                ? rellenar(t.tarjeta.conteoUna, { n: s.comprador.asistio })
                : rellenar(t.tarjeta.conteoVarias, {
                    n: s.comprador.asistio,
                    m: marcadas,
                  })}
          </dd>
        </div>
      </dl>

      {s.mensaje && (
        <blockquote className="mt-4 rounded-2xl bg-cream px-4 py-3 text-sm text-ink">
          «{s.mensaje}»
        </blockquote>
      )}

      {s.estado === "en_espera" && (
        <div className="mt-4 rounded-2xl bg-cream p-4">
          <p className="text-sm font-semibold text-ink">{t.enEspera.titulo}</p>
          <p className="mt-1 text-sm text-gray">
            {rellenar(t.enEspera.texto, { nombre: nombrePila })}
          </p>
        </div>
      )}

      {s.estado === "pendiente" && s.ninguno && (
        <p className="mt-4 rounded-2xl bg-cream p-4 text-sm font-medium text-ink">
          {t.ninguno}
        </p>
      )}

      {s.estado === "propuesta" && s.horarios.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-semibold text-ink">
            {t.horarios.actuales}
          </p>
          <ul className="mt-1 list-disc pl-5 text-sm text-gray">
            {s.horarios.map((h) => (
              <li key={h.id}>{formatearHorario(h.inicio, lang)}</li>
            ))}
          </ul>
        </div>
      )}

      {vigente && s.visita && (
        <div className="mt-4 rounded-2xl bg-purple-tint p-4">
          <p
            data-testid="tarjeta-horario"
            className="text-base font-bold text-purple-600"
          >
            {formatearHorario(s.visita.inicio, lang)}
          </p>
          {s.whatsapp && (
            <a
              href={construirWaMe(
                s.whatsapp,
                mensajeDireccion(s.visita.inicio),
              )}
              target="_blank"
              rel="noopener noreferrer"
              className={`${BOTON} mt-3`}
            >
              {t.acciones.escribir}
            </a>
          )}
        </div>
      )}

      {vigente &&
        s.visita &&
        Date.parse(s.visita.inicio) <= ahora.getTime() && (
          <div className="mt-4 rounded-2xl bg-cream p-4">
            {s.visita.asistio === null || abierto === "asistencia" ? (
              <>
                <p className="text-sm font-semibold text-ink">
                  {rellenar(t.asistencia.pregunta, {
                    nombre: nombrePila,
                    fecha: formatearDia(s.visita.inicio, lang),
                  })}
                </p>
                <p className="mt-1 text-xs text-mute">
                  {t.asistencia.explicacion}
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() =>
                      void rpc("marcar_asistencia", { asistio: true }).then(
                        (ok) => ok && setAbierto(null),
                      )
                    }
                    className={BOTON}
                  >
                    {t.asistencia.si}
                  </button>
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() =>
                      void rpc("marcar_asistencia", { asistio: false }).then(
                        (ok) => ok && setAbierto(null),
                      )
                    }
                    className={BOTON_SEC}
                  >
                    {t.asistencia.no}
                  </button>
                </div>
              </>
            ) : (
              <p className="flex flex-wrap items-center gap-3 text-sm text-ink">
                <span data-testid="asistencia-marcada">
                  {s.visita.asistio
                    ? t.asistencia.marcadaSi
                    : t.asistencia.marcadaNo}
                </span>
                <button
                  type="button"
                  onClick={() => setAbierto("asistencia")}
                  className="font-semibold text-purple-600 underline"
                >
                  {t.asistencia.cambiar}
                </button>
              </p>
            )}
          </div>
        )}

      {s.estado === "cancelada" && s.visita?.cancelada_por && (
        <p className="mt-4 text-sm text-gray">
          {formatearHorario(s.visita.inicio, lang)}
        </p>
      )}

      {abierto === "proponer" && (
        <form
          onSubmit={(ev) => {
            ev.preventDefault();
            void proponer();
          }}
          noValidate
          className="mt-4 space-y-4 rounded-2xl bg-cream p-4"
        >
          <h4 className="text-sm font-bold text-ink">
            {rellenar(t.horarios.titulo, { nombre: nombrePila })}
          </h4>
          <p className="text-sm text-gray">
            {rellenar(t.horarios.texto, { nombre: nombrePila })}
          </p>
          {filas.map((fila, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_1fr_auto] items-end gap-3"
            >
              <Campo
                id={`fecha-${s.id}-${i}`}
                label={`${rellenar(t.horarios.fila, { n: i + 1 })} · ${t.horarios.fecha}`}
                value={fila.fecha}
                onChange={(v) => actualizarFila(i, "fecha", v)}
                type="date"
                autoComplete="off"
              />
              <Campo
                id={`hora-${s.id}-${i}`}
                label={`${rellenar(t.horarios.fila, { n: i + 1 })} · ${t.horarios.hora}`}
                value={fila.hora}
                onChange={(v) => actualizarFila(i, "hora", v)}
                control="select"
                placeholder={t.horarios.hora}
                opciones={HORAS.map((h) => ({
                  value: h,
                  label: etiquetaHora(h, lang),
                }))}
              />
              {filas.length > 1 && (
                <button
                  type="button"
                  aria-label={rellenar(t.horarios.quitar, { n: i + 1 })}
                  onClick={() => setFilas((f) => f.filter((_, j) => j !== i))}
                  className="mb-1 rounded-full border border-purple-200 px-3 py-2 text-sm font-semibold text-gray hover:bg-white"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          {filas.length < MAX_HORARIOS && (
            <button
              type="button"
              onClick={() => setFilas((f) => [...f, { fecha: "", hora: "" }])}
              className="text-sm font-semibold text-purple-600 underline"
            >
              + {t.horarios.agregar}
            </button>
          )}
          {problema && (
            <p role="alert" className="text-sm font-medium text-red-600">
              {problema}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={ocupado} className={BOTON}>
              {ocupado
                ? t.horarios.enviando
                : rellenar(t.horarios.enviar, { nombre: nombrePila })}
            </button>
            <button
              type="button"
              onClick={() => setAbierto(null)}
              className={BOTON_SEC}
            >
              {t.horarios.cerrar}
            </button>
          </div>
        </form>
      )}

      {(abierto === "cancelar" || abierto === "rechazar") && (
        <div role="group" className="mt-4 rounded-2xl bg-cream p-4">
          <p className="text-sm text-gray">{t.acciones.avisoCancelar}</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={ocupado}
              onClick={() =>
                void (
                  abierto === "cancelar"
                    ? llamar("/api/visitas/cancelar", {
                        quien: "dueno",
                        solicitudId: s.id,
                      })
                    : llamar("/api/visitas/rechazar", { solicitudId: s.id })
                ).then((ok) => ok && setAbierto(null))
              }
              className={BOTON}
            >
              {abierto === "cancelar"
                ? t.acciones.confirmarCancelar
                : t.acciones.confirmarRechazar}
            </button>
            <button
              type="button"
              onClick={() => setAbierto(null)}
              className={BOTON_SEC}
            >
              {t.acciones.noCancelar}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-red-600">
          {error}
        </p>
      )}

      {abierto === null && (
        <div className="mt-4 flex flex-wrap gap-3">
          {acciones.aceptar && (
            <button
              type="button"
              disabled={ocupado}
              onClick={() => void rpc("aceptar_en_espera", {})}
              className={BOTON}
            >
              {t.acciones.aceptar}
            </button>
          )}
          {acciones.proponer && (
            <button
              type="button"
              onClick={() => {
                setFilas([{ fecha: "", hora: "" }]);
                setProblema(null);
                setAbierto("proponer");
              }}
              className={s.estado === "propuesta" ? BOTON_SEC : BOTON}
            >
              {s.estado === "propuesta"
                ? t.acciones.cambiarHorarios
                : t.acciones.proponer}
            </button>
          )}
          {acciones.rechazar && (
            <button
              type="button"
              onClick={() => setAbierto("rechazar")}
              className={BOTON_SEC}
            >
              {t.acciones.rechazar}
            </button>
          )}
          {acciones.cancelar && (
            <button
              type="button"
              onClick={() => setAbierto("cancelar")}
              className={BOTON_SEC}
            >
              {t.acciones.cancelar}
            </button>
          )}
        </div>
      )}
    </article>
  );
}

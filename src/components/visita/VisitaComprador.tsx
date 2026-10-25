"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  accionesComprador,
  type EstadoSolicitud,
} from "@/engine/agenda/estados";
import { diaAntes, formatearHorario } from "@/engine/agenda/bogota";
import { generarIcs } from "@/engine/agenda/ics";
import { extraerTokenDeHash } from "@/engine/token/token";
import type { Idioma } from "@/i18n/idiomas";
import { rellenar, type Proyectado } from "@/i18n/textos";
import { crearClienteNavegador } from "@/lib/supabase/client";
import type { VisitaDelComprador } from "@/lib/supabase/types";
import type { VISITA } from "@/textos/visita";

export type TextosPagina = Proyectado<typeof VISITA.pagina>;

type Carga =
  | { fase: "cargando" }
  | { fase: "sin-token" }
  | { fase: "no-encontrada" }
  | { fase: "error" }
  | { fase: "lista"; visita: VisitaDelComprador };

const BOTON =
  "inline-flex items-center justify-center rounded-full bg-purple px-6 py-3 text-sm font-semibold text-white shadow-card transition-transform hover:bg-purple-600 hover:scale-[1.03] disabled:opacity-60";
const BOTON_SEC =
  "inline-flex items-center justify-center rounded-full border border-purple-200 px-5 py-2.5 text-sm font-semibold text-purple-600 transition-colors hover:bg-purple-tint disabled:opacity-60";

// La solicitud de visita del comprador (S8, maqueta 06): ve su estado, elige uno de los horarios que propuso
// el dueño (o dice que ninguno le sirve), baja el evento a su calendario o cancela. Todo se resuelve con el
// token de SU solicitud, que viene en el fragmento del enlace del correo. Nunca se muestra la dirección: la
// da el dueño por WhatsApp.
export default function VisitaComprador({
  lang,
  t,
  tipos,
}: {
  lang: Idioma;
  t: TextosPagina;
  tipos: Record<string, string>;
}) {
  const [carga, setCarga] = useState<Carga>({ fase: "cargando" });
  const [token, setToken] = useState<string | null>(null);
  const [elegido, setElegido] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async (tok: string) => {
    const { data, error: e } = await crearClienteNavegador().rpc(
      "obtener_visita",
      { p_token: tok },
    );
    if (e) return setCarga({ fase: "error" });
    if (!data) return setCarga({ fase: "no-encontrada" });
    setCarga({ fase: "lista", visita: data });
  }, []);

  // El fragmento solo existe en el navegador: se resuelve tras montar.
  useEffect(() => {
    const tok = extraerTokenDeHash(
      typeof window !== "undefined" ? window.location.hash : "",
    );
    if (!tok) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCarga({ fase: "sin-token" });
      return;
    }
    setToken(tok);
    void cargar(tok);
  }, [cargar]);

  async function accion(ruta: string, cuerpo: Record<string, unknown>) {
    if (!token) return false;
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
        await cargar(token);
        return false;
      }
      await cargar(token);
      return true;
    } catch {
      setError(t.errores.servidor);
      return false;
    } finally {
      setOcupado(false);
    }
  }

  if (carga.fase === "cargando") {
    return (
      <p className="text-sm text-mute" role="status">
        {t.cargando}
      </p>
    );
  }
  if (carga.fase === "sin-token" || carga.fase === "no-encontrada") {
    return (
      <div className="rounded-[2rem] bg-cream px-6 py-12 text-center">
        <h1 className="text-lg font-bold text-ink">{t.sinEnlace.titulo}</h1>
        <p className="mt-2 text-sm text-gray">{t.sinEnlace.texto}</p>
      </div>
    );
  }
  if (carga.fase === "error") {
    return (
      <div
        role="alert"
        className="rounded-2xl bg-red-50 px-5 py-4 text-sm font-medium text-red-700"
      >
        {t.error}
      </div>
    );
  }

  const v = carga.visita;
  // Una solicitud de sala de ventas (S13) trae `proyecto` y no `inmueble`: la coordina el equipo de Innmobiliaria.
  const sala = v.inmueble === null ? v.proyecto : null;
  const slugRef = v.inmueble === null ? v.proyecto.slug : v.inmueble.slug;
  const dueno = sala ? t.sala.equipo : (v.inmueble?.nombre_publicador ?? "");
  const inmueble = v.inmueble
    ? rellenar(t.inmueble, {
        tipo: (tipos[v.inmueble.tipo] ?? tipos.inmueble).toLocaleLowerCase(
          lang,
        ),
        barrio: v.inmueble.barrio,
      })
    : rellenar(t.sala.proyecto, { nombre: sala?.nombre ?? "" });
  const hrefFicha = sala ? `/nuevos/${sala.slug}` : `/i/${slugRef}`;
  const hrefBuscar = sala ? "/buscar?v=nuevos" : "/buscar";
  const ahora = new Date();
  const acciones = accionesComprador(v, ahora);
  const estado: EstadoSolicitud = v.estado;
  const inicio = v.visita?.inicio ?? null;
  const confirmadaVigente =
    estado === "confirmada" && v.visita && v.visita.cancelada_por === null;
  const yaPaso =
    confirmadaVigente &&
    inicio !== null &&
    Date.parse(inicio) <= ahora.getTime();

  function descargarIcs() {
    if (!inicio || !token) return;
    const ics = generarIcs(
      {
        uid: `visita-${slugRef}-${inicio.replace(/\D/g, "")}@innmobiliaria`,
        inicio,
        titulo: sala
          ? rellenar(t.sala.ics.titulo, { nombre: sala.nombre })
          : rellenar(t.ics.titulo, { inmueble }),
        descripcion: rellenar(
          sala ? t.sala.ics.descripcion : t.ics.descripcion,
          { dueno },
        ),
      },
      new Date(),
    );
    const url = URL.createObjectURL(
      new Blob([ics], { type: "text/calendar;charset=utf-8" }),
    );
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = "visita-innmobiliaria.ics";
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    URL.revokeObjectURL(url);
    setAviso(t.estados.confirmada.calendarioListo);
  }

  async function confirmarHorario() {
    if (!elegido) return;
    await accion("/api/visitas/elegir", { horarioId: elegido });
  }

  async function ninguno() {
    const ok = await accion("/api/visitas/elegir", { horarioId: null });
    if (ok) setAviso(rellenar(t.estados.propuesta.ningunoListo, { dueno }));
  }

  async function cancelar() {
    const ok = await accion("/api/visitas/cancelar", { quien: "comprador" });
    if (ok) setConfirmando(false);
  }

  const cancelarBloque = acciones.cancelar && (
    <div className="mt-4">
      {!confirmando ? (
        <button
          type="button"
          onClick={() => setConfirmando(true)}
          className="text-sm font-semibold text-gray underline-offset-4 hover:underline"
        >
          {estado === "confirmada"
            ? t.estados.confirmada.cancelar
            : t.cancelarConfirmar.retirar}
        </button>
      ) : (
        <div
          role="group"
          aria-label={t.cancelarConfirmar.titulo}
          className="rounded-2xl bg-cream p-4"
        >
          <p className="text-sm font-semibold text-ink">
            {t.cancelarConfirmar.titulo}
          </p>
          <p className="mt-1 text-sm text-gray">
            {rellenar(
              sala ? t.sala.cancelarConfirmar : t.cancelarConfirmar.texto,
              { dueno },
            )}
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={ocupado}
              onClick={() => void cancelar()}
              className={BOTON}
            >
              {ocupado
                ? t.cancelarConfirmar.cancelando
                : t.cancelarConfirmar.si}
            </button>
            <button
              type="button"
              onClick={() => setConfirmando(false)}
              className={BOTON_SEC}
            >
              {t.cancelarConfirmar.no}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div aria-live="polite">
      <p className="text-sm font-semibold text-purple-600">{inmueble}</p>

      {estado === "en_espera" && (
        <section aria-labelledby="visita-titulo" className="mt-3">
          <h1
            id="visita-titulo"
            className="text-3xl font-extrabold tracking-tight text-ink"
          >
            {t.estados.en_espera.titulo}
          </h1>
          <p className="mt-2 text-sm text-gray">
            {rellenar(t.estados.en_espera.texto, { dueno })}
          </p>
          <div className="mt-4">
            <Link
              // El token viaja en el FRAGMENTO (no llega al servidor ni a los registros de acceso); la pantalla de
              // identificación lo recompone al volver.
              href={`/identificarse?volver=${encodeURIComponent("/visita")}#t=${token}`}
              className={BOTON}
            >
              {t.estados.en_espera.identificar}
            </Link>
          </div>
          {cancelarBloque}
        </section>
      )}

      {estado === "pendiente" && (
        <section aria-labelledby="visita-titulo" className="mt-3">
          <h1
            id="visita-titulo"
            className="text-3xl font-extrabold tracking-tight text-ink"
          >
            {t.estados.pendiente.titulo}
          </h1>
          <p className="mt-2 text-sm text-gray">
            {rellenar(sala ? t.sala.pendiente : t.estados.pendiente.texto, {
              dueno,
            })}
          </p>
          {cancelarBloque}
        </section>
      )}

      {estado === "propuesta" && (
        <section aria-labelledby="visita-titulo" className="mt-3">
          <h1
            id="visita-titulo"
            className="text-3xl font-extrabold tracking-tight text-ink"
          >
            {rellenar(t.estados.propuesta.titulo, { dueno })}
          </h1>
          <p className="mt-1 text-xs text-mute">{t.horasBogota}</p>
          <fieldset className="mt-4">
            <legend className="text-sm font-semibold text-ink">
              {t.estados.propuesta.elige}
            </legend>
            <div className="mt-2 space-y-2">
              {v.horarios.map((h) => (
                <label
                  key={h.id}
                  className="flex cursor-pointer items-center gap-3 rounded-2xl border border-purple-200 bg-white px-4 py-3 text-sm text-ink has-[:checked]:border-purple has-[:checked]:bg-purple-tint has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-purple"
                >
                  <input
                    type="radio"
                    name="horario"
                    value={h.id}
                    checked={elegido === h.id}
                    onChange={() => setElegido(h.id)}
                    className="h-4 w-4 accent-purple"
                  />
                  {formatearHorario(h.inicio, lang)}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={!elegido || ocupado}
              onClick={() => void confirmarHorario()}
              className={BOTON}
            >
              {ocupado
                ? t.estados.propuesta.confirmando
                : t.estados.propuesta.confirmar}
            </button>
            <button
              type="button"
              disabled={ocupado}
              onClick={() => void ninguno()}
              className={BOTON_SEC}
            >
              {t.estados.propuesta.ninguno}
            </button>
          </div>
          {cancelarBloque}
        </section>
      )}

      {confirmadaVigente && inicio && (
        <section aria-labelledby="visita-titulo" className="mt-3">
          <h1
            id="visita-titulo"
            className="text-3xl font-extrabold tracking-tight text-ink"
          >
            ✓ {t.estados.confirmada.titulo}
          </h1>
          <p
            data-testid="visita-horario"
            className="mt-3 text-xl font-bold text-purple"
          >
            {formatearHorario(inicio, lang)}
          </p>
          <p className="mt-1 text-xs text-mute">{t.horasBogota}</p>
          <p className="mt-3 text-sm text-gray">
            {rellenar(sala ? t.sala.confirmada.con : t.estados.confirmada.con, {
              inmueble,
              dueno,
            })}
          </p>
          {yaPaso ? (
            <p className="mt-3 text-sm text-gray">
              {t.estados.confirmada.yaPaso}
            </p>
          ) : (
            <ul className="mt-3 space-y-1.5 text-sm text-gray">
              <li>
                {rellenar(
                  sala
                    ? t.sala.confirmada.direccion
                    : t.estados.confirmada.direccion,
                  { dueno },
                )}
              </li>
              <li>
                {rellenar(t.estados.confirmada.recordatorio, {
                  dia: diaAntes(inicio, lang),
                })}
              </li>
              <li>{t.estados.confirmada.consejo}</li>
            </ul>
          )}
          {acciones.calendario && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button type="button" onClick={descargarIcs} className={BOTON}>
                {t.estados.confirmada.calendario}
              </button>
            </div>
          )}
          {aviso && (
            <p role="status" className="mt-2 text-sm font-medium text-ok">
              {aviso}
            </p>
          )}
          {cancelarBloque}
        </section>
      )}

      {estado === "cancelada" && (
        <section aria-labelledby="visita-titulo" className="mt-3">
          <h1
            id="visita-titulo"
            className="text-3xl font-extrabold tracking-tight text-ink"
          >
            {t.estados.cancelada.titulo}
          </h1>
          <p className="mt-2 text-sm text-gray">
            {rellenar(
              v.visita?.cancelada_por === "dueno"
                ? t.estados.cancelada.porDueno
                : sala
                  ? t.sala.cancelada.porComprador
                  : t.estados.cancelada.porComprador,
              { dueno },
            )}
          </p>
          <div className="mt-4">
            <Link href={hrefFicha} className={BOTON}>
              {t.estados.cancelada.otros}
            </Link>
          </div>
        </section>
      )}

      {estado === "rechazada" && (
        <section aria-labelledby="visita-titulo" className="mt-3">
          <h1
            id="visita-titulo"
            className="text-3xl font-extrabold tracking-tight text-ink"
          >
            {sala
              ? t.sala.rechazada.titulo
              : rellenar(t.estados.rechazada.titulo, { dueno })}
          </h1>
          <p className="mt-2 text-sm text-gray">
            {sala ? t.sala.rechazada.texto : t.estados.rechazada.texto}
          </p>
          <div className="mt-4">
            <Link href={hrefBuscar} className={BOTON}>
              {sala ? t.sala.rechazada.buscar : t.estados.rechazada.buscar}
            </Link>
          </div>
        </section>
      )}

      {aviso && estado !== "confirmada" && (
        <p role="status" className="mt-3 text-sm font-medium text-ok">
          {aviso}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

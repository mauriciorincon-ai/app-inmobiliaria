"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  agregarTokenAlerta,
  CLAVE_ALERTAS,
  leerTokensAlertas,
  serializarTokensAlertas,
} from "@/engine/alertas/tokens";
import { extraerTokenDeHash } from "@/engine/token/token";
import type { Idioma } from "@/i18n/idiomas";
import { rellenar, type Proyectado } from "@/i18n/textos";
import { enviarAccion } from "@/lib/api-cliente";
import { escribirLocal, leerLocal } from "@/lib/almacen-local";
import type { AccionAlerta, AlertaMia } from "@/lib/supabase/types";
import type { ALERTAS } from "@/textos/alertas";

export type TextosMias = Proyectado<typeof ALERTAS.mias>;

const RUTA_GESTION = "/api/alertas/gestion";

type Carga = "cargando" | "listo" | "error";
type Aviso = { tipo: "ok" | "error"; titulo?: string; texto: string };

const BOTON =
  "inline-flex items-center justify-center rounded-full bg-purple px-5 py-2 text-sm font-semibold text-white shadow-card transition-transform hover:bg-purple-600";
const BOTON_SEC =
  "inline-flex items-center justify-center rounded-full border border-purple-200 px-5 py-2 text-sm font-semibold text-purple-600 transition-colors hover:bg-purple-tint disabled:opacity-60";

// «Mis alertas» sin cuenta (S9, maqueta 08, ADR 017). El teléfono que creó una alerta guarda su token de
// GESTIONAR; con ellos pide sus alertas y las pausa, las cambia o las borra. Llegan dos enlaces por el
// fragmento (que no llega al servidor): `#c=…` confirma el correo y `#t=…` abre las alertas de otro teléfono
// (el enlace «gestionar» de cada resumen). Al leerlos se borran de la barra de direcciones.
export default function MisAlertas({
  lang,
  t,
}: {
  lang: Idioma;
  t: TextosMias;
}) {
  const [carga, setCarga] = useState<Carga>("cargando");
  const [alertas, setAlertas] = useState<AlertaMia[]>([]);
  const [tokens, setTokens] = useState<string[]>([]);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [borrando, setBorrando] = useState<number | null>(null);

  // Pide las alertas de los tokens dados y descarta del teléfono los que ya no existen (alertas borradas).
  const leer = useCallback(
    async (lista: string[]) => {
      if (lista.length === 0) {
        setTokens([]);
        setAlertas([]);
        return setCarga("listo");
      }
      const r = await enviarAccion<{ alertas: AlertaMia[] }>(
        RUTA_GESTION,
        "mias",
        { tokens: lista, idioma: lang },
      );
      if (!r.ok) return setCarga("error");
      setTokens(lista);
      setAlertas(r.datos.alertas);
      const vivos = new Set(r.datos.alertas.map((a) => a.indice));
      const quedan = lista.filter((_, i) => vivos.has(i));
      if (quedan.length !== lista.length) {
        escribirLocal(CLAVE_ALERTAS, serializarTokensAlertas(quedan));
      }
      setCarga("listo");
    },
    [lang],
  );

  // Sin guarda de «montaje vigente»: el efecto consume el fragmento (se borra de la barra) y, si lo repitiera
  // un segundo montaje de desarrollo, el aviso de la confirmación se perdería. Poner estado tras desmontar es
  // inofensivo.
  useEffect(() => {
    async function iniciar() {
      const hash = window.location.hash;
      const confirmar = extraerTokenDeHash(hash, "c");
      const gestionar = extraerTokenDeHash(hash, "t");
      let lista = leerTokensAlertas(leerLocal(CLAVE_ALERTAS));
      if (gestionar) {
        lista = agregarTokenAlerta(lista, gestionar);
        escribirLocal(CLAVE_ALERTAS, serializarTokensAlertas(lista));
      }
      if (confirmar || gestionar) {
        // El token no se queda en la barra de direcciones ni en el historial.
        window.history.replaceState(
          null,
          "",
          window.location.pathname + window.location.search,
        );
      }
      if (confirmar) {
        const r = await enviarAccion<{ nombre: string }>(
          RUTA_GESTION,
          "confirmar",
          { token: confirmar },
        );
        setAviso(
          r.ok
            ? {
                tipo: "ok",
                titulo: t.confirmada.titulo,
                texto: rellenar(t.confirmada.texto, { nombre: r.datos.nombre }),
              }
            : { tipo: "error", texto: t.confirmarError },
        );
      } else if (gestionar) {
        setAviso({ tipo: "ok", texto: t.agregada });
      }
      await leer(lista);
    }
    void iniciar();
  }, [leer, t]);

  async function cambiar(a: AlertaMia, cambio: AccionAlerta) {
    setOcupado(true);
    setAviso(null);
    const r = await enviarAccion(RUTA_GESTION, "gestionar", {
      token: tokens[a.indice],
      cambio,
    });
    setOcupado(false);
    setBorrando(null);
    if (!r.ok) {
      const errores = t.errores as Record<string, string>;
      return setAviso({
        tipo: "error",
        texto: errores[r.codigo] ?? t.errores.servidor,
      });
    }
    if (cambio === "borrar") setAviso({ tipo: "ok", texto: t.borrada });
    await leer(tokens);
  }

  function interruptor(
    etiqueta: string,
    encendido: boolean,
    alActivar: () => void,
  ) {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={encendido}
        disabled={ocupado}
        onClick={alActivar}
        className="flex w-full items-center justify-between gap-4 rounded-2xl bg-cream px-4 py-3 text-left text-sm font-semibold text-ink disabled:opacity-60"
      >
        <span>{etiqueta}</span>
        <span
          aria-hidden="true"
          className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors ${
            encendido ? "bg-purple" : "bg-purple-200"
          }`}
        >
          <span
            className={`h-5 w-5 rounded-full bg-white transition-transform ${
              encendido ? "translate-x-5" : ""
            }`}
          />
        </span>
      </button>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight text-ink">
        {t.titulo}
      </h1>
      <p className="mt-2 text-sm text-gray">{t.bajada}</p>

      <div aria-live="polite" className="mt-4">
        {aviso && (
          <div
            role={aviso.tipo === "error" ? "alert" : "status"}
            className={`rounded-2xl px-4 py-3 text-sm ${
              aviso.tipo === "ok"
                ? "bg-mint text-ok"
                : "bg-red-50 font-medium text-red-700"
            }`}
          >
            {aviso.titulo && (
              <p className="font-bold">
                {aviso.tipo === "ok" ? "✓ " : ""}
                {aviso.titulo}
              </p>
            )}
            <p>{aviso.texto}</p>
          </div>
        )}
      </div>

      {carga === "cargando" && (
        <p className="mt-6 text-sm text-mute" role="status">
          {t.cargando}
        </p>
      )}
      {carga === "error" && (
        <div
          role="alert"
          className="mt-6 rounded-2xl bg-red-50 px-5 py-4 text-sm font-medium text-red-700"
        >
          {t.error}
        </div>
      )}

      {carga === "listo" && alertas.length === 0 && (
        <div className="mt-6 rounded-[2rem] bg-cream px-6 py-12 text-center">
          <h2 className="text-lg font-bold text-ink">{t.vacio.titulo}</h2>
          <p className="mt-2 text-sm text-gray">{t.vacio.texto}</p>
          <Link href="/buscar" className={`${BOTON} mt-4`}>
            {t.vacio.boton}
          </Link>
        </div>
      )}

      {carga === "listo" && alertas.length > 0 && (
        <ul className="mt-6 space-y-4">
          {alertas.map((a) => {
            const pausada = a.estado === "pausada";
            const sinConfirmar = a.estado === "sin_confirmar";
            return (
              <li
                key={a.indice}
                className={`space-y-3 rounded-2xl border border-purple-200 bg-white p-5 shadow-soft ${
                  pausada ? "opacity-85" : ""
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-bold text-ink">{a.nombre}</h2>
                    <p className="mt-0.5 text-sm text-mute">{a.resumen}</p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold ${
                      a.estado === "activa"
                        ? "bg-mint text-ok"
                        : "border border-aviso-borde bg-aviso-tint text-aviso"
                    }`}
                  >
                    <span aria-hidden="true">
                      {a.estado === "activa" ? "🔔" : "⏸"}
                    </span>
                    {t.estado[a.estado]}
                  </span>
                </div>

                {sinConfirmar ? (
                  <p className="text-sm text-gray">
                    {rellenar(t.sinConfirmar, { correo: a.correo })}
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-gray">
                      {a.ultimo_resumen
                        ? rellenar(t.ultimo, {
                            nuevos: a.ultimo_resumen.nuevos,
                            bajas: a.ultimo_resumen.bajas,
                          })
                        : t.nunca}
                    </p>
                    {interruptor(
                      t.nuevos,
                      a.avisar_nuevos,
                      () =>
                        void cambiar(
                          a,
                          a.avisar_nuevos ? "nuevos_no" : "nuevos_si",
                        ),
                    )}
                    {interruptor(
                      t.bajas,
                      a.avisar_bajas,
                      () =>
                        void cambiar(
                          a,
                          a.avisar_bajas ? "bajas_no" : "bajas_si",
                        ),
                    )}
                  </>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  {!sinConfirmar && (
                    <Link href={a.buscar} className={BOTON_SEC}>
                      {t.verResultados}
                    </Link>
                  )}
                  {!sinConfirmar && (
                    <button
                      type="button"
                      disabled={ocupado}
                      onClick={() =>
                        void cambiar(a, pausada ? "reanudar" : "pausar")
                      }
                      className={BOTON_SEC}
                    >
                      {pausada ? t.reanudar : t.pausar}
                    </button>
                  )}
                  {borrando === a.indice ? (
                    <button
                      type="button"
                      disabled={ocupado}
                      onClick={() => void cambiar(a, "borrar")}
                      className="rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      {t.borrarConfirma}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setBorrando(a.indice)}
                      className="text-sm font-semibold text-gray underline-offset-4 hover:underline"
                    >
                      {t.borrar}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {carga === "listo" && alertas.length > 0 && (
        <p className="mt-6">
          <Link href="/buscar" className={BOTON}>
            + {t.nueva}
          </Link>
        </p>
      )}
    </div>
  );
}

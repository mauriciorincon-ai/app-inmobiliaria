"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AccionesPosibles } from "@/engine/antifraude/cola";
import {
  RAZONES_DESCARTE,
  UMBRALES,
  type RazonDescarte,
} from "@/engine/antifraude/reglas";
import type { Proyectado } from "@/i18n/textos";
import type { ANTIFRAUDE } from "@/textos/antifraude";

export type TextosColaAcciones = Pick<
  Proyectado<typeof ANTIFRAUDE.cola>,
  "acciones" | "hechos" | "descartar" | "errores"
>;

type Hecho = "pausado" | "reactivado" | "ctlPedido" | "ctlCerrado" | "descartado";

const BOTON =
  "inline-flex items-center justify-center rounded-full bg-purple px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-600 disabled:opacity-60";
const BOTON_SEC =
  "inline-flex items-center justify-center rounded-full border border-purple-200 px-4 py-2 text-sm font-semibold text-purple-600 transition-colors hover:bg-purple-tint disabled:opacity-60";
const BOTON_TXT =
  "inline-flex items-center justify-center rounded-full px-3 py-2 text-sm font-semibold text-mute underline underline-offset-4 hover:text-ink disabled:opacity-60";

// Lo que el operador hace con un anuncio de la cola (S15, maqueta 12): pausar o reactivar, pedir el CTL y descartar con una
// razón de la lista cerrada. Cada acción pasa por la ruta del operador (sesión + allowlist). Nada se le envía al dueño desde
// aquí: el enlace de WhatsApp con el texto ya escrito queda en la tarjeta.
export default function AccionesAntifraude({
  inmuebleId,
  posibles,
  t,
}: {
  inmuebleId: string;
  posibles: AccionesPosibles;
  t: TextosColaAcciones;
}) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const [descartando, setDescartando] = useState(false);
  const [razon, setRazon] = useState<RazonDescarte | null>(null);
  const [nota, setNota] = useState("");
  const [hecho, setHecho] = useState<Hecho | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function llamar(cuerpo: Record<string, unknown>, siSale: Hecho) {
    setOcupado(true);
    setError(null);
    try {
      const res = await fetch("/api/operador/antifraude/accion", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ inmuebleId, ...cuerpo }),
      });
      if (!res.ok) {
        const { error: codigo } = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        const errores = t.errores as Record<string, string>;
        setError(errores[codigo ?? ""] ?? t.errores.servidor);
        return;
      }
      setHecho(siSale);
      setDescartando(false);
      router.refresh();
    } catch {
      setError(t.errores.servidor);
    } finally {
      setOcupado(false);
    }
  }

  function descartar() {
    if (!razon) return setError(t.errores.razon);
    void llamar(
      { cambio: "descartar", razon, nota: nota.trim() || null },
      "descartado",
    );
  }

  return (
    <div className="mt-4" aria-live="polite">
      <div
        role="group"
        aria-label={t.acciones.etiqueta}
        className="flex flex-wrap items-center gap-2"
      >
        {posibles.pausar && (
          <button
            type="button"
            disabled={ocupado}
            onClick={() => void llamar({ cambio: "pausar" }, "pausado")}
            className={BOTON}
          >
            {t.acciones.pausar}
          </button>
        )}
        {posibles.reactivar && (
          <button
            type="button"
            disabled={ocupado}
            onClick={() => void llamar({ cambio: "reactivar" }, "reactivado")}
            className={BOTON_SEC}
          >
            {t.acciones.reactivar}
          </button>
        )}
        {posibles.pedirCtl && (
          <button
            type="button"
            disabled={ocupado}
            onClick={() => void llamar({ cambio: "pedir_ctl" }, "ctlPedido")}
            className={BOTON_SEC}
          >
            {t.acciones.pedirCtl}
          </button>
        )}
        {posibles.cerrarCtl && (
          <button
            type="button"
            disabled={ocupado}
            onClick={() => void llamar({ cambio: "cerrar_ctl" }, "ctlCerrado")}
            className={BOTON_SEC}
          >
            {t.acciones.cerrarCtl}
          </button>
        )}
        {posibles.descartar && (
          <button
            type="button"
            disabled={ocupado}
            aria-expanded={descartando}
            onClick={() => {
              setError(null);
              setDescartando((d) => !d);
            }}
            className={BOTON_TXT}
          >
            {t.acciones.descartar}
          </button>
        )}
        {ocupado && <span className="text-sm text-mute">{t.acciones.trabajando}</span>}
      </div>

      {descartando && (
        <fieldset className="mt-3 rounded-2xl bg-cream p-4">
          <legend className="text-sm font-bold text-ink">{t.descartar.titulo}</legend>
          <div className="mt-2 grid gap-2">
            {RAZONES_DESCARTE.map((r) => (
              <label key={r} className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="radio"
                  name={`razon-${inmuebleId}`}
                  value={r}
                  checked={razon === r}
                  onChange={() => setRazon(r)}
                  className="size-4 accent-purple"
                />
                {t.descartar.razones[r]}
              </label>
            ))}
          </div>
          <label
            htmlFor={`nota-${inmuebleId}`}
            className="mt-3 block text-sm font-semibold text-ink"
          >
            {t.descartar.nota}
          </label>
          <textarea
            id={`nota-${inmuebleId}`}
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            maxLength={UMBRALES.notaMax}
            rows={2}
            className="mt-1 w-full rounded-2xl border border-purple-200 px-3 py-2 text-sm text-ink"
          />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={ocupado}
              onClick={descartar}
              className={BOTON}
            >
              {t.descartar.confirmar}
            </button>
            <button
              type="button"
              onClick={() => setDescartando(false)}
              className={BOTON_TXT}
            >
              {t.descartar.cancelar}
            </button>
          </div>
        </fieldset>
      )}

      {hecho && (
        <p className="mt-3 text-sm text-gray">
          <span aria-hidden="true">✓ </span>
          {t.hechos[hecho]}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-red-700">
          <span aria-hidden="true">✕ </span>
          {error}
        </p>
      )}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Campo from "@/components/ui/Campo";
import { MAX_HORARIOS, validarHorarios } from "@/engine/agenda/horarios";
import {
  etiquetaHora,
  HORAS_PROPUESTAS,
} from "@/engine/agenda/horas-propuestas";
import type { Idioma } from "@/i18n/idiomas";
import { rellenar, type Proyectado } from "@/i18n/textos";
import type { OPERADOR } from "@/textos/operador";

export type TextosAcciones = Proyectado<typeof OPERADOR.salas.acciones>;
export type TextosErroresSala = {
  problemas: Proyectado<typeof OPERADOR.salas.problemas>;
  errores: Proyectado<typeof OPERADOR.salas.errores>;
};

type Abierto = "proponer" | "rechazar" | "cancelar" | null;
type Fila = { fecha: string; hora: string };

const BOTON =
  "inline-flex items-center justify-center rounded-full bg-purple px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-600 disabled:opacity-60";
const BOTON_SEC =
  "inline-flex items-center justify-center rounded-full border border-purple-200 px-5 py-2 text-sm font-semibold text-purple-600 transition-colors hover:bg-purple-tint disabled:opacity-60";

// Lo que el operador hace con una solicitud de sala (S13): proponer de 1 a 3 horarios, rechazarla o cancelar la visita
// confirmada. Cada acción pasa por una ruta del servidor que comprueba la sesión y la allowlist, ejecuta la RPC del operador y
// avisa por correo al comprador. Nada de esto manda un WhatsApp: eso lo hace el operador desde su teléfono.
export default function AccionesSala({
  solicitudId,
  puedeProponer,
  puedeRechazar,
  puedeCancelar,
  tieneHorarios,
  t,
  te,
  lang,
}: {
  solicitudId: string;
  puedeProponer: boolean;
  puedeRechazar: boolean;
  puedeCancelar: boolean;
  tieneHorarios: boolean;
  t: TextosAcciones;
  te: TextosErroresSala;
  lang: Idioma;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState<Abierto>(null);
  const [filas, setFilas] = useState<Fila[]>([{ fecha: "", hora: "" }]);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function llamar(ruta: string, cuerpo: Record<string, unknown>) {
    setOcupado(true);
    setError(null);
    try {
      const res = await fetch(ruta, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ solicitudId, ...cuerpo }),
      });
      if (!res.ok) {
        const { error: codigo } = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        const errores = te.errores as Record<string, string>;
        setError(errores[codigo ?? ""] ?? te.errores.servidor);
        router.refresh();
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError(te.errores.servidor);
      return false;
    } finally {
      setOcupado(false);
    }
  }

  async function proponer() {
    setError(null);
    const validos = validarHorarios(filas, new Date());
    if (!validos.ok) {
      const problemas = te.problemas as Record<string, string>;
      return setError(problemas[validos.problema] ?? te.errores.servidor);
    }
    if (await llamar("/api/operador/salas/proponer", { horarios: filas })) {
      setAbierto(null);
    }
  }

  function actualizarFila(i: number, campo: keyof Fila, valor: string) {
    setFilas((f) => f.map((x, j) => (j === i ? { ...x, [campo]: valor } : x)));
  }

  async function confirmar(accion: "rechazar" | "cancelar") {
    if (await llamar(`/api/operador/salas/${accion}`, {})) setAbierto(null);
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-3">
        {puedeProponer && (
          <button
            type="button"
            className={BOTON}
            onClick={() => setAbierto("proponer")}
          >
            {tieneHorarios ? t.cambiarHorarios : t.proponer}
          </button>
        )}
        {puedeRechazar && (
          <button
            type="button"
            className={BOTON_SEC}
            onClick={() => setAbierto("rechazar")}
          >
            {t.rechazar}
          </button>
        )}
        {puedeCancelar && (
          <button
            type="button"
            className={BOTON_SEC}
            onClick={() => setAbierto("cancelar")}
          >
            {t.cancelar}
          </button>
        )}
      </div>

      {abierto === "proponer" && (
        <form
          onSubmit={(ev) => {
            ev.preventDefault();
            void proponer();
          }}
          noValidate
          className="mt-3 space-y-4 rounded-2xl bg-cream p-4"
        >
          <h4 className="text-sm font-bold text-ink">{t.horarios.titulo}</h4>
          <p className="text-sm text-gray">{t.horarios.texto}</p>
          {filas.map((fila, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_1fr_auto] items-end gap-3"
            >
              <Campo
                id={`sala-fecha-${solicitudId}-${i}`}
                label={`${rellenar(t.horarios.fila, { n: i + 1 })} · ${t.horarios.fecha}`}
                value={fila.fecha}
                onChange={(v) => actualizarFila(i, "fecha", v)}
                type="date"
                autoComplete="off"
              />
              <Campo
                id={`sala-hora-${solicitudId}-${i}`}
                label={`${rellenar(t.horarios.fila, { n: i + 1 })} · ${t.horarios.hora}`}
                value={fila.hora}
                onChange={(v) => actualizarFila(i, "hora", v)}
                control="select"
                placeholder={t.horarios.hora}
                opciones={HORAS_PROPUESTAS.map((h) => ({
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
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={ocupado} className={BOTON}>
              {ocupado ? t.horarios.enviando : t.horarios.enviar}
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

      {(abierto === "rechazar" || abierto === "cancelar") && (
        <div role="group" className="mt-3 rounded-2xl bg-cream p-4">
          <p className="text-sm text-gray">
            {abierto === "rechazar"
              ? t.confirmar.rechazar
              : t.confirmar.cancelar}
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={ocupado}
              onClick={() => void confirmar(abierto)}
              className={BOTON}
            >
              {ocupado ? t.ocupado : t.confirmar.si}
            </button>
            <button
              type="button"
              onClick={() => setAbierto(null)}
              className={BOTON_SEC}
            >
              {t.confirmar.no}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

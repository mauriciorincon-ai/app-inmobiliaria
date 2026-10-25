"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Campo from "@/components/ui/Campo";
import {
  etiquetaHora,
  HORAS_PROPUESTAS,
} from "@/engine/agenda/horas-propuestas";
import {
  horarioDeSesion,
  type AccionesDeSesion,
} from "@/engine/antifraude/sesion";
import type { Idioma } from "@/i18n/idiomas";
import type { Proyectado } from "@/i18n/textos";
import type { OPERADOR } from "@/textos/operador";

export type TextosAccionesSesion = Pick<
  Proyectado<typeof OPERADOR.sesiones>,
  "acciones" | "agendar" | "confirmar" | "hechos" | "problemas" | "errores"
>;

type Abierto = "agendar" | "hecha" | "cancelar" | null;
type Hecho = "agendada" | "hecha" | "cancelada";

const BOTON =
  "inline-flex items-center justify-center rounded-full bg-purple px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-600 disabled:opacity-60";
const BOTON_SEC =
  "inline-flex items-center justify-center rounded-full border border-purple-200 px-4 py-2 text-sm font-semibold text-purple-600 transition-colors hover:bg-purple-tint disabled:opacity-60";

// Lo que el operador hace con una sesión de fotos (S15): agendarla, darla por hecha o cancelarla. Cada acción pasa por la ruta del
// operador (sesión + allowlist). Nada se le envía al dueño desde aquí: el enlace de WhatsApp con el texto ya escrito queda en la
// tarjeta.
export default function AccionesSesion({
  sesionId,
  posibles,
  t,
  lang,
}: {
  sesionId: string;
  posibles: AccionesDeSesion;
  t: TextosAccionesSesion;
  lang: Idioma;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState<Abierto>(null);
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [hecho, setHecho] = useState<Hecho | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function llamar(cuerpo: Record<string, unknown>, siSale: Hecho) {
    setOcupado(true);
    setError(null);
    try {
      const res = await fetch("/api/operador/sesiones/accion", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sesionId, ...cuerpo }),
      });
      if (!res.ok) {
        const { error: codigo, problema } = (await res
          .json()
          .catch(() => ({}))) as { error?: string; problema?: string };
        const errores: Record<string, string> = t.errores;
        const problemas: Record<string, string> = t.problemas;
        setError(
          (codigo === "horario" ? problemas[problema ?? ""] : undefined) ??
            errores[codigo ?? ""] ??
            t.errores.servidor,
        );
        router.refresh();
        return;
      }
      setHecho(siSale);
      setAbierto(null);
      router.refresh();
    } catch {
      setError(t.errores.servidor);
    } finally {
      setOcupado(false);
    }
  }

  function agendar() {
    setError(null);
    const h = horarioDeSesion(fecha, hora, new Date());
    if (!h.ok) {
      const problemas: Record<string, string> = t.problemas;
      setError(problemas[h.problema]);
      return;
    }
    void llamar({ cambio: "agendar", fecha, hora }, "agendada");
  }

  const hechos: Record<Hecho, string> = t.hechos;
  const hayAcciones =
    posibles.agendar || posibles.cambiar || posibles.hecha || posibles.cancelar;
  if (!hayAcciones && !hecho && !error) return null;
  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-3">
        {(posibles.agendar || posibles.cambiar) && (
          <button
            type="button"
            className={BOTON}
            onClick={() => setAbierto("agendar")}
          >
            {posibles.cambiar ? t.acciones.cambiar : t.acciones.agendar}
          </button>
        )}
        {posibles.hecha && (
          <button
            type="button"
            className={BOTON_SEC}
            onClick={() => setAbierto("hecha")}
          >
            {t.acciones.hecha}
          </button>
        )}
        {posibles.cancelar && (
          <button
            type="button"
            className={BOTON_SEC}
            onClick={() => setAbierto("cancelar")}
          >
            {t.acciones.cancelar}
          </button>
        )}
      </div>

      {abierto === "agendar" && (
        <div role="group" className="mt-3 space-y-4 rounded-2xl bg-cream p-4">
          <h4 className="text-sm font-bold text-ink">{t.agendar.titulo}</h4>
          <div className="grid grid-cols-2 gap-3">
            <Campo
              id={`sesion-fecha-${sesionId}`}
              label={t.agendar.fecha}
              value={fecha}
              onChange={setFecha}
              type="date"
              autoComplete="off"
            />
            <Campo
              id={`sesion-hora-${sesionId}`}
              label={t.agendar.hora}
              value={hora}
              onChange={setHora}
              control="select"
              placeholder={t.agendar.hora}
              opciones={HORAS_PROPUESTAS.map((h) => ({
                value: h,
                label: etiquetaHora(h, lang),
              }))}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={ocupado}
              onClick={agendar}
              className={BOTON}
            >
              {ocupado ? t.acciones.ocupado : t.agendar.guardar}
            </button>
            <button
              type="button"
              onClick={() => setAbierto(null)}
              className={BOTON_SEC}
            >
              {t.agendar.cerrar}
            </button>
          </div>
        </div>
      )}

      {(abierto === "hecha" || abierto === "cancelar") && (
        <div role="group" className="mt-3 rounded-2xl bg-cream p-4">
          <p className="text-sm text-gray">
            {abierto === "hecha" ? t.confirmar.hecha : t.confirmar.cancelar}
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={ocupado}
              onClick={() =>
                void llamar(
                  { cambio: abierto },
                  abierto === "hecha" ? "hecha" : "cancelada",
                )
              }
              className={BOTON}
            >
              {ocupado ? t.acciones.ocupado : t.confirmar.si}
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

      {hecho && (
        <p role="status" className="mt-3 text-sm font-semibold text-ok">
          <span aria-hidden="true">✓ </span>
          {hechos[hecho]}
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

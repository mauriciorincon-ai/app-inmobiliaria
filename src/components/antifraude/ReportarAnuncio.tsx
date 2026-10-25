"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  MOTIVOS_REPORTE,
  UMBRALES,
  type MotivoReporte,
} from "@/engine/antifraude/reglas";
import { rellenar, type Proyectado } from "@/i18n/textos";
import type { ANTIFRAUDE } from "@/textos/antifraude";

export type TextosReportar = Proyectado<typeof ANTIFRAUDE.reportar>;
export type TextosMotivos = Proyectado<typeof ANTIFRAUDE.motivos>;
export type TextosProtegete = Proyectado<typeof ANTIFRAUDE.protegete>;

type Fase = "cargando" | "sin-whatsapp" | "form" | "enviando" | "listo";

const BOTON =
  "inline-flex items-center justify-center rounded-full bg-purple px-6 py-3 text-sm font-semibold text-white shadow-card transition-colors hover:bg-purple-600 disabled:opacity-60";

// Reportar un anuncio (S15, maqueta 12). Exige el WhatsApp verificado (la cookie lo dice); el reporte va a la cola del
// operador y NO cambia lo que ve nadie. Motivos de una lista cerrada (uno o varios) y un detalle opcional.
export default function ReportarAnuncio({
  slug,
  t,
  motivos,
  protegete,
}: {
  slug: string;
  t: TextosReportar;
  motivos: TextosMotivos;
  protegete: TextosProtegete;
}) {
  const [fase, setFase] = useState<Fase>("cargando");
  const [elegidos, setElegidos] = useState<MotivoReporte[]>([]);
  const [detalle, setDetalle] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    void (async () => {
      try {
        const res = await fetch("/api/verificacion/estado", {
          cache: "no-store",
        });
        const e = res.ok ? ((await res.json()) as { estado: string }) : null;
        if (vigente) setFase(e?.estado === "verificado" ? "form" : "sin-whatsapp");
      } catch {
        if (vigente) setFase("sin-whatsapp");
      }
    })();
    return () => {
      vigente = false;
    };
  }, []);

  function alternar(m: MotivoReporte) {
    setElegidos((e) => (e.includes(m) ? e.filter((x) => x !== m) : [...e, m]));
  }

  async function enviar(ev: React.FormEvent) {
    ev.preventDefault();
    setError(null);
    if (elegidos.length === 0) return setError(t.errores.motivo);
    if (detalle.trim().length > UMBRALES.detalleMax) {
      return setError(rellenar(t.errores.detalle, { max: UMBRALES.detalleMax }));
    }
    setFase("enviando");
    try {
      const res = await fetch("/api/reportes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug,
          motivos: elegidos,
          detalle: detalle.trim() || null,
        }),
      });
      if (res.ok) return setFase("listo");
      if (res.status === 403) return setFase("sin-whatsapp");
      const { error: codigo } = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      const errores = t.errores as Record<string, string>;
      setError(errores[codigo ?? ""] ?? t.errores.servidor);
      setFase("form");
    } catch {
      setError(t.errores.servidor);
      setFase("form");
    }
  }

  const volverAqui = `/i/${slug}/reportar`;

  return (
    <div className="mt-6" aria-live="polite">
      {fase === "cargando" && <p className="text-sm text-mute">{t.cargando}</p>}

      {fase === "sin-whatsapp" && (
        <section
          aria-labelledby="reportar-whatsapp"
          className="rounded-3xl bg-white p-5 shadow-card"
        >
          <h2 id="reportar-whatsapp" className="text-lg font-bold text-ink">
            {t.primeroWhatsapp.titulo}
          </h2>
          <p className="mt-1 text-sm text-gray">{t.primeroWhatsapp.texto}</p>
          <div className="mt-4">
            <Link
              href={`/verificar?volver=${encodeURIComponent(volverAqui)}`}
              className={BOTON}
            >
              {t.primeroWhatsapp.boton}
            </Link>
          </div>
        </section>
      )}

      {(fase === "form" || fase === "enviando") && (
        <form
          onSubmit={(ev) => void enviar(ev)}
          noValidate
          className="rounded-3xl bg-white p-5 shadow-card"
        >
          <fieldset>
            <legend className="text-lg font-bold text-ink">{t.pregunta}</legend>
            <div className="mt-3 grid gap-2">
              {MOTIVOS_REPORTE.map((m) => (
                <label
                  key={m}
                  className="flex cursor-pointer items-start gap-3 rounded-2xl border border-purple-100 px-4 py-3 text-sm text-ink has-[:checked]:border-purple has-[:checked]:bg-purple-tint"
                >
                  <input
                    type="checkbox"
                    name="motivos"
                    value={m}
                    checked={elegidos.includes(m)}
                    onChange={() => alternar(m)}
                    className="mt-0.5 size-4 accent-purple"
                  />
                  <span>{motivos[m]}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="mt-5 block text-sm font-semibold text-ink" htmlFor="reportar-detalle">
            {t.detalle}
          </label>
          <textarea
            id="reportar-detalle"
            value={detalle}
            onChange={(e) => setDetalle(e.target.value)}
            maxLength={UMBRALES.detalleMax}
            rows={4}
            placeholder={t.ejemplo}
            aria-describedby="reportar-contador"
            className="mt-2 w-full rounded-2xl border border-purple-200 px-4 py-3 text-sm text-ink focus:border-purple focus:outline-none focus:ring-2 focus:ring-purple-200"
          />
          <p id="reportar-contador" className="mt-1 text-xs text-mute">
            {rellenar(t.contador, {
              n: detalle.length,
              max: UMBRALES.detalleMax,
            })}
          </p>

          {error && (
            <p role="alert" className="mt-4 text-sm font-medium text-red-700">
              <span aria-hidden="true">✕ </span>
              {error}
            </p>
          )}

          <div className="mt-5">
            <button type="submit" disabled={fase === "enviando"} className={BOTON}>
              {fase === "enviando" ? t.enviando : t.enviar}
            </button>
          </div>
        </form>
      )}

      {fase === "listo" && (
        <section
          aria-labelledby="reportar-listo"
          className="rounded-3xl bg-white p-5 shadow-card"
        >
          <h2 id="reportar-listo" className="text-xl font-bold text-ink">
            <span aria-hidden="true">✓ </span>
            {t.listo.titulo}
          </h2>
          <p className="mt-2 text-sm text-gray">{t.listo.texto}</p>
        </section>
      )}

      <section aria-labelledby="reportar-protegete" className="mt-8">
        <h2 id="reportar-protegete" className="text-base font-bold text-ink">
          {protegete.titulo}
        </h2>
        <ol className="mt-3 grid gap-2">
          {protegete.pasos.map((p, i) => (
            <li key={p} className="flex items-start gap-3 text-sm text-gray">
              <span
                aria-hidden="true"
                className="grid size-6 shrink-0 place-items-center rounded-full bg-purple-tint text-xs font-bold text-purple-600"
              >
                {i + 1}
              </span>
              <span>{p}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearClienteNavegador } from "@/lib/supabase/client";
import {
  PLANTILLAS,
  agruparPorIdioma,
  asuntoDe,
  cuerpoHtml,
  etiquetaDe,
  type PlantillaId,
} from "@/engine/envios/plantillas";
import type { Idioma } from "@/i18n/idiomas";
import { rellenar, type Proyectado } from "@/i18n/textos";
import type { LoteDestinatario } from "@/lib/supabase/types";
import type { OPERADOR } from "@/textos/operador";

export type TextosLote = Proyectado<typeof OPERADOR.lote>;

type Cuenta = { total: number; es: number; en: number };

// Selector de lote: elige plantilla → previsualiza destinatarios (obtener_lote) → envía por tandas
// (POST /api/envios; Brevo en mock si no hay key). Cada vendedor recibe el correo en el idioma que
// guardó al publicar; la vista previa se muestra en el idioma del panel (`lang`). El log se recarga
// tras enviar. Cliente: recibe SOLO los textos de su idioma por props.
export default function EnviarLote({
  urlApp,
  lang,
  t,
}: {
  urlApp: string;
  lang: Idioma;
  t: TextosLote;
}) {
  const router = useRouter();
  const [plantillaId, setPlantillaId] = useState<PlantillaId>(PLANTILLAS[0].id);
  const [preview, setPreview] = useState<Cuenta | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);

  const plantilla =
    PLANTILLAS.find((p) => p.id === plantillaId) ?? PLANTILLAS[0];

  function cambiar(id: PlantillaId) {
    setPlantillaId(id);
    setPreview(null);
    setResultado(null);
  }

  async function verDestinatarios() {
    const supabase = crearClienteNavegador();
    const { data } = await supabase.rpc("obtener_lote", {
      p_filtro: plantilla.filtroSugerido,
    });
    const lote = (data as LoteDestinatario[] | null) ?? [];
    const grupos = agruparPorIdioma(lote);
    setPreview({
      total: lote.length,
      es: grupos.es.length,
      en: grupos.en.length,
    });
  }

  async function enviar() {
    if (enviando) return;
    setEnviando(true);
    setResultado(null);
    try {
      const res = await fetch("/api/envios", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          plantilla: plantilla.id,
          filtro: plantilla.filtroSugerido,
        }),
      });
      const body = (await res.json().catch(() => null)) as {
        enviados?: number;
        tanda?: number;
        mock?: boolean;
        quedanHoy?: number;
      } | null;
      if (res.ok && body) {
        setResultado(
          rellenar(t.resultado, {
            enviados: body.enviados ?? 0,
            tanda: body.tanda ?? 0,
            quedan: body.quedanHoy ?? 0,
          }) + (body.mock ? t.modoPrueba : ""),
        );
        setPreview(null);
        router.refresh();
      } else {
        setResultado(t.errorEnvio);
      }
    } catch {
      setResultado(t.errorConexion);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section
      aria-labelledby="lote-titulo"
      className="mt-6 rounded-2xl border border-purple-200 p-5"
    >
      <h2 id="lote-titulo" className="text-lg font-bold text-ink">
        {t.titulo}
      </h2>

      <label
        htmlFor="plantilla"
        className="mt-4 block text-sm font-semibold text-ink"
      >
        {t.plantilla}
      </label>
      <select
        id="plantilla"
        value={plantillaId}
        onChange={(e) => cambiar(e.target.value as PlantillaId)}
        className="mt-1 w-full max-w-md rounded-xl border border-purple-200 px-3 py-2 text-sm text-ink focus:border-purple focus:outline-none"
      >
        {PLANTILLAS.map((p) => (
          <option key={p.id} value={p.id}>
            {etiquetaDe(p.id, lang)}
          </option>
        ))}
      </select>
      <p className="mt-1 text-xs text-mute">
        {rellenar(t.ayuda, { filtro: t.filtros[plantilla.filtroSugerido] })}
      </p>

      <div className="mt-4 rounded-xl bg-cream p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-mute">
          {t.vistaPrevia} · {t.vistaPreviaNota}
        </p>
        <p className="mt-1 text-sm font-bold text-ink">
          {asuntoDe(plantilla.id, lang)}
        </p>
        <div
          className="prose-sm mt-2 text-sm text-gray [&_a]:text-purple-600"
          // HTML propio del diccionario; el nombre y la URL entran escapados (cuerpoHtml).
          dangerouslySetInnerHTML={{
            __html: cuerpoHtml(plantilla.id, lang, t.nombreEjemplo, urlApp),
          }}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void verDestinatarios()}
          className="rounded-full bg-purple-tint px-4 py-2 text-sm font-semibold text-purple-600 hover:bg-purple-200"
        >
          {t.verDestinatarios}
        </button>
        {preview !== null && (
          <span className="text-sm font-semibold text-ink">
            {rellenar(
              preview.total === 1 ? t.destinatarioUno : t.destinatariosVarios,
              { n: preview.total, es: preview.es, en: preview.en },
            )}
          </span>
        )}
        <button
          type="button"
          onClick={() => void enviar()}
          disabled={enviando || preview?.total === 0}
          className="rounded-full bg-purple px-5 py-2 text-sm font-semibold text-white hover:bg-purple-600 disabled:opacity-50"
        >
          {enviando ? t.enviando : t.enviar}
        </button>
      </div>
      {resultado && (
        <p role="status" className="mt-3 text-sm font-medium text-purple-600">
          {resultado}
        </p>
      )}
    </section>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearClienteNavegador } from "@/lib/supabase/client";
import { PLANTILLAS, type PlantillaId } from "@/engine/envios/plantillas";
import type { LoteDestinatario } from "@/lib/supabase/types";

const FILTRO_LABEL: Record<string, string> = {
  "sin-fotos": "anuncios sin fotos",
  "sin-sello": "anuncios sin sello ⭐",
  "por-vencer": "anuncios por vencer",
};

// Selector de lote: elige plantilla → previsualiza destinatarios (obtener_lote) → envía por tandas
// (POST /api/envios; Brevo en mock si no hay key). El log se recarga tras enviar.
export default function EnviarLote({ urlApp }: { urlApp: string }) {
  const router = useRouter();
  const [plantillaId, setPlantillaId] = useState<PlantillaId>(PLANTILLAS[0].id);
  const [preview, setPreview] = useState<number | null>(null);
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
    setPreview(((data as LoteDestinatario[] | null) ?? []).length);
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
          `Enviados ${body.enviados}/${body.tanda}${body.mock ? " (modo prueba, sin Brevo)" : ""}. Quedan ${body.quedanHoy} hoy.`,
        );
        setPreview(null);
        router.refresh();
      } else {
        setResultado("No se pudo enviar el lote. Intenta de nuevo.");
      }
    } catch {
      setResultado("Problema de conexión. Intenta de nuevo.");
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
        Enviar un lote
      </h2>

      <label
        htmlFor="plantilla"
        className="mt-4 block text-sm font-semibold text-ink"
      >
        Plantilla
      </label>
      <select
        id="plantilla"
        value={plantillaId}
        onChange={(e) => cambiar(e.target.value as PlantillaId)}
        className="mt-1 w-full max-w-md rounded-xl border border-purple-200 px-3 py-2 text-sm text-ink focus:border-purple focus:outline-none"
      >
        {PLANTILLAS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.etiqueta}
          </option>
        ))}
      </select>
      <p className="mt-1 text-xs text-mute">
        Va a los {FILTRO_LABEL[plantilla.filtroSugerido]} de vendedores con
        correo.
      </p>

      <div className="mt-4 rounded-xl bg-cream p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-mute">
          Vista previa
        </p>
        <p className="mt-1 text-sm font-bold text-ink">{plantilla.asunto}</p>
        <div
          className="prose-sm mt-2 text-sm text-gray [&_a]:text-purple-600"
          // Contenido determinista propio (sin entrada de usuario) → seguro renderizar.
          dangerouslySetInnerHTML={{
            __html: plantilla.cuerpoHtml("Vendedor", urlApp),
          }}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void verDestinatarios()}
          className="rounded-full bg-purple-tint px-4 py-2 text-sm font-semibold text-purple-600 hover:bg-purple-200"
        >
          Ver destinatarios
        </button>
        {preview !== null && (
          <span className="text-sm font-semibold text-ink">
            {preview} {preview === 1 ? "destinatario" : "destinatarios"} con
            correo
          </span>
        )}
        <button
          type="button"
          onClick={() => void enviar()}
          disabled={enviando || preview === 0}
          className="rounded-full bg-purple px-5 py-2 text-sm font-semibold text-white hover:bg-purple-600 disabled:opacity-50"
        >
          {enviando ? "Enviando…" : "Enviar lote"}
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

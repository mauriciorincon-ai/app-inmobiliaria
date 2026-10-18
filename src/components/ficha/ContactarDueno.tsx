"use client";

import { useState } from "react";
import type { Idioma } from "@/i18n/idiomas";
import type { Proyectado } from "@/i18n/textos";
import type { FICHA } from "@/textos/ficha";

export type TextosContacto = Proyectado<typeof FICHA.contacto>;

type Paso = "cerrado" | "pedir" | "listo";

// Contactar al dueño con un toque (S7, ADR 015). SOLO se pinta si el vendedor activó el contacto. Sin
// WhatsApp verificado el botón explica y lleva a verificar; con él, muestra el mensaje que se abrirá y
// «Abrir WhatsApp» registra el contacto y abre `wa.me` del dueño. El número del dueño no viaja en la
// página: llega en la respuesta de `/api/contacto` solo a una sesión verificada.
export default function ContactarDueno({
  slug,
  lang,
  verificado,
  mensaje,
  t,
}: {
  slug: string;
  lang: Idioma;
  verificado: boolean;
  /** El mensaje que se precarga, ya redactado en el idioma de quien visita. */
  mensaje: string;
  t: TextosContacto;
}) {
  const [paso, setPaso] = useState<Paso>("cerrado");
  const [abriendo, setAbriendo] = useState(false);
  const [enlace, setEnlace] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function empezar() {
    setError(null);
    setPaso(verificado ? "listo" : "pedir");
  }

  async function abrirWhatsapp() {
    setAbriendo(true);
    setError(null);
    try {
      const res = await fetch("/api/contacto", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, idioma: lang }),
      });
      if (res.status === 403) {
        // La sesión caducó o se borró la cookie: hay que verificar de nuevo.
        setPaso("pedir");
        return;
      }
      if (res.status === 404) {
        setError(t.listo.noDisponible);
        return;
      }
      if (!res.ok) {
        setError(t.listo.error);
        return;
      }
      const { href } = (await res.json()) as { href: string };
      const ventana = window.open(href, "_blank");
      if (ventana) ventana.opener = null;
      // Si el navegador bloqueó la ventana, se ofrece el enlace en pantalla.
      setEnlace(ventana ? null : href);
    } catch {
      setError(t.listo.error);
    } finally {
      setAbriendo(false);
    }
  }

  const volver = encodeURIComponent(`/i/${slug}`);

  return (
    <div className="mt-2">
      {paso === "cerrado" && (
        <button
          type="button"
          onClick={empezar}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-purple px-7 py-3.5 text-base font-semibold text-white shadow-card transition-transform hover:bg-purple-600 hover:scale-[1.03]"
        >
          {t.boton}
        </button>
      )}

      {paso === "pedir" && (
        <section
          aria-labelledby="contactar-pedir"
          className="rounded-3xl bg-white p-5 shadow-card"
        >
          <h3 id="contactar-pedir" className="text-base font-bold text-ink">
            {t.pedir.titulo}
          </h3>
          <p className="mt-1 text-sm text-gray">{t.pedir.texto}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <a
              href={`/verificar?volver=${volver}`}
              className="inline-flex items-center justify-center rounded-full bg-purple px-6 py-3 text-sm font-semibold text-white shadow-card transition-transform hover:bg-purple-600 hover:scale-[1.03]"
            >
              {t.pedir.verificar}
            </a>
            <button
              type="button"
              onClick={() => setPaso("cerrado")}
              className="text-sm font-semibold text-gray underline-offset-4 hover:underline"
            >
              {t.pedir.ahoraNo}
            </button>
          </div>
        </section>
      )}

      {paso === "listo" && (
        <section
          aria-labelledby="contactar-listo"
          className="rounded-3xl bg-white p-5 shadow-card"
        >
          <h3 id="contactar-listo" className="text-base font-bold text-ink">
            {t.listo.titulo}
          </h3>
          <blockquote className="mt-2 rounded-2xl bg-cream px-4 py-3 text-sm text-ink">
            {mensaje}
          </blockquote>
          <p className="mt-2 text-xs text-mute">{t.listo.registro}</p>
          {error && (
            <p role="alert" className="mt-2 text-sm font-medium text-red-600">
              {error}
            </p>
          )}
          {enlace && (
            <p className="mt-2 text-sm">
              <a
                href={enlace}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-purple-600 underline"
              >
                {t.listo.sinPopup}
              </a>
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void abrirWhatsapp()}
              disabled={abriendo}
              className="inline-flex items-center justify-center rounded-full bg-purple px-6 py-3 text-sm font-semibold text-white shadow-card transition-transform hover:bg-purple-600 hover:scale-[1.03] disabled:opacity-60"
            >
              {abriendo ? t.listo.abriendo : t.listo.abrir}
            </button>
            <button
              type="button"
              onClick={() => setPaso("cerrado")}
              className="text-sm font-semibold text-gray underline-offset-4 hover:underline"
            >
              {t.listo.cerrar}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

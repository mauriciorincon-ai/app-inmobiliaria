"use client";

import { useCallback, useEffect, useState } from "react";
import { extraerTokenDeHash } from "@/engine/token/token";
import { calcularScore, DESCRIPCION_MIN } from "@/engine/score/score";
import { crearClienteNavegador } from "@/lib/supabase/client";
import type { MiAnuncioData } from "@/lib/supabase/types";
import ScoreCompletitud from "@/components/mi-anuncio/ScoreCompletitud";
import SubidorFotos from "@/components/mi-anuncio/SubidorFotos";
import GaleriaEditable from "@/components/mi-anuncio/GaleriaEditable";
import EditorDescripcion from "@/components/mi-anuncio/EditorDescripcion";
import EditorPrecio from "@/components/mi-anuncio/EditorPrecio";
import OptInContacto from "@/components/mi-anuncio/OptInContacto";
import SolicitudesVisita, {
  type ContextoSolicitudes,
} from "@/components/mi-anuncio/SolicitudesVisita";
import RenovarVigencia, {
  type TextosTarjeta,
} from "@/components/vigencia/RenovarVigencia";
import InvitaReferido, {
  type TextosReferido,
} from "@/components/referido/InvitaReferido";
import SelloNivel, { type TextosSello } from "@/components/ficha/SelloNivel";
import { formatearFecha } from "@/engine/format/fecha";
import { estadoSello } from "@/engine/sello/sello";
import { mascararTelefono } from "@/engine/verificacion/mascara";
import PaqueteFundador, {
  type TextosPaquete,
} from "@/components/paquete/PaqueteFundador";
import type { Idioma } from "@/i18n/idiomas";
import { rellenar, type Proyectado } from "@/i18n/textos";
import type { MI_ANUNCIO } from "@/textos/mi-anuncio";

export type TextosMiAnuncio = Proyectado<typeof MI_ANUNCIO>;

// Prefijo del enlace privado que se muestra de ejemplo; es parte de la URL, no se traduce.
const PREFIJO_ENLACE = "mi-anuncio#t=";

type Estado = "cargando" | "sin-token" | "no-encontrado" | "listo" | "error";

// Cliente: recibe SOLO los textos de su idioma por props (y los de los bloques que contiene).
export default function MiAnuncio({
  lang,
  t,
  tSello,
  vigencia,
  referido,
  paquete,
  solicitudes,
}: {
  lang: Idioma;
  t: TextosMiAnuncio;
  tSello: TextosSello;
  vigencia: TextosTarjeta;
  referido: TextosReferido;
  paquete: TextosPaquete;
  solicitudes: ContextoSolicitudes;
}) {
  const [estado, setEstado] = useState<Estado>("cargando");
  const [anuncio, setAnuncio] = useState<MiAnuncioData | null>(null);
  // Largo de la descripción tal como se está escribiendo (para el score en vivo, sin guardar aún).
  const [descripcionLen, setDescripcionLen] = useState(0);
  const [token, setToken] = useState<string | null>(null);

  // Consulta el anuncio y actualiza el estado. Recibe el token explícito para servir tanto a la
  // carga inicial como a las recargas de los hijos (todos los setState quedan tras el await → no
  // son síncronos dentro de un efecto).
  const cargar = useCallback(async (tok: string) => {
    const supabase = crearClienteNavegador();
    const { data, error } = await supabase.rpc("obtener_mi_anuncio", {
      p_token: tok,
    });
    if (error) {
      setEstado("error");
      return;
    }
    if (!data) {
      setEstado("no-encontrado");
      return;
    }
    setAnuncio(data);
    setDescripcionLen((data.descripcion ?? "").length);
    setEstado("listo");
  }, []);

  const recargar = useCallback(async () => {
    if (token) await cargar(token);
  }, [token, cargar]);

  // Extrae el token del fragment (solo cliente) una vez al montar y carga el anuncio. El fragment
  // no existe en SSR, así que resolverlo tras montar es lo correcto.
  useEffect(() => {
    const t = extraerTokenDeHash(
      typeof window !== "undefined" ? window.location.hash : "",
    );
    if (!t) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEstado("sin-token");
      return;
    }
    setToken(t);
    void cargar(t);
  }, [cargar]);

  if (estado === "cargando") {
    return (
      <p className="mt-10 text-sm text-mute" role="status">
        {t.estados.cargando}
      </p>
    );
  }

  if (estado === "sin-token" || estado === "no-encontrado") {
    return (
      <div className="mt-10 rounded-[2rem] bg-cream px-6 py-12 text-center">
        <p className="text-lg font-bold text-ink">
          {t.estados.sinEnlace.titulo}
        </p>
        <p className="mt-2 text-sm text-gray">
          {t.estados.sinEnlace.antes}
          <span className="font-medium">{PREFIJO_ENLACE}</span>
          {t.estados.sinEnlace.despues}
        </p>
      </div>
    );
  }

  if (estado === "error" || !anuncio || !token) {
    return (
      <div
        role="alert"
        className="mt-10 rounded-2xl bg-red-50 px-5 py-4 text-sm font-medium text-red-700"
      >
        {t.estados.error}
      </div>
    );
  }

  const tienePortada = anuncio.fotos.some((f) => f.es_portada);
  const score = calcularScore({
    fotos: anuncio.fotos.length,
    tienePortada,
    descripcionLen,
    contactoPublico: anuncio.contacto_publico,
  });

  return (
    <div className="mt-8 space-y-10">
      <ScoreCompletitud
        t={t.score}
        score={score}
        fotos={anuncio.fotos.length}
        tienePortada={tienePortada}
        descripcionLen={descripcionLen}
        contactoPublico={anuncio.contacto_publico}
      />

      <section aria-labelledby="fotos-titulo">
        <h2 id="fotos-titulo" className="text-xl font-bold text-ink">
          {t.secciones.fotos}
        </h2>
        <GaleriaEditable
          t={t.galeria}
          fotos={anuncio.fotos}
          token={token}
          onCambio={recargar}
        />
        <SubidorFotos
          t={t.subidor}
          token={token}
          cantidadActual={anuncio.fotos.length}
          onSubida={recargar}
        />
      </section>

      <section aria-labelledby="desc-titulo">
        <h2 id="desc-titulo" className="text-xl font-bold text-ink">
          {t.secciones.descripcion}
        </h2>
        <EditorDescripcion
          t={t.editor}
          token={token}
          valorInicial={anuncio.descripcion ?? ""}
          minimo={DESCRIPCION_MIN}
          onEscribir={setDescripcionLen}
          onGuardado={recargar}
        />
      </section>

      <section aria-labelledby="precio-titulo">
        <h2 id="precio-titulo" className="text-xl font-bold text-ink">
          {t.secciones.precio}
        </h2>
        <EditorPrecio
          t={t.precio}
          lang={lang}
          token={token}
          valorInicial={anuncio.precio_esperado}
          onGuardado={recargar}
        />
      </section>

      <section aria-labelledby="contacto-titulo">
        <h2 id="contacto-titulo" className="text-xl font-bold text-ink">
          {t.secciones.contacto}
        </h2>
        <OptInContacto
          t={t.contacto}
          token={token}
          activo={anuncio.contacto_publico}
          onCambio={recargar}
        />
      </section>

      <section aria-labelledby="solicitudes-titulo">
        <h2 id="solicitudes-titulo" className="text-xl font-bold text-ink">
          {solicitudes.t.titulo}
        </h2>
        <SolicitudesVisita
          lang={lang}
          ctx={solicitudes}
          token={token}
          tipo={anuncio.tipo}
          barrio={anuncio.barrio}
          contactoAbierto={anuncio.contacto_publico}
          soloIdentificados={anuncio.solo_identificados}
          solicitudes={anuncio.solicitudes ?? []}
          onCambio={recargar}
        />
      </section>

      <section aria-labelledby="contactos-titulo">
        <h2 id="contactos-titulo" className="text-xl font-bold text-ink">
          {t.contactos.titulo}
        </h2>
        {(anuncio.contactos ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-gray">{t.contactos.vacio}</p>
        ) : (
          <ul className="mt-3 divide-y divide-purple-100 rounded-2xl bg-white shadow-card">
            {(anuncio.contactos ?? []).map((c) => (
              <li
                key={`${c.nombre}-${c.telefono_fin}-${c.fecha}`}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm"
              >
                <span className="font-semibold text-ink">{c.nombre}</span>
                <span className="text-gray">
                  {mascararTelefono(c.telefono_fin)}
                </span>
                <span className="text-mute">
                  {formatearFecha(c.fecha, lang)}
                </span>
                <span className="text-ok">✓ {t.contactos.verificado}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="sello-titulo">
        <h2 id="sello-titulo" className="text-xl font-bold text-ink">
          {t.secciones.sello}
        </h2>
        <div className="mt-3 flex flex-col items-start gap-2">
          <SelloNivel
            nivel={anuncio.nivel_verificacion}
            ctlExpedidoEl={anuncio.ctl_expedido_el}
            lang={lang}
            t={tSello}
          />
          <p className="text-sm text-gray">
            {estadoSello(
              anuncio.nivel_verificacion,
              anuncio.ctl_expedido_el,
            ) === "verificado" && anuncio.ctl_expedido_el
              ? rellenar(t.sello.verificado, {
                  fecha: formatearFecha(anuncio.ctl_expedido_el, lang),
                })
              : estadoSello(
                    anuncio.nivel_verificacion,
                    anuncio.ctl_expedido_el,
                  ) === "reverificacion_pendiente"
                ? t.sello.pendiente
                : t.sello.fundador}
          </p>
        </div>
      </section>

      <RenovarVigencia
        lang={lang}
        t={vigencia}
        token={token}
        vigenteHastaInicial={anuncio.vigente_hasta}
      />

      <InvitaReferido token={token} lang={lang} t={referido} />

      <PaqueteFundador t={paquete} lang={lang} compacto />
    </div>
  );
}

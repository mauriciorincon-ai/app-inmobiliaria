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
import OptInContacto from "@/components/mi-anuncio/OptInContacto";

type Estado = "cargando" | "sin-token" | "no-encontrado" | "listo" | "error";

export default function MiAnuncio() {
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
        Cargando tu anuncio…
      </p>
    );
  }

  if (estado === "sin-token" || estado === "no-encontrado") {
    return (
      <div className="mt-10 rounded-[2rem] bg-cream px-6 py-12 text-center">
        <p className="text-lg font-bold text-ink">Necesitas tu enlace</p>
        <p className="mt-2 text-sm text-gray">
          Este anuncio se abre con el enlace privado que te dimos al publicar
          (empieza por <span className="font-medium">mi-anuncio#t=</span>).
          Búscalo en la pantalla de confirmación o pídelo de nuevo.
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
        No pudimos cargar tu anuncio. Recarga la página o inténtalo en un
        momento.
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
        score={score}
        fotos={anuncio.fotos.length}
        tienePortada={tienePortada}
        descripcionLen={descripcionLen}
        contactoPublico={anuncio.contacto_publico}
      />

      <section aria-labelledby="fotos-titulo">
        <h2 id="fotos-titulo" className="text-xl font-bold text-ink">
          Fotos
        </h2>
        <GaleriaEditable
          fotos={anuncio.fotos}
          token={token}
          onCambio={recargar}
        />
        <SubidorFotos
          token={token}
          cantidadActual={anuncio.fotos.length}
          onSubida={recargar}
        />
      </section>

      <section aria-labelledby="desc-titulo">
        <h2 id="desc-titulo" className="text-xl font-bold text-ink">
          Descripción
        </h2>
        <EditorDescripcion
          token={token}
          valorInicial={anuncio.descripcion ?? ""}
          minimo={DESCRIPCION_MIN}
          onEscribir={setDescripcionLen}
          onGuardado={recargar}
        />
      </section>

      <section aria-labelledby="contacto-titulo">
        <h2 id="contacto-titulo" className="text-xl font-bold text-ink">
          Contacto
        </h2>
        <OptInContacto
          token={token}
          activo={anuncio.contacto_publico}
          onCambio={recargar}
        />
      </section>
    </div>
  );
}

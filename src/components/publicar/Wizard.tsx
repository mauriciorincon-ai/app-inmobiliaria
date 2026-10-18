"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ZodType } from "zod";
import Boton from "@/components/ui/Boton";
import Progreso from "@/components/publicar/Progreso";
import Paso1Contacto, {
  type Errores,
} from "@/components/publicar/Paso1Contacto";
import Paso2Inmueble, {
  type Dominio,
} from "@/components/publicar/Paso2Inmueble";
import Paso3Revision from "@/components/publicar/Paso3Revision";
import type { Idioma } from "@/i18n/idiomas";
import type { Proyectado } from "@/i18n/textos";
import type { PUBLICAR } from "@/textos/publicar";
import {
  paso1Schema,
  paso2Schema,
  paso3Schema,
} from "@/engine/registro/schema";
import { CAMPO_HONEYPOT } from "@/engine/registro/anti-spam";
import { textoDeError } from "@/engine/registro/errores";
import { CLAVE_LINK, construirLinkAnuncio } from "@/engine/token/token";
import { extraerRefDeBusqueda } from "@/engine/referidos/referidos";
import { capturar } from "@/lib/posthog";
import {
  CLAVE_DRAFT,
  ESTADO_INICIAL,
  cargarDraft,
  esUltimoPaso,
  pasoAnterior,
  serializarDraft,
  siguientePaso,
  type EstadoFormulario,
  type Paso,
} from "@/engine/registro/wizard";

// Solo lo que el wizard pinta: el resto del diccionario (metadatos, confirmación) no viaja al cliente.
export type TextosWizard = Pick<
  Proyectado<typeof PUBLICAR>,
  | "progreso"
  | "paso1"
  | "paso2"
  | "paso3"
  | "botones"
  | "honeypot"
  | "envio"
  | "errores"
>;

// Valida y devuelve, por campo, la frase del idioma activo (el esquema solo da códigos).
function erroresDe(
  schema: ZodType,
  valores: unknown,
  t: TextosWizard,
): Errores {
  const r = schema.safeParse(valores);
  if (r.success) return {};
  const e: Errores = {};
  for (const issue of r.error.issues) {
    const key = String(issue.path[0]);
    if (!(key in e)) {
      e[key] = textoDeError(issue.message, t.errores, t.envio.generico);
    }
  }
  return e;
}

// Wizard "publicar = registro" (3 pasos). Persiste el borrador en localStorage tras cada cambio
// (retomar si se cae); valida por paso con mensajes por campo; envía una sola vez al endpoint.
// Cliente: recibe SOLO los textos de su idioma por props.
export default function Wizard({
  lang,
  t,
  dominio,
}: {
  lang: Idioma;
  t: TextosWizard;
  dominio: Dominio;
}) {
  const router = useRouter();
  const [paso, setPaso] = useState<Paso>(1);
  const [datos, setDatos] = useState<EstadoFormulario>(ESTADO_INICIAL);
  const [errores, setErrores] = useState<Errores>({});
  const [consentimiento, setConsentimiento] = useState(false);
  const [errorConsent, setErrorConsent] = useState<string | undefined>();
  const [errorEmail, setErrorEmail] = useState<string | undefined>();
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  const inicioMs = useRef<number>(0);
  const honeypot = useRef<string>("");
  // Código de referido de la URL (?ref=…). Se captura al montar y viaja en el envío.
  const refCodigo = useRef<string | null>(null);

  // Restaura el borrador, marca el inicio (time-trap) y captura el ?ref= de la URL.
  useEffect(() => {
    inicioMs.current = Date.now();
    refCodigo.current = extraerRefDeBusqueda(window.location.search);
    try {
      const restaurado = cargarDraft(localStorage.getItem(CLAVE_DRAFT));
      // Restaurar tras montar es lo correcto: leer localStorage en el render inicial rompería la
      // hidratación (el servidor no lo tiene). Es un setState único, no un bucle de renders.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (restaurado) setDatos(restaurado);
    } catch {
      // localStorage inaccesible (modo privado): seguimos sin borrador.
    }
  }, []);

  function set(campo: keyof EstadoFormulario, valor: string) {
    setDatos((prev) => {
      const siguiente = { ...prev, [campo]: valor };
      try {
        localStorage.setItem(CLAVE_DRAFT, serializarDraft(siguiente));
      } catch {
        // Sin persistencia: el flujo sigue funcionando en memoria.
      }
      return siguiente;
    });
    setErrores((prev) =>
      prev[campo] ? { ...prev, [campo]: undefined } : prev,
    );
  }

  function avanzar() {
    const schema = paso === 1 ? paso1Schema : paso2Schema;
    const e = erroresDe(schema, datos, t);
    if (Object.keys(e).length > 0) {
      setErrores(e);
      return;
    }
    setErrores({});
    if (paso === 1) capturar("publicar_paso1");
    setPaso((p) => siguientePaso(p));
  }

  function retroceder() {
    setErrores({});
    setPaso((p) => pasoAnterior(p));
  }

  async function enviar() {
    const e = erroresDe(paso3Schema, { consentimiento, email: datos.email }, t);
    setErrorConsent(e.consentimiento);
    setErrorEmail(e.email);
    if (e.consentimiento || e.email) {
      return;
    }
    setEnviando(true);
    setErrorEnvio(null);
    try {
      const res = await fetch("/api/registro", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...datos,
          consentimiento,
          ref: refCodigo.current,
          // Idioma activo: queda guardado en el vendedor y fija el idioma de sus avisos (S5).
          idioma: lang,
          _inicio: inicioMs.current,
          [CAMPO_HONEYPOT]: honeypot.current,
        }),
      });
      if (!res.ok) {
        if (res.status === 429) {
          setErrorEnvio(t.envio.demasiados);
        } else {
          setErrorEnvio(t.envio.generico);
        }
        return;
      }
      // La respuesta trae el token del magic link (en claro, una sola vez). Guardamos el link en
      // sessionStorage (efímero, muere con la pestaña) para que /confirmacion lo muestre.
      const cuerpo = (await res.json().catch(() => null)) as {
        token?: string;
      } | null;
      if (cuerpo?.token) {
        try {
          sessionStorage.setItem(
            CLAVE_LINK,
            construirLinkAnuncio(window.location.origin, cuerpo.token),
          );
        } catch {
          // sin sessionStorage: la confirmación mostrará el contenido genérico
        }
      }
      try {
        localStorage.removeItem(CLAVE_DRAFT);
      } catch {
        // sin persistencia: nada que limpiar
      }
      // Funnel (sin PII): zona/tipo/operación, jamás datos personales.
      capturar("registro_publicado", {
        zona: datos.localidad,
        tipo: datos.tipo,
        operacion: datos.operacion,
      });
      router.push("/confirmacion");
    } catch {
      setErrorEnvio(t.envio.conexion);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-10 lg:py-14">
      <Progreso paso={paso} t={t.progreso} />

      <div className="mt-8">
        {paso === 1 && (
          <Paso1Contacto
            t={t.paso1}
            datos={datos}
            errores={errores}
            set={set}
          />
        )}
        {paso === 2 && (
          <Paso2Inmueble
            t={t.paso2}
            dominio={dominio}
            datos={datos}
            errores={errores}
            set={set}
          />
        )}
        {paso === 3 && (
          <Paso3Revision
            t={t.paso3}
            dominio={dominio}
            lang={lang}
            datos={datos}
            set={set}
            consentimiento={consentimiento}
            onConsentimiento={(v) => {
              setConsentimiento(v);
              if (v) setErrorConsent(undefined);
            }}
            errorConsentimiento={errorConsent}
            errorEmail={errorEmail}
          />
        )}
      </div>

      {/* Honeypot: invisible para humanos; si llega con texto, el servidor descarta el envío. */}
      <div
        aria-hidden="true"
        className="absolute left-[-9999px] h-0 w-0 overflow-hidden"
      >
        <label htmlFor={CAMPO_HONEYPOT}>{t.honeypot}</label>
        <input
          id={CAMPO_HONEYPOT}
          name={CAMPO_HONEYPOT}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          onChange={(e) => {
            honeypot.current = e.target.value;
          }}
        />
      </div>

      {errorEnvio && (
        <p
          role="alert"
          className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          {errorEnvio}
        </p>
      )}

      <div className="mt-8 flex items-center justify-between gap-4">
        {paso > 1 ? (
          <Boton variante="texto" onClick={retroceder} type="button">
            {t.botones.atras}
          </Boton>
        ) : (
          <span />
        )}

        {esUltimoPaso(paso) ? (
          <Boton onClick={enviar} type="button" disabled={enviando}>
            {enviando ? t.botones.publicando : t.botones.publicar}
          </Boton>
        ) : (
          <Boton onClick={avanzar} type="button">
            {t.botones.continuar}
          </Boton>
        )}
      </div>
    </div>
  );
}

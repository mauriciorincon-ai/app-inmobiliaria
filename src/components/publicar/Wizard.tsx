"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ZodType } from "zod";
import Boton from "@/components/ui/Boton";
import Progreso from "@/components/publicar/Progreso";
import Paso1Contacto, {
  type Errores,
} from "@/components/publicar/Paso1Contacto";
import Paso2Inmueble from "@/components/publicar/Paso2Inmueble";
import Paso3Revision from "@/components/publicar/Paso3Revision";
import {
  paso1Schema,
  paso2Schema,
  paso3Schema,
} from "@/engine/registro/schema";
import { CAMPO_HONEYPOT } from "@/engine/registro/anti-spam";
import { CLAVE_LINK, construirLinkAnuncio } from "@/engine/token/token";
import { extraerRefDeBusqueda } from "@/engine/referidos/referidos";
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

function erroresDe(schema: ZodType, valores: unknown): Errores {
  const r = schema.safeParse(valores);
  if (r.success) return {};
  const e: Errores = {};
  for (const issue of r.error.issues) {
    const key = String(issue.path[0]);
    if (!(key in e)) e[key] = issue.message;
  }
  return e;
}

// Wizard "publicar = registro" (3 pasos). Persiste el borrador en localStorage tras cada cambio
// (retomar si se cae); valida por paso con mensajes por campo; envía una sola vez al endpoint.
export default function Wizard() {
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
    const e = erroresDe(schema, datos);
    if (Object.keys(e).length > 0) {
      setErrores(e);
      return;
    }
    setErrores({});
    setPaso((p) => siguientePaso(p));
  }

  function retroceder() {
    setErrores({});
    setPaso((p) => pasoAnterior(p));
  }

  async function enviar() {
    const e = erroresDe(paso3Schema, { consentimiento, email: datos.email });
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
          _inicio: inicioMs.current,
          [CAMPO_HONEYPOT]: honeypot.current,
        }),
      });
      if (!res.ok) {
        if (res.status === 429) {
          setErrorEnvio(
            "Recibimos demasiados intentos desde tu conexión. Intenta de nuevo más tarde.",
          );
        } else {
          setErrorEnvio(
            "No pudimos registrar tu inmueble. Revisa los datos e intenta de nuevo.",
          );
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
      router.push("/confirmacion");
    } catch {
      setErrorEnvio(
        "Hubo un problema de conexión. Revisa tu internet e inténtalo otra vez.",
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-10 lg:py-14">
      <Progreso paso={paso} />

      <div className="mt-8">
        {paso === 1 && (
          <Paso1Contacto datos={datos} errores={errores} set={set} />
        )}
        {paso === 2 && (
          <Paso2Inmueble datos={datos} errores={errores} set={set} />
        )}
        {paso === 3 && (
          <Paso3Revision
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
        <label htmlFor={CAMPO_HONEYPOT}>No llenar</label>
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
            ← Atrás
          </Boton>
        ) : (
          <span />
        )}

        {esUltimoPaso(paso) ? (
          <Boton onClick={enviar} type="button" disabled={enviando}>
            {enviando ? "Publicando…" : "Publicar mi inmueble"}
          </Boton>
        ) : (
          <Boton onClick={avanzar} type="button">
            Continuar
          </Boton>
        )}
      </div>
    </div>
  );
}

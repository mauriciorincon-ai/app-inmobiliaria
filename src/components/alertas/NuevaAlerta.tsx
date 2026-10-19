"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Campo from "@/components/ui/Campo";
import {
  agregarTokenAlerta,
  CLAVE_ALERTAS,
  leerTokensAlertas,
  serializarTokensAlertas,
} from "@/engine/alertas/tokens";
import { CAMPO_HONEYPOT } from "@/engine/registro/anti-spam";
import type { Idioma } from "@/i18n/idiomas";
import { rellenar, type Proyectado } from "@/i18n/textos";
import { enviarJson } from "@/lib/api-cliente";
import { escribirLocal, leerLocal } from "@/lib/almacen-local";
import type { ALERTAS } from "@/textos/alertas";

export type TextosNueva = Proyectado<typeof ALERTAS.nueva>;

type Errores = {
  nombre?: string;
  correo?: string;
  avisos?: string;
  consentimiento?: string;
};

// Un correo con forma de correo; la base lo vuelve a validar. Solo evita el viaje por un error de tipeo.
const FORMA_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Crear una alerta (S9, maqueta 08, ADR 017). La búsqueda viaja en la URL de esta página (los mismos filtros de
// `/buscar`). No pide cuenta, pero NADA se avisa hasta que se confirma el correo: el servidor manda un correo
// con «Confirmar» y, al navegador, solo vuelve el token para gestionarla desde este teléfono.
export default function NuevaAlerta({
  lang,
  t,
  consulta,
  resumen,
  nombreInicial,
}: {
  lang: Idioma;
  t: TextosNueva;
  consulta: string;
  resumen: string;
  nombreInicial: string;
}) {
  const [nombre, setNombre] = useState(nombreInicial);
  const [correo, setCorreo] = useState("");
  const [nuevos, setNuevos] = useState(true);
  const [bajas, setBajas] = useState(true);
  const [acepto, setAcepto] = useState(false);
  const [errores, setErrores] = useState<Errores>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviadaA, setEnviadaA] = useState<string | null>(null);
  const honeypot = useRef("");
  const inicioMs = useRef(0);

  // El momento en que se abrió el formulario, para el anti-spam del tiempo mínimo.
  useEffect(() => {
    inicioMs.current = Date.now();
  }, []);

  function validar(): Errores {
    const e: Errores = {};
    if (nombre.trim().length === 0) e.nombre = t.errores.nombre;
    if (!FORMA_CORREO.test(correo.trim())) e.correo = t.errores.correo;
    if (!nuevos && !bajas) e.avisos = t.errores.avisos;
    if (!acepto) e.consentimiento = t.errores.consentimiento;
    return e;
  }

  async function enviar(ev: React.FormEvent) {
    ev.preventDefault();
    const e = validar();
    setErrores(e);
    setErrorGeneral(null);
    if (Object.keys(e).length > 0) return;
    setEnviando(true);
    const r = await enviarJson<{ ok: boolean; gestionar?: string }>(
      "/api/alertas",
      {
        consulta,
        nombre: nombre.trim(),
        email: correo.trim(),
        nuevos,
        bajas,
        consentimiento: true,
        idioma: lang,
        _inicio: inicioMs.current,
        [CAMPO_HONEYPOT]: honeypot.current,
      },
    );
    setEnviando(false);
    if (!r.ok) {
      const errores = t.errores as Record<string, string>;
      return setErrorGeneral(errores[r.codigo] ?? t.errores.servidor);
    }
    // Este teléfono guarda el token para «Mis alertas»; el de confirmar solo llegó por correo.
    if (r.datos.gestionar) {
      escribirLocal(
        CLAVE_ALERTAS,
        serializarTokensAlertas(
          agregarTokenAlerta(
            leerTokensAlertas(leerLocal(CLAVE_ALERTAS)),
            r.datos.gestionar,
          ),
        ),
      );
    }
    setEnviadaA(correo.trim());
  }

  if (enviadaA !== null) {
    return (
      <section
        aria-labelledby="enviada-titulo"
        className="rounded-3xl bg-white p-6 shadow-card"
      >
        <h1 id="enviada-titulo" className="text-2xl font-bold text-ink">
          ✓ {t.enviada.titulo}
        </h1>
        <p className="mt-2 text-sm text-gray">
          {rellenar(t.enviada.texto, { correo: enviadaA })}
        </p>
        <p className="mt-1 text-sm text-mute">{t.enviada.spam}</p>
        <Link
          href="/alertas"
          className="mt-5 inline-flex items-center justify-center rounded-full bg-purple px-6 py-3 text-sm font-semibold text-white shadow-card transition-transform hover:bg-purple-600"
        >
          {t.enviada.verAlertas}
        </Link>
      </section>
    );
  }

  return (
    <form onSubmit={(ev) => void enviar(ev)} noValidate className="space-y-5">
      <h1 className="text-3xl font-extrabold tracking-tight text-ink">
        {t.titulo}
      </h1>
      <p className="rounded-2xl bg-purple-tint px-4 py-3 text-sm text-ink">
        <strong>{t.tuBusqueda}</strong> {resumen}
      </p>

      <Campo
        id="alerta-nombre"
        label={t.nombre}
        value={nombre}
        onChange={setNombre}
        error={errores.nombre}
        requerido
      />

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-ink">
          {t.queAvisamos}
        </legend>
        <label className="flex items-center gap-3 text-sm text-gray">
          <input
            type="checkbox"
            checked={nuevos}
            onChange={(e) => setNuevos(e.target.checked)}
            className="h-5 w-5 rounded border-purple-200 accent-purple"
          />
          {t.nuevos}
        </label>
        <label className="flex items-center gap-3 text-sm text-gray">
          <input
            type="checkbox"
            checked={bajas}
            onChange={(e) => setBajas(e.target.checked)}
            className="h-5 w-5 rounded border-purple-200 accent-purple"
          />
          {t.bajas}
        </label>
        {errores.avisos && (
          <p role="alert" className="text-sm font-medium text-red-600">
            {errores.avisos}
          </p>
        )}
        <p className="text-xs text-mute">{t.frecuencia}</p>
      </fieldset>

      <Campo
        id="alerta-correo"
        label={t.correo}
        value={correo}
        onChange={setCorreo}
        error={errores.correo}
        hint={t.correoAyuda}
        type="email"
        autoComplete="email"
        requerido
      />

      <div>
        <label className="flex items-start gap-3 text-sm text-gray">
          <input
            type="checkbox"
            checked={acepto}
            onChange={(e) => setAcepto(e.target.checked)}
            aria-invalid={errores.consentimiento ? true : undefined}
            aria-describedby={
              errores.consentimiento ? "alerta-consentimiento-error" : undefined
            }
            className="mt-0.5 h-5 w-5 shrink-0 rounded border-purple-200 accent-purple"
          />
          <span>
            {t.consentimiento}{" "}
            <Link
              href="/privacidad"
              className="font-semibold text-purple-600 underline"
            >
              {t.politica}
            </Link>
          </span>
        </label>
        {errores.consentimiento && (
          <p
            id="alerta-consentimiento-error"
            role="alert"
            className="mt-1.5 text-sm font-medium text-red-600"
          >
            {errores.consentimiento}
          </p>
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

      <p className="text-xs text-mute">{t.soloCorreo}</p>

      {errorGeneral && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {errorGeneral}
        </p>
      )}
      <button
        type="submit"
        disabled={enviando}
        className="inline-flex items-center justify-center rounded-full bg-purple px-7 py-3.5 text-base font-semibold text-white shadow-card transition-transform hover:bg-purple-600 hover:scale-[1.03] disabled:opacity-60"
      >
        {enviando ? t.creando : t.crear}
      </button>
    </form>
  );
}

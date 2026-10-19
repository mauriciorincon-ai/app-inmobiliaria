"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import Campo from "@/components/ui/Campo";
import { normalizarWhatsapp } from "@/engine/format/whatsapp";
import { unirFavoritos } from "@/engine/guardados/favoritos";
import { extraerTokenDeHash } from "@/engine/token/token";
import { MINUTOS_CODIGO } from "@/engine/verificacion/codigo";
import type { Idioma } from "@/i18n/idiomas";
import { rellenar, type Proyectado } from "@/i18n/textos";
import {
  favoritosLocales,
  fusionarConCuenta,
  guardarFavoritosLocales,
} from "@/lib/favoritos-cliente";
import type { VERIFICAR } from "@/textos/verificar";

export type TextosVerificar = Proyectado<typeof VERIFICAR>;

type Fase =
  | { fase: "cargando" }
  | { fase: "inicio" }
  | {
      fase: "esperando";
      codigo: string;
      href: string;
      numero: string;
      hasta: number;
    }
  | { fase: "listo" }
  | { fase: "otro_numero" }
  | { fase: "vencido" };

type Errores = { nombre?: string; telefono?: string; consentimiento?: string };

const SONDEO_MS = 3000;

// Verificación del WhatsApp del comprador (S7, ADR 015): nombre y número → un código que el comprador
// MANDA a Innmobiliaria por WhatsApp → la página lo nota sola. Innmobiliaria no envía nada. El código se
// muestra una vez y vive solo aquí, en memoria: si se recarga la página se pide otro (el anterior vence).
export default function Verificar({
  lang,
  t,
  volver,
}: {
  lang: Idioma;
  t: TextosVerificar;
  /** Ruta interna validada en el servidor (`rutaDeVuelta`) o null. */
  volver: string | null;
}) {
  const [estado, setEstado] = useState<Fase>({ fase: "cargando" });
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [acepto, setAcepto] = useState(false);
  const [errores, setErrores] = useState<Errores>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [ayuda, setAyuda] = useState(false);
  const esperando = useRef(false);

  // Lee el estado de ESTE navegador. No toca el estado del componente: devuelve el código o null.
  const leerEstado = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch("/api/verificacion/estado", {
        cache: "no-store",
      });
      if (!res.ok) return null;
      return ((await res.json()) as { estado: string }).estado;
    } catch {
      return null;
    }
  }, []);

  const aplicar = useCallback((e: string | null) => {
    if (e === "verificado") setEstado({ fase: "listo" });
    else if (e === "otro_numero") setEstado({ fase: "otro_numero" });
    else if (e === "vencido" && esperando.current)
      setEstado({ fase: "vencido" });
    else if (!esperando.current) setEstado({ fase: "inicio" });
  }, []);

  const consultar = useCallback(
    () => leerEstado().then(aplicar),
    [leerEstado, aplicar],
  );

  // Al abrir: si este navegador ya verificó, se muestra «listo»; si no, el formulario.
  useEffect(() => {
    let vigente = true;
    void leerEstado().then((e) => {
      if (vigente) aplicar(e);
    });
    return () => {
      vigente = false;
    };
  }, [leerEstado, aplicar]);

  // Al quedar verificado, los favoritos de este teléfono pasan a la cuenta, sin duplicar (S9, ADR 017).
  useEffect(() => {
    if (estado.fase !== "listo") return;
    const locales = favoritosLocales();
    if (locales.length === 0) return;
    void fusionarConCuenta(locales).then((cuenta) => {
      if (cuenta) guardarFavoritosLocales(unirFavoritos(cuenta, locales));
    });
  }, [estado.fase]);

  // Mientras espera el mensaje: sondeo corto, y una consulta al volver a la pestaña desde WhatsApp.
  useEffect(() => {
    esperando.current = estado.fase === "esperando";
    if (estado.fase !== "esperando") return;
    const hasta = estado.hasta;
    const id = window.setInterval(() => {
      if (Date.now() >= hasta) setEstado({ fase: "vencido" });
      else void consultar();
    }, SONDEO_MS);
    const alVolver = () => {
      if (document.visibilityState === "visible") void consultar();
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [estado, consultar]);

  function validar(): Errores {
    const e: Errores = {};
    if (nombre.trim().length < 2) e.nombre = t.errores.nombre;
    if (!normalizarWhatsapp(telefono)) e.telefono = t.errores.telefono;
    if (!acepto) e.consentimiento = t.errores.consentimiento;
    return e;
  }

  async function pedirCodigo(ev?: React.FormEvent) {
    ev?.preventDefault();
    const e = validar();
    setErrores(e);
    setErrorGeneral(null);
    if (Object.keys(e).length > 0) return;
    setEnviando(true);
    try {
      const res = await fetch("/api/verificacion/iniciar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(),
          whatsapp: telefono,
          consentimiento: true,
          idioma: lang,
        }),
      });
      if (res.status === 429) return setErrorGeneral(t.errores.tope);
      if (res.status === 503) return setErrorGeneral(t.errores.noDisponible);
      if (!res.ok) return setErrorGeneral(t.errores.servidor);
      const datos = (await res.json()) as {
        codigo: string;
        href: string;
        numero: string;
        segundos: number;
      };
      setCopiado(false);
      setAyuda(false);
      setEstado({
        fase: "esperando",
        codigo: datos.codigo,
        href: datos.href,
        numero: datos.numero,
        hasta:
          Date.now() + Math.min(datos.segundos, MINUTOS_CODIGO * 60) * 1000,
      });
      // WhatsApp se abre ya con el código escrito; si el navegador lo bloquea queda el botón.
      const ventana = window.open(datos.href, "_blank");
      if (ventana) ventana.opener = null;
    } catch {
      setErrorGeneral(t.errores.servidor);
    } finally {
      setEnviando(false);
    }
  }

  async function copiar(codigo: string) {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  }

  const pasoActivo =
    estado.fase === "esperando" ? 2 : estado.fase === "listo" ? 3 : 1;

  // A dónde vuelve «listo». Una lista compartida se abre con el token en el FRAGMENTO, que la ruta `?volver=`
  // no lleva: se recompone aquí (esta rama solo se pinta en el navegador, tras leer el estado).
  function destinoDeVuelta(): string | null {
    if (volver !== "/lista") return volver;
    const token = extraerTokenDeHash(window.location.hash);
    return token ? `${volver}#t=${token}` : volver;
  }

  return (
    <div className="mt-8">
      <ol aria-label={t.pasos.grupo} className="space-y-2 text-sm text-gray">
        {[t.pasos.uno, t.pasos.dos, t.pasos.tres].map((texto, i) => (
          <li
            key={texto}
            aria-current={pasoActivo === i + 1 ? "step" : undefined}
            className={pasoActivo === i + 1 ? "font-semibold text-ink" : ""}
          >
            <span aria-hidden="true">
              {pasoActivo > i + 1 ? "✓ " : `${i + 1} · `}
            </span>
            {texto}
          </li>
        ))}
      </ol>

      <div className="mt-6" aria-live="polite">
        {estado.fase === "cargando" && (
          <p className="text-sm text-mute">{t.cargando}</p>
        )}

        {(estado.fase === "inicio" ||
          estado.fase === "otro_numero" ||
          estado.fase === "vencido") && (
          <>
            {estado.fase === "otro_numero" && (
              <div role="alert" className="mb-5 rounded-2xl bg-cream p-4">
                <p className="font-semibold text-ink">
                  ⚠ {t.otroNumero.titulo}
                </p>
                <p className="mt-1 text-sm text-gray">{t.otroNumero.texto}</p>
              </div>
            )}
            {estado.fase === "vencido" && (
              <div role="alert" className="mb-5 rounded-2xl bg-cream p-4">
                <p className="font-semibold text-ink">⚠ {t.vencido.titulo}</p>
                <p className="mt-1 text-sm text-gray">{t.vencido.texto}</p>
              </div>
            )}
            <form
              onSubmit={(ev) => void pedirCodigo(ev)}
              noValidate
              className="space-y-5"
            >
              <Campo
                id="nombre-comprador"
                label={t.formulario.nombre}
                value={nombre}
                onChange={setNombre}
                error={errores.nombre}
                autoComplete="given-name"
                requerido
              />
              <Campo
                id="whatsapp-comprador"
                label={t.formulario.telefono}
                value={telefono}
                onChange={setTelefono}
                error={errores.telefono}
                hint={t.formulario.telefonoAyuda}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
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
                      errores.consentimiento
                        ? "consentimiento-comprador-error"
                        : undefined
                    }
                    className="mt-0.5 h-5 w-5 shrink-0 rounded border-purple-200 accent-purple"
                  />
                  <span>
                    {t.formulario.consentimiento}{" "}
                    <Link
                      href="/privacidad"
                      className="font-semibold text-purple-600 underline"
                    >
                      {t.formulario.politica}
                    </Link>
                  </span>
                </label>
                {errores.consentimiento && (
                  <p
                    id="consentimiento-comprador-error"
                    role="alert"
                    className="mt-1.5 text-sm font-medium text-red-600"
                  >
                    {errores.consentimiento}
                  </p>
                )}
              </div>
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
                {enviando
                  ? t.formulario.enviando
                  : estado.fase === "inicio"
                    ? t.formulario.enviar
                    : estado.fase === "otro_numero"
                      ? t.otroNumero.reintentar
                      : t.vencido.reintentar}
              </button>
            </form>
          </>
        )}

        {estado.fase === "esperando" && (
          <section
            aria-labelledby="esperando-titulo"
            className="rounded-3xl bg-white p-5 shadow-card"
          >
            <h2
              id="esperando-titulo"
              className="text-sm font-semibold text-gray"
            >
              {t.esperando.aviso}
            </h2>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-mute">
              {t.esperando.codigoEtiqueta}
            </p>
            <p
              data-testid="codigo-verificacion"
              className="mt-1 select-all font-mono text-3xl font-extrabold tracking-widest text-ink"
            >
              {estado.codigo}
            </p>
            <p className="mt-3 text-sm text-gray">⏳ {t.esperando.estado}</p>
            <p className="mt-1 text-xs text-mute">{t.esperando.vence}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <a
                href={estado.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-full bg-purple px-6 py-3 text-sm font-semibold text-white shadow-card transition-transform hover:bg-purple-600 hover:scale-[1.03]"
              >
                {t.esperando.abrir}
              </a>
              <button
                type="button"
                onClick={() => void consultar()}
                className="rounded-full border border-purple-200 px-5 py-2.5 text-sm font-semibold text-purple-600 transition-colors hover:bg-purple-tint"
              >
                {t.esperando.yaEnvie}
              </button>
              <button
                type="button"
                aria-expanded={ayuda}
                onClick={() => setAyuda((v) => !v)}
                className="text-sm font-semibold text-gray underline-offset-4 hover:underline"
              >
                {t.esperando.noAbrio}
              </button>
            </div>
            {ayuda && (
              <div className="mt-3 rounded-2xl bg-cream p-4 text-sm text-gray">
                <p>{rellenar(t.esperando.ayuda, { numero: estado.numero })}</p>
                <button
                  type="button"
                  onClick={() => void copiar(estado.codigo)}
                  className="mt-2 rounded-full border border-purple-200 px-4 py-2 text-sm font-semibold text-purple-600 hover:bg-purple-tint"
                >
                  {t.esperando.copiar}
                </button>
                {copiado && (
                  <span
                    role="status"
                    className="ml-3 text-sm font-medium text-ok"
                  >
                    {t.esperando.copiado}
                  </span>
                )}
              </div>
            )}
          </section>
        )}

        {estado.fase === "listo" && (
          <section
            aria-labelledby="listo-titulo"
            className="rounded-3xl bg-white p-5 shadow-card"
          >
            <h2 id="listo-titulo" className="text-xl font-bold text-ink">
              ✓ {t.listo.titulo}
            </h2>
            <p className="mt-2 text-sm text-gray">{t.listo.texto}</p>
            <div className="mt-4">
              <Link
                href={destinoDeVuelta() ?? "/buscar"}
                className="inline-flex items-center justify-center rounded-full bg-purple px-6 py-3 text-sm font-semibold text-white shadow-card transition-transform hover:bg-purple-600 hover:scale-[1.03]"
              >
                {volver ? t.listo.volver : t.listo.buscar}
              </Link>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

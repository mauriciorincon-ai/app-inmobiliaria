"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Campo from "@/components/ui/Campo";
import { pesosDeMillones } from "@/engine/format/presupuesto";
import { rellenar, type Proyectado } from "@/i18n/textos";
import type { FormaPago, IntencionVisita } from "@/lib/supabase/types";
import type { VISITA } from "@/textos/visita";

export type TextosPedir = Proyectado<typeof VISITA.pedir>;

type Fase =
  | { fase: "cargando" }
  | { fase: "sin-whatsapp" }
  | { fase: "form" }
  | { fase: "enviando" }
  | { fase: "listo"; token: string };

type Errores = {
  intencion?: string;
  presupuesto?: string;
  correo?: string;
  consentimiento?: string;
};

const FORMAS: FormaPago[] = [
  "hipotecario",
  "ahorros",
  "venta_inmueble",
  "otro",
];
const INTENCIONES: IntencionVisita[] = ["vivir", "invertir"];
const REGEX_CORREO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const LIMITE_MENSAJE = 300;

const BOTON =
  "inline-flex items-center justify-center rounded-full bg-purple px-6 py-3 text-sm font-semibold text-white shadow-card transition-transform hover:bg-purple-600 hover:scale-[1.03] disabled:opacity-60";

// Pedir una visita (S8, ADR 016). Exige el WhatsApp verificado (la cookie lo dice). El comprador declara
// para qué busca, su presupuesto y cómo pagaría —todo opcional salvo la intención—, deja un correo solo para
// los avisos de esta visita y consiente. El servidor devuelve UNA vez el token de su solicitud.
export default function PedirVisita({
  slug,
  t,
  intenciones,
  formasPago,
  soloIdentificados,
  contactoAbierto,
}: {
  slug: string;
  t: TextosPedir;
  intenciones: Proyectado<typeof VISITA.intencion>;
  formasPago: Proyectado<typeof VISITA.formasPago>;
  soloIdentificados: boolean;
  contactoAbierto: boolean;
}) {
  const [estado, setEstado] = useState<Fase>({ fase: "cargando" });
  const [identificado, setIdentificado] = useState(false);
  const [intencion, setIntencion] = useState<IntencionVisita | "">("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [pago, setPago] = useState<FormaPago[]>([]);
  const [mensaje, setMensaje] = useState("");
  const [correo, setCorreo] = useState("");
  const [acepto, setAcepto] = useState(false);
  const [errores, setErrores] = useState<Errores>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    void (async () => {
      try {
        const res = await fetch("/api/verificacion/estado", {
          cache: "no-store",
        });
        const e = res.ok
          ? ((await res.json()) as { estado: string; identificado?: boolean })
          : null;
        if (!vigente) return;
        if (e?.estado === "verificado") {
          setIdentificado(e.identificado === true);
          setEstado({ fase: "form" });
        } else setEstado({ fase: "sin-whatsapp" });
      } catch {
        if (vigente) setEstado({ fase: "sin-whatsapp" });
      }
    })();
    return () => {
      vigente = false;
    };
  }, []);

  function alternarPago(forma: FormaPago) {
    setPago((p) =>
      p.includes(forma) ? p.filter((x) => x !== forma) : [...p, forma],
    );
  }

  async function enviar(ev: React.FormEvent) {
    ev.preventDefault();
    setErrorGeneral(null);
    const e: Errores = {};
    if (!intencion) e.intencion = t.errores.intencion;
    const min = pesosDeMillones(desde);
    const max = pesosDeMillones(hasta);
    if (
      min === "invalido" ||
      max === "invalido" ||
      (typeof min === "number" && typeof max === "number" && min > max)
    ) {
      e.presupuesto = t.errores.presupuesto;
    }
    if (!REGEX_CORREO.test(correo.trim())) e.correo = t.errores.correo;
    if (!acepto) e.consentimiento = t.errores.consentimiento;
    setErrores(e);
    if (Object.keys(e).length > 0) return;

    setEstado({ fase: "enviando" });
    try {
      const res = await fetch("/api/visitas/solicitar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug,
          intencion,
          presupuestoMin: typeof min === "number" ? min : null,
          presupuestoMax: typeof max === "number" ? max : null,
          formaPago: pago,
          mensaje: mensaje.trim() || null,
          email: correo.trim(),
        }),
      });
      if (res.ok) {
        const { token } = (await res.json()) as { token: string };
        return setEstado({ fase: "listo", token });
      }
      const { error } = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (res.status === 403) return setEstado({ fase: "sin-whatsapp" });
      const errores = t.errores as Record<string, string>;
      setErrorGeneral(errores[error ?? ""] ?? t.errores.servidor);
      setEstado({ fase: "form" });
    } catch {
      setErrorGeneral(t.errores.servidor);
      setEstado({ fase: "form" });
    }
  }

  const volverAqui = `/pedir-visita?slug=${slug}`;

  if (!contactoAbierto) {
    return (
      <p
        role="alert"
        className="mt-8 rounded-2xl bg-cream p-4 text-sm text-gray"
      >
        {t.errores.no_disponible}
      </p>
    );
  }

  return (
    <div className="mt-8" aria-live="polite">
      {estado.fase === "cargando" && (
        <p className="text-sm text-mute">{t.cargando}</p>
      )}

      {estado.fase === "sin-whatsapp" && (
        <section
          aria-labelledby="pedir-whatsapp"
          className="rounded-3xl bg-white p-5 shadow-card"
        >
          <h2 id="pedir-whatsapp" className="text-lg font-bold text-ink">
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

      {estado.fase === "listo" && (
        <section
          aria-labelledby="pedir-listo"
          className="rounded-3xl bg-white p-5 shadow-card"
        >
          <h2 id="pedir-listo" className="text-xl font-bold text-ink">
            ✓ {t.listo.titulo}
          </h2>
          <p className="mt-2 text-sm text-gray">{t.listo.texto}</p>
          <div className="mt-4">
            <Link href={`/visita#t=${estado.token}`} className={BOTON}>
              {t.listo.ver}
            </Link>
          </div>
        </section>
      )}

      {(estado.fase === "form" || estado.fase === "enviando") && (
        <>
          {soloIdentificados && !identificado && (
            <section
              aria-labelledby="pedir-identificar"
              className="mb-6 rounded-2xl bg-cream p-4"
            >
              <h2 id="pedir-identificar" className="text-sm font-bold text-ink">
                {t.soloIdentificados.titulo}
              </h2>
              <p className="mt-1 text-sm text-gray">
                {t.soloIdentificados.texto}
              </p>
              <Link
                href={`/identificarse?volver=${encodeURIComponent(volverAqui)}`}
                className="mt-2 inline-block text-sm font-semibold text-purple-600 underline"
              >
                {t.soloIdentificados.boton}
              </Link>
            </section>
          )}
          <form
            onSubmit={(ev) => void enviar(ev)}
            noValidate
            className="space-y-6"
          >
            <fieldset
              aria-describedby={
                errores.intencion ? "intencion-error" : undefined
              }
            >
              <legend className="text-sm font-semibold text-ink">
                {t.formulario.intencion}
                <span className="text-purple-600"> *</span>
              </legend>
              <div className="mt-2 flex flex-wrap gap-3">
                {INTENCIONES.map((i) => (
                  <label
                    key={i}
                    className="flex cursor-pointer items-center gap-2 rounded-full border border-purple-200 bg-white px-4 py-2.5 text-sm text-ink has-[:checked]:border-purple has-[:checked]:bg-purple-tint has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-purple"
                  >
                    <input
                      type="radio"
                      name="intencion"
                      value={i}
                      checked={intencion === i}
                      onChange={() => setIntencion(i)}
                      className="h-4 w-4 accent-purple"
                    />
                    {intenciones[i]}
                  </label>
                ))}
              </div>
              {errores.intencion && (
                <p
                  id="intencion-error"
                  role="alert"
                  className="mt-1.5 text-sm font-medium text-red-600"
                >
                  {errores.intencion}
                </p>
              )}
            </fieldset>

            <fieldset>
              <legend className="text-sm font-semibold text-ink">
                {t.formulario.presupuesto}
              </legend>
              <p className="mt-1 text-xs text-mute">
                {t.formulario.presupuestoAyuda}
              </p>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <Campo
                  id="presupuesto-desde"
                  label={t.formulario.desde}
                  value={desde}
                  onChange={setDesde}
                  inputMode="numeric"
                  autoComplete="off"
                />
                <Campo
                  id="presupuesto-hasta"
                  label={t.formulario.hasta}
                  value={hasta}
                  onChange={setHasta}
                  inputMode="numeric"
                  autoComplete="off"
                  error={errores.presupuesto}
                />
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-sm font-semibold text-ink">
                {t.formulario.pago}
              </legend>
              <div className="mt-2 flex flex-wrap gap-3">
                {FORMAS.map((f) => (
                  <label
                    key={f}
                    className="flex cursor-pointer items-center gap-2 rounded-full border border-purple-200 bg-white px-4 py-2.5 text-sm text-ink has-[:checked]:border-purple has-[:checked]:bg-purple-tint has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-purple"
                  >
                    <input
                      type="checkbox"
                      checked={pago.includes(f)}
                      onChange={() => alternarPago(f)}
                      className="h-4 w-4 accent-purple"
                    />
                    {formasPago[f]}
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <Campo
                id="mensaje-visita"
                label={t.formulario.mensaje}
                value={mensaje}
                onChange={(v) => setMensaje(v.slice(0, LIMITE_MENSAJE))}
                hint={t.formulario.mensajeAyuda}
                control="textarea"
              />
              <p className="mt-1 text-right text-xs text-mute">
                {rellenar(t.formulario.contador, { n: mensaje.length })}
              </p>
            </div>

            <Campo
              id="correo-visita"
              label={t.formulario.correo}
              value={correo}
              onChange={setCorreo}
              error={errores.correo}
              hint={t.formulario.correoAyuda}
              type="email"
              inputMode="text"
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
                    errores.consentimiento
                      ? "consentimiento-visita-error"
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
                  id="consentimiento-visita-error"
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
              disabled={estado.fase === "enviando"}
              className={BOTON}
            >
              {estado.fase === "enviando"
                ? t.formulario.enviando
                : t.formulario.enviar}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

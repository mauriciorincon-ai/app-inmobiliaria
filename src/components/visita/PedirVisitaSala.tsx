"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Campo from "@/components/ui/Campo";
import { FRANJAS_VISITA, type FranjaDeVisita } from "@/engine/visita/franjas";
import type { Proyectado } from "@/i18n/textos";
import type { VIVIENDA_NUEVA } from "@/textos/vivienda-nueva";

export type TextosPedirSala = Proyectado<typeof VIVIENDA_NUEVA.visita>;

type Fase =
  | { fase: "cargando" }
  | { fase: "sin-whatsapp" }
  | { fase: "form" }
  | { fase: "enviando" }
  | { fase: "listo"; token: string };

type Errores = { correo?: string; consentimiento?: string };

const REGEX_CORREO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const BOTON =
  "inline-flex items-center justify-center rounded-full bg-purple px-6 py-3 text-sm font-semibold text-white shadow-card transition-transform hover:bg-purple-600 hover:scale-[1.03] disabled:opacity-60";

// Pedir la visita a la sala de ventas de un proyecto nuevo (S13, maqueta 05). Exige el WhatsApp verificado (la cookie lo
// dice), una franja y un correo solo para los avisos de esta visita. NADA más viaja: ni ingresos, ni presupuesto, ni arriendo.
// El servidor devuelve UNA vez el token de la solicitud.
export default function PedirVisitaSala({
  slug,
  t,
}: {
  slug: string;
  t: TextosPedirSala;
}) {
  const [estado, setEstado] = useState<Fase>({ fase: "cargando" });
  const [franja, setFranja] = useState<FranjaDeVisita>(FRANJAS_VISITA[0]);
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
        const e = res.ok ? ((await res.json()) as { estado: string }) : null;
        if (!vigente) return;
        setEstado(
          e?.estado === "verificado"
            ? { fase: "form" }
            : { fase: "sin-whatsapp" },
        );
      } catch {
        if (vigente) setEstado({ fase: "sin-whatsapp" });
      }
    })();
    return () => {
      vigente = false;
    };
  }, []);

  async function enviar(ev: React.FormEvent) {
    ev.preventDefault();
    setErrorGeneral(null);
    const e: Errores = {};
    if (!REGEX_CORREO.test(correo.trim())) e.correo = t.errores.correo;
    if (!acepto) e.consentimiento = t.errores.consentimiento;
    setErrores(e);
    if (Object.keys(e).length > 0) return;

    setEstado({ fase: "enviando" });
    try {
      const res = await fetch("/api/visitas/solicitar-sala", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, franja, email: correo.trim() }),
      });
      if (res.ok) {
        const { token } = (await res.json()) as { token: string };
        return setEstado({ fase: "listo", token });
      }
      const { error } = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (res.status === 403) return setEstado({ fase: "sin-whatsapp" });
      const errs = t.errores as Record<string, string>;
      setErrorGeneral(errs[error ?? ""] ?? t.errores.servidor);
      setEstado({ fase: "form" });
    } catch {
      setErrorGeneral(t.errores.servidor);
      setEstado({ fase: "form" });
    }
  }

  const volverAqui = `/nuevos/${slug}/visita`;
  const franjas: Record<string, string> = t.pedir.franjas;

  return (
    <div className="mt-6" aria-live="polite">
      {estado.fase === "cargando" && (
        <p className="text-sm text-mute">{t.pedir.cargando}</p>
      )}

      {estado.fase === "sin-whatsapp" && (
        <section
          aria-labelledby="sala-whatsapp"
          className="rounded-2xl border border-aviso-borde bg-aviso-tint p-5"
        >
          <h2 id="sala-whatsapp" className="text-lg font-bold text-ink">
            <span aria-hidden="true">! </span>
            {t.sinWhatsapp.titulo}
          </h2>
          <p className="mt-1 text-sm text-gray">{t.sinWhatsapp.detalle}</p>
          <div className="mt-4">
            <Link
              href={`/verificar?volver=${encodeURIComponent(volverAqui)}`}
              className={BOTON}
            >
              {t.sinWhatsapp.boton}
            </Link>
          </div>
        </section>
      )}

      {estado.fase === "listo" && (
        <section
          aria-labelledby="sala-listo"
          className="rounded-2xl bg-mint p-5 text-ok"
        >
          <h2 id="sala-listo" className="text-lg font-bold">
            <span aria-hidden="true">✓ </span>
            {t.solicitada.titulo}
          </h2>
          <p className="mt-2 text-sm text-ink">{t.solicitada.detalle}</p>
          <div className="mt-4">
            <Link href={`/visita#t=${estado.token}`} className={BOTON}>
              {t.solicitada.ver}
            </Link>
          </div>
        </section>
      )}

      {(estado.fase === "form" || estado.fase === "enviando") && (
        <form
          onSubmit={(ev) => void enviar(ev)}
          noValidate
          className="space-y-6 rounded-2xl border border-purple-200 bg-white p-5"
        >
          <p className="text-sm text-gray">{t.pedir.coordinamos}</p>
          <fieldset>
            <legend className="text-sm font-semibold text-ink">
              {t.pedir.franja}
            </legend>
            <div className="mt-2 flex flex-wrap gap-3">
              {FRANJAS_VISITA.map((f) => (
                <label
                  key={f}
                  className="flex cursor-pointer items-center gap-2 rounded-full border border-purple-200 bg-white px-4 py-2.5 text-sm text-ink has-[:checked]:border-purple has-[:checked]:bg-purple-tint has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-purple"
                >
                  <input
                    type="radio"
                    name="franja"
                    value={f}
                    checked={franja === f}
                    onChange={() => setFranja(f)}
                    className="h-4 w-4 accent-purple"
                  />
                  {franjas[f]}
                </label>
              ))}
            </div>
          </fieldset>

          <Campo
            id="correo-sala"
            label={t.pedir.correo}
            value={correo}
            onChange={setCorreo}
            error={errores.correo}
            hint={t.pedir.correoAyuda}
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
                    ? "consentimiento-sala-error"
                    : undefined
                }
                className="mt-0.5 h-5 w-5 shrink-0 rounded border-purple-200 accent-purple"
              />
              <span>
                {t.pedir.consentimiento}{" "}
                <Link
                  href="/privacidad"
                  className="font-semibold text-purple-600 underline"
                >
                  {t.pedir.politica}
                </Link>
              </span>
            </label>
            {errores.consentimiento && (
              <p
                id="consentimiento-sala-error"
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
            {estado.fase === "enviando" ? t.pedir.enviando : t.pedir.enviar}
          </button>
        </form>
      )}
    </div>
  );
}

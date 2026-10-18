"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Campo from "@/components/ui/Campo";
import { hoyBogota } from "@/engine/agenda/bogota";
import { camposInvalidos } from "@/engine/identidad/datos";
import { rellenar, type Proyectado } from "@/i18n/textos";
import type { IDENTIDAD } from "@/textos/identidad";

export type TextosIdentidad = Proyectado<typeof IDENTIDAD>;

type Fase =
  | "cargando"
  | "sin-whatsapp"
  | "inicio"
  | "validando"
  | "identificado"
  | "borrada"
  | "no_coincide"
  | "no_disponible"
  | "tope"
  | "tope_comprador";

type Errores = {
  cedula?: string;
  fecha?: string;
  nombre?: string;
  consentimiento?: string;
};

const BOTON =
  "inline-flex items-center justify-center rounded-full bg-purple px-6 py-3 text-sm font-semibold text-white shadow-card transition-transform hover:bg-purple-600 hover:scale-[1.03] disabled:opacity-60";

// Identificarse con la cédula (S8, ADR 016, maqueta 04). El número, la fecha y el nombre viven solo en este
// componente mientras se escriben: al responder el servidor se vacían. El servidor los manda al proveedor y
// no los guarda. Es opcional y reversible: se puede borrar la identificación.
export default function Identificarse({
  t,
  volver,
}: {
  t: TextosIdentidad;
  /** Ruta interna validada en el servidor (`rutaDeVuelta`) o null. */
  volver: string | null;
}) {
  const [fase, setFase] = useState<Fase>("cargando");
  const [cedula, setCedula] = useState("");
  const [fecha, setFecha] = useState("");
  const [nombre, setNombre] = useState("");
  const [acepto, setAcepto] = useState(false);
  const [errores, setErrores] = useState<Errores>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [nombreListo, setNombreListo] = useState("");
  const [borrando, setBorrando] = useState(false);

  const leerEstado = useCallback(async (): Promise<Fase> => {
    try {
      const res = await fetch("/api/verificacion/estado", {
        cache: "no-store",
      });
      if (!res.ok) return "sin-whatsapp";
      const e = (await res.json()) as {
        estado: string;
        identificado?: boolean;
      };
      if (e.estado !== "verificado") return "sin-whatsapp";
      return e.identificado ? "identificado" : "inicio";
    } catch {
      return "sin-whatsapp";
    }
  }, []);

  useEffect(() => {
    let vigente = true;
    void leerEstado().then((f) => {
      if (vigente) setFase(f);
    });
    return () => {
      vigente = false;
    };
  }, [leerEstado]);

  function olvidar() {
    setCedula("");
    setFecha("");
  }

  async function enviar(ev: React.FormEvent) {
    ev.preventDefault();
    setErrorGeneral(null);
    const malos = camposInvalidos(
      { cedula, fechaExpedicion: fecha, nombre },
      hoyBogota(new Date()),
    );
    const e: Errores = {};
    if (malos.includes("cedula")) e.cedula = t.errores.cedula;
    if (malos.includes("fechaExpedicion")) e.fecha = t.errores.fecha;
    if (malos.includes("nombre")) e.nombre = t.errores.nombre;
    if (!acepto) e.consentimiento = t.errores.consentimiento;
    if (Object.keys(e).length > 0) {
      setErrores(e);
      return;
    }
    setErrores({});
    setFase("validando");
    try {
      const res = await fetch("/api/identidad", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          cedula,
          fechaExpedicion: fecha,
          nombre,
          consentimiento: true,
        }),
      });
      olvidar();
      if (res.status === 403) return setFase("sin-whatsapp");
      if (!res.ok) {
        setErrorGeneral(t.errores.servidor);
        return setFase("inicio");
      }
      const { resultado } = (await res.json()) as { resultado: string };
      if (resultado === "identificado" || resultado === "ya_identificado") {
        setNombreListo(nombre.trim().split(/\s+/)[0] ?? "");
        return setFase("identificado");
      }
      if (resultado === "no_coincide") return setFase("no_coincide");
      if (resultado === "tope") return setFase("tope");
      if (resultado === "tope_comprador") return setFase("tope_comprador");
      if (resultado === "no_verificado") return setFase("sin-whatsapp");
      setFase("no_disponible");
    } catch {
      olvidar();
      setErrorGeneral(t.errores.servidor);
      setFase("inicio");
    }
  }

  async function borrar() {
    setBorrando(true);
    try {
      const res = await fetch("/api/identidad", { method: "DELETE" });
      if (res.ok) {
        setNombre("");
        setAcepto(false);
        setFase("borrada");
      } else setErrorGeneral(t.errores.servidor);
    } catch {
      setErrorGeneral(t.errores.servidor);
    } finally {
      setBorrando(false);
    }
  }

  const whatsappListo = fase !== "sin-whatsapp" && fase !== "cargando";
  const identificado = fase === "identificado";
  const volverA = volver ?? "/buscar";

  return (
    <div className="mt-6">
      <ul
        aria-label={t.estado.grupo}
        className="flex flex-wrap gap-2 text-xs font-semibold"
      >
        <li
          className={`rounded-full px-3 py-1 ${whatsappListo ? "bg-purple-tint text-purple-600" : "bg-cream text-gray"}`}
        >
          {whatsappListo ? "✓ " : "○ "}
          {whatsappListo
            ? t.estado.whatsappVerificado
            : t.estado.whatsappSinVerificar}
        </li>
        <li
          className={`rounded-full px-3 py-1 ${identificado ? "bg-purple-tint text-purple-600" : "bg-cream text-gray"}`}
        >
          {identificado ? "✓ " : "○ "}
          {identificado ? t.estado.identificado : t.estado.sinIdentificar}
        </li>
      </ul>

      <div className="mt-6" aria-live="polite">
        {fase === "cargando" && (
          <p className="text-sm text-mute">{t.cargando}</p>
        )}

        {fase === "sin-whatsapp" && (
          <section
            aria-labelledby="ident-whatsapp"
            className="rounded-3xl bg-white p-5 shadow-card"
          >
            <h2 id="ident-whatsapp" className="text-lg font-bold text-ink">
              {t.primeroWhatsapp.titulo}
            </h2>
            <p className="mt-1 text-sm text-gray">{t.primeroWhatsapp.texto}</p>
            <div className="mt-4">
              <Link
                href={`/verificar?volver=${encodeURIComponent(
                  `/identificarse${volver ? `?volver=${encodeURIComponent(volver)}` : ""}`,
                )}`}
                className={BOTON}
              >
                {t.primeroWhatsapp.boton}
              </Link>
            </div>
          </section>
        )}

        {(fase === "inicio" ||
          fase === "validando" ||
          fase === "no_coincide" ||
          fase === "no_disponible") && (
          <>
            {fase === "no_coincide" && (
              <div role="alert" className="mb-5 rounded-2xl bg-cream p-4">
                <p className="font-semibold text-ink">
                  ⚠ {t.resultado.noCoincide.titulo}
                </p>
                <p className="mt-1 text-sm text-gray">
                  {t.resultado.noCoincide.texto}
                </p>
              </div>
            )}
            {fase === "no_disponible" && (
              <div role="alert" className="mb-5 rounded-2xl bg-cream p-4">
                <p className="font-semibold text-ink">
                  ⚠ {t.resultado.noDisponible.titulo}
                </p>
                <p className="mt-1 text-sm text-gray">
                  {t.resultado.noDisponible.texto}
                </p>
              </div>
            )}
            <form
              onSubmit={(ev) => void enviar(ev)}
              noValidate
              autoComplete="off"
              className="space-y-5"
            >
              <Campo
                id="cedula"
                label={t.formulario.cedula}
                value={cedula}
                onChange={setCedula}
                error={errores.cedula}
                hint={t.formulario.cedulaAyuda}
                inputMode="numeric"
                autoComplete="off"
                requerido
              />
              <Campo
                id="fecha-expedicion"
                label={t.formulario.fecha}
                value={fecha}
                onChange={setFecha}
                error={errores.fecha}
                hint={t.formulario.fechaAyuda}
                type="date"
                autoComplete="off"
                requerido
              />
              <Campo
                id="nombre-cedula"
                label={t.formulario.nombre}
                value={nombre}
                onChange={setNombre}
                error={errores.nombre}
                autoComplete="off"
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
                        ? "consentimiento-cedula-error"
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
                    id="consentimiento-cedula-error"
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
                disabled={fase === "validando"}
                className={BOTON}
              >
                {fase === "validando"
                  ? t.formulario.enviando
                  : fase === "no_coincide"
                    ? t.resultado.noCoincide.reintentar
                    : fase === "no_disponible"
                      ? t.resultado.noDisponible.reintentar
                      : t.formulario.enviar}
              </button>
            </form>
          </>
        )}

        {identificado && (
          <section
            aria-labelledby="ident-listo"
            className="rounded-3xl bg-white p-5 shadow-card"
          >
            <h2 id="ident-listo" className="text-xl font-bold text-ink">
              ✓{" "}
              {nombreListo
                ? rellenar(t.resultado.identificado.titulo, {
                    nombre: nombreListo,
                  })
                : t.estado.identificado}
            </h2>
            <p className="mt-2 text-sm text-gray">
              {t.resultado.identificado.texto}
            </p>
            {errorGeneral && (
              <p role="alert" className="mt-2 text-sm font-medium text-red-600">
                {errorGeneral}
              </p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Link href={volverA} className={BOTON}>
                {volver
                  ? t.resultado.identificado.seguir
                  : t.resultado.identificado.buscar}
              </Link>
              <button
                type="button"
                onClick={() => void borrar()}
                disabled={borrando}
                className="text-sm font-semibold text-gray underline-offset-4 hover:underline disabled:opacity-60"
              >
                {borrando
                  ? t.resultado.identificado.borrando
                  : t.resultado.identificado.borrar}
              </button>
            </div>
          </section>
        )}

        {fase === "borrada" && (
          <section
            aria-labelledby="ident-borrada"
            className="rounded-3xl bg-white p-5 shadow-card"
          >
            <h2 id="ident-borrada" className="text-lg font-bold text-ink">
              {t.resultado.borrada.titulo}
            </h2>
            <p className="mt-2 text-sm text-gray">
              {t.resultado.borrada.texto}
            </p>
            <div className="mt-4">
              <Link href={volverA} className={BOTON}>
                {volver
                  ? t.resultado.identificado.seguir
                  : t.resultado.identificado.buscar}
              </Link>
            </div>
          </section>
        )}

        {(fase === "tope" || fase === "tope_comprador") && (
          <section
            aria-labelledby="ident-tope"
            role="alert"
            className="rounded-3xl bg-cream p-5"
          >
            <h2 id="ident-tope" className="text-lg font-bold text-ink">
              {fase === "tope"
                ? t.resultado.tope.titulo
                : t.resultado.topeComprador.titulo}
            </h2>
            <p className="mt-2 text-sm text-gray">
              {fase === "tope"
                ? t.resultado.tope.texto
                : t.resultado.topeComprador.texto}
            </p>
            <div className="mt-4">
              <Link href={volverA} className={BOTON}>
                {volver
                  ? t.resultado.identificado.seguir
                  : t.resultado.identificado.buscar}
              </Link>
            </div>
          </section>
        )}
      </div>

      <ul
        aria-label={t.garantias.grupo}
        className="mt-8 space-y-1.5 text-xs text-mute"
      >
        <li>🔒 {t.garantias.foto}</li>
        <li>🔒 {t.garantias.dueno}</li>
        <li>🔒 {t.garantias.borrar}</li>
      </ul>
    </div>
  );
}

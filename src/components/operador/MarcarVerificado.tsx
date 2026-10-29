"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ctlFechaMinima,
  ctlVigenteParaRegistrar,
  hoyEnBogota,
} from "@/engine/sello/sello";
import type { Proyectado } from "@/i18n/textos";
import { crearClienteNavegador } from "@/lib/supabase/client";
import type { OPERADOR } from "@/textos/operador";

export type TextosVerificar = Proyectado<typeof OPERADOR.marcarVerificado>;

// Ejemplo de formato de una matrícula, no es texto de la interfaz: no se traduce.
const EJEMPLO_MATRICULA = "50N-1234567";

// Verificación nivel 2 desde el panel. El operador YA vio el CTL (documento JAMÁS almacenado:
// ni upload, ni logs) y aquí solo captura la matrícula + la FECHA en que se expidió + confirma que lo
// vio. La RPC `marcar_verificado_ctl` exige que tenga máximo 30 días y persiste matrícula + fecha del
// CTL + verificado_at + nivel. Regla de dominio 3. `reverificar`: el anuncio ya estaba verificado pero
// sin fecha (re-verificación pendiente).
export default function MarcarVerificado({
  t,
  inmuebleId,
  reverificar = false,
}: {
  t: TextosVerificar;
  inmuebleId: string;
  reverificar?: boolean;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [matricula, setMatricula] = useState("");
  const [fechaCtl, setFechaCtl] = useState("");
  const [visto, setVisto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // La fecha de hoy se lee al abrir el diálogo, no al renderizar en el servidor (evita desfases).
  const [hoy, setHoy] = useState("");
  const verificacion = fechaCtl ? ctlVigenteParaRegistrar(fechaCtl, hoy) : null;
  const errorFecha =
    verificacion && !verificacion.ok
      ? {
          invalida: t.ctlInvalido,
          futura: t.ctlFuturo,
          vencida: t.ctlVencido,
        }[verificacion.motivo]
      : null;

  const listo =
    matricula.trim().length >= 4 && visto && verificacion?.ok === true;

  async function confirmar() {
    if (!listo || guardando) return;
    setGuardando(true);
    setError(null);
    const supabase = crearClienteNavegador();
    const { error: err } = await supabase.rpc("marcar_verificado_ctl", {
      p_inmueble_id: inmuebleId,
      p_matricula: matricula.trim(),
      p_ctl_expedido_el: fechaCtl,
    });
    setGuardando(false);
    if (err) {
      // Lo que la base dice, en palabras del operador (antes, siempre «no se pudo»: deuda del S6).
      setError(
        err.message.includes("ctl_fuera_de_plazo")
          ? t.ctlVencido
          : err.message.includes("inmueble_no_encontrado")
            ? t.noEncontrado
            : err.code === "42501" || err.code === "PGRST301"
              ? t.sinSesion
              : t.error,
      );
      return;
    }
    setAbierto(false);
    router.refresh();
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => {
          setHoy(hoyEnBogota());
          setAbierto(true);
        }}
        className="rounded-full bg-purple px-4 py-1.5 text-xs font-semibold text-white hover:bg-purple-600"
      >
        {reverificar ? t.botonReverificar : t.boton}
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-purple-200 bg-white p-3">
      <label
        htmlFor={`mat-${inmuebleId}`}
        className="block text-xs font-semibold text-ink"
      >
        {t.matricula}
      </label>
      <input
        id={`mat-${inmuebleId}`}
        value={matricula}
        onChange={(e) => setMatricula(e.target.value)}
        placeholder={EJEMPLO_MATRICULA}
        className="mt-1 w-full rounded-xl border border-purple-200 px-3 py-1.5 text-sm text-ink focus:border-purple focus:outline-none"
      />
      <label
        htmlFor={`ctl-${inmuebleId}`}
        className="mt-2 block text-xs font-semibold text-ink"
      >
        {t.fechaCtl}
      </label>
      <input
        id={`ctl-${inmuebleId}`}
        type="date"
        value={fechaCtl}
        min={ctlFechaMinima(hoy)}
        max={hoy}
        onChange={(e) => setFechaCtl(e.target.value)}
        aria-describedby={`ctl-ayuda-${inmuebleId}`}
        aria-invalid={errorFecha ? true : undefined}
        className="mt-1 w-full rounded-xl border border-purple-200 px-3 py-1.5 text-sm text-ink focus:border-purple focus:outline-none"
      />
      <p id={`ctl-ayuda-${inmuebleId}`} className="mt-1 text-xs text-mute">
        {t.fechaAyuda}
      </p>
      {errorFecha && (
        <p role="alert" className="mt-1 text-xs font-medium text-red-600">
          {errorFecha}
        </p>
      )}
      <label className="mt-2 flex items-start gap-2 text-xs text-gray">
        <input
          type="checkbox"
          checked={visto}
          onChange={(e) => setVisto(e.target.checked)}
          className="mt-0.5 accent-purple"
        />
        {t.visto}
      </label>
      {error && (
        <p role="alert" className="mt-1 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => void confirmar()}
          disabled={!listo || guardando}
          className="rounded-full bg-purple px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
        >
          {guardando ? t.guardando : t.confirmar}
        </button>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="rounded-full px-3 py-1 text-xs font-semibold text-mute hover:bg-cream"
        >
          {t.cancelar}
        </button>
      </div>
    </div>
  );
}

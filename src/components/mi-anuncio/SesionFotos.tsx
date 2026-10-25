"use client";

import { useState } from "react";
import Campo from "@/components/ui/Campo";
import { formatearHorario } from "@/engine/agenda/bogota";
import {
  errorDeSesion,
  puedePedirSesion,
  sesionAbierta,
} from "@/engine/antifraude/sesion";
import { FRANJAS_VISITA } from "@/engine/visita/franjas";
import type { Idioma } from "@/i18n/idiomas";
import { rellenar, type Proyectado } from "@/i18n/textos";
import { crearClienteNavegador } from "@/lib/supabase/client";
import type {
  EstadoSesionFotos,
  FranjaVisita,
  SesionFotos as Sesion,
} from "@/lib/supabase/types";
import type { MI_ANUNCIO } from "@/textos/mi-anuncio";

export type TextosSesionFotos = Proyectado<typeof MI_ANUNCIO.sesionFotos>;
export type TextosEquipo = Proyectado<typeof MI_ANUNCIO.equipo>;

const BOTON =
  "inline-flex items-center justify-center rounded-full bg-purple px-5 py-2.5 text-sm font-semibold text-white shadow-card transition-transform hover:scale-[1.03] hover:bg-purple-600 disabled:opacity-60";
const BOTON_SEC =
  "inline-flex items-center justify-center rounded-full border border-purple-200 px-5 py-2.5 text-sm font-semibold text-purple-600 transition-colors hover:bg-purple-tint disabled:opacity-60";

// El estado se dice con símbolo Y texto (el color nunca va solo).
const SIMBOLO: Record<EstadoSesionFotos, string> = {
  solicitada: "◷",
  agendada: "✓",
  hecha: "✓",
  cancelada: "✕",
};

// Lo que el equipo hizo con el anuncio: lo pausó o le pidió el CTL. Lo decide una persona del equipo, nunca una regla sola.
export function AvisosDelEquipo({
  t,
  pausado,
  ctlPedido,
}: {
  t: TextosEquipo;
  pausado: boolean;
  ctlPedido: boolean;
}) {
  if (!pausado && !ctlPedido) return null;
  const avisos = [
    pausado ? { id: "pausado", simbolo: "⏸", ...t.pausado } : null,
    ctlPedido ? { id: "ctl-pedido", simbolo: "◷", ...t.ctlPedido } : null,
  ].filter((a) => a !== null);
  return (
    <div className="space-y-3">
      {avisos.map((a) => (
        <div
          key={a.id}
          data-testid={`aviso-${a.id}`}
          className="flex gap-3 rounded-2xl border border-aviso-borde bg-aviso-tint p-4 text-sm text-ink"
        >
          <span aria-hidden="true" className="font-bold">
            {a.simbolo}
          </span>
          <div>
            <p className="font-bold">{a.titulo}</p>
            <p className="mt-1 text-gray">{a.texto}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// «Fotos que venden» (S15): el dueño pide una sesión de fotos desde su anuncio, ve en qué va y puede cancelarla. El equipo la
// agenda con él por WhatsApp. Pedirla no cuesta nada ni compromete. Una sola sesión abierta por anuncio (la base lo exige).
export default function SesionFotos({
  lang,
  t,
  token,
  sesion,
  onCambio,
}: {
  lang: Idioma;
  t: TextosSesionFotos;
  token: string;
  sesion: Sesion | null;
  onCambio: () => void | Promise<void>;
}) {
  const [franja, setFranja] = useState("");
  const [ocupado, setOcupado] = useState<"pedir" | "cancelar" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const franjas: Record<string, string> = t.franja;

  async function llamar(cual: "pedir" | "cancelar") {
    if (ocupado) return;
    if (cual === "pedir" && !franja) {
      setError(t.errores.eligeFranja);
      return;
    }
    setOcupado(cual);
    setError(null);
    const supabase = crearClienteNavegador();
    const { error: err } =
      cual === "pedir"
        ? await supabase.rpc("solicitar_sesion_fotos", {
            p_token: token,
            p_franja: franja as FranjaVisita,
          })
        : await supabase.rpc("cancelar_sesion_fotos", { p_token: token });
    if (err) setError(t.errores[errorDeSesion(err)]);
    else setFranja("");
    // También tras un error se recarga: si la sesión ya había cambiado, la pantalla se pone al día.
    await onCambio();
    setOcupado(null);
  }

  const abierta = sesionAbierta(sesion?.estado);
  const detalle = !sesion
    ? null
    : sesion.estado === "solicitada"
      ? rellenar(t.detalle.solicitada, { franja: franjas[sesion.franja] ?? "" })
      : sesion.estado === "agendada" || sesion.estado === "hecha"
        ? rellenar(t.detalle[sesion.estado], {
            cuando: sesion.agendada_para
              ? formatearHorario(sesion.agendada_para, lang)
              : "",
          })
        : t.detalle.cancelada;

  return (
    <div className="mt-3 space-y-4 rounded-2xl bg-cream p-5">
      <p className="text-sm text-gray">{t.intro}</p>

      {sesion && (
        <div
          data-testid="sesion-fotos-estado"
          data-estado={sesion.estado}
          className="space-y-2"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-white px-3 py-1 text-xs font-semibold text-ink">
            <span aria-hidden="true">{SIMBOLO[sesion.estado]}</span>
            {t.estado[sesion.estado]}
          </span>
          <p className="text-sm text-ink">{detalle}</p>
        </div>
      )}

      {abierta && (
        <button
          type="button"
          onClick={() => void llamar("cancelar")}
          disabled={ocupado !== null}
          className={BOTON_SEC}
        >
          {ocupado === "cancelar" ? t.cancelando : t.cancelar}
        </button>
      )}

      {puedePedirSesion(sesion) && (
        <div className="space-y-3">
          <Campo
            id="sesion-franja"
            control="select"
            label={t.franja.etiqueta}
            hint={t.franja.ayuda}
            value={franja}
            onChange={setFranja}
            placeholder={t.franja.placeholder}
            opciones={FRANJAS_VISITA.map((f) => ({
              value: f,
              label: franjas[f],
            }))}
          />
          <button
            type="button"
            onClick={() => void llamar("pedir")}
            disabled={ocupado !== null}
            className={BOTON}
          >
            {ocupado === "pedir" ? t.enviando : sesion ? t.pedirOtra : t.pedir}
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

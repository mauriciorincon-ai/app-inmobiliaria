"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Campo from "@/components/ui/Campo";
import type { Proyectado } from "@/i18n/textos";
import { crearClienteNavegador } from "@/lib/supabase/client";
import type { OPERADOR } from "@/textos/operador";

export type TextosContacto = Proyectado<typeof OPERADOR.salas.contacto>;

// El contacto de la sala de ventas de un proyecto (S13): lo escribe el operador, una vez por proyecto. La revista no lo trae
// y el repo jamás lo tiene; la base lo guarda en una tabla que solo las RPC del operador leen. Dos campos vacíos lo borran.
export default function GuardarSala({
  slug,
  telefono,
  direccion,
  t,
}: {
  slug: string;
  telefono: string | null;
  direccion: string | null;
  t: TextosContacto;
}) {
  const router = useRouter();
  const [tel, setTel] = useState(telefono ?? "");
  const [dir, setDir] = useState(direccion ?? "");
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(
    null,
  );

  async function guardar(ev: React.FormEvent) {
    ev.preventDefault();
    if (guardando) return;
    setGuardando(true);
    setMensaje(null);
    const { error } = await crearClienteNavegador().rpc("guardar_sala", {
      p_slug: slug,
      p_telefono: tel.trim() || null,
      p_direccion: dir.trim() || null,
    });
    setGuardando(false);
    setMensaje(
      error ? { ok: false, texto: t.error } : { ok: true, texto: t.guardado },
    );
    if (!error) router.refresh();
  }

  return (
    <form
      onSubmit={(ev) => void guardar(ev)}
      noValidate
      className="mt-3 space-y-3 rounded-2xl bg-cream p-4"
    >
      <h4 className="text-sm font-bold text-ink">{t.titulo}</h4>
      <p className="text-xs text-mute">{t.ayuda}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo
          id={`sala-tel-${slug}`}
          label={t.telefono}
          value={tel}
          onChange={setTel}
          inputMode="tel"
          autoComplete="off"
        />
        <Campo
          id={`sala-dir-${slug}`}
          label={t.direccion}
          value={dir}
          onChange={setDir}
          autoComplete="off"
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={guardando}
          className="rounded-full bg-purple px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-600 disabled:opacity-60"
        >
          {guardando ? t.guardando : t.guardar}
        </button>
        {mensaje && (
          <p
            role={mensaje.ok ? "status" : "alert"}
            className={`text-sm font-medium ${mensaje.ok ? "text-ok" : "text-red-600"}`}
          >
            {mensaje.ok ? "✓ " : ""}
            {mensaje.texto}
          </p>
        )}
      </div>
    </form>
  );
}

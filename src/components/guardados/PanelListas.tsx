"use client";

import { useCallback, useEffect, useState } from "react";
import VistaLista, {
  type TextosLista,
} from "@/components/guardados/VistaLista";
import type { Idioma } from "@/i18n/idiomas";
import { rellenar, type Proyectado } from "@/i18n/textos";
import { enviarAccion } from "@/lib/api-cliente";
import type { AnuncioGuardado, ListaResumen } from "@/lib/supabase/types";
import type { GUARDADOS } from "@/textos/guardados";

const RUTA_LISTAS = "/api/listas";

export type TextosListas = Proyectado<typeof GUARDADOS.listas>;

const BOTON =
  "rounded-full bg-purple px-5 py-2 text-sm font-semibold text-white shadow-card transition-transform hover:bg-purple-600 disabled:opacity-60";
const BOTON_SEC =
  "rounded-full border border-purple-200 px-5 py-2 text-sm font-semibold text-purple-600 transition-colors hover:bg-purple-tint disabled:opacity-60";

// Las listas de la dueña (maqueta 07), solo con el WhatsApp verificado. Crear, abrir (la misma vista que ve
// quien recibe el enlace, con los controles de la dueña) y borrar. Se carga diferido: solo la abre quien pulsa
// «Listas».
export default function PanelListas({
  lang,
  t,
  tLista,
  tipos,
  favoritos,
}: {
  lang: Idioma;
  t: TextosListas;
  tLista: TextosLista;
  tipos: Record<string, string>;
  favoritos: AnuncioGuardado[];
}) {
  const [listas, setListas] = useState<ListaResumen[] | null>(null);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [borrando, setBorrando] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const r = await enviarAccion<{ listas: ListaResumen[] }>(
      RUTA_LISTAS,
      "mias",
    );
    if (r.ok) setListas(r.datos.listas);
    else setListas([]);
  }, []);

  useEffect(() => {
    async function iniciar() {
      await cargar();
    }
    void iniciar();
  }, [cargar]);

  async function crear(ev: React.FormEvent) {
    ev.preventDefault();
    setError(null);
    const limpio = nombre.trim();
    if (!limpio) return setError(t.errores.nombre);
    setOcupado(true);
    const r = await enviarAccion<{ lista: string }>(RUTA_LISTAS, "crear", {
      nombre: limpio,
    });
    setOcupado(false);
    if (!r.ok) {
      const errores = t.errores as Record<string, string>;
      return setError(errores[r.codigo] ?? t.errores.servidor);
    }
    setNombre("");
    setAbierta(r.datos.lista);
    await cargar();
  }

  async function borrar(id: string) {
    setOcupado(true);
    const r = await enviarAccion(RUTA_LISTAS, "borrar", { lista: id });
    setOcupado(false);
    setBorrando(null);
    if (!r.ok) return setError(t.errores.servidor);
    if (abierta === id) setAbierta(null);
    await cargar();
  }

  return (
    <section aria-labelledby="listas-titulo" className="space-y-4">
      <h2 id="listas-titulo" className="text-xl font-bold text-ink">
        {t.titulo}
      </h2>

      <form
        onSubmit={(ev) => void crear(ev)}
        className="flex flex-wrap items-end gap-2"
      >
        <label className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ink">
            {t.nombre}
          </span>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            maxLength={60}
            placeholder={t.ejemplo}
            className="mt-1.5 w-full rounded-2xl border border-purple-200 bg-white px-4 py-2.5 text-base text-ink placeholder:text-mute focus:border-purple focus:outline-none"
          />
        </label>
        <button type="submit" disabled={ocupado} className={BOTON}>
          {ocupado ? t.creando : t.crear}
        </button>
      </form>
      {error && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {error}
        </p>
      )}

      {listas !== null && listas.length === 0 && (
        <p className="rounded-2xl bg-cream px-5 py-6 text-center text-sm text-gray">
          {t.vacio}
        </p>
      )}

      <ul className="space-y-4">
        {(listas ?? []).map((l) => {
          const n = l.slugs.length;
          const abierto = abierta === l.id;
          return (
            <li
              key={l.id}
              className="space-y-3 rounded-2xl border border-purple-200 bg-white p-4 shadow-soft"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-ink">{l.nombre}</p>
                  <p className="text-sm text-mute">
                    {n === 1
                      ? t.anunciosUno
                      : rellenar(t.anunciosVarios, { n })}
                    {l.compartida && ` · ${t.compartida}`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    aria-expanded={abierto}
                    onClick={() => setAbierta(abierto ? null : l.id)}
                    className={BOTON_SEC}
                  >
                    {abierto ? t.cerrar : t.abrir}
                  </button>
                  {borrando === l.id ? (
                    <button
                      type="button"
                      disabled={ocupado}
                      onClick={() => void borrar(l.id)}
                      className="rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      {t.borrarConfirma}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setBorrando(l.id)}
                      className="text-sm font-semibold text-gray underline-offset-4 hover:underline"
                    >
                      {t.borrar}
                    </button>
                  )}
                </div>
              </div>
              {abierto && (
                <VistaLista
                  lista={l.id}
                  lang={lang}
                  t={tLista}
                  tipos={tipos}
                  favoritos={favoritos}
                  onCambio={cargar}
                />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

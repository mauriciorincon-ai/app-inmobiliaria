"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { formatearCOP } from "@/engine/format/cop";
import {
  enlaceCompartirWhatsapp,
  enlaceLista,
} from "@/engine/guardados/listas";
import { extraerTokenDeHash } from "@/engine/token/token";
import type { Idioma } from "@/i18n/idiomas";
import { rellenar, type Proyectado } from "@/i18n/textos";
import { enviarAccion } from "@/lib/api-cliente";
import { keyThumb, urlPublicaFoto } from "@/lib/fotos-url";
import type {
  AnuncioGuardado,
  ItemDeLista,
  ListaDetalle,
} from "@/lib/supabase/types";
import type { GUARDADOS } from "@/textos/guardados";

const RUTA_LISTAS = "/api/listas";

export type TextosLista = Proyectado<typeof GUARDADOS.lista>;

type Carga =
  | { fase: "cargando" }
  | { fase: "sin-enlace" }
  | { fase: "error" }
  | { fase: "lista"; lista: ListaDetalle };

const BOTON =
  "rounded-full bg-purple px-5 py-2 text-sm font-semibold text-white shadow-card transition-transform hover:bg-purple-600 disabled:opacity-60";
const BOTON_SEC =
  "rounded-full border border-purple-200 px-5 py-2 text-sm font-semibold text-purple-600 transition-colors hover:bg-purple-tint disabled:opacity-60";
const CAMPO =
  "w-full rounded-2xl border border-purple-200 bg-white px-4 py-2.5 text-base text-ink placeholder:text-mute focus:border-purple focus:outline-none";

// Una lista de anuncios con sus notas (maqueta 07). La ven su dueña (`lista` = su id, desde «Guardados») y
// quien llega con el enlace (`/lista#t=…`, sin `lista`: el token se lee del fragmento, que no llega al servidor).
// Escribir una nota exige el WhatsApp verificado también a quien llega por el enlace. La dueña comparte (el
// enlace se muestra UNA vez y el anterior deja de servir), deja de compartir, agrega de sus favoritos y quita.
// Innmobiliaria no envía nada: «Compartir por WhatsApp» abre WhatsApp con el texto escrito y sin número.
export default function VistaLista({
  lista: idLista,
  lang,
  t,
  tipos,
  favoritos = [],
  onCambio,
}: {
  lista?: string;
  lang: Idioma;
  t: TextosLista;
  tipos: Record<string, string>;
  favoritos?: AnuncioGuardado[];
  onCambio?: () => void | Promise<void>;
}) {
  const [carga, setCarga] = useState<Carga>({ fase: "cargando" });
  const [token, setToken] = useState<string | null>(null);
  const [enlace, setEnlace] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notas, setNotas] = useState<Record<string, string>>({});
  const [paraAgregar, setParaAgregar] = useState("");

  const cargar = useCallback(
    async (tok: string | null) => {
      const r = await enviarAccion<{ lista: ListaDetalle }>(
        RUTA_LISTAS,
        "ver",
        tok ? { token: tok } : { lista: idLista },
      );
      if (r.ok) return setCarga({ fase: "lista", lista: r.datos.lista });
      setCarga({
        fase: r.status === 0 || r.status >= 500 ? "error" : "sin-enlace",
      });
    },
    [idLista],
  );

  useEffect(() => {
    async function iniciar() {
      if (idLista) return cargar(null);
      // El fragmento solo existe en el navegador: se resuelve tras montar.
      const tok = extraerTokenDeHash(window.location.hash);
      if (!tok) return setCarga({ fase: "sin-enlace" });
      setToken(tok);
      await cargar(tok);
    }
    void iniciar();
  }, [idLista, cargar]);

  // Una acción sobre la lista: si sale bien se vuelve a leer; si no, se dice por qué (sin el texto de la base).
  async function actuar(
    accion: string,
    resto: Record<string, unknown>,
    ok?: string,
  ): Promise<boolean> {
    setOcupado(true);
    setError(null);
    setAviso(null);
    const r = await enviarAccion<Record<string, unknown>>(
      RUTA_LISTAS,
      accion,
      resto,
    );
    setOcupado(false);
    if (!r.ok) {
      const errores = t.errores as Record<string, string>;
      setError(errores[r.codigo] ?? t.errores.servidor);
      return false;
    }
    if (ok) setAviso(ok);
    await cargar(token);
    await onCambio?.();
    return true;
  }

  const destino = token ? { token } : { lista: idLista };

  if (carga.fase === "cargando") {
    return (
      <p className="text-sm text-mute" role="status">
        {t.cargando}
      </p>
    );
  }
  if (carga.fase === "sin-enlace") {
    return (
      <div className="rounded-[2rem] bg-cream px-6 py-12 text-center">
        <h1 className="text-lg font-bold text-ink">{t.sinEnlace.titulo}</h1>
        <p className="mt-2 text-sm text-gray">{t.sinEnlace.texto}</p>
      </div>
    );
  }
  if (carga.fase === "error") {
    return (
      <div
        role="alert"
        className="rounded-2xl bg-red-50 px-5 py-4 text-sm font-medium text-red-700"
      >
        {t.error}
      </div>
    );
  }

  const lista = carga.lista;
  const Titulo = idLista ? "h3" : "h1";
  const n = lista.items.length;
  const enLista = new Set(lista.items.map((i) => i.slug));
  const faltan = favoritos.filter((f) => !enLista.has(f.slug));

  async function compartir() {
    setOcupado(true);
    setError(null);
    setAviso(null);
    const r = await enviarAccion<{ token: string }>(RUTA_LISTAS, "compartir", {
      lista: lista.id,
    });
    setOcupado(false);
    if (!r.ok) {
      const errores = t.errores as Record<string, string>;
      return setError(errores[r.codigo] ?? t.errores.servidor);
    }
    setEnlace(enlaceLista(window.location.origin, r.datos.token));
    setCopiado(false);
    await cargar(token);
    await onCambio?.();
  }

  async function copiar(texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  }

  function tarjeta(item: ItemDeLista) {
    const tipo = tipos[item.tipo] ?? tipos.inmueble;
    const nombre = `${tipo} · ${item.barrio}`;
    return (
      <li
        key={item.slug}
        className="rounded-2xl border border-purple-200 bg-white p-3 shadow-soft"
      >
        <div className="flex gap-3">
          {item.portada ? (
            // eslint-disable-next-line @next/next/no-img-element -- WebP ya optimizado en R2; next/image no aporta
            <img
              src={urlPublicaFoto(keyThumb(item.portada))}
              alt=""
              width={96}
              height={72}
              loading="lazy"
              decoding="async"
              className="h-[72px] w-24 shrink-0 rounded-xl object-cover"
            />
          ) : (
            <div
              aria-hidden="true"
              className="h-[72px] w-24 shrink-0 rounded-xl bg-purple-tint"
            />
          )}
          <div className="min-w-0">
            <Link
              href={`/i/${item.slug}`}
              aria-label={rellenar(t.ver, { anuncio: nombre })}
              className="font-semibold text-ink underline-offset-4 hover:underline"
            >
              {nombre}
            </Link>
            <p className="text-sm text-gray">
              {formatearCOP(item.precio_esperado, lang)}
            </p>
            {lista.es_dueno && (
              <button
                type="button"
                disabled={ocupado}
                onClick={() =>
                  void actuar("quitar", {
                    lista: lista.id,
                    slug: item.slug,
                  })
                }
                className="mt-1 text-sm font-semibold text-gray underline-offset-4 hover:underline"
              >
                {t.quitar}
              </button>
            )}
          </div>
        </div>

        {item.notas.length > 0 && (
          <ul className="mt-3 space-y-2">
            {item.notas.map((nota) => (
              <li
                key={nota.id}
                className={`flex items-start justify-between gap-3 rounded-xl px-3 py-2 text-sm ${
                  nota.es_mia ? "bg-purple-tint" : "bg-cream"
                }`}
              >
                <p>
                  <strong>{nota.es_mia ? t.notas.tu : nota.autor}:</strong>{" "}
                  {nota.texto}
                </p>
                {(nota.es_mia || lista.es_dueno) && (
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() =>
                      void actuar("borrar_nota", { nota: nota.id })
                    }
                    className="shrink-0 text-xs font-semibold text-gray underline-offset-4 hover:underline"
                  >
                    {t.notas.borrar}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {lista.puede_escribir && (
          <form
            className="mt-3 flex gap-2"
            onSubmit={(ev) => {
              ev.preventDefault();
              const texto = (notas[item.slug] ?? "").trim();
              if (!texto) return;
              // Se vacía al enviar (no al terminar, que pisaría lo que se escriba entretanto) y vuelve si falla.
              setNotas((p) => ({ ...p, [item.slug]: "" }));
              void actuar("nota", {
                ...destino,
                slug: item.slug,
                texto,
              }).then((bien) => {
                if (!bien) setNotas((p) => ({ ...p, [item.slug]: texto }));
              });
            }}
          >
            <label className="min-w-0 flex-1">
              <span className="sr-only">
                {t.notas.etiqueta}: {nombre}
              </span>
              <input
                value={notas[item.slug] ?? ""}
                onChange={(e) =>
                  setNotas((p) => ({ ...p, [item.slug]: e.target.value }))
                }
                maxLength={280}
                placeholder={t.notas.ejemplo}
                className={CAMPO}
              />
            </label>
            <button type="submit" disabled={ocupado} className={BOTON_SEC}>
              {ocupado ? t.notas.enviando : t.notas.enviar}
            </button>
          </form>
        )}
      </li>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Titulo className="text-2xl font-extrabold tracking-tight text-ink">
          {lista.nombre}
        </Titulo>
        <p className="mt-1 text-sm text-mute">
          {rellenar(t.por, { dueno: lista.dueno })} ·{" "}
          {n === 1 ? t.anunciosUno : rellenar(t.anunciosVarios, { n })}
        </p>
      </div>

      {!lista.puede_escribir && (
        <div className="rounded-2xl bg-cream p-4">
          <p className="text-sm text-gray">{t.notas.verificar}</p>
          <Link
            href={`/verificar?volver=${encodeURIComponent("/lista")}${token ? `#t=${token}` : ""}`}
            className={`${BOTON} mt-3 inline-flex`}
          >
            {t.notas.boton}
          </Link>
        </div>
      )}

      {lista.es_dueno && (
        <div className="space-y-3 rounded-2xl border border-purple-200 bg-white p-4">
          <p className="text-sm text-gray">
            {lista.compartida ? t.compartir.estado : t.compartir.sin}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={ocupado}
              onClick={() => void compartir()}
              className={BOTON_SEC}
            >
              {t.compartir.boton}
            </button>
            {lista.compartida && (
              <button
                type="button"
                disabled={ocupado}
                onClick={() => {
                  setEnlace(null);
                  void actuar(
                    "revocar",
                    { lista: lista.id },
                    t.compartir.revocada,
                  );
                }}
                className={BOTON_SEC}
              >
                {t.compartir.revocar}
              </button>
            )}
          </div>
          {lista.compartida && (
            <p className="text-xs text-mute">{t.compartir.nuevo}</p>
          )}
          {enlace && (
            <div className="space-y-2 rounded-xl bg-mint p-3 text-sm text-ok">
              <p>✓ {t.compartir.listo}</p>
              <p className="break-all text-ink">{enlace}</p>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={enlaceCompartirWhatsapp(
                    rellenar(t.compartir.texto, { nombre: lista.nombre }),
                    enlace,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={BOTON}
                >
                  {t.compartir.boton}
                </a>
                <button
                  type="button"
                  onClick={() => void copiar(enlace)}
                  className={BOTON_SEC}
                >
                  {t.compartir.copiar}
                </button>
                {copiado && (
                  <span role="status" className="font-medium">
                    {t.compartir.copiado}
                  </span>
                )}
              </div>
            </div>
          )}
          {favoritos.length > 0 && (
            <form
              className="flex flex-wrap items-end gap-2"
              onSubmit={(ev) => {
                ev.preventDefault();
                if (!paraAgregar) return;
                // Se limpia al enviar: el favorito elegido sale de las opciones apenas se agrega.
                const slug = paraAgregar;
                setParaAgregar("");
                void actuar("agregar", { lista: lista.id, slug });
              }}
            >
              {faltan.length > 0 ? (
                <>
                  <label className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-ink">
                      {t.agregar.etiqueta}
                    </span>
                    <select
                      value={paraAgregar}
                      onChange={(e) => setParaAgregar(e.target.value)}
                      className={`${CAMPO} mt-1.5`}
                    >
                      <option value="">{t.agregar.elegir}</option>
                      {faltan.map((f) => (
                        <option key={f.slug} value={f.slug}>
                          {tipos[f.tipo] ?? tipos.inmueble} · {f.barrio}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="submit"
                    disabled={ocupado || !paraAgregar}
                    className={BOTON_SEC}
                  >
                    {t.agregar.boton}
                  </button>
                </>
              ) : (
                <p className="text-sm text-mute">{t.agregar.ninguno}</p>
              )}
            </form>
          )}
        </div>
      )}

      <div aria-live="polite">
        {aviso && (
          <p role="status" className="text-sm font-medium text-ok">
            ✓ {aviso}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm font-medium text-red-600">
            {error}
          </p>
        )}
      </div>

      {lista.no_disponibles > 0 && (
        <p className="text-sm text-mute">
          {rellenar(t.noDisponibles, { n: lista.no_disponibles })}
        </p>
      )}

      {n === 0 ? (
        <p className="rounded-2xl bg-cream px-5 py-6 text-center text-sm text-gray">
          {t.vacia}
        </p>
      ) : (
        <ul className="space-y-3">{lista.items.map(tarjeta)}</ul>
      )}
    </div>
  );
}

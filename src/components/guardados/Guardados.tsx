"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import TarjetaAnuncio, {
  type TextosTarjeta,
} from "@/components/buscar/TarjetaAnuncio";
import type { TextosSello } from "@/components/ficha/SelloNivel";
import type { TextosVivo } from "@/components/ficha/VivoHace";
import type { TextosFavorito } from "@/components/guardados/CorazonFavorito";
import {
  alternarSeleccion,
  puedeComparar,
  TOPE_COMPARAR,
} from "@/engine/guardados/comparar";
import { leerFavoritos, unirFavoritos } from "@/engine/guardados/favoritos";
import type { Idioma } from "@/i18n/idiomas";
import { rellenar, type Proyectado } from "@/i18n/textos";
import { enviarJson } from "@/lib/api-cliente";
import {
  avisarFavorito,
  favoritosLocales,
  fusionarConCuenta,
  guardarFavoritosLocales,
  instantaneaFavoritos,
  suscribirFavoritos,
} from "@/lib/favoritos-cliente";
import type { AnuncioGuardado } from "@/lib/supabase/types";
import type { GUARDADOS } from "@/textos/guardados";

export type TextosGuardados = Proyectado<typeof GUARDADOS>;

type Vista = "favoritos" | "comparar" | "listas";
type Carga = "cargando" | "listo" | "error";

// La tabla y las listas pesan: solo se descargan cuando se abre su pestaña.
const TablaComparar = dynamic(
  () => import("@/components/guardados/TablaComparar"),
  { loading: () => null },
);
const PanelListas = dynamic(
  () => import("@/components/guardados/PanelListas"),
  { loading: () => null },
);

const BOTON =
  "inline-flex items-center justify-center rounded-full bg-purple px-5 py-2 text-sm font-semibold text-white shadow-card transition-transform hover:bg-purple-600 disabled:opacity-50";

// «Guardados» (maqueta 07, ADR 017): favoritos sin cuenta, comparar hasta 4 y listas. Los favoritos viven en
// ESTE teléfono; si el navegador ya verificó su WhatsApp, al abrir se fusionan con los de la cuenta (sin
// duplicar) y quedan también ahí. Los datos del anuncio salen de la misma lista blanca que `/buscar`.
export default function Guardados({
  lang,
  t,
  tSello,
  tVivo,
  tTarjeta,
  tFavorito,
  tipos,
}: {
  lang: Idioma;
  t: TextosGuardados;
  tSello: TextosSello;
  tVivo: TextosVivo;
  tTarjeta: TextosTarjeta;
  tFavorito: TextosFavorito;
  tipos: Record<string, string>;
}) {
  const crudo = useSyncExternalStore(
    suscribirFavoritos,
    instantaneaFavoritos,
    () => "",
  );
  const slugs = useMemo(() => leerFavoritos(crudo), [crudo]);
  const [carga, setCarga] = useState<Carga>("cargando");
  const [cuenta, setCuenta] = useState(false);
  const [anuncios, setAnuncios] = useState<AnuncioGuardado[]>([]);
  const [vista, setVista] = useState<Vista>("favoritos");
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [tope, setTope] = useState(false);

  useEffect(() => {
    let vigente = true;
    async function cargar() {
      const delCuenta = await fusionarConCuenta(favoritosLocales());
      const todos = delCuenta
        ? unirFavoritos(delCuenta, favoritosLocales())
        : favoritosLocales();
      if (delCuenta) guardarFavoritosLocales(todos);
      const r =
        todos.length > 0
          ? await enviarJson<{ anuncios: AnuncioGuardado[] }>(
              "/api/anuncios/resumen",
              { slugs: todos },
            )
          : null;
      if (!vigente) return;
      setCuenta(delCuenta !== null);
      if (r && !r.ok) return setCarga("error");
      setAnuncios(r?.ok ? r.datos.anuncios : []);
      setCarga("listo");
    }
    void cargar();
    return () => {
      vigente = false;
    };
  }, []);

  const porSlug = new Map(anuncios.map((a) => [a.slug, a]));
  const visibles = slugs.flatMap((s) => {
    const a = porSlug.get(s);
    return a ? [a] : [];
  });
  const noDisponibles = carga === "listo" ? slugs.length - visibles.length : 0;
  const elegidos = seleccion.filter((s) => visibles.some((a) => a.slug === s));
  const ahora = new Date();

  function marcar(slug: string) {
    const r = alternarSeleccion(elegidos, slug);
    setSeleccion(r.seleccion);
    setTope(r.tope);
  }

  function limpiar() {
    const faltantes = slugs.filter((s) => !porSlug.has(s));
    guardarFavoritosLocales(slugs.filter((s) => porSlug.has(s)));
    for (const s of faltantes) void avisarFavorito(s, false);
  }

  const verificar = `/verificar?volver=${encodeURIComponent("/guardados")}`;
  const pestana = (v: Vista, texto: string) => (
    <button
      key={v}
      type="button"
      aria-pressed={vista === v}
      onClick={() => setVista(v)}
      className={`rounded-full px-5 py-1.5 text-sm font-semibold transition-colors ${
        vista === v
          ? "bg-purple text-white"
          : "text-purple-600 hover:bg-purple-200"
      }`}
    >
      {texto}
    </button>
  );

  return (
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight text-ink">
        {t.titulo}
      </h1>
      <div
        role="group"
        aria-label={t.vista.grupo}
        className="mt-4 inline-flex rounded-full bg-purple-tint p-1"
      >
        {pestana("favoritos", t.vista.favoritos)}
        {pestana("comparar", t.vista.comparar)}
        {pestana("listas", t.vista.listas)}
      </div>

      {carga === "listo" && vista !== "comparar" && (
        <p className="mt-4 rounded-2xl bg-purple-tint px-4 py-3 text-sm text-gray">
          {cuenta ? (
            t.aviso.cuenta
          ) : (
            <>
              {t.aviso.telefono}{" "}
              <Link
                href={verificar}
                className="font-semibold text-purple-600 underline"
              >
                {t.aviso.verificar}
              </Link>
            </>
          )}
        </p>
      )}

      <div className="mt-5">
        {carga === "cargando" && (
          <p className="text-sm text-mute" role="status">
            {t.cargando}
          </p>
        )}
        {carga === "error" && (
          <div
            role="alert"
            className="rounded-2xl bg-red-50 px-5 py-4 text-sm font-medium text-red-700"
          >
            {t.error}
          </div>
        )}

        {carga === "listo" && vista === "favoritos" && (
          <>
            {visibles.length === 0 ? (
              <div className="rounded-[2rem] bg-cream px-6 py-12 text-center">
                <h2 className="text-lg font-bold text-ink">
                  {t.favoritos.vacio.titulo}
                </h2>
                <p className="mt-2 text-sm text-gray">
                  {t.favoritos.vacio.texto}
                </p>
                <Link href="/buscar" className={`${BOTON} mt-4`}>
                  {t.favoritos.vacio.boton}
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-ink">
                    {rellenar(t.favoritos.contador, {
                      n: elegidos.length,
                      tope: TOPE_COMPARAR,
                    })}
                  </p>
                  <button
                    type="button"
                    disabled={!puedeComparar(elegidos)}
                    onClick={() => setVista("comparar")}
                    className={BOTON}
                  >
                    {t.favoritos.comparar}
                  </button>
                </div>
                {tope && (
                  <p
                    role="status"
                    className="mb-4 rounded-2xl border border-aviso-borde bg-aviso-tint px-4 py-3 text-sm font-medium text-aviso"
                  >
                    ▲ {rellenar(t.favoritos.tope, { tope: TOPE_COMPARAR })}
                  </p>
                )}
                <ul className="grid gap-4 sm:grid-cols-2">
                  {visibles.map((r) => {
                    const nombre = `${tipos[r.tipo] ?? tipos.inmueble} · ${r.barrio}`;
                    return (
                      <TarjetaAnuncio
                        key={r.slug}
                        r={r}
                        tipo={tipos[r.tipo] ?? tipos.inmueble}
                        lang={lang}
                        t={tTarjeta}
                        tSello={tSello}
                        tVivo={tVivo}
                        tFavorito={tFavorito}
                        ahora={ahora}
                        pie={
                          <label className="flex items-center gap-2 text-sm font-semibold text-ink">
                            <input
                              type="checkbox"
                              checked={elegidos.includes(r.slug)}
                              onChange={() => marcar(r.slug)}
                              aria-label={rellenar(t.favoritos.marcarAria, {
                                anuncio: nombre,
                              })}
                              className="h-5 w-5 rounded border-purple-200 accent-purple"
                            />
                            {t.favoritos.marcar}
                          </label>
                        }
                      />
                    );
                  })}
                </ul>
              </>
            )}
            {noDisponibles > 0 && (
              <p className="mt-4 text-sm text-mute">
                {noDisponibles === 1
                  ? t.favoritos.noDisponiblesUno
                  : rellenar(t.favoritos.noDisponiblesVarios, {
                      n: noDisponibles,
                    })}{" "}
                <button
                  type="button"
                  onClick={limpiar}
                  className="font-semibold text-purple-600 underline"
                >
                  {t.favoritos.limpiar}
                </button>
              </p>
            )}
          </>
        )}

        {carga === "listo" && vista === "comparar" && (
          <TablaComparar
            anuncios={visibles}
            seleccion={elegidos}
            lang={lang}
            t={t.comparar}
            tSello={tSello}
            tVivo={tVivo}
            onCambiar={() => setVista("favoritos")}
          />
        )}

        {carga === "listo" && vista === "listas" && (
          <>
            {cuenta ? (
              <PanelListas
                lang={lang}
                t={t.listas}
                tLista={t.lista}
                tipos={tipos}
                favoritos={visibles}
              />
            ) : (
              <div className="rounded-[2rem] bg-cream px-6 py-12 text-center">
                <h2 className="text-lg font-bold text-ink">
                  {t.listas.primeroWhatsapp.titulo}
                </h2>
                <p className="mt-2 text-sm text-gray">
                  {t.listas.primeroWhatsapp.texto}
                </p>
                <Link href={verificar} className={`${BOTON} mt-4`}>
                  {t.aviso.verificar}
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

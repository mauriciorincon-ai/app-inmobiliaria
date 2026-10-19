"use client";

import Link from "next/link";
import SelloNivel, { type TextosSello } from "@/components/ficha/SelloNivel";
import type { TextosVivo } from "@/components/ficha/VivoHace";
import { textoVivo } from "@/components/ficha/vivo-texto";
import { columnasComparar } from "@/engine/guardados/comparar";
import { formatearCOP } from "@/engine/format/cop";
import type { Idioma } from "@/i18n/idiomas";
import type { Proyectado } from "@/i18n/textos";
import type { AnuncioGuardado } from "@/lib/supabase/types";
import type { GUARDADOS } from "@/textos/guardados";

export type TextosComparar = Proyectado<typeof GUARDADOS.comparar>;

// Sin dato (p. ej. un área que no sirve para dividir): un guion, nunca un número inventado.
const SIN_DATO = "—";
// Unidad de superficie: igual en los dos idiomas, no es texto de la interfaz.
const UNIDAD_AREA = "m²";

// La tabla de comparar (maqueta 07): una columna por anuncio, en el orden en que se marcaron, con precio, área,
// precio por m², habitaciones, el sello del dueño y «vivo hace». La fila «¿Está caro?» de la maqueta llega con
// su propio sprint. Se carga diferido: solo la abre quien pulsa «Comparar».
export default function TablaComparar({
  anuncios,
  seleccion,
  lang,
  t,
  tSello,
  tVivo,
  onCambiar,
}: {
  anuncios: AnuncioGuardado[];
  seleccion: string[];
  lang: Idioma;
  t: TextosComparar;
  tSello: TextosSello;
  tVivo: TextosVivo;
  onCambiar: () => void;
}) {
  const ahora = new Date();
  const columnas = columnasComparar(anuncios, seleccion, ahora);
  const porSlug = new Map(anuncios.map((a) => [a.slug, a]));

  if (columnas.length < 2) {
    return (
      <div className="rounded-[2rem] bg-cream px-6 py-10 text-center">
        <p className="text-sm text-gray">{t.pocos}</p>
        <button
          type="button"
          onClick={onCambiar}
          className="mt-4 rounded-full bg-purple px-5 py-2 text-sm font-semibold text-white hover:bg-purple-600"
        >
          {t.cambiar}
        </button>
      </div>
    );
  }

  const celda = "min-w-36 px-4 py-3 align-top text-sm text-ink";
  const fila = "border-t border-purple-100";
  // La columna de datos se queda fija al deslizar de lado (con 3 o 4 anuncios la tabla no cabe en el teléfono).
  const etiquetaFila =
    "sticky left-0 bg-white px-4 py-3 text-left text-sm font-semibold text-gray";

  return (
    <div>
      <p className="mb-3 text-sm text-mute">{t.ayuda}</p>
      <div className="overflow-x-auto rounded-2xl border border-purple-200 bg-white shadow-soft">
        <table className="w-full border-collapse">
          <caption className="sr-only">{t.tabla}</caption>
          <thead>
            <tr>
              <th scope="col" className={etiquetaFila}>
                <span className="sr-only">{t.dato}</span>
              </th>
              {columnas.map((c) => (
                <th
                  key={c.slug}
                  scope="col"
                  className="px-4 py-3 text-left text-sm font-bold text-ink"
                >
                  <Link
                    href={`/i/${c.slug}`}
                    className="text-purple-600 underline underline-offset-4"
                  >
                    {c.barrio}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className={fila}>
              <th scope="row" className={etiquetaFila}>
                {t.filas.precio}
              </th>
              {columnas.map((c) => (
                <td key={c.slug} className={`${celda} font-semibold`}>
                  {formatearCOP(c.precio, lang)}
                </td>
              ))}
            </tr>
            <tr className={fila}>
              <th scope="row" className={etiquetaFila}>
                {t.filas.area}
              </th>
              {columnas.map((c) => (
                <td key={c.slug} className={celda}>
                  {c.area} {UNIDAD_AREA}
                </td>
              ))}
            </tr>
            <tr className={fila}>
              <th scope="row" className={etiquetaFila}>
                {t.filas.precioM2}
              </th>
              {columnas.map((c) => (
                <td key={c.slug} className={celda}>
                  {c.precioPorM2 === null
                    ? SIN_DATO
                    : formatearCOP(c.precioPorM2, lang)}
                </td>
              ))}
            </tr>
            <tr className={fila}>
              <th scope="row" className={etiquetaFila}>
                {t.filas.habitaciones}
              </th>
              {columnas.map((c) => (
                <td key={c.slug} className={celda}>
                  {c.habitaciones}
                </td>
              ))}
            </tr>
            <tr className={fila}>
              <th scope="row" className={etiquetaFila}>
                {t.filas.dueno}
              </th>
              {columnas.map((c) => {
                const a = porSlug.get(c.slug);
                return (
                  <td key={c.slug} className={celda}>
                    {a && (
                      <SelloNivel
                        nivel={a.nivel_verificacion}
                        ctlExpedidoEl={a.ctl_expedido_el}
                        lang={lang}
                        t={tSello}
                        compacto
                      />
                    )}
                  </td>
                );
              })}
            </tr>
            <tr className={fila}>
              <th scope="row" className={etiquetaFila}>
                {t.filas.vivo}
              </th>
              {columnas.map((c) => (
                <td key={c.slug} className={celda}>
                  {textoVivo(c.vivoDias, tVivo) ?? SIN_DATO}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={onCambiar}
        className="mt-4 rounded-full border border-purple-200 px-5 py-2 text-sm font-semibold text-purple-600 hover:bg-purple-tint"
      >
        {t.cambiar}
      </button>
    </div>
  );
}

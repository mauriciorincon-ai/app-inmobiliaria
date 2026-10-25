"use client";

import { useMemo, useState } from "react";
import PapeleoClausulas from "@/components/papeleo/PapeleoClausulas";
import PapeleoGastos from "@/components/papeleo/PapeleoGastos";
import { Documentos, Plazos } from "@/components/papeleo/PapeleoGuia";
import Casilla from "@/components/papeleo/Casilla";
import Campo from "@/components/ui/Campo";
import {
  ENTRADA_INICIAL,
  REPARTOS,
  TIPOS_VIVIENDA,
  gastos,
  type EntradaGastos,
  type QuienVende,
  type Reparto,
  type TipoVivienda,
} from "@/engine/papeleo/gastos";
import { leerDinero } from "@/engine/papeleo/formulario";
import type { Idioma } from "@/i18n/idiomas";
import type { Proyectado } from "@/i18n/textos";
import {
  CIUDADES,
  CONSULTADO_CLAUSULAS,
  ESCRITURACION,
  TARIFAS_PAPELEO,
} from "@/lib/papeleo/datos";
import type { PAPELEO } from "@/textos/papeleo";
import type { PAPELEO_CLAUSULAS } from "@/textos/papeleo-clausulas";

export type TextosPapeleo = Proyectado<typeof PAPELEO>;
export type TextosClausulas = Proyectado<typeof PAPELEO_CLAUSULAS>;

type Seccion = "gastos" | "documentos" | "plazos" | "clausulas";
const SECCIONES: readonly Seccion[] = [
  "gastos",
  "documentos",
  "plazos",
  "clausulas",
];

type Campos = {
  precio: string;
  ciudad: string;
  tipo: TipoVivienda;
  subsidio: boolean;
  vende: QuienVende;
  reparto: Reparto;
  avaluo: string;
  credito: boolean;
};

const texto = (n: number | null) => (n === null ? "" : String(n));

// El asistente del papeleo (maqueta 11). Todo ocurre en el teléfono: NO hay <form> ni ninguna petición con lo que se escribe,
// y nada se guarda. Lo único que llega del servidor es la entrada de partida (la que trae el enlace de la ficha) y la fecha de hoy.
export default function Papeleo({
  lang,
  t,
  c,
  inicial,
  hoy,
  desdeAnuncio,
}: {
  lang: Idioma;
  t: TextosPapeleo;
  c: TextosClausulas;
  inicial: EntradaGastos;
  hoy: string;
  desdeAnuncio: boolean;
}) {
  const [campos, setCampos] = useState<Campos>({
    precio: texto(inicial.precio),
    ciudad: inicial.ciudad,
    tipo: inicial.tipo,
    subsidio: inicial.subsidio,
    vende: inicial.vende,
    reparto: inicial.reparto,
    avaluo: texto(inicial.avaluo),
    credito: inicial.credito,
  });
  const [seccion, setSeccion] = useState<Seccion>("gastos");
  const cambiar = <K extends keyof Campos>(k: K, v: Campos[K]) =>
    setCampos((prev) => ({ ...prev, [k]: v }));

  const precio = leerDinero(campos.precio);
  const avaluo = leerDinero(campos.avaluo);
  const r = useMemo(
    () =>
      gastos(
        {
          precio,
          ciudad: campos.ciudad,
          tipo: campos.tipo,
          subsidio: campos.tipo === "normal" ? false : campos.subsidio,
          vende: campos.vende,
          reparto: campos.reparto,
          avaluo,
          credito: campos.credito,
        },
        ESCRITURACION,
        TARIFAS_PAPELEO,
        hoy,
      ),
    [campos, precio, avaluo, hoy],
  );
  const invalido = (v: string, n: number | null) =>
    v.trim() !== "" && n === null ? t.campos.invalido : undefined;
  // Los ajustes nacen abiertos solo si la entrada de partida ya salió de lo habitual.
  const ajustesAbiertos =
    inicial.vende !== ENTRADA_INICIAL.vende ||
    inicial.reparto !== ENTRADA_INICIAL.reparto ||
    inicial.avaluo !== null ||
    inicial.credito;

  return (
    <div className="mt-4 space-y-5">
      <div
        role="group"
        aria-label={t.campos.grupo}
        className="space-y-4 rounded-2xl border border-purple-200 bg-white p-5"
      >
        <Campo
          id="pap-precio"
          label={t.campos.precio.etiqueta}
          inputMode="numeric"
          autoComplete="off"
          value={campos.precio}
          onChange={(v) => cambiar("precio", v)}
          error={invalido(campos.precio, precio)}
          hint={desdeAnuncio ? t.campos.precio.ayudaAnuncio : undefined}
          placeholder={t.campos.precio.ejemplo}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            id="pap-ciudad"
            control="select"
            label={t.campos.ciudad.etiqueta}
            hint={t.campos.ciudad.ayuda}
            value={campos.ciudad}
            onChange={(v) => cambiar("ciudad", v)}
            placeholder={t.campos.ciudad.etiqueta}
            opciones={CIUDADES.map((o) => ({
              value: o.id,
              label:
                o.nombre ?? t.ciudades[o.id as keyof typeof t.ciudades] ?? o.id,
            }))}
          />
          <Campo
            id="pap-tipo"
            control="select"
            label={t.campos.tipo.etiqueta}
            value={campos.tipo}
            onChange={(v) => cambiar("tipo", v as TipoVivienda)}
            placeholder={t.campos.tipo.etiqueta}
            opciones={TIPOS_VIVIENDA.map((x) => ({
              value: x,
              label: t.campos.tipo[x],
            }))}
          />
        </div>
        {campos.tipo !== "normal" && (
          <Casilla
            id="pap-subsidio"
            etiqueta={t.campos.subsidio.etiqueta}
            ayuda={t.campos.subsidio.ayuda}
            marcada={campos.subsidio}
            onChange={(m) => cambiar("subsidio", m)}
          />
        )}
        <details
          open={ajustesAbiertos}
          className="rounded-2xl border border-purple-100 p-4"
        >
          <summary className="cursor-pointer font-semibold text-ink">
            {t.campos.ajustes.titulo}
            <span className="ml-2 text-sm font-normal text-gray">
              {t.campos.ajustes.ayuda}
            </span>
          </summary>
          <div className="mt-4 space-y-4">
            <Campo
              id="pap-vende"
              control="select"
              label={t.campos.vende.etiqueta}
              value={campos.vende}
              onChange={(v) => cambiar("vende", v as QuienVende)}
              placeholder={t.campos.vende.etiqueta}
              opciones={(["persona", "empresa"] as const).map((x) => ({
                value: x,
                label: t.campos.vende[x],
              }))}
            />
            <Campo
              id="pap-reparto"
              control="select"
              label={t.campos.reparto.etiqueta}
              hint={t.campos.reparto.ayuda}
              value={campos.reparto}
              onChange={(v) => cambiar("reparto", v as Reparto)}
              placeholder={t.campos.reparto.etiqueta}
              opciones={REPARTOS.map((x) => ({
                value: x,
                label: t.campos.reparto[x],
              }))}
            />
            <Campo
              id="pap-avaluo"
              label={t.campos.avaluo.etiqueta}
              inputMode="numeric"
              autoComplete="off"
              value={campos.avaluo}
              onChange={(v) => cambiar("avaluo", v)}
              error={invalido(campos.avaluo, avaluo)}
              hint={t.campos.avaluo.ayuda}
              placeholder={t.campos.precio.ejemplo}
            />
            <Casilla
              id="pap-credito"
              etiqueta={t.campos.credito.etiqueta}
              ayuda={t.campos.credito.ayuda}
              marcada={campos.credito}
              onChange={(m) => cambiar("credito", m)}
            />
          </div>
        </details>
      </div>

      <div
        role="group"
        aria-label={t.secciones.grupo}
        className="flex gap-2 overflow-x-auto pb-1"
      >
        {SECCIONES.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={seccion === s}
            aria-controls={`pap-${s}`}
            onClick={() => setSeccion(s)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              seccion === s
                ? "bg-purple text-white"
                : "border border-purple-200 bg-white text-purple-600 hover:bg-purple-tint"
            }`}
          >
            {t.secciones[s]}
          </button>
        ))}
      </div>

      <section id="pap-gastos" hidden={seccion !== "gastos"}>
        <h2 className="mb-3 text-xl font-bold text-ink">
          {t.secciones.gastos}
        </h2>
        <PapeleoGastos
          r={r}
          lang={lang}
          t={t}
          anio={TARIFAS_PAPELEO.vigencia}
          consultado={TARIFAS_PAPELEO.consultado}
        />
      </section>
      <section id="pap-documentos" hidden={seccion !== "documentos"}>
        <h2 className="mb-3 text-xl font-bold text-ink">
          {t.guia.documentos.titulo}
        </h2>
        <Documentos credito={campos.credito} t={t} />
      </section>
      <section id="pap-plazos" hidden={seccion !== "plazos"}>
        <h2 className="mb-3 text-xl font-bold text-ink">
          {t.guia.plazos.titulo}
        </h2>
        <Plazos credito={campos.credito} t={t} />
      </section>
      <section id="pap-clausulas" hidden={seccion !== "clausulas"}>
        <h2 className="mb-3 text-xl font-bold text-ink">{c.titulo}</h2>
        <PapeleoClausulas
          c={c}
          credito={campos.credito}
          lang={lang}
          leidas={CONSULTADO_CLAUSULAS}
          estadoNorma={t.estados.vigente}
        />
      </section>
    </div>
  );
}

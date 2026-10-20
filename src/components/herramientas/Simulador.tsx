"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import Campo from "@/components/ui/Campo";
import { formatearCOP } from "@/engine/format/cop";
import { formatearFecha } from "@/engine/format/fecha";
import { leerCapacidad } from "@/engine/simulador/capacidad-local";
import { simular } from "@/engine/simulador/cuota";
import {
  CAMPOS_INICIALES,
  PLAZOS,
  camposDesdeCapacidad,
  capacidadDe,
  enlaceAlerta,
  enlaceBuscar,
  leerFormulario,
  precioMaximoDe,
  type CamposSimulador,
} from "@/engine/simulador/formulario";
import { localeIntl, type Idioma } from "@/i18n/idiomas";
import { rellenar, type Proyectado } from "@/i18n/textos";
import {
  guardarCapacidad,
  instantaneaCapacidad,
  olvidarCapacidad,
  suscribirCapacidad,
} from "@/lib/capacidad-cliente";
import type { SIMULADOR } from "@/textos/simulador";

type Base = Proyectado<typeof SIMULADOR>;

/** Los textos que la pantalla pinta, ya proyectados (y con las normas escritas dentro de su frase). */
export type TextosSimulador = Pick<
  Base,
  "campos" | "tasa" | "salidas" | "avisos" | "capacidad"
> & {
  grupo: string;
  fuenteTasa: string;
  descargo: {
    titulo: string;
    texto: string;
    cuota: string;
    financiable: string;
    plazo: string;
    fuenteTasa: string;
  };
};

/** La tasa de referencia del día, con su fecha: viene del servidor. */
export type TasaReferencia = {
  tasaEA: number;
  fechaCorte: string;
  creditos: number;
  entidades: number;
  /** «respaldo» = la base aún no tiene ninguna guardada y se usa la última leída. */
  origen: "guardada" | "respaldo";
  vieja: boolean;
  diasVieja: number;
};

// Sin dato (aún no hay ingresos, por ejemplo): un guion, nunca un número inventado.
const SIN_DATO = "—";

const BOTON =
  "inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition-colors";

// El simulador (maqueta 10, ADR 018). «Un cálculo, no una aprobación». Todo ocurre en el teléfono: NO hay <form> ni
// ninguna petición con lo que se escribe; los ingresos se guardan solo en `localStorage` de este teléfono y lo único
// que sale hacia un enlace es el PRECIO MÁXIMO. Lo que se escribe pisa a lo guardado; lo guardado pisa a los valores
// de partida.
export default function Simulador({
  lang,
  t,
  tasa,
  precioInicial,
}: {
  lang: Idioma;
  t: TextosSimulador;
  tasa: TasaReferencia;
  precioInicial: number | null;
}) {
  const [escrito, setEscrito] = useState<Partial<CamposSimulador>>({});
  const guardado = useSyncExternalStore(
    suscribirCapacidad,
    instantaneaCapacidad,
    () => "",
  );
  const cap = leerCapacidad(guardado || null);

  const partida: CamposSimulador = {
    ...CAMPOS_INICIALES,
    precio: precioInicial === null ? "" : String(precioInicial),
  };
  const campos: CamposSimulador = {
    ...camposDesdeCapacidad(partida, cap),
    ...escrito,
  };

  function cambiar(campo: keyof CamposSimulador, valor: string) {
    setEscrito((prev) => ({ ...prev, [campo]: valor }));
    const siguiente = { ...campos, [campo]: valor };
    const c = capacidadDe(siguiente, tasa.tasaEA);
    if (c) guardarCapacidad(c);
    else if (siguiente.ingresos.trim() === "") olvidarCapacidad();
  }

  function olvidar() {
    olvidarCapacidad();
    // Se conserva el precio escrito; un `undefined` en el objeto pisaría al valor de partida al mezclarlos.
    setEscrito((prev) =>
      prev.precio === undefined ? {} : { precio: prev.precio },
    );
  }

  const lectura = leerFormulario(campos, tasa.tasaEA);
  const r = simular(lectura.entrada);
  const max = precioMaximoDe(campos, tasa.tasaEA);
  const numero = new Intl.NumberFormat(localeIntl(lang), {
    maximumFractionDigits: 1,
  });
  const error = (campo: keyof CamposSimulador) =>
    lectura.invalidos.has(campo) ? t.campos.invalido : undefined;
  const conResultado =
    r.estado === "cabe" ||
    r.estado === "no_cabe" ||
    r.estado === "sin_ingresos";
  const fecha = formatearFecha(tasa.fechaCorte, lang);

  return (
    <div className="mt-4 grid gap-5 md:grid-cols-2">
      <div
        role="group"
        aria-label={t.grupo}
        className="space-y-4 rounded-2xl border border-purple-200 bg-white p-5"
      >
        <Campo
          id="sim-precio"
          label={t.campos.precio.etiqueta}
          inputMode="numeric"
          autoComplete="off"
          value={campos.precio}
          onChange={(v) => cambiar("precio", v)}
          error={error("precio")}
          hint={
            precioInicial !== null ? t.campos.precio.ayudaAnuncio : undefined
          }
          placeholder={t.campos.precio.ejemplo}
        />
        <Campo
          id="sim-inicial"
          label={t.campos.inicial.etiqueta}
          inputMode="decimal"
          autoComplete="off"
          value={campos.inicial}
          onChange={(v) => cambiar("inicial", v)}
          error={error("inicial")}
          hint={t.campos.inicial.ayuda}
        />
        <Campo
          id="sim-plazo"
          control="select"
          label={t.campos.plazo.etiqueta}
          value={campos.plazo}
          onChange={(v) => cambiar("plazo", v)}
          placeholder={t.campos.plazo.etiqueta}
          opciones={PLAZOS.map((a) => ({ value: String(a), label: String(a) }))}
        />
        <Campo
          id="sim-tasa"
          label={t.campos.tasa.etiqueta}
          inputMode="decimal"
          autoComplete="off"
          value={campos.tasa}
          onChange={(v) => cambiar("tasa", v)}
          error={error("tasa")}
          hint={t.campos.tasa.ayuda}
          placeholder={t.campos.tasa.ejemplo}
        />
        <div className="space-y-1 text-xs text-mute">
          {lectura.origenTasa === "escrita" ? (
            <p>
              {rellenar(t.tasa.tuya, { tasa: numero.format(lectura.tasaEA!) })}
            </p>
          ) : (
            <>
              <p>
                {rellenar(t.tasa.referencia, {
                  tasa: numero.format(tasa.tasaEA),
                  fecha,
                  fuente: t.fuenteTasa,
                })}
              </p>
              <p>
                {rellenar(t.tasa.muestra, {
                  creditos: tasa.creditos,
                  entidades: tasa.entidades,
                })}
              </p>
              {tasa.origen === "respaldo" && (
                <p>{rellenar(t.tasa.respaldo, { fecha })}</p>
              )}
              {tasa.vieja && (
                <p className="font-semibold text-aviso">
                  {rellenar(t.tasa.vieja, { dias: tasa.diasVieja })}
                </p>
              )}
            </>
          )}
        </div>
        <Campo
          id="sim-ingresos"
          label={t.campos.ingresos.etiqueta}
          inputMode="numeric"
          autoComplete="off"
          value={campos.ingresos}
          onChange={(v) => cambiar("ingresos", v)}
          error={error("ingresos")}
          hint={t.campos.ingresos.ayuda}
          placeholder={t.campos.ingresos.ejemplo}
        />
        {cap && (
          <button
            type="button"
            onClick={olvidar}
            className="text-sm font-semibold text-gray underline underline-offset-4 hover:text-ink"
          >
            {t.capacidad.olvidar}
          </button>
        )}
      </div>

      <div className="space-y-4">
        <section
          aria-live="polite"
          aria-label={t.salidas.grupo}
          className="space-y-3 rounded-2xl border border-purple-200 bg-white p-5"
        >
          <p className="text-sm text-mute">{t.salidas.cuota}</p>
          <p className="text-4xl font-extrabold tracking-tight text-purple">
            {conResultado ? formatearCOP(r.cuota, lang) : SIN_DATO}
          </p>
          <table className="w-full border-collapse text-sm">
            <tbody>
              <Fila
                etiqueta={t.salidas.cuotaInicial}
                valor={
                  conResultado ? formatearCOP(r.cuotaInicial, lang) : SIN_DATO
                }
              />
              <Fila
                etiqueta={t.salidas.credito}
                valor={conResultado ? formatearCOP(r.credito, lang) : SIN_DATO}
              />
              <Fila
                etiqueta={t.salidas.total}
                valor={
                  conResultado ? formatearCOP(r.totalPagado, lang) : SIN_DATO
                }
              />
              <Fila
                etiqueta={t.salidas.proporcion}
                valor={
                  conResultado && r.porcentajeIngreso !== null
                    ? `${numero.format(r.porcentajeIngreso)} %`
                    : SIN_DATO
                }
              />
              <Fila
                etiqueta={t.salidas.ingresoNecesario}
                valor={
                  conResultado
                    ? formatearCOP(r.ingresoNecesario, lang)
                    : SIN_DATO
                }
              />
            </tbody>
          </table>
          {r.estado === "cabe" && (
            <Aviso clase="bg-mint text-ok" simbolo="✓">
              {t.avisos.cabe}
            </Aviso>
          )}
          {r.estado === "no_cabe" && (
            <Aviso
              clase="border border-aviso-borde bg-aviso-tint text-aviso"
              simbolo="▲"
              titulo={t.avisos.noCabeTitulo}
            >
              {t.avisos.noCabeTexto}
            </Aviso>
          )}
          {r.estado === "sin_ingresos" && (
            <Aviso clase="bg-sky text-ink" simbolo="i">
              {t.avisos.sinIngresos}
            </Aviso>
          )}
          {r.estado === "sin_tasa" && (
            <Aviso clase="bg-sky text-ink" simbolo="i">
              {t.avisos.sinTasa}
            </Aviso>
          )}
          {r.estado === "invalido" && (
            <Aviso clase="bg-sky text-ink" simbolo="i">
              {t.avisos.invalido}
            </Aviso>
          )}
          {conResultado && r.excedeFinanciable && (
            <Aviso
              clase="border border-aviso-borde bg-aviso-tint text-aviso"
              simbolo="▲"
            >
              {t.avisos.excede}
            </Aviso>
          )}
        </section>

        <section
          aria-labelledby="sim-capacidad"
          className="space-y-3 rounded-2xl border border-purple-200 bg-white p-5"
        >
          <h2 id="sim-capacidad" className="text-lg font-bold text-ink">
            {t.capacidad.titulo}
          </h2>
          {max === null ? (
            <p className="text-sm text-gray">{t.capacidad.sinCalculo}</p>
          ) : (
            <>
              <p className="text-sm text-gray">
                {rellenar(t.capacidad.hasta, {
                  precio: formatearCOP(max, lang),
                })}
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href={enlaceBuscar(max)}
                  prefetch={false}
                  className={`${BOTON} bg-purple text-white shadow-card hover:bg-purple-600`}
                >
                  {t.capacidad.ver}
                </Link>
                <Link
                  href={enlaceAlerta(max)}
                  prefetch={false}
                  className={`${BOTON} border border-purple-200 bg-white text-purple-600 hover:bg-purple-tint`}
                >
                  {t.capacidad.avisame}
                </Link>
              </div>
              <p className="text-xs text-mute">{t.capacidad.privado}</p>
            </>
          )}
        </section>
      </div>

      <section
        aria-labelledby="sim-descargo"
        className="rounded-2xl bg-cream p-5 md:col-span-2"
      >
        <h2 id="sim-descargo" className="font-bold text-ink">
          {t.descargo.titulo}
        </h2>
        <p className="mt-1 text-sm text-gray">{t.descargo.texto}</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray">
          <li>{t.descargo.cuota}</li>
          <li>{t.descargo.financiable}</li>
          <li>{t.descargo.plazo}</li>
          <li>{t.descargo.fuenteTasa}</li>
        </ul>
      </section>
    </div>
  );
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <tr className="border-t border-purple-100">
      <th scope="row" className="py-2 pr-3 text-left font-semibold text-gray">
        {etiqueta}
      </th>
      <td className="py-2 text-right text-ink">{valor}</td>
    </tr>
  );
}

function Aviso({
  clase,
  simbolo,
  titulo,
  children,
}: {
  clase: string;
  simbolo: string;
  titulo?: string;
  children: string;
}) {
  return (
    <div className={`flex gap-3 rounded-2xl p-3 text-sm ${clase}`}>
      <span aria-hidden="true" className="font-bold">
        {simbolo}
      </span>
      <div>
        {titulo && <p className="font-semibold">{titulo}</p>}
        <p className={titulo ? "mt-0.5 text-ink" : undefined}>{children}</p>
      </div>
    </div>
  );
}

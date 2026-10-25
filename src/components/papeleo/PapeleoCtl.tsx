"use client";

import { useState } from "react";
import Aviso from "@/components/papeleo/Aviso";
import Campo from "@/components/ui/Campo";
import normas from "@/data/normas-ctl.json";
import {
  leerCtl,
  resumenDe,
  type Lectura,
  type Marca,
} from "@/engine/ctl/lector";
import { formatearFecha } from "@/engine/format/fecha";
import { CTL_MAX_DIAS } from "@/engine/sello/sello";
import { localeIntl, type Idioma } from "@/i18n/idiomas";
import { rellenar, type Proyectado } from "@/i18n/textos";
import type { CTL } from "@/textos/ctl";

export type TextosCtl = Proyectado<typeof CTL>;

const BOTON =
  "inline-flex items-center justify-center rounded-full bg-purple px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-purple-600 disabled:opacity-60";
const BOTON_SEC =
  "inline-flex items-center justify-center rounded-full border border-purple-200 px-5 py-2.5 text-sm font-semibold text-purple-600 transition-colors hover:bg-purple-tint disabled:opacity-60";
const AVISO = "border border-aviso-borde bg-aviso-tint text-aviso";

// El lector de CTL (S15, maqueta 11): se pega el texto del certificado de tradición y libertad y se marca lo que conviene
// preguntar antes de la promesa. Todo ocurre en el teléfono: el texto vive solo en este estado, sin <form>, sin petición, sin
// almacén y sin corrector del navegador; se pierde al cerrar la página. Cada marca trae su anotación, si sigue vigente o qué
// anotación la canceló, y su norma. Lo que no reconoce, lo dice. No es un estudio de títulos.
export default function PapeleoCtl({
  ctl,
  lang,
  hoy,
}: {
  ctl: TextosCtl;
  lang: Idioma;
  hoy: string;
}) {
  const t = ctl.lector;
  const [texto, setTexto] = useState("");
  const [lectura, setLectura] = useState<Lectura | null>(null);

  const leidas = new Intl.DateTimeFormat(localeIntl(lang), {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${normas.consultado}T00:00:00Z`));

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray">{t.intro}</p>
      <Aviso clase="bg-sky text-ink" simbolo="i">
        {t.privacidad}
      </Aviso>

      <Campo
        id="pap-ctl-texto"
        control="textarea"
        filas={8}
        sinCorrector
        label={t.campo}
        hint={t.ayuda}
        value={texto}
        onChange={(v) => {
          setTexto(v);
          setLectura(null);
        }}
      />
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className={BOTON}
          onClick={() => setLectura(leerCtl(texto, hoy))}
        >
          {t.leer}
        </button>
        <button
          type="button"
          className={BOTON_SEC}
          disabled={texto === ""}
          onClick={() => {
            setTexto("");
            setLectura(null);
          }}
        >
          {t.borrar}
        </button>
      </div>

      <div aria-live="polite" data-testid="ctl-resultado">
        {lectura?.estado === "vacio" && (
          <Aviso clase="bg-sky text-ink" simbolo="i">
            {t.vacio}
          </Aviso>
        )}
        {lectura?.estado === "sin_anotaciones" && (
          <Aviso clase={AVISO} simbolo="▲">
            {t.sinAnotaciones}
          </Aviso>
        )}
        {lectura?.estado === "leido" && (
          <Resultado lectura={lectura} ctl={ctl} lang={lang} />
        )}
      </div>

      <p className="text-xs text-mute">
        {rellenar(t.leidas, { fecha: leidas })}
      </p>
    </div>
  );
}

function Resultado({
  lectura,
  ctl,
  lang,
}: {
  lectura: Extract<Lectura, { estado: "leido" }>;
  ctl: TextosCtl;
  lang: Idioma;
}) {
  const t = ctl.lector;
  const { vigentes, canceladas } = resumenDe(lectura.marcas);
  // Lo que sigue vigente va primero: es lo que hay que preguntar antes de firmar.
  const marcas = [...lectura.marcas].sort(
    (a, b) =>
      Number(b.vigente) - Number(a.vigente) || a.anotacion - b.anotacion,
  );
  const dias = lectura.diasDesdeExpedicion;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-ink">{t.resultado}</h3>
      <p className="text-sm font-semibold text-ink">
        {rellenar(t.resumen, {
          anotaciones: lectura.anotaciones,
          vigentes,
          canceladas,
        })}
      </p>

      {dias !== null && dias >= 0 && (
        <div className="space-y-2">
          <Aviso clase="bg-sky text-ink" simbolo="i">
            {rellenar(t.expedido, { dias })}
          </Aviso>
          {dias > CTL_MAX_DIAS && (
            <Aviso clase={AVISO} simbolo="▲">
              {rellenar(t.viejo, { max: CTL_MAX_DIAS })}
            </Aviso>
          )}
        </div>
      )}

      {marcas.length === 0 ? (
        <Aviso clase="bg-mint text-ok" simbolo="✓">
          {t.sinMarcas}
        </Aviso>
      ) : (
        <ul className="space-y-3">
          {marcas.map((m) => (
            <TarjetaMarca
              key={`${m.tipo}-${m.anotacion}`}
              m={m}
              ctl={ctl}
              lang={lang}
            />
          ))}
        </ul>
      )}

      {lectura.noReconocidas.length > 0 && (
        <section
          aria-labelledby="ctl-no-reconocidas"
          className="space-y-2 rounded-2xl border border-aviso-borde bg-aviso-tint p-4"
        >
          <h4 id="ctl-no-reconocidas" className="font-semibold text-ink">
            <span aria-hidden="true">▲ </span>
            {t.noReconocidas.titulo}
          </h4>
          <p className="text-sm text-gray">{t.noReconocidas.texto}</p>
          <ul className="space-y-1 text-sm text-ink">
            {lectura.noReconocidas.map((n) => (
              <li key={n.anotacion} data-testid="ctl-no-reconocida">
                <strong>{rellenar(t.anotacion, { n: n.anotacion })}</strong>
                {n.codigo ? ` · ${n.codigo}` : ""}
                {n.especificacion
                  ? ` · ${rellenar(t.especificacion, { texto: n.especificacion.slice(0, 160) })}`
                  : ""}
              </li>
            ))}
          </ul>
        </section>
      )}

      {lectura.cancelacionesSinNumero.map((n) => (
        <Aviso key={`sn-${n}`} clase={AVISO} simbolo="▲">
          {rellenar(t.sinNumero, { n })}
        </Aviso>
      ))}
      {lectura.referenciasRotas.map((n) => (
        <Aviso key={`rr-${n}`} clase={AVISO} simbolo="▲">
          {rellenar(t.referenciaRota, { n })}
        </Aviso>
      ))}

      <Aviso clase="bg-sky text-ink" simbolo="i">
        {t.aviso}
      </Aviso>
    </div>
  );
}

function TarjetaMarca({
  m,
  ctl,
  lang,
}: {
  m: Marca;
  ctl: TextosCtl;
  lang: Idioma;
}) {
  const t = ctl.lector;
  const x = ctl.marcas[m.tipo];
  return (
    <li
      data-testid="ctl-marca"
      data-tipo={m.tipo}
      data-vigente={m.vigente ? "si" : "no"}
      className={`rounded-2xl border bg-white p-4 ${
        m.vigente ? "border-aviso-borde" : "border-purple-200"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="font-semibold text-ink">{x.titulo}</h4>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
            m.vigente ? AVISO : "bg-mint text-ok"
          }`}
        >
          <span aria-hidden="true">{m.vigente ? "▲" : "✓"}</span>
          {m.vigente ? t.vigente : t.cancelada}
        </span>
      </div>
      <p className="mt-1 text-xs text-mute">
        {rellenar(t.anotacion, { n: m.anotacion })}
        {m.fecha
          ? ` · ${rellenar(t.fecha, { fecha: formatearFecha(m.fecha, lang) })}`
          : ""}
      </p>
      <dl className="mt-2 space-y-2 text-sm">
        <div>
          <dt className="font-semibold text-gray">{t.rotulos.queEs}</dt>
          <dd className="text-ink">{x.queEs}</dd>
        </div>
        {m.vigente && (
          <div>
            <dt className="font-semibold text-gray">{t.rotulos.queHacer}</dt>
            <dd className="text-ink">{x.queHacer}</dd>
          </div>
        )}
        <div>
          <dt className="font-semibold text-gray">{t.rotulos.norma}</dt>
          <dd className="text-mute">
            {x.norma}
            {!m.vigente && m.canceladaPor !== null && (
              <>
                <br />
                {rellenar(ctl.cancelacion.texto, { n: m.canceladaPor })}{" "}
                {ctl.cancelacion.norma}
              </>
            )}
          </dd>
        </div>
      </dl>
    </li>
  );
}

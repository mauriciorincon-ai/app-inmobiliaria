// El lector de CTL (S15, maqueta 11): el comprador PEGA el texto de su certificado de tradición y libertad y el lector marca
// lo que conviene preguntar antes de la promesa. Corre SOLO en el navegador: el texto no sale del teléfono, no se guarda y no
// entra a ningún registro. Puro, sin zod, con la fecha de consulta como parámetro.
//
// Cómo lee (la estructura pública del certificado; Ley 1579 de 2012):
//   1. parte el texto en ANOTACIONES por su número («ANOTACIÓN: Nro 3»);
//   2. de cada una toma la fecha y la ESPECIFICACIÓN, con su código de naturaleza jurídica: los dos primeros dígitos son el
//      grupo del art. 8, parágrafo 3 (02 gravámenes, 03 limitaciones y afectaciones, 04 medidas cautelares, 06 falsa
//      tradición, 07/08 cancelaciones);
//   3. con código, el GRUPO decide y la palabra solo afina dentro del grupo (S16, contra el catálogo oficial de la Res. SNR
//      11885 de 2016, art. 4: `tests/fixtures/ctl/catalogo-snr-11885.json`); sin código, decide la palabra y la marca lo dice;
//      lo que no reconoce lo dice («no reconocida»), jamás lo da por bueno;
//   4. una cancelación deja sin efecto la anotación que NOMBRA por su número (arts. 62 y 63); si no nombra ninguna, el lector
//      no adivina cuál canceló y lo avisa;
//   5. compara las anotaciones leídas con «NRO TOTAL DE ANOTACIONES» y con la numeración consecutiva: si falta una (una página
//      sin copiar suele esconder la más reciente, la del embargo), dice que el texto parece incompleto (S16).
import { CODIGOS_CATALOGO } from "./codigos.ts";
import type { TipoMarca } from "./marcas.ts";

const EN_CATALOGO: ReadonlySet<string> = new Set(CODIGOS_CATALOGO);

export type Marca = {
  tipo: TipoMarca;
  anotacion: number;
  fecha: string | null;
  codigo: string | null;
  /** S16: el código no está en el catálogo de 2016; se leyó por su grupo. */
  codigoFueraDeCatalogo: boolean;
  vigente: boolean;
  /** La anotación que la canceló, si alguna la nombra. */
  canceladaPor: number | null;
};

export type NoReconocida = {
  anotacion: number;
  codigo: string | null;
  especificacion: string;
};

export type Lectura =
  | { estado: "vacio" }
  | { estado: "sin_anotaciones" }
  | {
      estado: "leido";
      anotaciones: number;
      marcas: Marca[];
      noReconocidas: NoReconocida[];
      /** Cancelaciones que no dicen qué anotación cancelan. */
      cancelacionesSinNumero: number[];
      /** Cancelaciones que nombran una anotación que el texto no trae. */
      referenciasRotas: number[];
      /** Días desde la fecha de expedición del certificado, si el texto la trae. */
      diasDesdeExpedicion: number | null;
      /** S16: ¿están todas? «si» cuadra con el total impreso y la numeración; «sin_total» si el texto no lo trae. */
      completitud: Completitud;
    };

export type Completitud = {
  estado: "si" | "no" | "sin_total";
  /** El total que imprime el certificado («NRO TOTAL DE ANOTACIONES»), si lo trae. */
  total: number | null;
  /** Los números que faltan entre 1 y el mayor (o el total). */
  faltan: number[];
};

type Naturaleza = TipoMarca | "cancelacion" | "neutra" | "desconocida";

type Anotacion = {
  numero: number;
  fecha: string | null;
  codigo: string | null;
  especificacion: string;
  naturaleza: Naturaleza;
  cancela: number[];
  canceladaPor: number | null;
};

/** Mayúsculas, sin tildes y sin espacios repetidos (los saltos de línea se conservan). */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[ \t ]+/g, " ");
}

// El encabezado de una anotación; no el «se cancela anotación No: 3» ni el «cancelada por la anotación 5» de dentro.
const INICIO_ANOTACION =
  /(?<!(?:CANCELA|CANCELAN)(?:\s+(?:LA|LAS))?\s+|POR(?:\s+LA)?\s+)ANOTACION\s*:?\s*(?:NRO\.?|NO\.?|N[°º]\.?|NUMERO)?\s*:?\s*(\d{1,4})\b/g;
const FIN_DE_ANOTACIONES =
  /NRO\.? TOTAL DE ANOTACIONES|SALVEDADES\s*:|FIN DE ESTE DOCUMENTO/;
const FECHA = /FECHA\s*:?\s*(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/;
const ESPECIFICACION = /ESPECIFICACION\s*:?\s*([^\n]*)/;
// 4 cifras (`0203`) o 5 (`01001`, `04001`): las dos primeras son el grupo del art. 8.
const CODIGO = /\b(0[1-9]\d{2}\d?)\b/;
const TOTAL = /NRO\.? TOTAL DE ANOTACIONES\s*:?\s*\*?\s*(\d{1,4})/;
const CANCELA =
  /CANCELA(?:N)?\s+(?:LA\s+|LAS\s+)?ANOTACION(?:ES)?\s*(?:NRO\.?|NO\.?|N[°º]\.?|NUMERO)?\s*:?\s*(\d{1,4}(?:\s*(?:,|Y)\s*\d{1,4})*)/;
const CANCELADA_POR =
  /CANCELAD[AO]\s+POR\s+(?:LA\s+)?ANOTACION\s*(?:NRO\.?|NO\.?|N[°º]\.?|NUMERO)?\s*:?\s*(\d{1,4})/;

// Palabras clave por naturaleza (sobre el texto normalizado de la especificación).
const ES_CANCELACION = /\bCANCELACION\b|\bLEVANTAMIENTO\b|\bDESEMBARGO\b/;
const ES_PARCIAL = /\bPARCIAL/;
const ES_FALSA_TRADICION =
  /FALSA TRADICION|COSA AJENA|DERECHOS HERENCIALES|DERECHOS Y ACCIONES|MEJORAS EN SUELO AJENO|DERECHO INCOMPLETO/;
// «HIPOTECA» como palabra: ni «hipotecada», ni «hipotecarse», ni «hipotecaria» (S16: 0107, 0372 y 0925 salían como hipotecas).
const ES_HIPOTECA = /\bHIPOTECAS?\b/;
const ES_HIPOTECARIO_02 = /HIPOTEC/;
const ES_PROHIBICION_TRANSFERENCIA = /PROHIBICION DE TRANSFERENCIA/;
// Dentro del grupo 03, el régimen de propiedad horizontal o de condominio y los linderos no piden una pregunta.
const ES_NEUTRA_03 = /PROPIEDAD HORIZONTAL|CONDOMINIO|DESLINDE|MEDIANERIA/;
// Dentro del grupo 09 («otros»), los trámites que no limitan nada; el resto del 09 se pregunta.
const ES_NEUTRA_09 =
  /ACLARACION|CORRECCION|ACTUALIZACION|CAMBIO DE NOMBRE|CAMBIO DE RAZON SOCIAL|CONSTITUCION DE URBANIZACION|DECLARACION DE CONSTRUCCION EN SUELO PROPIO|MEJORA EN SUELO PROPIO|PARTE RESTANTE|DESENGLOBE|DIVISION MATERIAL|ENGLOBE|LOTEO|EXTINCION OBLIGACION HIPOTECARIA|LEVANTAMIENTO|CESION DE POSICION|AUTORIZACION REGISTRO|CONFIRMACION SENTENCIA|PERMISO VENTA|PERMISO CONSTITUIR GRAVAMEN|CERTIFICACION TECNICA DE OCUPACION/;
const ES_EMBARGO = /\bEMBARGO/;
const ES_CAUTELAR = /\bDEMANDA\b|\bPROHIBICION|MEDIDA CAUTELAR|\bSECUESTRO\b/;
const ES_VIVIENDA_FAMILIAR = /AFECTACION A VIVIENDA FAMILIAR/;
const ES_PATRIMONIO = /PATRIMONIO DE FAMILIA/;
// Actos que el lector reconoce y que no piden una pregunta antes de la promesa.
const ES_NEUTRA =
  /\bCOMPRAVENTA\b|\bADJUDICACION\b|\bSUCESION\b|\bDONACION\b|\bPERMUTA\b|DACION EN PAGO|\bREMATE\b|\bAPORTE\b|PROPIEDAD HORIZONTAL|\bLOTEO\b|\bENGLOBE\b|\bDESENGLOBE\b|\bACLARACION\b|\bACTUALIZACION\b|\bLINDEROS\b/;

/** Con código: el grupo del art. 8 decide y la palabra solo afina dentro del grupo (S16). */
function naturalezaPorGrupo(especificacion: string, grupo: string): Naturaleza {
  switch (grupo) {
    case "01":
      return "neutra";
    case "02":
      return ES_HIPOTECARIO_02.test(especificacion) ? "hipoteca" : "gravamen";
    case "03":
      if (ES_PROHIBICION_TRANSFERENCIA.test(especificacion)) {
        return "prohibicion_transferencia";
      }
      if (ES_VIVIENDA_FAMILIAR.test(especificacion)) return "vivienda_familiar";
      if (ES_PATRIMONIO.test(especificacion)) return "patrimonio_familia";
      return ES_NEUTRA_03.test(especificacion) ? "neutra" : "limitacion_dominio";
    case "04":
      // Un embargo «con acción real hipotecaria» o «de derechos y acciones» es un embargo: el grupo manda.
      return ES_EMBARGO.test(especificacion) ? "embargo" : "medida_cautelar";
    case "05":
      return "limitacion_dominio";
    case "06":
      return "falsa_tradicion";
    case "07":
    case "08":
      // Una cancelación PARCIAL deja viva parte de la anotación: no la da por cancelada, y como no sabemos cuánto queda, la
      // lista como «no reconocida» en vez de callarla.
      return ES_PARCIAL.test(especificacion) ? "desconocida" : "cancelacion";
    case "09":
      return ES_NEUTRA_09.test(especificacion) ? "neutra" : "limitacion_dominio";
    default:
      return "desconocida";
  }
}

function naturalezaDe(
  especificacion: string,
  codigo: string | null,
): Naturaleza {
  if (codigo) return naturalezaPorGrupo(especificacion, codigo.slice(0, 2));
  // Sin código decide la palabra (la marca lo dice: `codigo` queda en null).
  if (ES_CANCELACION.test(especificacion)) {
    return ES_PARCIAL.test(especificacion) ? "desconocida" : "cancelacion";
  }
  if (ES_FALSA_TRADICION.test(especificacion)) return "falsa_tradicion";
  if (ES_EMBARGO.test(especificacion)) return "embargo";
  if (ES_PROHIBICION_TRANSFERENCIA.test(especificacion)) {
    return "prohibicion_transferencia";
  }
  if (ES_HIPOTECA.test(especificacion)) return "hipoteca";
  if (ES_VIVIENDA_FAMILIAR.test(especificacion)) return "vivienda_familiar";
  if (ES_PATRIMONIO.test(especificacion)) return "patrimonio_familia";
  if (ES_CAUTELAR.test(especificacion)) return "medida_cautelar";
  if (ES_NEUTRA.test(especificacion)) return "neutra";
  return "desconocida";
}

function fechaValida(d: number, mes: number, a: number): string | null {
  const f = new Date(Date.UTC(a, mes - 1, d));
  if (
    f.getUTCFullYear() !== a ||
    f.getUTCMonth() !== mes - 1 ||
    f.getUTCDate() !== d
  ) {
    return null;
  }
  return f.toISOString().slice(0, 10);
}

function fechaIso(m: RegExpExecArray | null): string | null {
  return m ? fechaValida(Number(m[1]), Number(m[2]), Number(m[3])) : null;
}

function numerosDe(lista: string): number[] {
  return (lista.match(/\d{1,4}/g) ?? []).map(Number);
}

/** Las anotaciones del texto, en el orden en que aparecen. */
export function partirAnotaciones(texto: string): Anotacion[] {
  const t = normalizar(texto);
  const fin = t.search(FIN_DE_ANOTACIONES);
  const cuerpo = fin >= 0 ? t.slice(0, fin) : t;
  const inicios = [...cuerpo.matchAll(INICIO_ANOTACION)];
  return inicios.map((m, i) => {
    const desde = m.index ?? 0;
    const hasta =
      i + 1 < inicios.length
        ? (inicios[i + 1].index ?? cuerpo.length)
        : cuerpo.length;
    const bloque = cuerpo.slice(desde, hasta);
    const especificacion = (ESPECIFICACION.exec(bloque)?.[1] ?? "").trim();
    const codigo = CODIGO.exec(especificacion)?.[1] ?? null;
    const naturaleza = naturalezaDe(especificacion, codigo);
    const cancela = CANCELA.exec(bloque);
    const canceladaPor = CANCELADA_POR.exec(bloque);
    return {
      numero: Number(m[1]),
      fecha: fechaIso(FECHA.exec(bloque)),
      codigo,
      especificacion: especificacion.slice(0, 80),
      naturaleza,
      cancela:
        naturaleza === "cancelacion" && cancela ? numerosDe(cancela[1]) : [],
      canceladaPor: canceladaPor ? Number(canceladaPor[1]) : null,
    };
  });
}

const MESES = [
  "ENERO",
  "FEBRERO",
  "MARZO",
  "ABRIL",
  "MAYO",
  "JUNIO",
  "JULIO",
  "AGOSTO",
  "SEPTIEMBRE",
  "OCTUBRE",
  "NOVIEMBRE",
  "DICIEMBRE",
];
const IMPRESO = /IMPRESO EL\s+(\d{1,2})\s+DE\s+([A-Z]+)\s+DE\s+(\d{4})/;
const EXPEDICION =
  /FECHA DE EXPEDICION\s*:?\s*(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/;

/** La fecha de expedición del certificado, si el texto la trae («Impreso el 20 de octubre de 2026» o «Fecha de expedición»). */
export function fechaDeExpedicion(texto: string): string | null {
  const t = normalizar(texto);
  const exp = fechaIso(EXPEDICION.exec(t));
  if (exp) return exp;
  const m = IMPRESO.exec(t);
  if (!m) return null;
  const mes = MESES.indexOf(m[2]);
  if (mes < 0) return null;
  return fechaValida(Number(m[1]), mes + 1, Number(m[3]));
}

function diasEntre(desde: string, hoy: string): number {
  return Math.round(
    (Date.parse(`${hoy}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) /
      86_400_000,
  );
}

/** ¿Están todas las anotaciones? El total impreso y la numeración consecutiva desde 1 (S16). */
export function completitudDe(
  texto: string,
  numeros: readonly number[],
): Completitud {
  const m = TOTAL.exec(normalizar(texto));
  const total = m ? Number(m[1]) : null;
  const leidos = new Set(numeros);
  const hasta = Math.max(total ?? 0, ...numeros, 0);
  const faltan: number[] = [];
  for (let n = 1; n <= hasta; n++) if (!leidos.has(n)) faltan.push(n);
  if (total === null) {
    return { estado: faltan.length > 0 ? "no" : "sin_total", total, faltan };
  }
  return {
    estado: faltan.length === 0 && leidos.size === total ? "si" : "no",
    total,
    faltan,
  };
}

export function leerCtl(texto: string, hoy: string): Lectura {
  if (texto.trim() === "") return { estado: "vacio" };
  const anotaciones = partirAnotaciones(texto);
  if (anotaciones.length === 0) return { estado: "sin_anotaciones" };

  const existentes = new Set(anotaciones.map((a) => a.numero));
  const canceladaPor = new Map<number, number>();
  const cancelacionesSinNumero: number[] = [];
  const referenciasRotas: number[] = [];
  for (const a of anotaciones) {
    if (a.naturaleza !== "cancelacion") continue;
    if (a.cancela.length === 0) cancelacionesSinNumero.push(a.numero);
    for (const n of a.cancela) {
      if (existentes.has(n) && n !== a.numero) canceladaPor.set(n, a.numero);
      else referenciasRotas.push(a.numero);
    }
  }
  // La nota en la anotación cancelada («cancelada por la anotación N») vale si N existe y es una cancelación.
  for (const a of anotaciones) {
    if (a.canceladaPor === null || canceladaPor.has(a.numero)) continue;
    const por = anotaciones.find((x) => x.numero === a.canceladaPor);
    if (por?.naturaleza === "cancelacion")
      canceladaPor.set(a.numero, por.numero);
  }

  const marcas: Marca[] = [];
  const noReconocidas: NoReconocida[] = [];
  for (const a of anotaciones) {
    if (a.naturaleza === "desconocida") {
      noReconocidas.push({
        anotacion: a.numero,
        codigo: a.codigo,
        especificacion: a.especificacion,
      });
    } else if (a.naturaleza !== "cancelacion" && a.naturaleza !== "neutra") {
      const por = canceladaPor.get(a.numero) ?? null;
      marcas.push({
        tipo: a.naturaleza,
        anotacion: a.numero,
        fecha: a.fecha,
        codigo: a.codigo,
        codigoFueraDeCatalogo: a.codigo !== null && !EN_CATALOGO.has(a.codigo),
        vigente: por === null,
        canceladaPor: por,
      });
    }
  }

  const expedicion = fechaDeExpedicion(texto);
  return {
    completitud: completitudDe(texto, anotaciones.map((a) => a.numero)),
    estado: "leido",
    anotaciones: anotaciones.length,
    marcas,
    noReconocidas,
    cancelacionesSinNumero,
    referenciasRotas: [...new Set(referenciasRotas)],
    diasDesdeExpedicion: expedicion ? diasEntre(expedicion, hoy) : null,
  };
}

/** Cuántas marcas siguen vigentes y cuántas se cancelaron. */
export function resumenDe(marcas: readonly Marca[]): {
  vigentes: number;
  canceladas: number;
} {
  const vigentes = marcas.filter((m) => m.vigente).length;
  return { vigentes, canceladas: marcas.length - vigentes };
}

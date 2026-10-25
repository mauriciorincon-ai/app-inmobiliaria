// La guía del papeleo (S14): qué pedir antes de firmar y cuánto tarda cada paso. Aquí vive solo la ESTRUCTURA (ids, estado de la
// norma y cuándo aplica cada paso); el texto de cada uno, con su norma citada en palabras, vive en `src/textos/papeleo.ts` bajo el
// mismo id. Puro y sin zod: corre en el teléfono.
//
// El estado dice de dónde sale cada paso, y la pantalla lo muestra con símbolo y texto (el color nunca va solo):
//   · `vigente`  — hay una norma primaria, leída en su texto, que lo dice (el artículo está citado en el texto del paso).
//   · `practica` — lo piden la notaría, el banco o la costumbre del estudio de títulos; ninguna norma consultada lo exige tal cual.
export type EstadoGuia = "vigente" | "practica";
export type CuandoAplica = "siempre" | "credito";

export type PasoGuia<Id extends string> = {
  id: Id;
  estado: EstadoGuia;
  cuando: CuandoAplica;
};

export const DOCUMENTOS = [
  { id: "ctl", estado: "vigente", cuando: "siempre" },
  { id: "escritura_anterior", estado: "practica", cuando: "siempre" },
  { id: "comprobantes_fiscales", estado: "vigente", cuando: "siempre" },
  { id: "cedulas_y_conyuge", estado: "vigente", cuando: "siempre" },
  { id: "promesa_escrita", estado: "vigente", cuando: "siempre" },
  { id: "credito", estado: "practica", cuando: "credito" },
] as const satisfies readonly PasoGuia<string>[];

export const PLAZOS = [
  { id: "antes", estado: "practica", cuando: "siempre" },
  { id: "promesa", estado: "vigente", cuando: "siempre" },
  { id: "escritura", estado: "vigente", cuando: "siempre" },
  { id: "pedir_registro", estado: "vigente", cuando: "siempre" },
  { id: "oficina_registra", estado: "vigente", cuando: "siempre" },
  { id: "hipoteca", estado: "vigente", cuando: "credito" },
  { id: "entrega", estado: "practica", cuando: "siempre" },
] as const satisfies readonly PasoGuia<string>[];

export type IdDocumento = (typeof DOCUMENTOS)[number]["id"];
export type IdPlazo = (typeof PLAZOS)[number]["id"];

/** Los pasos que aplican a esta compra: con crédito entran los del banco y la hipoteca. */
export function pasosDe<T extends PasoGuia<string>>(
  pasos: readonly T[],
  credito: boolean,
): T[] {
  return pasos.filter((p) => p.cuando === "siempre" || credito);
}

// Qué dice cada documento: las cláusulas típicas de la promesa, la escritura y el registro. Es texto fijo y versionado, sin IA y sin
// leer el documento de nadie; el texto de cada una vive en `src/textos/papeleo-clausulas.ts` bajo el mismo id. Todas son `vigente`:
// una cláusula sin artículo leído no entra. `normas` dice, por número, qué artículos cita; cada uno está en el registro de lo que se
// leyó en su texto oficial (`src/data/normas-clausulas.json`, con dónde y cuándo), y una prueba ata el texto a esos números.
export type IdNorma =
  | "codigo_civil"
  | "codigo_comercio"
  | "ley_153_1887"
  | "ley_1579_2012"
  | "ley_258_1996"
  | "decreto_960_1970"
  | "ordenanza_039_2020"
  | "estatuto_tributario";

export const DOCUMENTOS_CLAUSULAS = [
  "promesa",
  "escritura",
  "registro",
] as const;
export type DocumentoClausula = (typeof DOCUMENTOS_CLAUSULAS)[number];

export type Clausula<Id extends string> = PasoGuia<Id> & {
  estado: "vigente";
  documento: DocumentoClausula;
  normas: Partial<Record<IdNorma, readonly number[]>>;
};

export const CLAUSULAS = [
  {
    id: "requisitos",
    documento: "promesa",
    estado: "vigente",
    cuando: "siempre",
    normas: { ley_153_1887: [89] },
  },
  {
    id: "plazo_y_notaria",
    documento: "promesa",
    estado: "vigente",
    cuando: "siempre",
    normas: { ley_153_1887: [89] },
  },
  {
    id: "arras",
    documento: "promesa",
    estado: "vigente",
    cuando: "siempre",
    normas: { codigo_civil: [1859, 1860, 1861], codigo_comercio: [22, 866] },
  },
  {
    id: "clausula_penal",
    documento: "promesa",
    estado: "vigente",
    cuando: "siempre",
    normas: { codigo_civil: [1592, 1599, 1600, 1601], codigo_comercio: [867] },
  },
  {
    id: "incumplimiento",
    documento: "promesa",
    estado: "vigente",
    cuando: "siempre",
    normas: { codigo_civil: [1546] },
  },
  {
    id: "perfecciona",
    documento: "escritura",
    estado: "vigente",
    cuando: "siempre",
    normas: { codigo_civil: [1857] },
  },
  {
    id: "precio_real",
    documento: "escritura",
    estado: "vigente",
    cuando: "siempre",
    normas: { estatuto_tributario: [90] },
  },
  {
    id: "gastos",
    documento: "escritura",
    estado: "vigente",
    cuando: "siempre",
    normas: {
      codigo_civil: [1862],
      decreto_960_1970: [223],
      ordenanza_039_2020: [212],
    },
  },
  {
    id: "saneamiento",
    documento: "escritura",
    estado: "vigente",
    cuando: "siempre",
    normas: { codigo_civil: [1880, 1893, 1894, 1895, 1898] },
  },
  {
    id: "vivienda_familiar",
    documento: "escritura",
    estado: "vigente",
    cuando: "siempre",
    normas: { ley_258_1996: [3, 6, 12] },
  },
  {
    id: "dueno_al_registrar",
    documento: "registro",
    estado: "vigente",
    cuando: "siempre",
    normas: { codigo_civil: [756], ley_1579_2012: [2] },
  },
  {
    id: "prioridad",
    documento: "registro",
    estado: "vigente",
    cuando: "siempre",
    normas: { ley_1579_2012: [3] },
  },
  {
    id: "hipoteca",
    documento: "registro",
    estado: "vigente",
    cuando: "credito",
    normas: { codigo_civil: [2434, 2435], ley_1579_2012: [28] },
  },
] as const satisfies readonly Clausula<string>[];

export type IdClausula = (typeof CLAUSULAS)[number]["id"];

/** Las cláusulas de un documento que aplican a esta compra (con crédito entra la de la hipoteca). */
export function clausulasDe(
  documento: DocumentoClausula,
  credito: boolean,
): (typeof CLAUSULAS)[number][] {
  return pasosDe(CLAUSULAS, credito).filter((c) => c.documento === documento);
}

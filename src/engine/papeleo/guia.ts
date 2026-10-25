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

import { z } from "zod";

// Lógica pura del wizard de 3 pasos: navegación, progreso y serialización del borrador.
// El acceso a `localStorage` (side-effect) vive en el componente; aquí solo transformaciones puras.

export const PASOS = [1, 2, 3] as const;
export type Paso = (typeof PASOS)[number];

/** Clave versionada del borrador en localStorage (el sufijo evita colisiones entre sprints). */
export const CLAVE_DRAFT = "publicar.draft.v1";

/** Estado del formulario tal como se teclea (todo string; el consentimiento NO se persiste). */
export type EstadoFormulario = {
  nombre: string;
  whatsapp: string;
  ciudad: string;
  operacion: string;
  tipo: string;
  barrio: string;
  direccion_aproximada: string;
  area_m2: string;
  habitaciones: string;
  precio_esperado: string;
};

export const ESTADO_INICIAL: EstadoFormulario = {
  nombre: "",
  whatsapp: "",
  ciudad: "Bogotá",
  operacion: "",
  tipo: "",
  barrio: "",
  direccion_aproximada: "",
  area_m2: "",
  habitaciones: "",
  precio_esperado: "",
};

export function esPrimerPaso(paso: Paso): boolean {
  return paso === PASOS[0];
}

export function esUltimoPaso(paso: Paso): boolean {
  return paso === PASOS[PASOS.length - 1];
}

export function siguientePaso(paso: Paso): Paso {
  return esUltimoPaso(paso) ? paso : ((paso + 1) as Paso);
}

export function pasoAnterior(paso: Paso): Paso {
  return esPrimerPaso(paso) ? paso : ((paso - 1) as Paso);
}

/** Progreso 0–100 según el paso actual (paso 1 = 33%, 2 = 66%, 3 = 100%). */
export function progreso(paso: Paso): number {
  return Math.round((paso / PASOS.length) * 100);
}

/** Serializa el estado del formulario a JSON para guardarlo en localStorage. */
export function serializarDraft(estado: EstadoFormulario): string {
  return JSON.stringify(estado);
}

// Esquema laxo del borrador: todos los campos opcionales y string. El consentimiento se excluye a
// propósito (nunca se restaura una casilla de consentimiento marcada — debe ser un acto fresco).
const draftSchema = z
  .object({
    nombre: z.string(),
    whatsapp: z.string(),
    ciudad: z.string(),
    operacion: z.string(),
    tipo: z.string(),
    barrio: z.string(),
    direccion_aproximada: z.string(),
    area_m2: z.string(),
    habitaciones: z.string(),
    precio_esperado: z.string(),
  })
  .partial();

/**
 * Restaura el borrador desde el string crudo de localStorage. Devuelve el estado combinado con los
 * valores por defecto, o `null` si no hay nada o los datos están corruptos (se descartan enteros).
 */
export function cargarDraft(raw: string | null): EstadoFormulario | null {
  if (!raw) return null;
  let parseado: unknown;
  try {
    parseado = JSON.parse(raw);
  } catch {
    return null;
  }
  const resultado = draftSchema.safeParse(parseado);
  if (!resultado.success) return null;
  return { ...ESTADO_INICIAL, ...resultado.data };
}

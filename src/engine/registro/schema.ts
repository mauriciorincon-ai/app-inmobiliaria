import { z } from "zod";
import { esWhatsappValido, normalizarWhatsapp } from "../format/whatsapp";
import { esEnteroEscrito, parsearCOP } from "../format/cop";
import { LOCALIDADES } from "../zonas/localidades";
import { sectorPorNombre } from "../zonas/sectores";
import { normalizarCodigo } from "../referidos/referidos";

// Contrato único de validación del flujo "publicar = registro". Lo usan tanto el wizard (validación
// por paso, mensajes por campo) como el endpoint server (re-validación, defensa en profundidad).
//
// Los campos numéricos se validan como STRING (tal como llegan del input) para dar mensajes
// claros por campo; `construirPayload` los convierte a los tipos que espera la RPC.

export const OPERACIONES = ["venta", "arriendo"] as const;
export const TIPOS = ["apartamento", "casa", "apartaestudio", "otro"] as const;

export type Operacion = (typeof OPERACIONES)[number];
export type TipoInmueble = (typeof TIPOS)[number];

// Límites (deben coincidir con los CHECK de la migración 0001). Los que aparecen en un mensaje
// («entre {areaMin} y {areaMax} m²») se exportan para que la UI los rellene en su idioma.
export const LIMITES = {
  areaMin: 10,
  areaMax: 100000,
  habMax: 40,
} as const;
const PRECIO_MIN = 1_000_000;
const PRECIO_MAX = 900_000_000_000;

// Los mensajes de validación son CÓDIGOS, no frases: el esquema es el mismo en el navegador y en el
// servidor, y la persona los lee en su idioma desde `src/textos/publicar.ts` (regla de producto 10).
// Cada clave tiene su texto `{ es, en }` en `PUBLICAR.errores`; un test exige que no falte ninguna.
export const ERR = {
  nombreCorto: "nombreCorto",
  nombreLargo: "nombreLargo",
  whatsappVacio: "whatsappVacio",
  whatsappInvalido: "whatsappInvalido",
  ciudadCorta: "ciudadCorta",
  ciudadLarga: "ciudadLarga",
  operacion: "operacion",
  tipo: "tipo",
  localidad: "localidad",
  barrioCorto: "barrioCorto",
  barrioLargo: "barrioLargo",
  barrioNoCatalogo: "barrioNoCatalogo",
  direccionLarga: "direccionLarga",
  areaVacia: "areaVacia",
  soloEnteros: "soloEnteros",
  areaRango: "areaRango",
  habitacionesVacio: "habitacionesVacio",
  habitacionesMax: "habitacionesMax",
  precioVacio: "precioVacio",
  precioNumero: "precioNumero",
  precioRango: "precioRango",
  consentimiento: "consentimiento",
  correoLargo: "correoLargo",
  correoInvalido: "correoInvalido",
} as const;
export type CodigoError = (typeof ERR)[keyof typeof ERR];

export function esCodigoError(valor: string): valor is CodigoError {
  return (Object.values(ERR) as string[]).includes(valor);
}

// ---------------------------------------------------------------------------
// Paso 1 — Contacto (MÁXIMO 3 campos — acceptance criterion del sprint)
// ---------------------------------------------------------------------------
export const paso1Schema = z.object({
  nombre: z.string().trim().min(2, ERR.nombreCorto).max(80, ERR.nombreLargo),
  whatsapp: z
    .string()
    .trim()
    .min(1, ERR.whatsappVacio)
    .refine(esWhatsappValido, ERR.whatsappInvalido),
  ciudad: z.string().trim().min(2, ERR.ciudadCorta).max(60, ERR.ciudadLarga),
});

// ---------------------------------------------------------------------------
// Paso 2 — Datos del inmueble (mínimo indispensable — sin fotos ni documentos)
// ---------------------------------------------------------------------------
const paso2Base = z.object({
  operacion: z.enum(OPERACIONES, { error: ERR.operacion }),
  tipo: z.enum(TIPOS, { error: ERR.tipo }),
  // Localidad de Bogotá (para el contador de cupos por zona). Lista cerrada (fase 1 = Bogotá).
  localidad: z.enum(LOCALIDADES, { error: ERR.localidad }),
  barrio: z.string().trim().min(2, ERR.barrioCorto).max(80, ERR.barrioLargo),
  direccion_aproximada: z
    .string()
    .trim()
    .max(120, ERR.direccionLarga)
    .optional(),
  area_m2: z
    .string()
    .trim()
    .min(1, ERR.areaVacia)
    .refine(esEnteroEscrito, ERR.soloEnteros)
    .refine((s) => {
      const n = parsearCOP(s);
      return n !== null && n >= LIMITES.areaMin && n <= LIMITES.areaMax;
    }, ERR.areaRango),
  habitaciones: z
    .string()
    .trim()
    .min(1, ERR.habitacionesVacio)
    .refine(esEnteroEscrito, ERR.soloEnteros)
    .refine(
      (s) => (parsearCOP(s) ?? Infinity) <= LIMITES.habMax,
      ERR.habitacionesMax,
    ),
  precio_esperado: z
    .string()
    .trim()
    .min(1, ERR.precioVacio)
    .refine(
      (s) => parsearCOP(s) !== null && esEnteroEscrito(s),
      ERR.precioNumero,
    )
    .refine((s) => {
      const n = parsearCOP(s);
      return n !== null && n >= PRECIO_MIN && n <= PRECIO_MAX;
    }, ERR.precioRango),
});

// S6 — el barrio es un barrio del catálogo catastral dentro de la localidad elegida (ADR 014): el
// anuncio se ubica por él. El wizard lo ofrece en un select; esto es la defensa de la API y de un
// borrador viejo con texto libre.
function barrioDelCatalogo(
  d: { localidad: string; barrio: string },
  ctx: z.RefinementCtx,
) {
  if (!sectorPorNombre(d.localidad, d.barrio)) {
    ctx.addIssue({
      code: "custom",
      path: ["barrio"],
      message: ERR.barrioNoCatalogo,
    });
  }
}

export const paso2Schema = paso2Base.superRefine(barrioDelCatalogo);

// ---------------------------------------------------------------------------
// Paso 3 — Consentimiento (Ley 1581): sin `true` explícito no hay envío
// ---------------------------------------------------------------------------
export const paso3Schema = z.object({
  consentimiento: z.literal(true, { error: ERR.consentimiento }),
  // Correo OPCIONAL: habilita los avisos de campaña por email (Brevo). Vacío ⇒ solo WhatsApp.
  email: z
    .string()
    .trim()
    .max(120, ERR.correoLargo)
    .optional()
    .refine(
      (v) => !v || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v),
      ERR.correoInvalido,
    ),
});

// Esquema completo (los tres pasos combinados) — lo re-valida el endpoint.
export const registroSchema = paso1Schema
  .extend(paso2Base.shape)
  .extend(paso3Schema.shape)
  .superRefine(barrioDelCatalogo);

export type DatosPaso1 = z.infer<typeof paso1Schema>;
export type DatosPaso2 = z.infer<typeof paso2Schema>;
export type DatosRegistro = z.infer<typeof registroSchema>;

// Payload tipado que consume la RPC `registrar_fundador`.
export type PayloadRegistro = {
  nombre: string;
  whatsapp: string; // E.164
  email: string | null;
  ciudad: string;
  zona: string | null; // localidad de Bogotá (S3)
  operacion: Operacion;
  tipo: TipoInmueble;
  barrio: string;
  direccion: string | null;
  area: number;
  habitaciones: number;
  precio: number;
  consentimiento: true;
  ref: string | null; // código de referido (S3), o null
};

/**
 * Convierte datos ya validados a los tipos que espera la RPC: normaliza WhatsApp a E.164 y parsea
 * los numéricos. S3: email opcional del paso 3, zona = localidad del paso 2, y `ref` (código de
 * referido de la URL) validado — un ref mal formado se descarta (null), el registro nunca se bloquea.
 * Lanza si se llama con datos inválidos (nunca debería: el endpoint valida antes con `registroSchema`).
 */
export function construirPayload(
  datos: DatosRegistro,
  ref?: string | null,
): PayloadRegistro {
  const whatsapp = normalizarWhatsapp(datos.whatsapp);
  const precio = parsearCOP(datos.precio_esperado);
  const area = parsearCOP(datos.area_m2);
  const habitaciones = parsearCOP(datos.habitaciones);
  if (
    whatsapp === null ||
    precio === null ||
    area === null ||
    habitaciones === null
  ) {
    throw new Error("construirPayload recibió datos inválidos");
  }
  return {
    nombre: datos.nombre.trim(),
    whatsapp,
    email: datos.email?.trim() || null,
    ciudad: datos.ciudad.trim(),
    zona: datos.localidad,
    operacion: datos.operacion,
    tipo: datos.tipo,
    // El nombre del catálogo, no lo que llegó escrito: la BD y el slug usan el mismo.
    barrio:
      sectorPorNombre(datos.localidad, datos.barrio)?.nombre ??
      datos.barrio.trim(),
    direccion: datos.direccion_aproximada?.trim() || null,
    area,
    habitaciones,
    precio,
    consentimiento: true,
    ref: normalizarCodigo(ref),
  };
}

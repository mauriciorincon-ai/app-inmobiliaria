import { z } from "zod";
import { esWhatsappValido, normalizarWhatsapp } from "../format/whatsapp";
import { parsearCOP } from "../format/cop";

// Contrato único de validación del flujo "publicar = registro". Lo usan tanto el wizard (validación
// por paso, mensajes por campo) como el endpoint server (re-validación, defensa en profundidad).
//
// Los campos numéricos se validan como STRING (tal como llegan del input) para dar mensajes
// claros por campo; `construirPayload` los convierte a los tipos que espera la RPC.

export const OPERACIONES = ["venta", "arriendo"] as const;
export const TIPOS = ["apartamento", "casa", "apartaestudio", "otro"] as const;

export type Operacion = (typeof OPERACIONES)[number];
export type TipoInmueble = (typeof TIPOS)[number];

// Límites (deben coincidir con los CHECK de la migración 0001).
const AREA_MIN = 10;
const AREA_MAX = 100000;
const HAB_MAX = 40;
const PRECIO_MIN = 1_000_000;
const PRECIO_MAX = 900_000_000_000;

const numeroEntero = (s: string) => /^\d+$/.test(s.replace(/[.\s]/g, ""));

// ---------------------------------------------------------------------------
// Paso 1 — Contacto (MÁXIMO 3 campos — acceptance criterion del sprint)
// ---------------------------------------------------------------------------
export const paso1Schema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, "Escribe tu nombre")
    .max(80, "Máximo 80 caracteres"),
  whatsapp: z
    .string()
    .trim()
    .min(1, "Escribe tu WhatsApp")
    .refine(
      esWhatsappValido,
      "Escribe un celular colombiano válido (ej: 300 123 4567)",
    ),
  ciudad: z
    .string()
    .trim()
    .min(2, "Escribe tu ciudad")
    .max(60, "Máximo 60 caracteres"),
});

// ---------------------------------------------------------------------------
// Paso 2 — Datos del inmueble (mínimo indispensable — sin fotos ni documentos)
// ---------------------------------------------------------------------------
export const paso2Schema = z.object({
  operacion: z.enum(OPERACIONES, { error: "Elige si es venta o arriendo" }),
  tipo: z.enum(TIPOS, { error: "Elige el tipo de inmueble" }),
  barrio: z
    .string()
    .trim()
    .min(2, "Escribe el barrio o zona")
    .max(80, "Máximo 80 caracteres"),
  direccion_aproximada: z
    .string()
    .trim()
    .max(120, "Máximo 120 caracteres")
    .optional(),
  area_m2: z
    .string()
    .trim()
    .min(1, "Escribe el área en m²")
    .refine(numeroEntero, "Solo números enteros")
    .refine((s) => {
      const n = Number(s.replace(/[.\s]/g, ""));
      return n >= AREA_MIN && n <= AREA_MAX;
    }, `El área debe estar entre ${AREA_MIN} y ${AREA_MAX} m²`),
  habitaciones: z
    .string()
    .trim()
    .min(1, "Escribe cuántas habitaciones")
    .refine(numeroEntero, "Solo números enteros")
    .refine((s) => Number(s) <= HAB_MAX, `Máximo ${HAB_MAX} habitaciones`),
  precio_esperado: z
    .string()
    .trim()
    .min(1, "Escribe el precio esperado")
    .refine((s) => parsearCOP(s) !== null, "Escribe un número")
    .refine((s) => {
      const n = parsearCOP(s);
      return n !== null && n >= PRECIO_MIN && n <= PRECIO_MAX;
    }, "El precio está fuera de rango"),
});

// ---------------------------------------------------------------------------
// Paso 3 — Consentimiento (Ley 1581): sin `true` explícito no hay envío
// ---------------------------------------------------------------------------
export const paso3Schema = z.object({
  consentimiento: z.literal(true, {
    error: "Debes aceptar el tratamiento de datos para publicar",
  }),
});

// Esquema completo (los tres pasos combinados) — lo re-valida el endpoint.
export const registroSchema = paso1Schema
  .extend(paso2Schema.shape)
  .extend(paso3Schema.shape);

export type DatosPaso1 = z.infer<typeof paso1Schema>;
export type DatosPaso2 = z.infer<typeof paso2Schema>;
export type DatosRegistro = z.infer<typeof registroSchema>;

// Payload tipado que consume la RPC `registrar_fundador`.
export type PayloadRegistro = {
  nombre: string;
  whatsapp: string; // E.164
  email: string | null;
  ciudad: string;
  zona: string | null;
  operacion: Operacion;
  tipo: TipoInmueble;
  barrio: string;
  direccion: string | null;
  area: number;
  habitaciones: number;
  precio: number;
  consentimiento: true;
};

/**
 * Convierte datos ya validados a los tipos que espera la RPC: normaliza WhatsApp a E.164 y parsea
 * los numéricos. En S1 no se recogen email ni zona (columnas nullable reservadas) → van en `null`.
 * Lanza si se llama con datos inválidos (nunca debería: el endpoint valida antes con `registroSchema`).
 */
export function construirPayload(datos: DatosRegistro): PayloadRegistro {
  const whatsapp = normalizarWhatsapp(datos.whatsapp);
  const precio = parsearCOP(datos.precio_esperado);
  if (whatsapp === null || precio === null) {
    throw new Error("construirPayload recibió datos inválidos");
  }
  return {
    nombre: datos.nombre.trim(),
    whatsapp,
    email: null,
    ciudad: datos.ciudad.trim(),
    zona: null,
    operacion: datos.operacion,
    tipo: datos.tipo,
    barrio: datos.barrio.trim(),
    direccion: datos.direccion_aproximada?.trim() || null,
    area: Number(datos.area_m2.replace(/[.\s]/g, "")),
    habitaciones: Number(datos.habitaciones),
    precio,
    consentimiento: true,
  };
}

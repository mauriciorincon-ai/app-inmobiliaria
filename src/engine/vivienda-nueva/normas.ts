// Los dos archivos de normas del S11 (`src/data/subsidios-vivienda.json` y `src/data/tarifas-escrituracion.json`):
// cada fila con su norma, su año, la fecha en que se consultó y su estado. Lo que no está `vigente` o `sin_cupos`
// con su fecha no se muestra: `no_verificado` jamás se suma ni se enseña como cifra.
import { z } from "zod";

export const ESTADOS_NORMA = [
  "vigente",
  "sin_cupos",
  "suspendido",
  "no_verificado",
] as const;
export type EstadoNorma = (typeof ESTADOS_NORMA)[number];

const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const bilingue = z
  .object({ es: z.string().min(1), en: z.string().min(1) })
  .strict();
const pesos = z.number().int().positive().nullable();

export const ProgramaSchema = z
  .object({
    id: z.string().regex(/^[a-z_]+$/),
    nombre: bilingue,
    entidad: z.string().min(1),
    ambito: z.enum(["bogota", "nacional"]),
    destino: z.enum(["compra", "cuota", "arriendo"]),
    monto: z
      .object({
        minimo_smmlv: z.number().positive().nullable(),
        maximo_smmlv: z.number().positive(),
        pesos_2026: z
          .object({ minimo: pesos, maximo: pesos.unwrap() })
          .strict(),
        regla: bilingue,
      })
      .strict(),
    ingreso_maximo_smmlv: z.number().positive().nullable(),
    ingreso_maximo_pesos_2026: pesos,
    vivienda: z.string().min(1),
    normas: z.array(z.string().min(1)).min(1),
    anio: z.number().int(),
    consultado: fecha,
    estado: z.enum(ESTADOS_NORMA),
    estado_al: fecha,
    estado_segun: z.string().min(1),
    nota: bilingue,
  })
  .strict();

export const NoVerificadoSchema = z
  .object({
    id: z.string().regex(/^[a-z_]+$/),
    nombre: bilingue,
    estado: z.literal("no_verificado"),
    consultado: fecha,
    motivo: bilingue,
  })
  .strict();

export const SubsidiosSchema = z
  .object({
    version: z.number().int(),
    vigencia: z.number().int(),
    consultado: fecha,
    descripcion: bilingue,
    salario_minimo_2026: z.number().int().positive(),
    programas: z.array(ProgramaSchema).min(1),
    no_verificados: z.array(NoVerificadoSchema),
  })
  .strict();

/** Lo común a todo concepto de tarifa; el detalle de cada concepto lo lee su propio motor. */
export const ConceptoTarifaSchema = z
  .object({
    id: z.string().regex(/^[a-z_]+$/),
    nombre: bilingue,
    entidad: z.string().min(1),
    norma: z.string().min(1).nullable(),
    anio: z.number().int(),
    consultado: fecha,
    estado: z.enum(ESTADOS_NORMA),
  })
  .loose();

export const TarifasSchema = z
  .object({
    version: z.number().int(),
    vigencia: z.number().int(),
    consultado: fecha,
    descripcion: bilingue,
    unidades: z
      .object({
        uvb: z.object({ valor: z.number().positive() }).loose(),
        smmlv: z.object({ valor: z.number().positive() }).loose(),
      })
      .strict(),
    topes_vis: z
      .object({
        smmlv: z.number().positive(),
        smmlv_aglomeraciones: z.number().positive(),
        municipios_aglomeracion_bogota: z.array(z.string()).min(1),
        otras_aglomeraciones: z.array(z.string()).min(1),
        norma: z.string().min(1),
        anio: z.number().int(),
        consultado: fecha,
        estado: z.enum(ESTADOS_NORMA),
      })
      .strict(),
    conceptos: z.array(ConceptoTarifaSchema).min(1),
  })
  .strict();

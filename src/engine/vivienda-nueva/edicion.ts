// La edición mensual de la revista de vivienda nueva como DATO (S11, F1). Puro. Lo que sale de las páginas de la
// revista y llega aquí es solo lo PROCESADO: nombre del proyecto, constructora, zona, cifras y rótulos de una lista
// cerrada. Nunca fotos, logos, textos de avisos, teléfonos, direcciones ni webs: el esquema es `strict` (un campo
// extra cae) y los textos libres pasan por una guarda que rechaza URL, correo, teléfono y dirección.
//
// Dos estados honestos para cualquier campo: `no_lo_dice` (el aviso no lo imprime; jamás se adivina) e `ilegible`
// (está impreso pero no se alcanza a leer). Un cero o un valor inventado no existen.
//
// Imports con extensión `.ts` y sin alias `@/`: los scripts de `scripts/vivienda-nueva/` importan este archivo con el
// `type stripping` nativo de Node, sin compilar.
import { z } from "zod";

/** Los datos de la edición 187: la maqueta, `datos-187.js` y los valores por omisión de los scripts. Las demás ediciones no se declaran aquí (S13). */
export const EDICION = {
  numero: 187,
  /** La frase «Fuente: …» que se muestra vive en `src/textos/vivienda-nueva.ts`. */
  nombre: "Estrenar Vivienda",
  /** Vigencia impresa en la portada (AAAA-MM-DD). */
  desde: "2026-10-15",
  hasta: "2026-11-15",
} as const;

export const NO_LO_DICE = "no_lo_dice" as const;
export const ILEGIBLE = "ilegible" as const;
export type Estado = typeof NO_LO_DICE | typeof ILEGIBLE;

/** Las páginas de la edición 187 (los datos de la maqueta y de los scripts de lectura). Las demás ediciones traen las suyas. */
export const PAGINAS_EDICION = 68;
/** El tope de cualquier edición: el mismo CHECK de la tabla `ediciones.paginas`. */
export const PAGINAS_MAX = 500;

export const TIPOS_PAGINA = [
  "portada",
  "indice",
  "aviso_constructora",
  "directorio",
  "articulo",
  "publicidad_otra",
  "otro",
] as const;
export const TIPOS = ["apartamento", "casa", "lote", "otro"] as const;
export const SEGMENTOS = ["VIP", "VIS", "No VIS", "mixto"] as const;
export const ETAPAS = [
  "sobre_planos",
  "en_construccion",
  "entrega_inmediata",
] as const;
export const PRECISIONES_ENTREGA = [
  "mes",
  "trimestre",
  "semestre",
  "anio",
] as const;
export const PARQUEADERO = ["incluido", "adicional", "hay_sin_precio"] as const;

/** Lo que el aviso promete, en una lista CERRADA: un mensaje fuera de ella cuenta como «otro» y su texto no se guarda. */
export const ROTULOS = [
  "lanzamiento",
  "ultimas_unidades",
  "descuento",
  "cuota_inicial_flexible",
  "mejor_precio",
  "mejor_ubicacion",
  "renta_turistica",
  "financiacion_directa",
  "otro",
] as const;

export type TipoPagina = (typeof TIPOS_PAGINA)[number];
export type Rotulo = (typeof ROTULOS)[number];

// --- guardas de texto: lo que jamás entra --------------------------------------------------------------------------
const RE_WEB = /(https?:|www\.|\.com\b|\.co\b|\.net\b|@)/i;
export const RE_TELEFONO = /\d[\d\s().+-]{6,}\d/;
export const RE_DIRECCION =
  /\b(calle|cll?|carrera|cra?|kr|avenida|av|diagonal|dg|transversal|tv|autopista|km|kil[oó]metro)\b\.?\s*(n[o°º]?\.?\s*)?\d/i;

/** Texto corto sin web, correo, teléfono ni dirección. */
function texto(max: number) {
  return z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine((s) => !RE_WEB.test(s), "lleva_web")
    .refine((s) => !RE_TELEFONO.test(s), "lleva_telefono")
    .refine((s) => !RE_DIRECCION.test(s), "lleva_direccion");
}

function conEstado<T extends z.ZodType>(t: T) {
  return z.union([t, z.literal(NO_LO_DICE), z.literal(ILEGIBLE)]);
}

const area = z.number().positive().max(20000);
const entrega = z.union([
  z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "AAAA-MM"),
  z.literal("inmediata"),
]);

// --- proyecto ------------------------------------------------------------------------------------------------------
/** Los campos de un proyecto, sin las revisiones cruzadas: el de la lectura y el del proyecto unido los comparten. */
export const ProyectoBase = z
  .object({
    pagina: z.number().int().min(1).max(PAGINAS_MAX),
    /** Orden de lectura en la página: de izquierda a derecha y de arriba abajo. */
    posicion: z.number().int().min(1).max(30),
    nombre: conEstado(texto(80)),
    constructora: conEstado(texto(80)),
    tipo: conEstado(z.enum(TIPOS)),
    /** Ciudad o municipio como se escribe normalmente («Bogotá», «Chía»). */
    ciudad: conEstado(texto(40)),
    /** Localidad o barrio SOLO si el aviso lo imprime como tal; una dirección no es un sector. */
    sector: conEstado(texto(40)),
    segmento: conEstado(z.enum(SEGMENTOS)),
    /** Pesos enteros. Es el «desde»: el de la unidad más pequeña o barata, no un precio de cualquier unidad. */
    precio_desde: conEstado(
      z.number().int().min(10_000_000).max(50_000_000_000),
    ),
    area_construida_desde: conEstado(area),
    /** `null` si el aviso da un solo valor y no un rango. */
    area_construida_hasta: z.union([area, z.null(), z.literal(ILEGIBLE)]),
    area_privada_desde: conEstado(area),
    area_privada_hasta: z.union([area, z.null(), z.literal(ILEGIBLE)]),
    etapa: conEstado(z.enum(ETAPAS)),
    /** El ÚLTIMO mes que cubre lo impreso («segundo semestre 2028» → 2028-12). */
    entrega: conEstado(entrega),
    /** Qué tan fina es la fecha impresa; `null` cuando la entrega no es una fecha. */
    entrega_precision: z.union([z.enum(PRECISIONES_ENTREGA), z.null()]),
    parqueadero: conEstado(z.enum(PARQUEADERO)),
    /** Pesos enteros del parqueadero cuando el aviso lo da por separado; `null` si no. */
    parqueadero_precio: z.union([
      z.number().int().min(1_000_000).max(500_000_000),
      z.null(),
    ]),
    /** «si» solo si el aviso lo imprime; jamás «no». */
    precio_fijo: conEstado(z.literal("si")),
    subsidio_anunciado: conEstado(z.literal("si")),
    rotulos: z.array(z.enum(ROTULOS)).max(ROTULOS.length),
    /** Solo para la transcripción cruda (carpeta ignorada). Jamás pasa a un archivo del repo. */
    notas_crudo: texto(300).optional(),
  })
  .strict();

/**
 * Las revisiones cruzadas de un proyecto. En el proyecto UNIDO, un campo que dos páginas contradicen (`en_conflicto`) no
 * se revisa contra otro: lo que se contradice no puede ser incoherente a la vez con su vecino.
 */
export function revisarProyecto(
  p: Pick<
    z.infer<typeof ProyectoBase>,
    | "area_construida_desde"
    | "area_construida_hasta"
    | "area_privada_desde"
    | "area_privada_hasta"
    | "entrega"
    | "entrega_precision"
    | "parqueadero"
    | "parqueadero_precio"
  > & { en_conflicto?: readonly string[] },
  ctx: z.RefinementCtx,
) {
  {
    const contradicho = (campo: string) => p.en_conflicto?.includes(campo);
    const par = (
      desde: unknown,
      hasta: unknown,
      campo: "area_construida_hasta" | "area_privada_hasta",
    ) => {
      if (
        typeof desde === "number" &&
        typeof hasta === "number" &&
        hasta < desde
      ) {
        ctx.addIssue({
          code: "custom",
          path: [campo],
          message: "hasta_menor_que_desde",
        });
      }
    };
    if (
      !contradicho("area_construida_desde") &&
      !contradicho("area_construida_hasta")
    ) {
      par(
        p.area_construida_desde,
        p.area_construida_hasta,
        "area_construida_hasta",
      );
    }
    if (
      !contradicho("area_privada_desde") &&
      !contradicho("area_privada_hasta")
    ) {
      par(p.area_privada_desde, p.area_privada_hasta, "area_privada_hasta");
    }
    if (
      typeof p.area_privada_desde === "number" &&
      typeof p.area_construida_desde === "number" &&
      !contradicho("area_privada_desde") &&
      !contradicho("area_construida_desde") &&
      p.area_privada_desde > p.area_construida_desde
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["area_privada_desde"],
        message: "privada_mayor_que_construida",
      });
    }
    const esFecha = /^\d{4}-/.test(String(p.entrega));
    if (esFecha && p.entrega_precision === null) {
      ctx.addIssue({
        code: "custom",
        path: ["entrega_precision"],
        message: "entrega_sin_precision",
      });
    }
    if (!esFecha && p.entrega_precision !== null) {
      ctx.addIssue({
        code: "custom",
        path: ["entrega_precision"],
        message: "precision_sin_entrega",
      });
    }
    if (p.parqueadero_precio !== null && p.parqueadero !== "adicional") {
      ctx.addIssue({
        code: "custom",
        path: ["parqueadero_precio"],
        message: "precio_parqueadero_sin_adicional",
      });
    }
  }
}

export const ProyectoSchema = ProyectoBase.superRefine(revisarProyecto);

export type Proyecto = z.infer<typeof ProyectoSchema>;

// --- metadatos de la edición (S13) ---------------------------------------------------------------------------------
/** La revista; el nombre de una edición nunca cambia de un mes a otro. */
export const NOMBRE_REVISTA = "Estrenar Vivienda";
const fechaIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "AAAA-MM-DD");
const aMs = (f: string) => Date.parse(`${f}T00:00:00Z`);
/** Una vigencia razonable: de un mes, con holgura. Un año tecleado mal (2062) no pasa. */
export const DIAS_VIGENCIA_MAX = 62;

/**
 * Lo que `cargar` necesita saber de una edición y que NO es un proyecto: su número, cuántas páginas tiene y entre qué días
 * vale. Lo escribe `entregar` en el archivo entregado (el número y las páginas, de la propia transcripción; la vigencia, de
 * la convención del nombre del PDF o de lo que el usuario dice de la portada) y `cargar` lo lee de ahí: una edición nueva
 * entra sin tocar este módulo.
 */
export const MetaEdicionSchema = z
  .object({
    numero: z.number().int().positive(),
    nombre: z.literal(NOMBRE_REVISTA),
    desde: fechaIso,
    hasta: fechaIso,
    paginas: z.number().int().min(1).max(PAGINAS_MAX),
  })
  .strict()
  .superRefine((m, ctx) => {
    const d = aMs(m.desde);
    const h = aMs(m.hasta);
    if (Number.isNaN(d) || Number.isNaN(h)) {
      ctx.addIssue({
        code: "custom",
        path: ["desde"],
        message: "fecha_invalida",
      });
      return;
    }
    if (h < d) {
      ctx.addIssue({
        code: "custom",
        path: ["hasta"],
        message: "vigencia_invertida",
      });
    } else if ((h - d) / 86_400_000 > DIAS_VIGENCIA_MAX) {
      ctx.addIssue({
        code: "custom",
        path: ["hasta"],
        message: "vigencia_demasiado_larga",
      });
    }
  });

export type MetaEdicion = z.infer<typeof MetaEdicionSchema>;

// --- página y lectura ----------------------------------------------------------------------------------------------
export const PaginaSchema = z
  .object({
    pagina: z.number().int().min(1).max(PAGINAS_MAX),
    tipo: z.enum(TIPOS_PAGINA),
    proyectos: z.array(ProyectoSchema),
    /** Texto de la revista dirigido a un agente o modelo (una orden, un «ignora…»). Se ignora y se anota aquí. */
    avisos_al_agente: z.array(z.string().max(200)).max(5),
    /** Cuántas ilegibilidades hubo en la página, para el informe. */
    observaciones: texto(300).optional(),
  })
  .strict();

export const LecturaSchema = z
  .object({
    // Cualquier edición: la que los lectores leen la dice el archivo, no este módulo (S13).
    edicion: z.number().int().positive(),
    lector: z.string().regex(/^[A-Za-z0-9_-]{1,12}$/),
    paginas: z.array(PaginaSchema).min(1),
  })
  .strict()
  .superRefine((l, ctx) => {
    const vistas = new Set<number>();
    l.paginas.forEach((p, i) => {
      if (vistas.has(p.pagina)) {
        ctx.addIssue({
          code: "custom",
          path: ["paginas", i, "pagina"],
          message: "pagina_repetida",
        });
      }
      vistas.add(p.pagina);
      p.proyectos.forEach((pr, j) => {
        if (pr.pagina !== p.pagina) {
          ctx.addIssue({
            code: "custom",
            path: ["paginas", i, "proyectos", j, "pagina"],
            message: "pagina_ajena",
          });
        }
      });
    });
  });

export type PaginaLeida = z.infer<typeof PaginaSchema>;
export type Lectura = z.infer<typeof LecturaSchema>;

export type ResultadoValidacion =
  { ok: true; lectura: Lectura } | { ok: false; errores: string[] };

/** Valida una lectura y devuelve los errores legibles: «paginas.2.proyectos.1.sector: lleva una dirección». */
export function validarLectura(entrada: unknown): ResultadoValidacion {
  const r = LecturaSchema.safeParse(entrada);
  if (r.success) return { ok: true, lectura: r.data };
  return {
    ok: false,
    errores: r.error.issues.map(
      (i) => `${i.path.join(".") || "(raíz)"}: ${i.message}`,
    ),
  };
}

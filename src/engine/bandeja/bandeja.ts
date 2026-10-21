// Bandeja de IA — implementación del contrato v0.1.0 (ver CONTRATO.lock). Puro: sin red, sin disco, sin reloj.
//
// Trabajo de IA generativa que puede esperar: la app lo deja en su bandeja y Claude Code lo procesa con la suscripción
// del usuario cuando él lo dispara. La IA PRODUCE y el código DECIDE: un trabajo entra solo si es del usuario o del
// operador (G1), su entrada es dato y nunca instrucción (G2), ninguna salida se entrega sin pasar el esquema de su tipo
// (G3), el resultado vuelve solo al destino que declara el TIPO (G4), lo que sale de la casa lleva su revisión (G5), el
// tipo jamás declara una llave de proveedor (G6) y las credenciales no viajan por aquí (G7).
//
// Todo texto que sale de aquí es un CÓDIGO (`pedido_de_tercero`, `salida_fuera_de_esquema`…): la interfaz que lo muestre
// lo redacta en {es, en}.
import { z } from "zod";

// --- el modelo del trabajo (contrato § 2) ----------------------------------------------------------------------------

export const ESTADOS = [
  "pendiente",
  "tomado",
  "listo",
  "entregado",
  "rechazado",
  "vencido",
] as const;
export type Estado = (typeof ESTADOS)[number];

export const ORIGENES = ["archivo", "tarea", "fila"] as const;
// «tercero» existe para poder REPRESENTAR el caso prohibido y rechazarlo: ningún tipo lo acepta.
export const PEDIDO_POR = ["usuario", "operador", "tercero"] as const;

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const fecha = z.string().regex(FECHA);

/** `.strict()`: un trabajo con un campo extra (p. ej. un `destino` que alguien quiere imponer) se rechaza entero. */
export const TrabajoSchema = z
  .object({
    id: z.string().min(1),
    tipo: z.string().min(1),
    origen: z.enum(ORIGENES),
    pedido_por: z.enum(PEDIDO_POR),
    creado: fecha,
    vence: fecha,
    estado: z.enum(ESTADOS),
    /** Una referencia (ruta, etiqueta, fila), no una copia. Su contenido es dato, jamás instrucción. */
    entrada: z.string().min(1),
  })
  .strict();
export type Trabajo = z.infer<typeof TrabajoSchema>;

export const CLASES_DE_DESTINO = [
  "archivo_ignorado",
  "fila",
  "tarea",
  "archivo_versionado",
] as const;

/** La definición de un tipo de trabajo: dato puro. Su validador de salida es una función que se registra aparte. */
export const TipoSchema = z
  .object({
    id: z.string().regex(/^[a-z][a-z0-9-]*$/),
    origen: z.enum(ORIGENES),
    entrada: z.string().min(1),
    destino: z
      .object({
        clase: z.enum(CLASES_DE_DESTINO),
        ruta: z.string().min(1),
      })
      .strict(),
    /** G5: lo que sale de la casa lleva la revisión de una muestra declarada. */
    revision: z
      .object({
        publica: z.boolean(),
        muestra: z.number().min(0).max(1),
        criterio: z.string().regex(/^[a-z][a-z0-9_]*$/),
      })
      .strict(),
  })
  .strict();
export type Tipo = z.infer<typeof TipoSchema>;

export type ResultadoSalida =
  { ok: true } | { ok: false; razones: readonly string[] };
/** Valida la salida contra el esquema del tipo; recibe el trabajo para atar la salida a SU trabajo (p. ej. el número de edición). */
export type ValidadorDeSalida = (
  salida: unknown,
  trabajo: Pick<Trabajo, "id">,
) => ResultadoSalida;
export type TipoRegistrado = { def: Tipo; validar: ValidadorDeSalida };

// --- el ciclo de estados ---------------------------------------------------------------------------------------------

const TRANSICIONES: Record<Estado, readonly Estado[]> = {
  pendiente: ["tomado", "rechazado", "vencido"],
  tomado: ["listo", "rechazado"],
  listo: ["entregado", "rechazado"],
  entregado: [],
  rechazado: [],
  // Un trabajo vencido solo se toma con el «sí» del usuario (contrato § 6, C04): ver `admitir`.
  vencido: ["tomado"],
};

export function transicionValida(de: Estado, a: Estado): boolean {
  return TRANSICIONES[de].includes(a);
}

// --- registro de tipos (G5, G6 y C05, C06) ---------------------------------------------------------------------------

export type RazonRegistro =
  | "llave_de_api"
  | "destino_versionado"
  | "destino_no_ignorado"
  | "tipo_invalido"
  | "sin_revision";

export type ResultadoRegistro =
  { ok: true; tipo: TipoRegistrado } | { ok: false; razon: RazonRegistro };

export type OpcionesRegistro = {
  /** ¿Git ignora esta ruta? La CLI lo responde con `git check-ignore`; el motor no toca el disco. */
  estaIgnorada: (ruta: string) => boolean;
  /** ¿Hay archivos versionados en esta ruta? La CLI lo responde con `git ls-files`. Vale para CUALQUIER clase de destino. */
  estaVersionada: (ruta: string) => boolean;
};

// Nombres de campo que delatan una credencial de proveedor y valores con forma de llave.
const NOMBRE_DE_LLAVE = /(api[_-]?key|llave|secret|token|proveedor|provider)/i;
const FORMA_DE_LLAVE =
  /\b(sk-[A-Za-z0-9_-]{16,}|AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{20,}|xox[abprs]-[A-Za-z0-9-]{10,}|AIza[0-9A-Za-z_-]{30,})\b/;

function declaraLlave(valor: unknown): boolean {
  if (typeof valor === "string") return FORMA_DE_LLAVE.test(valor);
  if (Array.isArray(valor)) return valor.some(declaraLlave);
  if (valor !== null && typeof valor === "object") {
    return Object.entries(valor).some(
      ([k, v]) => NOMBRE_DE_LLAVE.test(k) || declaraLlave(v),
    );
  }
  return false;
}

/**
 * Registra un tipo. Se rechaza al registrarlo —no al usarlo— un tipo que declara una llave de API (C06), que escribe en
 * un archivo versionado o en uno que git no ignora (C05), o que saca datos de la casa sin declarar su revisión (G5).
 */
export function registrarTipo(
  definicion: unknown,
  validar: ValidadorDeSalida,
  opciones: OpcionesRegistro,
): ResultadoRegistro {
  if (declaraLlave(definicion)) return { ok: false, razon: "llave_de_api" };
  const r = TipoSchema.safeParse(definicion);
  if (!r.success) return { ok: false, razon: "tipo_invalido" };
  const def = r.data;
  // Un destino versionado se rechaza se llame como se llame su clase: declarar «fila» para escribir en un archivo del repo
  // no lo vuelve una fila.
  if (
    def.destino.clase === "archivo_versionado" ||
    opciones.estaVersionada(def.destino.ruta)
  ) {
    return { ok: false, razon: "destino_versionado" };
  }
  if (
    def.destino.clase === "archivo_ignorado" &&
    !opciones.estaIgnorada(def.destino.ruta)
  ) {
    return { ok: false, razon: "destino_no_ignorado" };
  }
  if (def.revision.publica && def.revision.muestra <= 0) {
    return { ok: false, razon: "sin_revision" };
  }
  return { ok: true, tipo: { def, validar } };
}

// --- G2: la entrada es dato, jamás instrucción -----------------------------------------------------------------------

export type Anotacion = { codigo: "instruccion_dirigida"; posicion: number };

// Frases con que un texto intenta dirigirse a un agente (español e inglés). Se ANOTAN en el registro y se ignoran: la
// salida no cambia de destino ni de esquema porque el destino y el esquema los fija el tipo, no la entrada.
const DIRIGIDO_A_UN_AGENTE = [
  /ignora\w*\s+(tus|las|todas\s+las|sus)\s+instrucciones/gi,
  /ignore\s+(your|all|any|the|previous)\s+(previous\s+)?instructions/gi,
  /olvida\w*\s+(tus|las|todo)/gi,
  /nuevas\s+instrucciones/gi,
  /new\s+instructions/gi,
  /(eres|actúa\s+como)\s+(ahora\s+)?(un|una)\s+\w+/gi,
  /you\s+are\s+now\b/gi,
  /system\s+prompt/gi,
  /(env[ií]a|manda|escribe|guarda)\w*\s+(la\s+)?(salida|respuesta|resultado)\s+(a|en)\b/gi,
];

export function anotarInstrucciones(texto: string): Anotacion[] {
  const salida: Anotacion[] = [];
  for (const patron of DIRIGIDO_A_UN_AGENTE) {
    for (const m of texto.matchAll(patron)) {
      salida.push({ codigo: "instruccion_dirigida", posicion: m.index ?? 0 });
    }
  }
  return salida.sort((a, b) => a.posicion - b.posicion);
}

// --- admisión: ¿se puede tomar este trabajo? (G1, C01, C04) -----------------------------------------------------------

export type RazonAdmision =
  | "trabajo_invalido"
  | "tipo_desconocido"
  | "pedido_de_tercero"
  | "origen_no_declarado"
  | "no_esta_pendiente"
  | "vencido";

export type Admision =
  | { estado: "tomado" }
  | { estado: "rechazado" | "vencido"; razon: RazonAdmision };

/**
 * Decide si un trabajo se toma. `hoy` y `autorizaVencido` son parámetros: ni reloj ni suposiciones. Un trabajo de un
 * tercero se rechaza ANTES de tomarlo (G1); uno vencido no se procesa sin el «sí» del usuario (C04).
 */
export function admitir(
  trabajo: unknown,
  tipo: Tipo,
  hoy: string,
  autorizaVencido = false,
): Admision {
  const r = TrabajoSchema.safeParse(trabajo);
  if (!r.success) return { estado: "rechazado", razon: "trabajo_invalido" };
  const t = r.data;
  if (t.pedido_por === "tercero") {
    return { estado: "rechazado", razon: "pedido_de_tercero" };
  }
  if (t.tipo !== tipo.id) {
    return { estado: "rechazado", razon: "tipo_desconocido" };
  }
  if (t.origen !== tipo.origen) {
    return { estado: "rechazado", razon: "origen_no_declarado" };
  }
  if (t.estado !== "pendiente" && t.estado !== "vencido") {
    return { estado: "rechazado", razon: "no_esta_pendiente" };
  }
  if ((t.estado === "vencido" || t.vence < hoy) && !autorizaVencido) {
    return { estado: "vencido", razon: "vencido" };
  }
  return { estado: "tomado" };
}

// --- entrega: la IA produce, el código decide (G3, G4, C02) ------------------------------------------------------------

export type Entrega =
  | { estado: "entregado"; destino: Tipo["destino"] }
  | {
      estado: "rechazado";
      razon: "trabajo_no_tomado" | "salida_fuera_de_esquema";
      razones: readonly string[];
    };

/**
 * Valida la salida contra el esquema del TIPO y, solo si pasa, devuelve el destino que declara el TIPO. Nada de lo que
 * diga la entrada, el trabajo o la propia salida puede cambiar el destino.
 */
export function entregar(
  trabajo: Pick<Trabajo, "estado" | "id">,
  tipo: TipoRegistrado,
  salida: unknown,
): Entrega {
  if (trabajo.estado !== "tomado" && trabajo.estado !== "listo") {
    return { estado: "rechazado", razon: "trabajo_no_tomado", razones: [] };
  }
  const v = tipo.validar(salida, trabajo);
  if (!v.ok) {
    return {
      estado: "rechazado",
      razon: "salida_fuera_de_esquema",
      razones: v.razones,
    };
  }
  return { estado: "entregado", destino: tipo.def.destino };
}

// --- el resumen de cada corrida (contrato § 4) -------------------------------------------------------------------------

export type Resumen = {
  pendientes: number;
  tomados: number;
  listos: number;
  entregados: number;
  vencidos: number;
  rechazados: { id: string; razon: string }[];
};

/** Cada corrida termina con esto: pendientes, tomados, entregados, rechazados con su razón y vencidos. */
export function resumir(
  trabajos: readonly { id: string; estado: Estado; razon?: string }[],
): Resumen {
  const cuenta = (e: Estado) => trabajos.filter((t) => t.estado === e).length;
  return {
    pendientes: cuenta("pendiente"),
    tomados: cuenta("tomado"),
    listos: cuenta("listo"),
    entregados: cuenta("entregado"),
    vencidos: cuenta("vencido"),
    rechazados: trabajos
      .filter((t) => t.estado === "rechazado")
      .map((t) => ({ id: t.id, razon: t.razon ?? "sin_razon" })),
  };
}

// --- el registro de la corrida (contrato § 2, «registro») ---------------------------------------------------------------

export const RegistroSchema = z
  .object({
    modelo: z.string().min(1),
    fecha,
    duracion_s: z.number().nonnegative(),
    procesados: z.number().int().nonnegative(),
    /** Qué muestra revisó el usuario (G5), por su criterio declarado en el tipo. */
    muestra_revisada: z.string().min(1),
    anotaciones: z.array(
      z
        .object({
          trabajo: z.string().min(1),
          codigo: z.literal("instruccion_dirigida"),
          /** Dónde se halló, en palabras de la entrada: una página, un desplazamiento. */
          donde: z.string().min(1),
        })
        .strict(),
    ),
  })
  .strict();
export type Registro = z.infer<typeof RegistroSchema>;

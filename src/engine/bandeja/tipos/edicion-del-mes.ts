// El primer tipo de la bandeja: `edicion-del-mes` (S11). Origen `archivo`: un PDF de la revista mensual de vivienda nueva en
// la carpeta de fuentes privadas de la planeadora SIN su transcripción es un trabajo pendiente. Claude Code lo renderiza,
// lo transcribe con lectores en Sonnet y lo valida; la IA solo transcribe y los números los hacen los motores.
//
// Destino: `scripts/vivienda-nueva/crudo/` (ignorado por git). Al repo solo llega lo procesado (maqueta.mjs), con su
// fuente. La revisión (G5): doble lectura de al menos el 10 % de los proyectos, con cero discrepancias en precio y áreas.
import { z } from "zod";
import { PAGINAS_EDICION, PaginaSchema } from "../../vivienda-nueva/edicion.ts";
import { ProyectoUnicoSchema } from "../../vivienda-nueva/lectura.ts";
import { type Tipo, type Trabajo, type ValidadorDeSalida } from "../bandeja.ts";

export const ID_EDICION_DEL_MES = "edicion-del-mes";
/** Donde espera la transcripción entregada (`edicion-N.json`) antes de cargarse: ignorada por git, jamás se versiona. */
export const CARPETA_INTERMEDIA = "scripts/vivienda-nueva/crudo/";
/** Dónde está el insumo: dentro de la planeadora (privada, solo en el Mac del usuario). */
export const CARPETA_DE_FUENTES = "fuentes/estrenar-vivienda/";

export const DEFINICION_EDICION_DEL_MES: Tipo = {
  id: ID_EDICION_DEL_MES,
  origen: "archivo",
  entrada: CARPETA_DE_FUENTES,
  // G4: el resultado vuelve a una FILA (la tabla de ediciones). La transcripción validada espera antes, en una carpeta
  // ignorada por git, hasta que alguien la carga y, tras revisar la muestra, la publica.
  destino: { clase: "fila", ruta: "ediciones" },
  revision: { publica: true, muestra: 0.1, criterio: "doble_lectura" },
};

// `2026-10-edicion-187.pdf`: el mes en que sale y el número de la edición.
const NOMBRE = /^(\d{4})-(\d{2})-edicion-(\d+)\.pdf$/;

/** La edición vale hasta el día 15 del mes siguiente (vigente del 15 al 15): pasada esa fecha, la bandeja lo dice. */
export function venceEdicion(nombre: string): string | null {
  const m = nombre.match(NOMBRE);
  if (!m) return null;
  let anio = Number(m[1]);
  let mes = Number(m[2]) + 1;
  if (mes > 12) {
    mes = 1;
    anio += 1;
  }
  return `${anio}-${String(mes).padStart(2, "0")}-15`;
}

/** La edición sale el día 15 del mes de su nombre. */
export function creaEdicion(nombre: string): string | null {
  const m = nombre.match(NOMBRE);
  return m ? `${m[1]}-${m[2]}-15` : null;
}

export function numeroDeEdicion(nombre: string): number | null {
  const m = nombre.match(NOMBRE);
  return m ? Number(m[3]) : null;
}

/** El archivo donde espera la transcripción entregada de una edición, dentro de la carpeta intermedia. */
export const archivoDeEdicion = (numero: number) => `edicion-${numero}.json`;

/** Solo el NOMBRE del archivo: la bandeja no abre el PDF ni lee sus metadatos para saber que existe. */
export type ArchivoDeFuente = { nombre: string };

/**
 * Los trabajos pendientes: cada PDF con nombre de edición cuya transcripción NO existe. Los archivos que no siguen el
 * nombre se devuelven aparte (la bandeja no adivina qué son). Todos nacen `pendiente`: `admitir` decide si ya vencieron.
 */
export function trabajosDeEdicion(
  archivos: readonly ArchivoDeFuente[],
  transcritas: readonly number[],
): { trabajos: Trabajo[]; listos: Trabajo[]; ignorados: string[] } {
  const trabajos: Trabajo[] = [];
  const listos: Trabajo[] = [];
  const ignorados: string[] = [];
  for (const a of archivos) {
    const numero = numeroDeEdicion(a.nombre);
    const vence = venceEdicion(a.nombre);
    const creado = creaEdicion(a.nombre);
    if (numero === null || vence === null || creado === null) {
      ignorados.push(a.nombre);
      continue;
    }
    const trabajo: Trabajo = {
      id: `${ID_EDICION_DEL_MES}-${numero}`,
      tipo: ID_EDICION_DEL_MES,
      origen: "archivo",
      // El usuario deja el PDF en su carpeta: es trabajo suyo, jamás de un tercero.
      pedido_por: "usuario",
      creado,
      vence,
      estado: "pendiente",
      entrada: `${CARPETA_DE_FUENTES}${a.nombre}`,
    };
    // Con su transcripción entregada el trabajo está «listo»: falta cargarla a su destino y publicarla tras la revisión.
    if (transcritas.includes(numero))
      listos.push({ ...trabajo, estado: "listo" });
    else trabajos.push(trabajo);
  }
  return { trabajos, listos, ignorados };
}

// La salida: la edición unida (`validar.mjs --unir`). Cada página pasa el esquema ESTRICTO de la F1 (sin teléfonos,
// direcciones, webs ni texto libre); la edición no se entrega a medias.
const SalidaSchema = z
  .object({
    edicion: z.number().int().positive(),
    paginas: z.array(PaginaSchema).min(1),
    proyectos: z.array(ProyectoUnicoSchema).min(1),
    conflictos: z.array(z.unknown()),
    reconciliados: z.array(z.unknown()),
    paginasSinLeer: z.array(z.number().int()),
    paginasRepetidas: z.array(z.number().int()),
  })
  .strict();

export const validarEdicionDelMes: ValidadorDeSalida = (salida, trabajo) => {
  const r = SalidaSchema.safeParse(salida);
  if (!r.success) {
    return {
      ok: false,
      razones: r.error.issues.map(
        (i) => `${i.path.join(".") || "(raíz)"}: ${i.message}`,
      ),
    };
  }
  const razones: string[] = [];
  // La salida es de SU trabajo: `edicion-del-mes-188` no se cierra con la transcripción de la 187.
  if (r.data.edicion !== Number(trabajo.id.split("-").pop())) {
    razones.push("edicion_distinta");
  }
  if (r.data.paginasSinLeer.length > 0) razones.push("paginas_sin_leer");
  if (r.data.paginas.length !== PAGINAS_EDICION)
    razones.push("paginas_incompletas");
  return razones.length === 0 ? { ok: true } : { ok: false, razones };
};

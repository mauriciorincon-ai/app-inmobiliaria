// Los datos con los que el comprador se identifica (S8, ADR 016): número de cédula, fecha de expedición y
// nombre completo como aparece en la cédula. Se validan aquí, viajan al proveedor y se DESCARTAN: ninguno
// se guarda en la base ni sale en un registro. Este módulo no conoce al proveedor.
import { z } from "zod";

/** Quita los separadores con los que la gente escribe la cédula: «1.020.304.050» → «1020304050». */
export function normalizarCedula(texto: string): string {
  return texto.replace(/[\s.\-]/g, "");
}

// Cédula de ciudadanía colombiana: de 6 a 10 dígitos (el rango que acepta el registro).
const REGEX_CEDULA = /^[0-9]{6,10}$/;
const REGEX_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;
// Letras (con tildes y eñes), espacios, apóstrofo, guion y punto.
const REGEX_NOMBRE = /^\p{L}[\p{L}' .-]*$/u;
// La cédula amarilla con hologramas se expide desde 2000; las anteriores siguen vigentes en papel. Una
// fecha anterior a 1940 es un error de digitación.
const FECHA_MINIMA = "1940-01-01";

export function esFechaReal(fecha: string): boolean {
  const m = REGEX_FECHA.exec(fecha);
  if (!m) return false;
  const [anio, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(anio, mes - 1, dia));
  return (
    d.getUTCFullYear() === anio &&
    d.getUTCMonth() === mes - 1 &&
    d.getUTCDate() === dia
  );
}

function palabrasDe(nombre: string): string[] {
  return nombre.trim().split(/\s+/).filter(Boolean);
}

const entradaSchema = z.object({
  cedula: z.string().max(20),
  fechaExpedicion: z.string().max(10),
  nombre: z.string().max(120),
  consentimiento: z.literal(true),
});

export type DatosIdentidad = {
  cedula: string;
  fechaExpedicion: string;
  nombre: string;
};

export type CampoInvalido = "cedula" | "fechaExpedicion" | "nombre";

/**
 * Valida lo que escribió el comprador. `hoy` es la fecha de Bogotá (YYYY-MM-DD) en que se valida: la fecha
 * de expedición no puede ser futura. Sin el consentimiento no hay datos: responde el campo `consentimiento`.
 */
export function validarDatosIdentidad(
  entrada: unknown,
  hoy: string,
):
  | { ok: true; datos: DatosIdentidad }
  | { ok: false; campo: CampoInvalido | "consentimiento" } {
  const leido = entradaSchema.safeParse(entrada);
  if (!leido.success) {
    const consentimientoMal =
      typeof entrada !== "object" ||
      entrada === null ||
      (entrada as { consentimiento?: unknown }).consentimiento !== true;
    if (consentimientoMal) return { ok: false, campo: "consentimiento" };
    const ruta = leido.error.issues[0]?.path[0];
    return {
      ok: false,
      campo: ruta === "fechaExpedicion" || ruta === "nombre" ? ruta : "cedula",
    };
  }
  const cedula = normalizarCedula(leido.data.cedula);
  if (!REGEX_CEDULA.test(cedula)) return { ok: false, campo: "cedula" };
  const fecha = leido.data.fechaExpedicion;
  if (!esFechaReal(fecha) || fecha < FECHA_MINIMA || fecha > hoy) {
    return { ok: false, campo: "fechaExpedicion" };
  }
  const nombre = palabrasDe(leido.data.nombre).join(" ");
  if (
    nombre.length < 5 ||
    !REGEX_NOMBRE.test(nombre) ||
    palabrasDe(nombre).length < 2
  ) {
    return { ok: false, campo: "nombre" };
  }
  return { ok: true, datos: { cedula, fechaExpedicion: fecha, nombre } };
}

/** «José Ñúñez-Ruiz» → «jose nunez ruiz»: sin tildes, sin mayúsculas, sin guiones ni puntos. */
export function normalizarNombre(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z' ]+/g, " ")
    .replace(/'/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .join(" ");
}

/**
 * ¿El nombre que escribió el comprador es el del registro? Las mismas palabras, en cualquier orden (el
 * registro separa nombres y apellidos; la persona los escribe juntos). Una palabra de más o de menos —un
 * segundo nombre omitido, un apellido de menos— no coincide: la pantalla pide escribirlo «como en la
 * cédula, con los dos apellidos».
 */
export function nombresCoinciden(declarado: string, registro: string): boolean {
  const a = normalizarNombre(declarado).split(" ").filter(Boolean).sort();
  const b = normalizarNombre(registro).split(" ").filter(Boolean).sort();
  return a.length > 0 && a.length === b.length && a.every((p, i) => p === b[i]);
}

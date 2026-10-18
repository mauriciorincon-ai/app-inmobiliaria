// Qué responde el proveedor de identidad y cómo se lee (S8, ADR 016). Dos fuentes con la misma salida:
//   · el SIMULADOR, determinista, para desarrollo, CI y pruebas (`IDENTIDAD_MOCK=1`);
//   · Didit (`POST /v3/database-validation/`, servicio `col_cedula`), detrás de `DIDIT_API_KEY`.
// Solo un `MATCH` del registro con el MISMO nombre identifica. Este módulo es puro: no llama a nadie.
import { z } from "zod";
import { nombresCoinciden, type DatosIdentidad } from "./datos";

export type ResultadoProveedor =
  "identificado" | "no_coincide" | "no_disponible";

// ── Simulador ─────────────────────────────────────────────────────────────────

// Cédulas de prueba, una por estado de la maqueta 04. Cualquier otra no coincide: el simulador jamás
// identifica a quien no sea de prueba. Son SINTÉTICAS (rango que no existe en el registro).
export const CEDULAS_PRUEBA = {
  identificado: "1000000001",
  no_coincide: "1000000002",
  no_disponible: "1000000003",
} as const satisfies Record<ResultadoProveedor, string>;

export function simular(datos: DatosIdentidad): ResultadoProveedor {
  if (datos.cedula === CEDULAS_PRUEBA.identificado) return "identificado";
  if (datos.cedula === CEDULAS_PRUEBA.no_disponible) return "no_disponible";
  return "no_coincide";
}

// ── Didit ─────────────────────────────────────────────────────────────────────

export const URL_DIDIT =
  "https://verification.didit.me/v3/database-validation/";

/**
 * El formulario que se manda a Didit: país, servicio, número y fecha de expedición. El nombre NO viaja:
 * se compara aquí con el que devuelve el registro (minimización, y sin depender de cómo se separan
 * nombres y apellidos).
 */
export function formularioDidit(datos: DatosIdentidad): Record<string, string> {
  return {
    issuing_state: "COL",
    services: "col_cedula",
    personal_number: datos.cedula,
    date_of_issue: datos.fechaExpedicion,
  };
}

// Solo lo que se lee de la respuesta; lo demás se ignora. Los nombres del registro se usan para comparar
// y se descartan.
const respuestaDiditSchema = z.object({
  validations: z
    .array(
      z.object({
        service_id: z.string().optional(),
        outcome_code: z.string(),
        source_data: z
          .object({
            first_name: z.string().nullish(),
            last_name: z.string().nullish(),
          })
          .nullish(),
      }),
    )
    .min(1),
});

/**
 * Traduce la respuesta de Didit. `MATCH` + el mismo nombre ⇒ identificado. `NO_MATCH`,
 * `DOCUMENT_NOT_FOUND`, `PARTIAL_MATCH` o un nombre distinto ⇒ no coincide. `INCONCLUSIVE`, un HTTP que no
 * es 200, una respuesta que no se entiende o un `MATCH` sin nombres ⇒ no disponible (el registro no
 * respondió; no gasta los intentos del comprador).
 */
export function interpretarDidit(
  status: number,
  cuerpo: unknown,
  nombreDeclarado: string,
): ResultadoProveedor {
  if (status !== 200) return "no_disponible";
  const leido = respuestaDiditSchema.safeParse(cuerpo);
  if (!leido.success) return "no_disponible";
  const v =
    leido.data.validations.find((x) => x.service_id === "col_cedula") ??
    leido.data.validations[0];
  switch (v.outcome_code) {
    case "MATCH": {
      const registro = [v.source_data?.first_name, v.source_data?.last_name]
        .filter((p): p is string => typeof p === "string" && p.trim() !== "")
        .join(" ");
      if (!registro) return "no_disponible";
      return nombresCoinciden(nombreDeclarado, registro)
        ? "identificado"
        : "no_coincide";
    }
    case "NO_MATCH":
    case "DOCUMENT_NOT_FOUND":
    case "PARTIAL_MATCH":
      return "no_coincide";
    default:
      return "no_disponible";
  }
}

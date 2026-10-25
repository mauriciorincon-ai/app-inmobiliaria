// De un error de las RPC antifraude y de la sesión de fotos a una respuesta HTTP (S15). Como en la visita: la base dice QUÉ
// pasó con un código en el mensaje; lo que no se reconoce es un 500 y jamás se muestra el texto de la base.
import type { ErrorRpc } from "@/engine/visita/errores";

const DE_VALIDACION = [
  "motivo_invalido",
  "detalle_invalido",
  "razon_invalida",
  "nota_invalida",
  "huella_invalida",
  "franja_invalida",
  "fecha_invalida",
  "hallazgos_invalidos",
] as const;

const DE_ESTADO = ["ya_reportado", "ya_solicitada", "estado_invalido"] as const;

const DE_TOPE = ["demasiados_reportes", "demasiadas_sesiones"] as const;

export type CodigoAntifraude =
  | (typeof DE_VALIDACION)[number]
  | (typeof DE_ESTADO)[number]
  | (typeof DE_TOPE)[number]
  | "no_verificado"
  | "token_invalido"
  | "no_disponible"
  | "servidor";

export function respuestaDeErrorAntifraude(error: ErrorRpc): {
  status: number;
  codigo: CodigoAntifraude;
} {
  const mensaje = error.message ?? "";
  const buscar = <T extends string>(lista: readonly T[]) =>
    lista.find((c) => mensaje.includes(c));
  if (error.code === "42501" || mensaje.includes("no_verificado")) {
    return { status: 403, codigo: "no_verificado" };
  }
  if (mensaje.includes("token_invalido")) {
    return { status: 403, codigo: "token_invalido" };
  }
  if (error.code === "P0002" || mensaje.includes("no_disponible")) {
    return { status: 404, codigo: "no_disponible" };
  }
  const validacion = buscar(DE_VALIDACION);
  if (validacion) return { status: 400, codigo: validacion };
  const estado = buscar(DE_ESTADO);
  if (estado) return { status: 409, codigo: estado };
  const tope = buscar(DE_TOPE);
  if (tope) return { status: 429, codigo: tope };
  return { status: 500, codigo: "servidor" };
}

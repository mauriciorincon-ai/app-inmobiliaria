// De un error de las RPC de guardar y avisar (S9) a una respuesta HTTP. Igual que en la visita: la RPC dice
// QUÉ pasó con un código en el mensaje y aquí se le da un estado; lo que no se reconoce es un 500 y jamás se
// le muestra a la persona el texto de la base.
import type { ErrorRpc } from "@/engine/visita/errores";

// Lo que la persona escribió mal: 400.
const DE_VALIDACION = [
  "consentimiento_requerido",
  "email_invalido",
  "nombre_invalido",
  "idioma_invalido",
  "sin_aviso",
  "sin_criterios",
  "criterios_invalidos",
  "poligono_invalido",
  "ip_invalida",
  "nota_invalida",
  "accion_invalida",
] as const;

// Un tope (por persona, por lista o el cupo de correos del día): 429.
const DE_TOPE = [
  "demasiadas_alertas",
  "sin_cupo",
  "demasiadas_listas",
  "lista_llena",
  "demasiadas_notas",
] as const;

export type CodigoGuardar =
  | (typeof DE_VALIDACION)[number]
  | (typeof DE_TOPE)[number]
  | "no_verificado"
  | "token_invalido"
  | "no_disponible"
  | "servidor";

export function respuestaDeErrorGuardar(error: ErrorRpc): {
  status: number;
  codigo: CodigoGuardar;
} {
  const mensaje = error.message ?? "";
  if (error.code === "42501" || mensaje.includes("no_verificado")) {
    return { status: 403, codigo: "no_verificado" };
  }
  if (mensaje.includes("token_invalido")) {
    return { status: 403, codigo: "token_invalido" };
  }
  if (error.code === "P0002" || mensaje.includes("no_disponible")) {
    return { status: 404, codigo: "no_disponible" };
  }
  const validacion = DE_VALIDACION.find((c) => mensaje.includes(c));
  if (validacion) return { status: 400, codigo: validacion };
  const tope = DE_TOPE.find((c) => mensaje.includes(c));
  if (tope) return { status: 429, codigo: tope };
  return { status: 500, codigo: "servidor" };
}

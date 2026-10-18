// De un error de las RPC de la visita a una respuesta HTTP (S8). Las RPC dicen QUÉ pasó con un código en el
// mensaje (`raise exception 'ya_solicitada'`); este módulo lo reconoce y le da un estado HTTP. Lo que no
// reconoce es un error del servidor (500): nunca se le muestra a la persona el texto de la base.

// Datos que la persona escribió mal: 400.
const DE_VALIDACION = [
  "intencion_invalida",
  "email_invalido",
  "presupuesto_invalido",
  "pago_invalido",
  "mensaje_invalido",
  "horarios_invalidos",
  "asistencia_invalida",
] as const;

// La solicitud no está en el estado que la acción necesita, o un tope: 409.
const DE_ESTADO = [
  "ya_solicitada",
  "demasiadas_solicitudes",
  "rechazada_reciente",
  "sin_contacto",
  "estado_invalido",
  "solicitud_invalida",
  "horario_invalido",
  "horario_vencido",
  "visita_invalida",
  "visita_futura",
] as const;

export type CodigoVisita =
  | (typeof DE_VALIDACION)[number]
  | (typeof DE_ESTADO)[number]
  | "no_verificado"
  | "token_invalido"
  | "no_disponible"
  | "servidor";

export type ErrorRpc = { code?: string | null; message?: string | null };

export function respuestaDeError(error: ErrorRpc): {
  status: number;
  codigo: CodigoVisita;
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
  return { status: 500, codigo: "servidor" };
}

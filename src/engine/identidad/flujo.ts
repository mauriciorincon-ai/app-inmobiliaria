// El orden que protege el dinero (S8, ADR 016): PRIMERO se reserva la consulta en la base (donde viven
// los topes), DESPUÉS se llama al proveedor, y al final se registra el resultado. Sin reserva no hay
// llamada y no hay cobro. Puro: recibe las tres operaciones como funciones, así el gate se prueba sin red.
import type { DatosIdentidad } from "./datos";
import type { ResultadoProveedor } from "./proveedor";

// Lo que responde la base al pedir la reserva (`reservar_consulta_identidad`).
export type Reserva =
  | { ok: true; consulta_id: string }
  | {
      ok: false;
      motivo:
        | "no_verificado"
        | "ya_identificado"
        | "tope_comprador"
        | "tope_dia"
        | "tope_mes";
    };

// Lo que ve la página. `tope` = la plataforma llegó al tope del día o del mes («Hoy no podemos validar
// más cédulas»); `tope_comprador` = este comprador ya usó sus intentos.
export type RespuestaIdentidad =
  | ResultadoProveedor
  | "tope"
  | "tope_comprador"
  | "no_verificado"
  | "ya_identificado";

export type OperacionesIdentidad = {
  reservar: () => Promise<Reserva>;
  consultar: (datos: DatosIdentidad) => Promise<ResultadoProveedor>;
  /**
   * Cierra la reserva con el resultado. Recibe los datos para poder ligar la identificación al nombre que
   * validó el registro. Si no puede dejarla completa, devuelve el resultado con el que la cerró (p. ej.
   * `no_disponible`): nadie queda «identificado» a medias.
   */
  registrar: (
    consultaId: string,
    resultado: ResultadoProveedor,
    datos: DatosIdentidad,
  ) => Promise<ResultadoProveedor | void>;
};

export function respuestaSinReserva(
  motivo: Extract<Reserva, { ok: false }>["motivo"],
): RespuestaIdentidad {
  return motivo === "tope_dia" || motivo === "tope_mes" ? "tope" : motivo;
}

export async function identificar(
  op: OperacionesIdentidad,
  datos: DatosIdentidad,
): Promise<RespuestaIdentidad> {
  const reserva = await op.reservar();
  if (!reserva.ok) return respuestaSinReserva(reserva.motivo);
  let resultado: ResultadoProveedor;
  try {
    resultado = await op.consultar(datos);
  } catch {
    // Una caída de red o del proveedor: no es culpa del comprador.
    resultado = "no_disponible";
  }
  const cerrado = await op.registrar(reserva.consulta_id, resultado, datos);
  return cerrado ?? resultado;
}

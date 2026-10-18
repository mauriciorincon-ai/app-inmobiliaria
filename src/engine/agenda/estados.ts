// Qué puede hacer cada quien con una solicitud de visita según su estado y la hora (S8). La base es la que
// decide (las RPC rechazan lo que no toca); esto le dice a la interfaz qué botones mostrar, con las mismas
// reglas, para no ofrecer lo que la base va a rechazar.

export type EstadoSolicitud =
  | "en_espera"
  | "pendiente"
  | "propuesta"
  | "confirmada"
  | "rechazada"
  | "cancelada";

export type VisitaResumen = {
  inicio: string;
  cancelada_por: "comprador" | "dueno" | null;
  asistio?: boolean | null;
} | null;

export type AccionesDueno = {
  aceptar: boolean;
  proponer: boolean;
  rechazar: boolean;
  cancelar: boolean;
  marcar: boolean;
};

export type AccionesComprador = {
  elegir: boolean;
  cancelar: boolean;
  calendario: boolean;
};

const VIVOS: EstadoSolicitud[] = [
  "en_espera",
  "pendiente",
  "propuesta",
  "confirmada",
];

export function estaViva(estado: EstadoSolicitud): boolean {
  return VIVOS.includes(estado);
}

function confirmadaYVigente(
  estado: EstadoSolicitud,
  visita: VisitaResumen,
): boolean {
  return (
    estado === "confirmada" && visita !== null && visita.cancelada_por === null
  );
}

export function accionesDueno(
  s: { estado: EstadoSolicitud; visita: VisitaResumen },
  ahora: Date,
): AccionesDueno {
  const vigente = confirmadaYVigente(s.estado, s.visita);
  const yaPaso = vigente && Date.parse(s.visita!.inicio) <= ahora.getTime();
  return {
    aceptar: s.estado === "en_espera",
    proponer: s.estado === "pendiente" || s.estado === "propuesta",
    rechazar:
      s.estado === "en_espera" ||
      s.estado === "pendiente" ||
      s.estado === "propuesta",
    cancelar: vigente && !yaPaso,
    marcar: vigente && yaPaso,
  };
}

export function accionesComprador(
  v: { estado: EstadoSolicitud; visita: VisitaResumen; horarios: unknown[] },
  ahora: Date,
): AccionesComprador {
  const vigente = confirmadaYVigente(v.estado, v.visita);
  const futura = vigente && Date.parse(v.visita!.inicio) > ahora.getTime();
  return {
    elegir: v.estado === "propuesta" && v.horarios.length > 0,
    cancelar:
      v.estado === "en_espera" ||
      v.estado === "pendiente" ||
      v.estado === "propuesta" ||
      futura,
    calendario: futura,
  };
}

// Las franjas en que un comprador dice que le sirve visitar una sala de ventas (S13, maqueta 05). La misma lista que el
// CHECK de `solicitudes_visita.franja` y que valida la ruta y la base: una franja fuera de ella nunca llega a guardarse.
export const FRANJAS_VISITA = ["entre_semana", "sabado", "domingo"] as const;
export type FranjaDeVisita = (typeof FRANJAS_VISITA)[number];

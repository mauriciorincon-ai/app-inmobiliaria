"use client";

import { createContext, useContext } from "react";

// Qué pestaña muestra el teléfono (lista o mapa). La decide BuscarLayout; el mapa, que llega ya
// armado desde el servidor, la lee de aquí en vez de recibirla por props.
export type Vista = "lista" | "mapa";

export const VistaContexto = createContext<{
  vista: Vista;
  setVista: (v: Vista) => void;
}>({ vista: "lista", setVista: () => {} });

export function useVista() {
  return useContext(VistaContexto);
}

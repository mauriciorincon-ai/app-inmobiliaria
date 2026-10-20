// «Lo que puedes pagar» en el NAVEGADOR (S10, ADR 018). Los ingresos viven en `localStorage` de ESTE teléfono y en
// ningún otro sitio: ninguna función de aquí hace una petición. Nunca lanza.
import {
  CLAVE_CAPACIDAD,
  serializarCapacidad,
  type Capacidad,
} from "@/engine/simulador/capacidad-local";
import { borrarLocal, escribirLocal, leerLocal } from "@/lib/almacen-local";

const EVENTO = "inn:capacidad";

export function suscribirCapacidad(avisar: () => void): () => void {
  window.addEventListener("storage", avisar);
  window.addEventListener(EVENTO, avisar);
  return () => {
    window.removeEventListener("storage", avisar);
    window.removeEventListener(EVENTO, avisar);
  };
}

/** Lo guardado tal cual (texto): estable entre lecturas, apto para `useSyncExternalStore`. */
export function instantaneaCapacidad(): string {
  return leerLocal(CLAVE_CAPACIDAD) ?? "";
}

export function guardarCapacidad(c: Capacidad): void {
  escribirLocal(CLAVE_CAPACIDAD, serializarCapacidad(c));
  window.dispatchEvent(new Event(EVENTO));
}

export function olvidarCapacidad(): void {
  borrarLocal(CLAVE_CAPACIDAD);
  window.dispatchEvent(new Event(EVENTO));
}

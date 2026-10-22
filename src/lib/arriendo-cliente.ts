// «Tu arriendo» de la espera en el NAVEGADOR (S12, como `capacidad-cliente`). El arriendo vive en `localStorage` de ESTE
// teléfono y en ningún otro sitio: ninguna función de aquí hace una petición. Nunca lanza.
import {
  CLAVE_ARRIENDO,
  serializarArriendo,
} from "@/engine/vivienda-nueva/arriendo-local";
import { borrarLocal, escribirLocal, leerLocal } from "@/lib/almacen-local";

const EVENTO = "inn:arriendo";

export function suscribirArriendo(avisar: () => void): () => void {
  window.addEventListener("storage", avisar);
  window.addEventListener(EVENTO, avisar);
  return () => {
    window.removeEventListener("storage", avisar);
    window.removeEventListener(EVENTO, avisar);
  };
}

/** Lo guardado tal cual (texto): estable entre lecturas, apto para `useSyncExternalStore`. */
export function instantaneaArriendo(): string {
  return leerLocal(CLAVE_ARRIENDO) ?? "";
}

export function guardarArriendo(arriendo: number): void {
  escribirLocal(CLAVE_ARRIENDO, serializarArriendo(arriendo));
  window.dispatchEvent(new Event(EVENTO));
}

export function olvidarArriendo(): void {
  borrarLocal(CLAVE_ARRIENDO);
  window.dispatchEvent(new Event(EVENTO));
}

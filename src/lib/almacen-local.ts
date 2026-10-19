// Almacenamiento del navegador (S9). Puede faltar o lanzar (ventana privada, datos de sitio bloqueados,
// vistas previas): aquí nunca lanza, y lo que no se pudo guardar simplemente no se guarda. Lo guardado vive
// solo en ESTE teléfono; nada de esto llega al servidor por sí solo.
export function leerLocal(clave: string): string | null {
  try {
    return window.localStorage.getItem(clave);
  } catch {
    return null;
  }
}

export function escribirLocal(clave: string, valor: string): void {
  try {
    window.localStorage.setItem(clave, valor);
  } catch {
    // sin almacenamiento: la pantalla sigue funcionando con lo que tiene en memoria
  }
}

import { lang } from "next/root-params";
import { esIdioma, IDIOMA_POR_DEFECTO, type Idioma } from "./idiomas";

// Idioma del segmento raíz [lang] SIN recibir `params`: para los archivos que Next no alimenta con
// él (`loading.tsx`, `not-found.tsx`). Solo funciona en Server Components. Las páginas leen
// `params` con `leerIdioma` (ruta.ts), que es explícito y fácil de probar.
export async function idiomaDeLaRaiz(): Promise<Idioma> {
  const valor = await lang();
  return esIdioma(valor) ? valor : IDIOMA_POR_DEFECTO;
}

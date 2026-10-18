import { notFound } from "next/navigation";
import { esIdioma, type Idioma } from "./idiomas";

// Lee y valida el segmento `[lang]` de una página o layout. Un valor que no sea es/en no debería
// llegar nunca (la reescritura de `next.config.ts` solo produce los dos), pero si llega es un 404.
export async function leerIdioma(
  params: Promise<{ lang: string }>,
): Promise<Idioma> {
  const { lang } = await params;
  if (!esIdioma(lang)) notFound();
  return lang;
}

// Props de toda página bajo /[lang].
export type PropsLang = { params: Promise<{ lang: string }> };

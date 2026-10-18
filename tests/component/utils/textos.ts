import type { Idioma } from "@/i18n/idiomas";
import { enIdioma } from "@/i18n/textos";
import { LANDING } from "@/textos/landing";
import { MI_ANUNCIO, VIGENCIA } from "@/textos/mi-anuncio";
import { PUBLICAR } from "@/textos/publicar";
import { REFERIDO } from "@/textos/referido";

// Los componentes cliente reciben sus textos por props (ya proyectados a un idioma). Las pruebas los
// piden al diccionario real, así que afirman lo que la persona lee en cada idioma.
export const textosDe = (idioma: Idioma) => ({
  cupos: enIdioma(LANDING.cupos, idioma),
  miAnuncio: enIdioma(MI_ANUNCIO, idioma),
  vigencia: enIdioma(VIGENCIA.tarjeta, idioma),
  enlace: enIdioma(PUBLICAR.confirmacion.enlace, idioma),
  referido: enIdioma(REFERIDO, idioma),
});

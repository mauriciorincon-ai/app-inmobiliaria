// Los dos textos que se precargan en WhatsApp (S7): el del comprador a Innmobiliaria con su código y el
// del comprador al dueño. Salen en el idioma de quien visita; la redacción vive en `src/textos/`.
import { localeIntl, type Idioma } from "@/i18n/idiomas";
import { enIdioma, rellenar } from "@/i18n/textos";
import { COMUN } from "@/textos/comun";
import { FICHA } from "@/textos/ficha";
import { VERIFICAR } from "@/textos/verificar";

export function mensajeCodigo(codigo: string, idioma: Idioma): string {
  return rellenar(enIdioma(VERIFICAR.mensajeWhatsapp, idioma), { codigo });
}

/** «Hola, vi tu apartamento en Cedritos en Innmobiliaria…», con el tipo en minúscula. */
export function mensajeContacto(
  tipo: string,
  barrio: string,
  idioma: Idioma,
): string {
  const tipos: Record<string, string> = enIdioma(COMUN.dominio.tipo, idioma);
  const nombreTipo = (tipos[tipo] ?? tipos.inmueble).toLocaleLowerCase(
    localeIntl(idioma),
  );
  const inmueble = rellenar(enIdioma(FICHA.encabezado.titulo, idioma), {
    tipo: nombreTipo,
    barrio,
  });
  return rellenar(enIdioma(FICHA.contacto.mensaje, idioma), { inmueble });
}

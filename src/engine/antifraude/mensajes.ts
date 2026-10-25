// Lo que el operador le escribe al dueño desde la cola antifraude (S15): el texto ya escrito, en el idioma que el dueño guardó,
// para abrirlo en el WhatsApp del operador. La app no envía nada sola. La redacción vive en `src/textos/mensajes.ts`.
import type { Idioma } from "@/i18n/idiomas";
import { enIdioma, rellenar } from "@/i18n/textos";
import { construirWaMe } from "@/engine/format/whatsapp";
import { COMUN } from "@/textos/comun";
import { MENSAJES } from "@/textos/mensajes";

export type MensajeAlDueno =
  "pedirCtl" | "pausa" | "sesionPedida" | "sesionAgendada" | "sesionCancelada";

export type DuenoDelAnuncio = {
  nombre: string;
  whatsapp: string;
  idioma: Idioma;
};

export function mensajeAlDueno(
  clave: MensajeAlDueno,
  dueno: Pick<DuenoDelAnuncio, "nombre" | "idioma">,
  anuncio: { tipo: string; barrio: string },
  // Lo que un mensaje suma a nombre e inmueble: la sesión de fotos agendada trae `cuando`, ya escrito en hora de Bogotá.
  extra: Record<string, string> = {},
): string {
  const idioma = dueno.idioma;
  const tipos: Record<string, string> = enIdioma(COMUN.dominio.tipo, idioma);
  const primerNombre =
    dueno.nombre.trim().split(/\s+/)[0] || enIdioma(MENSAJES.sinNombre, idioma);
  const inmueble = rellenar(enIdioma(MENSAJES.inmueble, idioma), {
    // «tu otro en …» no se lee: un tipo «otro» se nombra «inmueble».
    tipo: (anuncio.tipo !== "otro" && tipos[anuncio.tipo]
      ? tipos[anuncio.tipo]
      : tipos.inmueble
    ).toLowerCase(),
    barrio: anuncio.barrio,
  });
  return rellenar(enIdioma(MENSAJES[clave], idioma), {
    ...extra,
    nombre: primerNombre,
    inmueble,
  });
}

/** El enlace `wa.me` con el mensaje ya escrito, al número del dueño. */
export function enlaceAlDueno(
  clave: MensajeAlDueno,
  dueno: DuenoDelAnuncio,
  anuncio: { tipo: string; barrio: string },
  extra: Record<string, string> = {},
): string {
  return construirWaMe(
    dueno.whatsapp,
    mensajeAlDueno(clave, dueno, anuncio, extra),
  );
}

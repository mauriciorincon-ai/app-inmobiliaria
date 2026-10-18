import { construirWaMe } from "@/engine/format/whatsapp";
import { rellenar, type Proyectado } from "@/i18n/textos";
import type { FICHA } from "@/textos/ficha";

export type TextosContacto = Proyectado<typeof FICHA.contacto>;

// Bloque de contacto de la ficha. SOLO aparece si el vendedor activó el opt-in (obtener_ficha
// devuelve whatsapp = null sin opt-in → este componente no se renderiza). Nunca muestra email
// ni matrícula. El mensaje precargado sale en el idioma de quien visita la ficha.
export default function ContactoVendedor({
  whatsapp,
  inmueble,
  t,
}: {
  whatsapp: string | null;
  inmueble: string;
  t: TextosContacto;
}) {
  if (!whatsapp) return null;

  const mensaje = rellenar(t.mensaje, { inmueble });

  return (
    <a
      href={construirWaMe(whatsapp, mensaje)}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-purple px-7 py-3.5 text-base font-semibold text-white shadow-card transition-transform hover:bg-purple-600 hover:scale-[1.03]"
    >
      {t.boton}
    </a>
  );
}

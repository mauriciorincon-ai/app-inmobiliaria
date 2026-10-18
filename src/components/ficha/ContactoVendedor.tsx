import type { Proyectado } from "@/i18n/textos";
import type { FICHA } from "@/textos/ficha";

export type TextosContacto = Proyectado<typeof FICHA.contacto>;

// Bloque de contacto de la ficha. SOLO aparece si el vendedor activó el opt-in (`contacto_publico`).
// Desde el S7 la ficha YA NO trae el WhatsApp del dueño: el botón lleva a verificar el del comprador
// y el número solo sale, por `registrar_contacto`, hacia una sesión verificada (la UI completa llega
// con `ContactarDueno`). Nunca muestra email ni matrícula.
export default function ContactoVendedor({
  slug,
  t,
}: {
  slug: string;
  t: TextosContacto;
}) {
  return (
    <a
      href={`/verificar?volver=${encodeURIComponent(`/i/${slug}`)}`}
      className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-purple px-7 py-3.5 text-base font-semibold text-white shadow-card transition-transform hover:bg-purple-600 hover:scale-[1.03]"
    >
      {t.boton}
    </a>
  );
}

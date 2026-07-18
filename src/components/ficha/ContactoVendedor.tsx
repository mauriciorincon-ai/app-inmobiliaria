import { construirWaMe } from "@/engine/format/whatsapp";

// Bloque de contacto de la ficha. SOLO aparece si el vendedor activó el opt-in (obtener_ficha
// devuelve whatsapp = null sin opt-in → este componente no se renderiza). Nunca muestra email
// ni matrícula.
export default function ContactoVendedor({
  whatsapp,
  tipoBarrio,
}: {
  whatsapp: string | null;
  tipoBarrio: string;
}) {
  if (!whatsapp) return null;

  const mensaje = `Hola, vi tu ${tipoBarrio} en Innmobiliaria y me interesa. ¿Sigue disponible?`;

  return (
    <a
      href={construirWaMe(whatsapp, mensaje)}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-purple px-7 py-3.5 text-base font-semibold text-white shadow-card transition-transform hover:bg-purple-600 hover:scale-[1.03]"
    >
      Escribir por WhatsApp
    </a>
  );
}

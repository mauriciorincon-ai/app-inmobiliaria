// Lectura del cuerpo que Meta manda al webhook de WhatsApp (S7, ADR 015). Solo interesan los mensajes
// de TEXTO entrantes; todo lo demás (estados de entrega, imágenes, reacciones, otros campos) se ignora.
// El remitente sale en E.164 (`wa_id` de Meta + «+»). El texto se usa solo para buscar el código y no
// se guarda.
import { z } from "zod";

/** Tope de mensajes por entrega: Meta agrupa pocos; más que esto no es una conversación real. */
export const MAX_MENSAJES = 50;

const mensaje = z.object({
  from: z.string(),
  type: z.string(),
  text: z.object({ body: z.string() }).optional(),
});

const carga = z.object({
  object: z.literal("whatsapp_business_account"),
  entry: z.array(
    z.object({
      changes: z.array(
        z.object({
          field: z.string(),
          value: z.object({ messages: z.array(mensaje).optional() }),
        }),
      ),
    }),
  ),
});

export type MensajeEntrante = { remitente: string; texto: string };

const WA_ID = /^[1-9][0-9]{7,14}$/;

export function extraerMensajes(cuerpo: unknown): MensajeEntrante[] {
  const leido = carga.safeParse(cuerpo);
  if (!leido.success) return [];
  const salida: MensajeEntrante[] = [];
  for (const entrada of leido.data.entry) {
    for (const cambio of entrada.changes) {
      if (cambio.field !== "messages") continue;
      for (const m of cambio.value.messages ?? []) {
        if (m.type !== "text" || !m.text || !WA_ID.test(m.from)) continue;
        salida.push({ remitente: `+${m.from}`, texto: m.text.body });
        if (salida.length >= MAX_MENSAJES) return salida;
      }
    }
  }
  return salida;
}

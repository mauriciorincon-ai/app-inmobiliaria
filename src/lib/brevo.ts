// Adapter de envíos por lotes vía Brevo (API v3, fetch — sin SDK, edge-safe). Server-only: la
// API key vive en secrets, jamás viaja al cliente. Patrón "adapter conmutable" del pipeline:
// con BREVO_MOCK=1 o sin API key va en MOCK (no envía nada, solo cuenta) → CI y dev sin tocar Brevo.
import type { Plantilla } from "@/engine/envios/plantillas";

export type Destinatario = { email: string; nombre: string };
export type ResultadoLote = {
  enviados: number;
  fallidos: number;
  mock: boolean;
};

export function brevoEnMock(): boolean {
  return process.env.BREVO_MOCK === "1" || !process.env.BREVO_API_KEY;
}

// Envía una plantilla a un lote de destinatarios, uno por uno (Brevo free = 300/día; el llamador
// ya recortó la tanda). Devuelve cuántos se enviaron. En mock cuenta todos como enviados.
export async function enviarLote(
  plantilla: Plantilla,
  destinatarios: Destinatario[],
  urlApp: string,
): Promise<ResultadoLote> {
  if (brevoEnMock()) {
    return { enviados: destinatarios.length, fallidos: 0, mock: true };
  }

  const remitente = {
    email: process.env.BREVO_FROM_EMAIL ?? "",
    name: process.env.BREVO_FROM_NOMBRE ?? "Innmobiliaria",
  };
  let enviados = 0;
  let fallidos = 0;
  for (const d of destinatarios) {
    try {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": process.env.BREVO_API_KEY ?? "",
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          sender: remitente,
          to: [{ email: d.email, name: d.nombre }],
          subject: plantilla.asunto,
          htmlContent: plantilla.cuerpoHtml(d.nombre, urlApp),
        }),
      });
      if (res.ok) enviados++;
      else fallidos++;
    } catch {
      fallidos++;
    }
  }
  return { enviados, fallidos, mock: false };
}

// Adapter de envíos por lotes vía Brevo (API v3, fetch — sin SDK, edge-safe). Server-only: la
// API key vive en secrets, jamás viaja al cliente. Patrón "adapter conmutable" del pipeline:
// con BREVO_MOCK=1 o sin API key va en MOCK (no envía nada, solo cuenta) → CI y dev sin tocar Brevo.
import {
  agruparPorIdioma,
  asuntoDe,
  cuerpoHtml,
  type Plantilla,
} from "@/engine/envios/plantillas";
import { IDIOMAS, type Idioma } from "@/i18n/idiomas";
import { textoPlano } from "@/engine/format/texto-plano";

// `idioma` es el que el vendedor guardó al publicar: su correo sale en ese idioma.
export type Destinatario = { email: string; nombre: string; idioma: Idioma };
export type ResultadoLote = {
  enviados: number;
  fallidos: number;
  mock: boolean;
};

export function brevoEnMock(): boolean {
  return process.env.BREVO_MOCK === "1" || !process.env.BREVO_API_KEY;
}

// Envía una plantilla a un lote de destinatarios, uno por uno (Brevo free = 300/día; el llamador
// ya recortó la tanda), cada uno en su idioma: el lote se agrupa por idioma y el asunto se arma una vez
// por grupo. Devuelve cuántos se enviaron. En mock cuenta todos como enviados.
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
  const grupos = agruparPorIdioma(destinatarios);
  for (const idioma of IDIOMAS) {
    const asunto = asuntoDe(plantilla.id, idioma);
    for (const d of grupos[idioma]) {
      const html = cuerpoHtml(plantilla.id, idioma, d.nombre, urlApp);
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
            subject: asunto,
            htmlContent: html,
            textContent: textoPlano(html),
          }),
        });
        if (res.ok) enviados++;
        else fallidos++;
      } catch {
        fallidos++;
      }
    }
  }
  return { enviados, fallidos, mock: false };
}

// ── S8: un correo transaccional (los avisos de la visita, ADR 016) ─────────────
// Mismo patrón conmutable: en MOCK no envía nada y lo cuenta como enviado. Devuelve si salió; nunca lanza
// (un correo que falla no revierte la acción que lo provocó).
export type CorreoTransaccional = {
  para: { email: string; nombre: string };
  asunto: string;
  html: string;
  // S9: cabeceras propias (la baja en un clic de las alertas, `List-Unsubscribe`, RFC 8058).
  cabeceras?: Record<string, string>;
};

export async function enviarCorreo(
  correo: CorreoTransaccional,
): Promise<{ ok: boolean; mock: boolean }> {
  if (brevoEnMock()) return { ok: true, mock: true };
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY ?? "",
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: {
          email: process.env.BREVO_FROM_EMAIL ?? "",
          name: process.env.BREVO_FROM_NOMBRE ?? "Innmobiliaria",
        },
        // Sin nombre (las alertas no lo piden), solo el correo: Brevo no acepta un nombre vacío.
        to: [
          correo.para.nombre
            ? { email: correo.para.email, name: correo.para.nombre }
            : { email: correo.para.email },
        ],
        subject: correo.asunto,
        htmlContent: correo.html,
        textContent: textoPlano(correo.html),
        ...(correo.cabeceras ? { headers: correo.cabeceras } : {}),
      }),
    });
    return { ok: res.ok, mock: false };
  } catch {
    return { ok: false, mock: false };
  }
}

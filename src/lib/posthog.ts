// Funnel de campaña con PostHog. INERTE sin `NEXT_PUBLIC_POSTHOG_KEY` (cero ruido en CI/local) y,
// clave para el performance budget, `posthog-js` se carga por IMPORT DINÁMICO → sin key no entra
// al bundle de ninguna página (CI/lighthouse no lo descargan). Ley 1581: SIN autocapture, SIN
// session recording, persistencia en MEMORIA (sin cookies de seguimiento) y SOLO eventos explícitos
// con props SIN PII (zona/tipo/conteos; jamás nombre/whatsapp/email/matrícula). Declarado en la política.

type PostHog = (typeof import("posthog-js"))["default"];

let ph: PostHog | null = null;
let iniciado = false;

export async function iniciarPostHog(): Promise<void> {
  if (iniciado || typeof window === "undefined") return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;
  iniciado = true; // marca antes del await para evitar doble init en re-montajes rápidos
  const mod = await import("posthog-js");
  ph = mod.default;
  ph.init(key, {
    api_host:
      process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    capture_pageview: false,
    capture_pageleave: false,
    autocapture: false,
    disable_session_recording: true,
    persistence: "memory",
  });
}

// Captura un evento del funnel. `props` DEBE ir sin PII (lo garantiza el llamador). Silencioso si
// PostHog aún no cargó o no hay key.
export function capturar(
  evento: string,
  props?: Record<string, string | number | boolean>,
): void {
  if (!ph) return;
  ph.capture(evento, props);
}

import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

const nextConfig: NextConfig = {
  // El indicador de desarrollo de Next (esquina inferior) tapa la navegación inferior
  // móvil e intercepta taps en los e2e (visto en nutri-kids S1) — apagado por default.
  devIndicators: false,

  // /conoce sirve el brochure (docs/BROCHURE.html, copiado a public/ por build:brochure).
  // Es una URL limpia: el enlace que se comparte no dice ".html". Va como asset estático y
  // NO como page.tsx: el brochure es un documento HTML completo y anidarlo en el layout de
  // la app rompería la página.
  async rewrites() {
    return [{ source: "/conoce", destination: "/conoce.html" }];
  },
};

// El correo del responsable (Ley 1581) lo lee /privacidad en tiempo de build y no se versiona:
// sin la variable, la política saldría sin contacto. Se falla el build de producción antes que
// publicar eso. `pnpm dev` y `next start` no lo exigen. La CI pone un valor reservado `.test`.
// La fase llega como argumento: `process.env.NEXT_PHASE` aún no existe cuando Next carga esta
// config (la fija después), así que leerla aquí daba `undefined` y el guard jamás disparaba.
export default function config(phase: string): NextConfig {
  if (
    phase === PHASE_PRODUCTION_BUILD &&
    !process.env.NEXT_PUBLIC_RESPONSABLE_CORREO?.trim()
  ) {
    throw new Error(
      "Falta NEXT_PUBLIC_RESPONSABLE_CORREO: la política de privacidad no puede publicarse sin el correo del responsable (ver .env.example).",
    );
  }
  return nextConfig;
}

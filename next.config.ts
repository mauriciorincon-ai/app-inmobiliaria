import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

// Resolución del idioma SIN proxy ni middleware (ADR 013). En Next 16 `proxy.ts` corre en Node y
// OpenNext lo declara experimental en Cloudflare; las reescrituras `afterFiles` con condiciones
// `has` las implementan igual Next y OpenNext. Cada petición se reescribe a un segmento interno
// `/es/...` o `/en/...` que está prerenderizado: la URL que ve la persona no cambia y la página
// sigue siendo estática (no se lee ninguna cookie al renderizar).
//
// Orden (la primera que encaja gana): 1) cookie `idioma=en` · 2) cookie `idioma=es` · 3) sin cookie
// y un navegador que NO empieza por español pero acepta inglés · 4) español, que es el mercado
// (Bogotá). Los archivos de `public/` (conoce.html, las guías, og-fallback.png) y las rutas de
// `api/` se resuelven antes de `afterFiles` y no se reescriben. Una petición directa a `/en/x`
// pasa a `/en/en/x` y cae en la 404 de captura: los segmentos internos no se exponen.
const TODO_EL_SITIO = "/:path*";

const idioma = (destino: "es" | "en") => ({
  source: TODO_EL_SITIO,
  destination: `/${destino}/:path*`,
});

const nextConfig: NextConfig = {
  // El indicador de desarrollo de Next (esquina inferior) tapa la navegación inferior
  // móvil e intercepta taps en los e2e (visto en nutri-kids S1) — apagado por default.
  devIndicators: false,

  // /conoce sirve el brochure (docs/BROCHURE.html, copiado a public/ por build:brochure).
  // Es una URL limpia: el enlace que se comparte no dice ".html". Va como asset estático y
  // NO como page.tsx: el brochure es un documento HTML completo y anidarlo en el layout de
  // la app rompería la página. Va PRIMERO: las reglas de idioma no deben tocarlo.
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [
        { source: "/conoce", destination: "/conoce.html" },
        {
          ...idioma("en"),
          has: [{ type: "cookie" as const, key: "idioma", value: "en" }],
        },
        {
          ...idioma("es"),
          has: [{ type: "cookie" as const, key: "idioma", value: "es" }],
        },
        {
          ...idioma("en"),
          has: [
            {
              type: "header" as const,
              key: "accept-language",
              value: "(?!es).*\\ben\\b.*",
            },
          ],
          // Solo cuenta una cookie VÁLIDA: `idioma=fr` no debe impedir que decida la cabecera.
          missing: [
            { type: "cookie" as const, key: "idioma", value: "(en|es)" },
          ],
        },
        idioma("es"),
      ],
      fallback: [],
    };
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

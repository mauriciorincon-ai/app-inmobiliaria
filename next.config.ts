import type { NextConfig } from "next";

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

export default nextConfig;

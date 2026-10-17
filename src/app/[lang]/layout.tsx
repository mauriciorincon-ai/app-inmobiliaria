import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "../globals.css";
import SmoothScroll from "@/components/motion/SmoothScroll";
import PostHogInit from "@/components/analitica/PostHogInit";
import { IDIOMAS, langHtml } from "@/i18n/idiomas";
import { leerIdioma, type PropsLang } from "@/i18n/ruta";
import { enIdioma } from "@/i18n/textos";
import { COMUN } from "@/textos/comun";

const poppins = Poppins({
  variable: "--font-poppins",
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  display: "swap",
});

// metadataBase hace absolutas las og:image relativas (p. ej. el fallback /og-fallback.png de la
// ficha). WhatsApp ignora las relativas. En prod, NEXT_PUBLIC_APP_URL se fija a la URL de
// producción (registro privado en la planeadora — regla 15: cero enlaces).
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function generateMetadata({
  params,
}: PropsLang): Promise<Metadata> {
  const lang = await leerIdioma(params);
  const t = enIdioma(COMUN.meta, lang);
  return {
    metadataBase: new URL(APP_URL),
    title: t.titulo,
    description: t.descripcion,
    // H1 privado: la preview no se indexa hasta H2a (publicación de la landing).
    robots: { index: false, follow: false },
  };
}

// Una página por idioma, prerenderizada en el build: la reescritura de `next.config.ts` elige a
// cuál de las dos entra cada petición, sin leer cookies en el render (la página sigue estática).
export function generateStaticParams() {
  return IDIOMAS.map((lang) => ({ lang }));
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{ children: React.ReactNode } & PropsLang>) {
  const lang = await leerIdioma(params);
  return (
    <html
      lang={langHtml(lang)}
      className={`${poppins.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-white text-ink">
        <PostHogInit />
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}

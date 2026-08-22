import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import SmoothScroll from "@/components/motion/SmoothScroll";
import PostHogInit from "@/components/analitica/PostHogInit";

const poppins = Poppins({
  variable: "--font-poppins",
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  display: "swap",
});

// metadataBase hace absolutas las og:image relativas (p. ej. el fallback /og-fallback.png de la
// ficha). WhatsApp ignora las relativas. En prod se fija NEXT_PUBLIC_APP_URL a la URL workers.dev.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: "Innmobiliaria — Vende tu casa directo, sin comisión",
  description:
    "Publica tu inmueble en Bogotá como vendedor fundador: sin comisión, sin intermediarios. Publicar es registrarte. Te esperamos listo para el día que abramos a los compradores.",
  // H1 privado: la preview no se indexa hasta H2a (publicación de la landing).
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-CO" className={`${poppins.variable} h-full antialiased`}>
      <body className="min-h-full bg-white text-ink">
        <PostHogInit />
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import SmoothScroll from "@/components/motion/SmoothScroll";

const poppins = Poppins({
  variable: "--font-poppins",
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
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
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}

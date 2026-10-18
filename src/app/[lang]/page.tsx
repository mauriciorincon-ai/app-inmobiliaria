import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import BandaCupos from "@/components/landing/BandaCupos";
import Dolores from "@/components/landing/Dolores";
import ComoFunciona from "@/components/landing/ComoFunciona";
import QueViene from "@/components/landing/QueViene";
import Faq from "@/components/landing/Faq";
import CtaFinal from "@/components/landing/CtaFinal";
import Footer from "@/components/landing/Footer";
import VistaLanding from "@/components/analitica/VistaLanding";
import PaqueteFundador from "@/components/paquete/PaqueteFundador";
import { leerIdioma, type PropsLang } from "@/i18n/ruta";
import { enIdioma } from "@/i18n/textos";
import { LANDING } from "@/textos/landing";

// Landing de expectativa seller-first. El hero es el candidato LCP y nace estático (ver Hero.tsx).
export default async function Home({ params }: PropsLang) {
  const lang = await leerIdioma(params);
  const t = enIdioma(LANDING, lang);
  return (
    <>
      <VistaLanding />
      <Navbar lang={lang} />
      <main>
        <Hero lang={lang} />
        <BandaCupos t={t.cupos} />
        <Dolores lang={lang} />
        <ComoFunciona lang={lang} />
        <QueViene lang={lang} />
        <PaqueteFundador t={t.paquete} lang={lang} />
        <Faq t={t.faq} />
        <CtaFinal lang={lang} />
      </main>
      <Footer lang={lang} />
    </>
  );
}

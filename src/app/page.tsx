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

// Landing de expectativa seller-first. El hero es el candidato LCP y nace estático (ver Hero.tsx).
export default function Home() {
  return (
    <>
      <VistaLanding />
      <Navbar />
      <main>
        <Hero />
        <BandaCupos />
        <Dolores />
        <ComoFunciona />
        <QueViene />
        <Faq />
        <CtaFinal />
      </main>
      <Footer />
    </>
  );
}

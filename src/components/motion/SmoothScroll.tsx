"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// Scroll suave con Lenis, sincronizado con ScrollTrigger. Portado fiel de la página base
// (implementación ya correcta): respeta prefers-reduced-motion (no inicia Lenis) y limpia todo
// al desmontar. Montado en el root layout.
export default function SmoothScroll({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduce) return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    lenis.on("scroll", ScrollTrigger.update);

    const raf = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    // Recalcula triggers cuando fuentes/imágenes ya asentaron.
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);
    const t = setTimeout(refresh, 600);

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
      window.removeEventListener("load", refresh);
      clearTimeout(t);
    };
  }, []);

  return <>{children}</>;
}

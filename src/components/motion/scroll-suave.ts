import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Lenis + GSAP + ScrollTrigger viven en ESTE módulo aparte, y no dentro de `SmoothScroll.tsx`, para
// que el import dinámico del componente produzca UN SOLO chunk perezoso. Importando los tres
// paquetes por separado desde el efecto, el bundler emite tres chunks y el overhead (requests +
// envoltorios de módulo) costaba ~3,2 KB extra en cada ruta — justo lo que se intentaba ahorrar.
//
// Devuelve la función de limpieza: quien inicia, desmonta.
export function iniciarScrollSuave(): () => void {
  gsap.registerPlugin(ScrollTrigger);

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
}

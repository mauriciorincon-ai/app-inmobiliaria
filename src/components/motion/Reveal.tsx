"use client";

import { useRef, type ElementType, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type RevealProps = {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  delay?: number;
  y?: number;
  /** Anima los hijos directos en cascada en lugar del propio wrapper. */
  stagger?: boolean;
};

// Reveal-on-scroll para secciones BAJO EL FOLD (nunca el candidato LCP — patrón lcp-nace-estatico).
// Corrige el gap de la base: allí el fallback reduced-motion nunca aplicaba (la clase `.reveal` no
// se ponía y no había guard en JS). Aquí: (1) marca `.reveal` para el fallback CSS y (2) hace
// early-return por matchMedia, así el contenido nace visible sin que corra `gsap.from`.
export default function Reveal({
  children,
  as,
  className,
  delay = 0,
  y = 28,
  stagger = false,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const Tag = (as ?? "div") as ElementType;

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      // Respeta reduced-motion: sin animación, el contenido queda visible tal cual.
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      const targets = stagger ? Array.from(el.children) : el;
      gsap.from(targets, {
        opacity: 0,
        y,
        duration: 0.9,
        ease: "power3.out",
        delay,
        stagger: stagger ? 0.12 : 0,
        scrollTrigger: {
          trigger: el,
          start: "top 85%",
          toggleActions: "restart none restart none",
        },
      });
    },
    { scope: ref },
  );

  return (
    <Tag ref={ref} className={`reveal${className ? ` ${className}` : ""}`}>
      {children}
    </Tag>
  );
}

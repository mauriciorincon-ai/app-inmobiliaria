"use client";

import { useEffect } from "react";

// Scroll suave con Lenis, sincronizado con ScrollTrigger. Portado fiel de la página base
// (implementación ya correcta): respeta prefers-reduced-motion (no inicia Lenis) y limpia todo
// al desmontar. Montado en el root layout.
//
// El motor (`./scroll-suave`) entra por IMPORT DINÁMICO dentro del efecto, no por import estático.
// Al vivir este componente en el layout RAÍZ, un import estático mete ~44 KB de motion en el
// payload INICIAL de TODAS las rutas — incluida `/publicar`, que es un formulario y no anima nada
// al hacer scroll (Lighthouse reportaba ese chunk 70% sin usar, y el LCP simulado de la ruta se
// pasaba del presupuesto). Cargándolo tras hidratar, el scroll suave se comporta igual en todas
// las páginas pero sale del camino crítico del LCP. Bonus: con prefers-reduced-motion el guard va
// ANTES del await, así que el motion ni siquiera se descarga.
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

    let cancelado = false;
    let limpiar: (() => void) | null = null;

    void (async () => {
      const { iniciarScrollSuave } = await import("./scroll-suave");
      // Se desmontó mientras cargaba: no inicies nada que después nadie limpie.
      if (cancelado) return;
      limpiar = iniciarScrollSuave();
    })();

    return () => {
      cancelado = true;
      limpiar?.();
    };
  }, []);

  return <>{children}</>;
}

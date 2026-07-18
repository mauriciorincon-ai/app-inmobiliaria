// Provider mínimo para renderizar los componentes fuera de Next.js (previews de Claude Design):
// monta el AppRouterContext que `next/link` (Logo, Boton con href) lee, con un router inerte.
// Solo existe para el bundle del design system — la app real nunca lo importa.
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { ReactNode } from "react";

const noop = () => {};
const routerInerte = {
  back: noop,
  forward: noop,
  refresh: noop,
  push: noop,
  replace: noop,
  prefetch: noop,
  hmrRefresh: noop,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- stub de preview, no API pública
} as any;

export function DSProvider({ children }: { children: ReactNode }) {
  return (
    <AppRouterContext.Provider value={routerInerte}>
      {children}
    </AppRouterContext.Provider>
  );
}

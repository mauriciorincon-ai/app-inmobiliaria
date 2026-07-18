import { Logo } from "app-inmobiliaria";

export const Ink = () => <Logo />;

// Tono blanco sobre fondo oscuro (footer).
export const Blanco = () => (
  <div className="inline-block rounded-2xl bg-ink px-8 py-6">
    <Logo tono="blanco" />
  </div>
);

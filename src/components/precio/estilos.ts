import type { EstadoPrecio } from "@/engine/precio/comparables";

// Un estado nunca se dice solo con color: siempre símbolo + texto + color (regla 5). Los colores son los tokens de
// estado del sistema: ok (verde), aviso (ámbar) y error (rojo).
export const ESTILO_ESTADO: Record<
  EstadoPrecio,
  { simbolo: string; clase: string }
> = {
  en_rango: { simbolo: "✓", clase: "bg-mint text-ok" },
  caro: {
    simbolo: "▲",
    clase: "border border-aviso-borde bg-aviso-tint text-aviso",
  },
  sospechoso: { simbolo: "⚠", clase: "bg-red-50 text-red-700" },
  sin_datos: { simbolo: "○", clase: "bg-cream text-gray" },
};

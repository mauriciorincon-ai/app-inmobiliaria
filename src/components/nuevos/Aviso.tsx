import type { ReactNode } from "react";

// Una caja de aviso de las pantallas de vivienda nueva: SIEMPRE símbolo + texto + color (el color nunca solo). `alerta`
// anuncia el cambio a quien usa lector de pantalla; `info` y `ok` son informativos.
const TONOS = {
  alerta: {
    clase: "border border-aviso-borde bg-aviso-tint text-aviso",
    simbolo: "!",
  },
  info: { clase: "bg-sky text-ink", simbolo: "i" },
  ok: { clase: "bg-mint text-ok", simbolo: "✓" },
} as const;

export default function Aviso({
  tono,
  titulo,
  children,
}: {
  tono: keyof typeof TONOS;
  titulo?: string;
  children?: ReactNode;
}) {
  const { clase, simbolo } = TONOS[tono];
  return (
    <div
      role={tono === "alerta" ? "status" : undefined}
      className={`mb-4 flex gap-3 rounded-2xl p-4 ${clase}`}
    >
      <span aria-hidden="true" className="font-extrabold">
        {simbolo}
      </span>
      <div className="text-sm">
        {titulo && <p className="font-semibold">{titulo}</p>}
        {children}
      </div>
    </div>
  );
}

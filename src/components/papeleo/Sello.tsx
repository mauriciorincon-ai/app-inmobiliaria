// El estado de una cifra o de un paso, con símbolo Y texto (el color nunca va solo): ✓ norma leída · ● práctica, no norma · ▲ no verificado.
export type EstadoSello = "vigente" | "practica" | "no_verificado";

const SIMBOLO: Record<EstadoSello, string> = {
  vigente: "✓",
  practica: "●",
  no_verificado: "▲",
};
const CLASE: Record<EstadoSello, string> = {
  vigente: "bg-mint text-ok",
  practica: "bg-sky text-ink",
  no_verificado: "border border-aviso-borde bg-aviso-tint text-aviso",
};

export default function Sello({
  estado,
  etiqueta,
}: {
  estado: EstadoSello;
  etiqueta: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${CLASE[estado]}`}
    >
      <span aria-hidden="true">{SIMBOLO[estado]}</span>
      {etiqueta}
    </span>
  );
}

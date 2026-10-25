"use client";

// Una casilla con su etiqueta real (clic en el texto también marca) y una ayuda asociada.
export default function Casilla({
  id,
  etiqueta,
  ayuda,
  marcada,
  onChange,
}: {
  id: string;
  etiqueta: string;
  ayuda?: string;
  marcada: boolean;
  onChange: (marcada: boolean) => void;
}) {
  const ayudaId = `${id}-ayuda`;
  return (
    <div>
      <label htmlFor={id} className="flex items-start gap-3 text-ink">
        <input
          id={id}
          type="checkbox"
          checked={marcada}
          aria-describedby={ayuda ? ayudaId : undefined}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-purple"
        />
        <span className="text-base font-semibold">{etiqueta}</span>
      </label>
      {ayuda && (
        <p id={ayudaId} className="ml-8 mt-1 text-sm text-gray">
          {ayuda}
        </p>
      )}
    </div>
  );
}

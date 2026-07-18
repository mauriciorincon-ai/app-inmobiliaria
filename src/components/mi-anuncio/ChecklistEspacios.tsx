// Sugerencia de espacios a fotografiar (no obligatorio, solo guía de calidad). Determinista.
const ESPACIOS = [
  "Fachada o entrada",
  "Sala / comedor",
  "Cocina",
  "Habitación principal",
  "Baño",
] as const;

export default function ChecklistEspacios() {
  return (
    <div className="mt-3 rounded-2xl bg-sky/60 px-4 py-3">
      <p className="text-xs font-semibold text-ink">Ideas para tus fotos</p>
      <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray">
        {ESPACIOS.map((e) => (
          <li key={e}>· {e}</li>
        ))}
      </ul>
    </div>
  );
}

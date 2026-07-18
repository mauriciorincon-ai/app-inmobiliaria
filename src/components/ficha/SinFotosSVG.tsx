// Estado sin-fotos de la ficha: SVG del sistema (acento morado + casa), estático (LCP-safe).
// No decorativo puro: comunica que el anuncio aún no tiene fotos.
export default function SinFotosSVG() {
  return (
    <div className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-3 rounded-[2rem] bg-cream text-center">
      <svg
        viewBox="0 0 24 24"
        className="h-16 w-16 text-purple-soft"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M4 11.5 12 5l8 6.5M6 10.5V19h12v-8.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <p className="text-sm font-medium text-mute">
        Este inmueble aún no tiene fotos
      </p>
    </div>
  );
}

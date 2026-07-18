import Link from "next/link";

// Wordmark de Innmobiliaria: chip morado con ícono de casa + palabra. Reemplaza a "Habita".
export default function Logo({
  className = "",
  tono = "ink",
}: {
  className?: string;
  tono?: "ink" | "blanco";
}) {
  const color = tono === "blanco" ? "text-white" : "text-ink";
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2 font-extrabold tracking-tight ${color} ${className}`}
      aria-label="Innmobiliaria — inicio"
    >
      <span
        aria-hidden="true"
        className="grid h-8 w-8 place-items-center rounded-xl bg-purple text-white shadow-soft"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M4 11.5 12 5l8 6.5M6 10.5V19h12v-8.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="text-lg">Innmobiliaria</span>
    </Link>
  );
}

// Export nombrado además del default: `export *` (barriles, design-sync) no re-exporta defaults.
export { Logo };

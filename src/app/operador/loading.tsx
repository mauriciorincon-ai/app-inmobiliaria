import EncabezadoInterior from "@/components/ui/EncabezadoInterior";

// Estado de carga del panel (Suspense fallback mientras el server component consulta la BD).
export default function Cargando() {
  return (
    <>
      <EncabezadoInterior />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">
          Registros
        </h1>
        <div className="mt-8 space-y-3" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-cream" />
          ))}
        </div>
        <p className="sr-only" role="status">
          Cargando registros…
        </p>
      </main>
    </>
  );
}

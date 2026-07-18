"use client";

import { siguientePaso, type EstadoAnuncio } from "@/engine/score/score";

// Barra de completitud goal-gradient: muestra el % y el siguiente paso alcanzable. El estado lo
// calcula MiAnuncio (fuente única del score); aquí solo se pinta.
export default function ScoreCompletitud({
  score,
  fotos,
  tienePortada,
  descripcionLen,
  contactoPublico,
}: {
  score: number;
} & EstadoAnuncio) {
  const paso = siguientePaso({
    fotos,
    tienePortada,
    descripcionLen,
    contactoPublico,
  });
  const completo = paso === null;

  return (
    <section
      aria-labelledby="score-titulo"
      className="rounded-2xl bg-cream p-5"
    >
      <div className="flex items-baseline justify-between">
        <h2 id="score-titulo" className="text-sm font-semibold text-ink">
          Tu anuncio está {score}% completo
        </h2>
        <span className="text-2xl font-extrabold text-purple">{score}%</span>
      </div>
      <div
        className="mt-2 h-3 overflow-hidden rounded-full bg-purple-tint"
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Anuncio ${score}% completo`}
      >
        <div
          className="h-full rounded-full bg-purple transition-all duration-500"
          style={{ width: `${score}%` }}
        />
      </div>
      {completo ? (
        <p className="mt-3 text-sm font-medium text-ink">
          ¡Listo! Tu anuncio está completo. 🎉
        </p>
      ) : (
        <p className="mt-3 text-sm text-gray">
          Siguiente:{" "}
          <span className="font-semibold text-ink">{paso.accion}</span>{" "}
          <span className="text-mute">(+{paso.puntos}%)</span>
        </p>
      )}
    </section>
  );
}

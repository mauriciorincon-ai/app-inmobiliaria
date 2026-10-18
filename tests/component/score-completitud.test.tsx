import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ScoreCompletitud from "@/components/mi-anuncio/ScoreCompletitud";
import { textosDe } from "./utils/textos";

const es = textosDe("es").miAnuncio.score;
const en = textosDe("en").miAnuncio.score;

describe("ScoreCompletitud", () => {
  it("muestra 40% y sugiere la primera foto en un anuncio vacío", () => {
    render(
      <ScoreCompletitud
        t={es}
        score={40}
        fotos={0}
        tienePortada={false}
        descripcionLen={0}
        contactoPublico={false}
      />,
    );
    expect(screen.getByText(/40% completo/i)).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "40",
    );
    expect(screen.getByText(/Sube tu primera foto/i)).toBeInTheDocument();
  });

  it("ANCLA visible: con una foto muestra 55% y el siguiente paso", () => {
    render(
      <ScoreCompletitud
        t={es}
        score={55}
        fotos={1}
        tienePortada={false}
        descripcionLen={0}
        contactoPublico={false}
      />,
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "55",
    );
    expect(screen.getByText(/Escribe la descripción/i)).toBeInTheDocument();
  });

  it("al 100% celebra y no muestra siguiente paso", () => {
    render(
      <ScoreCompletitud
        t={es}
        score={100}
        fotos={5}
        tienePortada={true}
        descripcionLen={120}
        contactoPublico={true}
      />,
    );
    expect(screen.getByText(/¡Listo!/i)).toBeInTheDocument();
    expect(screen.queryByText(/Siguiente:/i)).not.toBeInTheDocument();
  });

  it("en inglés el siguiente paso sale en inglés", () => {
    render(
      <ScoreCompletitud
        t={en}
        score={40}
        fotos={0}
        tienePortada={false}
        descripcionLen={0}
        contactoPublico={false}
      />,
    );
    expect(screen.getByText(/40% complete/i)).toBeInTheDocument();
    expect(screen.getByText("Upload your first photo")).toBeInTheDocument();
  });
});

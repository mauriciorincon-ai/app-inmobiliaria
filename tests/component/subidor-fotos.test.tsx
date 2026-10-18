import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SubidorFotos from "@/components/mi-anuncio/SubidorFotos";
import { MAX_FOTOS } from "@/engine/fotos/gate";
import { textosDe } from "./utils/textos";

const es = textosDe("es").miAnuncio.subidor;
const en = textosDe("en").miAnuncio.subidor;

// Mock del orquestador de subida: el gate real ya está unit-testeado (gate-fotos.test.ts); aquí
// verificamos el CABLEADO de la UI (rechazo → mensaje sin avanzar; éxito → recarga).
const subirFotoMock = vi.fn();
vi.mock("@/lib/fotos-cliente", () => ({
  subirFoto: (...args: unknown[]) => subirFotoMock(...args),
}));

function archivo(nombre = "foto.jpg", tipo = "image/jpeg"): File {
  return new File(["xxxx"], nombre, { type: tipo });
}

describe("SubidorFotos", () => {
  beforeEach(() => subirFotoMock.mockReset());

  it("muestra la cuenta y el máximo de fotos", () => {
    render(
      <SubidorFotos t={es} token="t" cantidadActual={2} onSubida={vi.fn()} />,
    );
    expect(
      screen.getByText(new RegExp(`2 de ${MAX_FOTOS}`)),
    ).toBeInTheDocument();
  });

  it("una foto rechazada por resolución muestra el mensaje y NO recarga", async () => {
    const onSubida = vi.fn();
    subirFotoMock.mockResolvedValue({ ok: false, razon: "resolucion" });
    render(
      <SubidorFotos t={es} token="t" cantidadActual={0} onSubida={onSubida} />,
    );

    const input = screen.getByLabelText(/agregar fotos/i, {
      selector: "input",
    });
    await userEvent.upload(input, archivo());

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/muy pequeña/i),
    );
    expect(onSubida).not.toHaveBeenCalled();
  });

  it("una foto válida invoca el pipeline y recarga", async () => {
    const onSubida = vi.fn();
    subirFotoMock.mockResolvedValue({ ok: true, fotoId: "f1", orden: 0 });
    render(
      <SubidorFotos
        t={es}
        token="tok"
        cantidadActual={0}
        onSubida={onSubida}
      />,
    );

    const input = screen.getByLabelText(/agregar fotos/i, {
      selector: "input",
    });
    await userEvent.upload(input, archivo());

    await waitFor(() => expect(onSubida).toHaveBeenCalled());
    expect(subirFotoMock).toHaveBeenCalledWith(
      expect.any(File),
      "tok",
      expect.any(Function),
    );
  });

  it("bloquea la subida cuando se alcanzó el máximo", () => {
    render(
      <SubidorFotos
        t={es}
        token="t"
        cantidadActual={MAX_FOTOS}
        onSubida={vi.fn()}
      />,
    );
    expect(screen.getByText(/máximo de fotos/i)).toBeInTheDocument();
    expect(
      screen.getByLabelText(/máximo de fotos/i, { selector: "input" }),
    ).toBeDisabled();
  });

  it("cada razón sale con la frase del idioma recibido; un fallo de red cae en la de conexión", async () => {
    subirFotoMock.mockResolvedValue({ ok: false, razon: "confirmacion" });
    render(
      <SubidorFotos t={en} token="t" cantidadActual={0} onSubida={vi.fn()} />,
    );
    const input = screen.getByLabelText(/add photos/i, { selector: "input" });
    await userEvent.upload(input, archivo());
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "We couldn't upload the photo. Check your connection and try again.",
      ),
    );
  });
});

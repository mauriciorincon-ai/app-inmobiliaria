import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EditorDescripcion from "@/components/mi-anuncio/EditorDescripcion";

const rpcMock = vi.fn().mockResolvedValue({ data: null, error: null });
vi.mock("@/lib/supabase/client", () => ({
  crearClienteNavegador: () => ({ rpc: rpcMock }),
}));

describe("EditorDescripcion", () => {
  beforeEach(() => rpcMock.mockClear());

  it("deshabilita Guardar hasta alcanzar el mínimo de caracteres", async () => {
    render(
      <EditorDescripcion
        token="t"
        valorInicial=""
        minimo={80}
        onEscribir={vi.fn()}
        onGuardado={vi.fn()}
      />,
    );
    const guardar = screen.getByRole("button", { name: /Guardar/i });
    expect(guardar).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/Descripción/i), "corto");
    expect(guardar).toBeDisabled();
    expect(screen.getByText(/al menos 80/i)).toBeInTheDocument();
  });

  it("informa el largo en vivo mientras se escribe (para el score)", async () => {
    const onEscribir = vi.fn();
    render(
      <EditorDescripcion
        token="t"
        valorInicial=""
        minimo={80}
        onEscribir={onEscribir}
        onGuardado={vi.fn()}
      />,
    );
    await userEvent.type(screen.getByLabelText(/Descripción/i), "hola");
    expect(onEscribir).toHaveBeenLastCalledWith(4);
  });

  it("guarda vía RPC cuando la descripción es suficiente", async () => {
    const onGuardado = vi.fn();
    const texto = "a".repeat(85);
    render(
      <EditorDescripcion
        token="tok"
        valorInicial={texto}
        minimo={80}
        onEscribir={vi.fn()}
        onGuardado={onGuardado}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Guardar/i }));
    await waitFor(() => expect(onGuardado).toHaveBeenCalled());
    expect(rpcMock).toHaveBeenCalledWith("guardar_descripcion", {
      p_token: "tok",
      p_descripcion: texto,
    });
  });
});

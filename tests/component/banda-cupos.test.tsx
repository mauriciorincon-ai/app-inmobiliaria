import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import BandaCupos from "@/components/landing/BandaCupos";

const rpcMock = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  crearClienteNavegador: () => ({ rpc: rpcMock }),
}));

describe("BandaCupos", () => {
  beforeEach(() => rpcMock.mockReset());

  it("no renderiza NADA si no hay cupos fijados (escasez real o no existe)", async () => {
    rpcMock.mockResolvedValue({ data: [], error: null });
    const { container } = render(<BandaCupos />);
    await waitFor(() => expect(rpcMock).toHaveBeenCalledWith("obtener_cupos"));
    expect(container).toBeEmptyDOMElement();
  });

  it("muestra el contador honesto por zona cuando hay cupo fijado", async () => {
    rpcMock.mockResolvedValue({
      data: [{ zona: "Chapinero", cupo_total: 10, publicados: 3 }],
      error: null,
    });
    render(<BandaCupos />);
    await waitFor(() =>
      expect(
        screen.getByText(/Quedan 7 cupos de fundador en Chapinero/i),
      ).toBeInTheDocument(),
    );
  });
});

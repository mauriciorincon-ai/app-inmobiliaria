import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import BandaCupos from "@/components/landing/BandaCupos";
import { textosDe } from "./utils/textos";

const rpcMock = vi.fn();
vi.mock("@/lib/supabase/rpc-publico", () => ({
  rpcPublico: (fn: string) => rpcMock(fn),
}));

const es = textosDe("es");
const en = textosDe("en");

describe("BandaCupos", () => {
  beforeEach(() => rpcMock.mockReset());

  it("no renderiza NADA si no hay cupos fijados (escasez real o no existe)", async () => {
    rpcMock.mockResolvedValue([]);
    const { container } = render(<BandaCupos t={es.cupos} />);
    await waitFor(() => expect(rpcMock).toHaveBeenCalledWith("obtener_cupos"));
    expect(container).toBeEmptyDOMElement();
  });

  it("muestra el contador honesto por zona cuando hay cupo fijado", async () => {
    rpcMock.mockResolvedValue([
      { zona: "Chapinero", cupo_total: 10, publicados: 3 },
    ]);
    render(<BandaCupos t={es.cupos} />);
    await waitFor(() =>
      expect(
        screen.getByText(/Quedan 7 cupos de fundador en Chapinero/i),
      ).toBeInTheDocument(),
    );
  });

  it("el contador sale en el idioma del texto recibido y concuerda en singular", async () => {
    rpcMock.mockResolvedValue([
      { zona: "Chapinero", cupo_total: 10, publicados: 9 },
      { zona: "Suba", cupo_total: 5, publicados: 5 },
    ]);
    render(<BandaCupos t={en.cupos} />);
    await waitFor(() =>
      expect(
        screen.getByText("1 founding-seller spot left in Chapinero"),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getByText("Founding-seller spots in Suba are full"),
    ).toBeInTheDocument();
  });
});

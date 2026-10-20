import { describe, it, expect } from "vitest";
import {
  CAMPOS_INICIALES,
  PLAZOS,
  camposDesdeCapacidad,
  capacidadDe,
  enlaceAlerta,
  enlaceBuscar,
  enlaceCalculo,
  leerFormulario,
  parsearDecimal,
  precioMaximoDe,
  type CamposSimulador,
} from "@/engine/simulador/formulario";
import {
  leerCapacidad,
  serializarCapacidad,
} from "@/engine/simulador/capacidad-local";
import {
  FINANCIABLE_MAX,
  PLAZO_MAX_ANOS,
  PLAZO_MIN_ANOS,
  TOPE_CUOTA_INGRESO,
  precioMaximo,
  simular,
} from "@/engine/simulador/cuota";
import { leerFiltros } from "@/engine/busqueda/filtros";
import { SIMULADOR } from "@/textos/simulador";

// El formulario del simulador sin pantalla (S10): texto → números → `simular`. Y que lo que sale hacia un enlace sea un
// precio, nunca los ingresos.
const TASA_REF = 15.48;
const c = (p: Partial<CamposSimulador> = {}): CamposSimulador => ({
  ...CAMPOS_INICIALES,
  precio: "300000000",
  ingresos: "8000000",
  ...p,
});

describe("parsearDecimal", () => {
  it.each([
    ["14,5", 14.5],
    ["14.5", 14.5],
    [" 30 ", 30],
    ["0,75", 0.75],
  ])("%s → %s", (texto, esperado) => {
    expect(parsearDecimal(texto)).toBe(esperado);
  });

  it.each(["", "abc", "1,2,3", "-5", "1e3", "14,5%"])(
    "«%s» no es un decimal",
    (t) => {
      expect(parsearDecimal(t)).toBeNull();
    },
  );
});

describe("leerFormulario", () => {
  it("el caso calculado a mano pasa por el formulario igual que por el motor", () => {
    const l = leerFormulario(c({ ingresos: "8000000" }), TASA_REF);
    expect(l.origenTasa).toBe("referencia");
    expect(l.invalidos.size).toBe(0);
    const r = simular(l.entrada);
    // 300 M, 30 % de cuota inicial, 20 años, 15,48 % EA ⇒ cuota 2.684.822 (la cuenta está en simulador.test.ts).
    expect(r.estado).toBe("cabe");
    expect(r.estado === "cabe" && r.cuota).toBe(2_684_822);
  });

  it("la tasa escrita pisa a la de referencia; una ilegible no se cuela", () => {
    expect(leerFormulario(c({ tasa: "12,5" }), TASA_REF).tasaEA).toBe(12.5);
    expect(leerFormulario(c({ tasa: "12,5" }), TASA_REF).origenTasa).toBe(
      "escrita",
    );
    const mala = leerFormulario(c({ tasa: "mucho" }), TASA_REF);
    expect(mala.tasaEA).toBeNull();
    expect(mala.origenTasa).toBe("ninguna");
    expect(mala.invalidos.has("tasa")).toBe(true);
    expect(simular(mala.entrada).estado).toBe("sin_tasa");
    // fuera de 0–60 tampoco
    expect(
      leerFormulario(c({ tasa: "75" }), TASA_REF).invalidos.has("tasa"),
    ).toBe(true);
  });

  it("sin tasa de referencia ni escrita: «sin tasa»", () => {
    expect(simular(leerFormulario(c(), null).entrada).estado).toBe("sin_tasa");
  });

  it("sin ingresos calcula la cuota pero no dice si cabe; ingresos ilegibles se marcan", () => {
    expect(
      simular(leerFormulario(c({ ingresos: "" }), TASA_REF).entrada).estado,
    ).toBe("sin_ingresos");
    const mal = leerFormulario(c({ ingresos: "ocho millones" }), TASA_REF);
    expect(mal.invalidos.has("ingresos")).toBe(true);
    expect(mal.entrada.ingresos).toBeNull();
  });

  it("precio vacío o ilegible, cuota inicial fuera de 0–100 y plazo roto son «inválido» y marcan el campo", () => {
    expect(
      simular(leerFormulario(c({ precio: "" }), TASA_REF).entrada).estado,
    ).toBe("invalido");
    const l = leerFormulario(c({ precio: "85.5" }), TASA_REF);
    expect(l.invalidos.has("precio")).toBe(true);
    expect(
      leerFormulario(c({ inicial: "100" }), TASA_REF).invalidos.has("inicial"),
    ).toBe(true);
    expect(
      leerFormulario(c({ inicial: "-3" }), TASA_REF).invalidos.has("inicial"),
    ).toBe(true);
    expect(
      leerFormulario(c({ plazo: "" }), TASA_REF).invalidos.has("plazo"),
    ).toBe(true);
    // un precio escrito con separadores de miles se lee entero
    expect(
      leerFormulario(c({ precio: "$300.000.000" }), TASA_REF).entrada.precio,
    ).toBe(300_000_000);
  });

  it("los plazos que ofrece la lista van del mínimo al máximo de la norma, de 5 en 5", () => {
    expect(PLAZOS[0]).toBe(PLAZO_MIN_ANOS);
    expect(PLAZOS[PLAZOS.length - 1]).toBe(PLAZO_MAX_ANOS);
    expect(PLAZOS).toEqual([5, 10, 15, 20, 25, 30]);
  });
});

describe("lo que se guarda en el teléfono", () => {
  it("guarda ingresos, cuota inicial y plazo; la tasa de referencia NO (se vuelve a leer del día)", () => {
    const cap = capacidadDe(c(), TASA_REF);
    expect(cap).toEqual({
      ingresos: 8_000_000,
      inicial: 0.3,
      plazoAnos: 20,
      tasaEA: null,
    });
  });

  it("guarda la tasa solo si la persona la escribió", () => {
    expect(capacidadDe(c({ tasa: "13,25" }), TASA_REF)?.tasaEA).toBe(13.25);
  });

  it("sin ingresos (o con algo ilegible) no hay nada que guardar", () => {
    expect(capacidadDe(c({ ingresos: "" }), TASA_REF)).toBeNull();
    expect(capacidadDe(c({ inicial: "x" }), TASA_REF)).toBeNull();
    expect(capacidadDe(c({ plazo: "99" }), TASA_REF)).toBeNull();
  });

  it("ida y vuelta por el almacén: lo guardado reconstruye los mismos campos", () => {
    const cap = capacidadDe(c({ tasa: "13,25", inicial: "35" }), TASA_REF)!;
    const vuelta = leerCapacidad(serializarCapacidad(cap));
    const campos = camposDesdeCapacidad(
      { ...CAMPOS_INICIALES, precio: "1" },
      vuelta,
    );
    expect(campos).toEqual({
      precio: "1",
      inicial: "35",
      plazo: "20",
      tasa: "13.25",
      ingresos: "8000000",
    });
    expect(camposDesdeCapacidad(CAMPOS_INICIALES, null)).toBe(CAMPOS_INICIALES);
  });
});

describe("el precio máximo y los enlaces: viaja un precio, nunca los ingresos", () => {
  it("se redondea HACIA ABAJO al millón (jamás promete de más)", () => {
    const exacto = precioMaximo(8_000_000, 0.3, 20, TASA_REF)!;
    expect(exacto).toBe(357_565_565);
    expect(precioMaximoDe(c(), TASA_REF)).toBe(357_000_000);
  });

  it("sin ingresos o sin tasa no hay máximo", () => {
    expect(precioMaximoDe(c({ ingresos: "" }), TASA_REF)).toBeNull();
    expect(precioMaximoDe(c(), null)).toBeNull();
  });

  it("los enlaces llevan solo el precio máximo y la búsqueda los lee como filtro", () => {
    const buscar = enlaceBuscar(357_000_000);
    expect(buscar).toBe("/buscar?op=venta&max=357000000&pago=1");
    const filtros = leerFiltros(new URLSearchParams(buscar.split("?")[1]));
    expect(filtros.operacion).toBe("venta");
    expect(filtros.precioMax).toBe(357_000_000);
    expect(enlaceAlerta(357_000_000)).toBe(
      "/alertas/nueva?op=venta&max=357000000",
    );
    expect(enlaceCalculo(412_500_000.4)).toBe("/herramientas?precio=412500000");
    // Ningún enlace puede traer los ingresos de la prueba.
    for (const url of [buscar, enlaceAlerta(357_000_000)]) {
      expect(url).not.toContain("8000000");
      expect(url).not.toContain("ingres");
    }
  });
});

describe("los textos del simulador dicen lo mismo que las constantes de la norma", () => {
  const pct = (f: number) => `${Math.round(f * 100)}`;
  it("40 % de la cuota y 70 % del financiable aparecen en los dos idiomas, y ningún 30 % viejo", () => {
    for (const idioma of ["es", "en"] as const) {
      const cuota = [
        SIMULADOR.avisos.cabe[idioma],
        SIMULADOR.avisos.noCabeTitulo[idioma],
        SIMULADOR.salidas.ingresoNecesario[idioma],
        SIMULADOR.descargo.cuota[idioma],
      ];
      for (const texto of cuota) {
        expect(texto).toContain(pct(TOPE_CUOTA_INGRESO));
        expect(texto).not.toMatch(/\b30\s?%/);
      }
      expect(SIMULADOR.avisos.excede[idioma]).toContain(pct(FINANCIABLE_MAX));
      expect(SIMULADOR.descargo.financiable[idioma]).toContain(
        pct(FINANCIABLE_MAX),
      );
      expect(SIMULADOR.descargo.plazo[idioma]).toContain(
        String(PLAZO_MIN_ANOS),
      );
      expect(SIMULADOR.descargo.plazo[idioma]).toContain(
        String(PLAZO_MAX_ANOS),
      );
    }
  });
});

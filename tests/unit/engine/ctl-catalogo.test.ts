import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { partirAnotaciones } from "@/engine/ctl/lector";

// S16 — el lector de CTL contra la NORMA, no solo contra los certificados que se consigan: cada código vigente del catálogo
// oficial (Res. SNR 11885 de 2016, art. 4; leído en dos reproducciones que coinciden) pasa por el lector en una anotación
// sintética con la forma pública del certificado, y su tipo tiene que ser el que pide el grupo del art. 8 de la Ley 1579.
// La investigación del 2026-10-25 (§ 3) encontró 6 de 26 mal: esta prueba nació en rojo con esos 6 y los de 5 cifras.
type Codigo = { codigo: string; descripcion: string; tipo: string };
const catalogo = JSON.parse(
  readFileSync(
    join(__dirname, "..", "..", "fixtures", "ctl", "catalogo-snr-11885.json"),
    "utf8",
  ),
) as { codigos: Codigo[] };

const ETIQUETA: Record<string, string> = {
  "01": "MODO DE ADQUISICION",
  "02": "GRAVAMEN",
  "03": "LIMITACION AL DOMINIO",
  "04": "MEDIDA CAUTELAR",
  "06": "FALSA TRADICION",
  "08": "CANCELACION",
  "09": "OTRO",
};

function tipoLeido(c: Codigo): string {
  const texto = [
    "ANOTACION: Nro 001 Fecha: 05-03-2019 Radicación: 2019-0001",
    "Doc: ESCRITURA 100 del 01-03-2019 NOTARIA PRIMERA de BOGOTA D. C. VALOR ACTO: $",
    `ESPECIFICACION: ${ETIQUETA[c.codigo.slice(0, 2)]}: ${c.codigo} ${c.descripcion}`,
    "PERSONAS QUE INTERVIENEN EN EL ACTO (X-Titular de derecho real de dominio,I-Titular de dominio incompleto)",
    "DE: PERSONA A",
    "A: PERSONA B X",
    "NRO TOTAL DE ANOTACIONES: *1*",
  ].join("\n");
  const [a] = partirAnotaciones(texto);
  return a?.naturaleza ?? "sin_anotacion";
}

describe("el catálogo oficial de códigos (Res. SNR 11885 de 2016, art. 4)", () => {
  it("trae los grupos que importan al comprador y los códigos de 5 cifras", () => {
    const grupos = new Set(catalogo.codigos.map((c) => c.codigo.slice(0, 2)));
    for (const g of ["01", "02", "03", "04", "06", "08", "09"]) {
      expect(grupos.has(g), g).toBe(true);
    }
    expect(catalogo.codigos.some((c) => c.codigo === "04001")).toBe(true);
    expect(catalogo.codigos.some((c) => c.codigo === "01001")).toBe(true);
  });

  it("los seis que la investigación encontró mal, y la cancelación parcial", () => {
    const de = (codigo: string) => tipoLeido(catalogo.codigos.find((c) => c.codigo === codigo)!);
    expect(de("0107")).toBe("neutra"); // adjudicación de la cosa hipotecada: no es una hipoteca
    expect(de("0207")).toBe("hipoteca"); // hipoteca de derechos y acciones: el grupo 02 manda
    expect(de("0372")).toBe("limitacion_dominio"); // «solo podrá hipotecarse…»: una limitación, no una hipoteca
    expect(de("0426")).toBe("embargo"); // embargo de derechos y acciones: el grupo 04 manda
    expect(de("0925")).toBe("neutra"); // extinción de la obligación hipotecaria: no es una hipoteca
    expect(de("0362")).toBe("prohibicion_transferencia"); // con su norma, no la medida cautelar del CGP 591
    expect(de("0855")).toBe("desconocida"); // cancelación parcial: no se da nada por cancelado
    expect(de("01001")).toBe("neutra"); // 5 cifras
    expect(de("04001")).toBe("medida_cautelar"); // 5 cifras
  });

  it.each(catalogo.codigos.map((c) => [c.codigo, c.descripcion, c.tipo]))(
    "%s %s → %s",
    (codigo, descripcion, tipo) => {
      expect(tipoLeido({ codigo, descripcion, tipo })).toBe(tipo);
    },
  );
});

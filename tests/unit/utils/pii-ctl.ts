// El gate de datos personales de los certificados SINTÉTICOS (S15): un fixture de CTL lleva la estructura pública del
// certificado y nada de una persona real. Busca por la forma del dato, no por el nombre de nadie.
export type HallazgoPii = { linea: number; tipo: string };

const PATRONES: Array<[string, RegExp]> = [
  ["documento", /\b(?:C\.?C\.?|NIT|CEDULA|C[EÉ]DULA)\b\s*(?:No\.?|Nro\.?|N[°º])?\s*:?\s*\d[\d.\s-]{4,}/i],
  ["celular", /(?:\+?57\s*)?\b3\d{2}\s*\d{3}\s*\d{4}\b/],
  ["correo", /[^\s@]+@[^\s@]+\.[a-z]{2,}/i],
  // Una matrícula con forma real (círculo-número de 5 dígitos o más, no pegada a otro número como en una fecha o una
  // radicación); la de los fixtures va en ceros.
  ["matricula", /(?<![\d-])\b\d{2,3}[A-Z]?-(?!0+\b)\d{5,}\b/],
];

// Las líneas de personas («DE:», «A:») solo pueden nombrar PERSONA <letra> o una ENTIDAD DE PRUEBA.
const PERSONA = /^\s*(?:DE|A)\s*:\s*(.*)$/i;
const NOMBRE_SINTETICO = /^(?:PERSONA [A-Z]|ENTIDAD DE PRUEBA)(?:\s+[XI])?\s*$/i;

export function hallazgosPii(texto: string): HallazgoPii[] {
  const hallazgos: HallazgoPii[] = [];
  texto.split("\n").forEach((l, i) => {
    for (const [tipo, re] of PATRONES) if (re.test(l)) hallazgos.push({ linea: i + 1, tipo });
    const p = PERSONA.exec(l);
    if (p && !NOMBRE_SINTETICO.test(p[1])) hallazgos.push({ linea: i + 1, tipo: "persona" });
  });
  return hallazgos;
}

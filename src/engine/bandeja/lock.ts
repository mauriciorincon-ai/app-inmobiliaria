// El sello del contrato (contrato § 5): `CONTRATO.lock` es una COPIA FIJADA del contrato de la bandeja con su versión, su
// huella SHA-256 y el origen (el commit de la planeadora que la tenía). Si alguien edita la copia, o la copia no es la que
// dice ser, la huella no coincide y el gate cae. Cambiar el contrato es G-Metodo en la planeadora: aquí solo se re-fija.
//
// Formato: encabezado `clave: valor` (una por línea), una línea `---` y, después, el contrato EXACTO como estaba.
// Puro: la función de huella llega como parámetro (la CLI y las pruebas pasan la de `node:crypto`).

export type SelloDeContrato = {
  contrato: string;
  version: string;
  sha256: string;
  origen: string;
};

export type ResultadoLock =
  | { ok: true; sello: SelloDeContrato; cuerpo: string }
  | {
      ok: false;
      razon:
        | "sin_separador"
        | "encabezado_incompleto"
        | "version_invalida"
        | "origen_invalido"
        | "huella_no_coincide"
        | "version_del_cuerpo_distinta"
        | "cuerpo_incompleto";
    };

const SEPARADOR = "\n---\n";
const SEMVER = /^\d+\.\d+\.\d+$/;
const COMMIT = /^[0-9a-f]{40}$/;
const HUELLA = /^[0-9a-f]{64}$/;

// Lo que una copia íntegra del contrato v0.1.0 debe traer: las siete garantías y las seis carnadas.
const MARCAS_DEL_CUERPO = [
  ...[1, 2, 3, 4, 5, 6, 7].map((n) => `G${n} ·`),
  ...[1, 2, 3, 4, 5, 6].map((n) => `C0${n}`),
];

export function verificarLock(
  texto: string,
  sha256: (cuerpo: string) => string,
): ResultadoLock {
  const corte = texto.indexOf(SEPARADOR);
  if (corte < 0) return { ok: false, razon: "sin_separador" };
  const encabezado = texto.slice(0, corte);
  const cuerpo = texto.slice(corte + SEPARADOR.length);

  const campos = new Map<string, string>();
  for (const linea of encabezado.split("\n")) {
    const m = linea.match(/^([a-z0-9_]+):\s*(.+)$/);
    if (m) campos.set(m[1], m[2].trim());
  }
  const contrato = campos.get("contrato");
  const version = campos.get("version");
  const huella = campos.get("sha256");
  const origen = campos.get("origen");
  if (!contrato || !version || !huella || !origen) {
    return { ok: false, razon: "encabezado_incompleto" };
  }
  if (!SEMVER.test(version)) return { ok: false, razon: "version_invalida" };
  if (!COMMIT.test(origen) || !HUELLA.test(huella)) {
    return { ok: false, razon: "origen_invalido" };
  }
  if (sha256(cuerpo) !== huella) {
    return { ok: false, razon: "huella_no_coincide" };
  }
  if (
    !new RegExp(`^version: ${version.replace(/\./g, "\\.")}$`, "m").test(cuerpo)
  ) {
    return { ok: false, razon: "version_del_cuerpo_distinta" };
  }
  if (!MARCAS_DEL_CUERPO.every((marca) => cuerpo.includes(marca))) {
    return { ok: false, razon: "cuerpo_incompleto" };
  }
  return {
    ok: true,
    sello: { contrato, version, sha256: huella, origen },
    cuerpo,
  };
}

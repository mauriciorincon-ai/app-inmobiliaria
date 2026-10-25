// Qué edición están leyendo estos scripts (S13). Por omisión la 187, como hasta ahora; `--edicion N` elige otra y, para
// otra, `--paginas P` dice cuántas páginas tiene el PDF (el script que une las lecturas no puede adivinarlo). Ninguna
// edición nueva exige editar `edicion.ts`.
import {
  EDICION,
  PAGINAS_EDICION,
  PAGINAS_MAX,
} from "../../src/engine/vivienda-nueva/edicion.ts";

/** @param {string[]} args @returns {{ numero: number, paginas: number | undefined }} */
export function edicionDeTrabajo(args) {
  const valor = (nombre) => {
    const i = args.indexOf(`--${nombre}`);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const numero = Number(valor("edicion") ?? EDICION.numero);
  if (!Number.isInteger(numero) || numero <= 0) {
    console.error("✗ --edicion debe ser el número de la edición (entero > 0)");
    process.exit(2);
  }
  const dicho = valor("paginas");
  const paginas =
    dicho !== undefined
      ? Number(dicho)
      : numero === EDICION.numero
        ? PAGINAS_EDICION
        : undefined;
  if (
    paginas !== undefined &&
    (!Number.isInteger(paginas) || paginas < 1 || paginas > PAGINAS_MAX)
  ) {
    console.error(`✗ --paginas debe ser un entero entre 1 y ${PAGINAS_MAX}`);
    process.exit(2);
  }
  return { numero, paginas };
}

/** Para unir lecturas hace falta saber cuántas páginas tiene la edición. */
export function paginasDeLaEdicion({ numero, paginas }) {
  if (paginas === undefined) {
    console.error(
      `✗ la edición ${numero} no es la de edicion.ts: pasa --paginas <las del PDF> para unir sus lecturas`,
    );
    process.exit(2);
  }
  return paginas;
}

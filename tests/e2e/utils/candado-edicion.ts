import { mkdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// La base local se comparte entre specs que corren en paralelo, y la edición que la app muestra es UNA: la vigente a la fecha, y
// si hay varias, la de MAYOR número (`nuevos_publicados`, `solicitar_visita_sala`). Dos specs que publican a la vez una edición
// vigente HOY se la quitan una a la otra. Este candado las pone en fila: quien publica una edición con ventana real lo toma en
// su `beforeAll` y lo suelta en su `afterAll`. Es un directorio (`mkdir` es atómico). Un candado de más de 3 minutos es de una
// corrida que murió a medias y se toma.
const RUTA = join(tmpdir(), "inn-e2e-edicion-vigente.lock");
const VIEJO_MS = 3 * 60_000;

export async function tomarCandadoEdicion(
  esperaMaxMs = 150_000,
): Promise<void> {
  const t0 = Date.now();
  for (;;) {
    try {
      mkdirSync(RUTA);
      return;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
      try {
        if (Date.now() - statSync(RUTA).mtimeMs > VIEJO_MS) {
          rmSync(RUTA, { recursive: true, force: true });
          continue;
        }
      } catch {
        continue; // se soltó entre el mkdir y el stat
      }
      if (Date.now() - t0 > esperaMaxMs) {
        throw new Error("no se pudo tomar el candado de la edición vigente");
      }
      await new Promise((r) => setTimeout(r, 250));
    }
  }
}

export function soltarCandadoEdicion(): void {
  rmSync(RUTA, { recursive: true, force: true });
}

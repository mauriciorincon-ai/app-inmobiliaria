import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";

// Lectura de la base LOCAL desde los e2e, por el contenedor de Postgres de `supabase start`. Sirve
// para comprobar lo que ninguna RPC expone (el catálogo de permisos, una columna interna). Datos
// 100 % sintéticos; jamás apunta a la nube. El nombre del contenedor es supabase_db_<project_id>
// (project_id está en supabase/config.toml).
const CONTENEDOR =
  process.env.SUPABASE_DB_CONTAINER ?? "supabase_db_app-inmobiliaria";

const BASE = [
  "exec",
  "-i",
  CONTENEDOR,
  "psql",
  "-U",
  "postgres",
  "-d",
  "postgres",
  "-At",
];

// Una consulta; una fila por línea.
export function consultar(sql: string): string[] {
  const salida = execFileSync("docker", [...BASE, "-c", sql], {
    encoding: "utf8",
  });
  return salida.split("\n").filter(Boolean);
}

// Un guion de varias sentencias por stdin (p. ej. `begin; …; rollback;`). Corta en el primer error.
// Devuelve TODAS las líneas, incluidas las etiquetas de comando (BEGIN, ROLLBACK…): el llamador
// filtra la fila que le interesa.
export function ejecutar(guion: string): string[] {
  const salida = execFileSync(
    "docker",
    [...BASE, "-v", "ON_ERROR_STOP=1", "-f", "-"],
    { encoding: "utf8", input: guion },
  );
  return salida.split("\n").filter(Boolean);
}

const execFileAsync = promisify(execFile);

// La misma consulta, asíncrona: para lanzar dos a la vez y probar carreras (cada una abre su conexión).
export async function consultarAsync(sql: string): Promise<string[]> {
  const { stdout } = await execFileAsync("docker", [...BASE, "-c", sql], {
    encoding: "utf8",
  });
  return stdout.split("\n").filter(Boolean);
}

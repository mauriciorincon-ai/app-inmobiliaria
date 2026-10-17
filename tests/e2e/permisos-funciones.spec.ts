import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";

// Red de seguridad del ADR 012. Lee el CATÁLOGO de la base local y exige que el conjunto de funciones
// de `public` que `anon` puede ejecutar sea EXACTAMENTE la lista blanca de RPC públicas. Una función
// nueva que nadie cerró (en Postgres nace abierta a PUBLIC) rompe esta prueba en la CI, sin depender
// de que alguien se acuerde de añadirla a la matriz de `rls.spec.ts`.
//
// Añadir una RPC pública es una decisión: se edita PUBLICAS a propósito. Datos 100 % sintéticos: solo
// consulta el catálogo, no toca ninguna fila.

const PUBLICAS = [
  "eliminar_foto",
  "guardar_contacto_publico",
  "guardar_descripcion",
  "marcar_portada",
  "obtener_codigo_referido",
  "obtener_cupos",
  "obtener_ficha",
  "obtener_mi_anuncio",
  "obtener_mis_referidos",
  "ping",
  "registrar_foto",
  "registrar_fundador",
  "renovar_vigencia",
];

// Cron e internas: ni `anon` ni `authenticated` (solo service_role / otras funciones SECURITY DEFINER).
const SOLO_SERVIDOR = ["marcar_vencidos", "generar_slug", "tocar_updated_at"];

// El contenedor de la base local se llama supabase_db_<project_id> (project_id está en config.toml).
const CONTENEDOR =
  process.env.SUPABASE_DB_CONTAINER ?? "supabase_db_app-inmobiliaria";

function consultar(sql: string): string[] {
  const salida = execFileSync(
    "docker",
    [
      "exec",
      "-i",
      CONTENEDOR,
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-At",
      "-c",
      sql,
    ],
    { encoding: "utf8" },
  );
  return salida.split("\n").filter(Boolean);
}

// Mismo alcance que la migración: funciones propias de `postgres` en `public`, sin event triggers
// (los gestiona Supabase) ni funciones de otros dueños.
const PROPIAS = `
  from pg_proc p
  where p.pronamespace = 'public'::regnamespace
    and p.prokind = 'f'
    and p.proowner = (select r.oid from pg_roles r where r.rolname = 'postgres')
    and p.prorettype <> 'event_trigger'::regtype`;

// El catálogo es el mismo para los dos proyectos de Playwright: se corre una sola vez.
test.beforeEach(() => {
  test.skip(test.info().project.name !== "desktop-chromium", "una sola vez");
});

test("anon ejecuta SOLO la lista blanca de RPC públicas", async () => {
  const abiertas = consultar(
    `select p.proname ${PROPIAS} and has_function_privilege('anon', p.oid, 'execute') order by 1`,
  );
  expect(abiertas).toEqual([...PUBLICAS].sort());
});

test("todas las RPC de la lista blanca existen (la lista no quedó desfasada)", async () => {
  const existentes = consultar(`select p.proname ${PROPIAS} order by 1`);
  for (const nombre of PUBLICAS) expect(existentes, nombre).toContain(nombre);
});

test("las funciones de cron e internas no las ejecuta ni anon ni authenticated", async () => {
  const lista = SOLO_SERVIDOR.map((n) => `'${n}'`).join(", ");
  const abiertas = consultar(
    `select p.proname ${PROPIAS} and p.proname in (${lista})
       and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))
     order by 1`,
  );
  expect(abiertas).toEqual([]);
});

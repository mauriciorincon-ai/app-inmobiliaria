import { test, expect } from "@playwright/test";
import { consultar, ejecutar } from "./utils/bd";

// Red de seguridad de los ADR 012 y 013. Lee el CATÁLOGO de la base local y exige que el conjunto de
// funciones de `public` que `anon` puede ejecutar sea EXACTAMENTE la lista blanca de RPC públicas,
// comparada por FIRMA (una sobrecarga nueva con el mismo nombre no pasa desapercibida). Además:
//   · ninguna función de `public` depende de PUBLIC;
//   · una función creada DESPUÉS (la sonda) nace cerrada para anon, authenticated y PUBLIC.
// Añadir una RPC pública es una decisión: se edita PUBLICAS a propósito. Datos 100 % sintéticos:
// solo consulta el catálogo; la sonda vive dentro de una transacción que se revierte.

const PUBLICAS = [
  "buscar_inmuebles(operacion,tipo_inmueble,text,bigint,bigint,smallint,text,integer)",
  "eliminar_foto(text,uuid)",
  "guardar_contacto_publico(text,boolean)",
  "guardar_descripcion(text,text)",
  "marcar_portada(text,uuid)",
  "obtener_codigo_referido(text)",
  "obtener_cupos()",
  "obtener_ficha(text)",
  "obtener_mi_anuncio(text)",
  "obtener_mis_referidos(text)",
  "ping()",
  "registrar_foto(text,text,integer,integer,integer)",
  "registrar_fundador(text,text,text,text,text,operacion,tipo_inmueble,text,text,integer,smallint,bigint,boolean,text,text,text)",
  "renovar_vigencia(text)",
];

// Cron e internas: ni `anon` ni `authenticated` (solo service_role / otras funciones SECURITY DEFINER).
const SOLO_SERVIDOR = [
  "marcar_vencidos",
  "generar_slug",
  "tocar_updated_at",
  "fijar_sector",
  "clave_barrio",
];

// Mismo alcance que las migraciones: funciones propias de `postgres` en `public`, sin event triggers
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

test("anon ejecuta SOLO la lista blanca de RPC públicas (por firma)", async () => {
  const abiertas = consultar(
    `select p.oid::regprocedure::text ${PROPIAS} and has_function_privilege('anon', p.oid, 'execute') order by 1`,
  );
  expect(abiertas).toEqual([...PUBLICAS].sort());
});

test("todas las RPC de la lista blanca existen (la lista no quedó desfasada)", async () => {
  const existentes = consultar(
    `select p.oid::regprocedure::text ${PROPIAS} order by 1`,
  );
  for (const firma of PUBLICAS) expect(existentes, firma).toContain(firma);
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

test("marcar_verificado_ctl la ejecuta el operador (authenticated), jamás anon", async () => {
  const [fila] = consultar(
    `select has_function_privilege('anon', 'public.marcar_verificado_ctl(uuid,text,date)', 'execute')::text
        || ',' || has_function_privilege('authenticated', 'public.marcar_verificado_ctl(uuid,text,date)', 'execute')::text`,
  );
  expect(fila).toBe("false,true");
});

test("ninguna función de public depende de PUBLIC", async () => {
  // El ACL nulo significa «el default», que incluye PUBLIC: se expande con acldefault.
  const conPublic = consultar(
    `select p.oid::regprocedure::text ${PROPIAS}
       and exists (
         select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
         where a.grantee = 0 and a.privilege_type = 'EXECUTE')
     order by 1`,
  );
  expect(conPublic).toEqual([]);
});

// La sonda: crea una función DESPUÉS de las migraciones, dentro de una transacción que se revierte,
// y mide quién puede ejecutarla. Devuelve «anon,authenticated,filasPUBLIC».
function medirSonda(prefacio = ""): string {
  const salida = ejecutar(`
    begin;
    ${prefacio}
    create function public._sonda_s5() returns int language sql as $$ select 1 $$;
    select has_function_privilege('anon', 'public._sonda_s5()', 'execute')::text || ','
        || has_function_privilege('authenticated', 'public._sonda_s5()', 'execute')::text || ','
        || (select count(*) from pg_proc p,
              aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
            where p.oid = 'public._sonda_s5()'::regprocedure and a.grantee = 0)::text;
    rollback;
  `);
  const fila = salida.find((l) => /^(true|false),(true|false),\d+$/.test(l));
  expect(fila, `salida de la sonda: ${salida.join(" | ")}`).toBeDefined();
  return fila as string;
}

test("una función nueva nace CERRADA: ni anon, ni authenticated, ni PUBLIC", async () => {
  expect(medirSonda()).toBe("false,false,0");
});

test("la sonda sí detecta una función abierta (la guarda falla cuando debe)", async () => {
  // Demo en rojo (regla 15): con un default abierto la misma sonda ve a anon.
  const abierta = medirSonda(
    "alter default privileges for role postgres in schema public grant execute on functions to anon;",
  );
  expect(abierta.startsWith("true,")).toBe(true);
  // Y la transacción se revirtió: el default real sigue cerrado.
  expect(medirSonda()).toBe("false,false,0");
});

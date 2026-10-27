import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// S16 — la sonda de las migraciones en la NUBE: cada prueba solo pasa con el cuerpo NUEVO de las funciones. El 401 de
// `supabase db query --linked` no dejaba mirarlas; esta va por Postgres directo, con la contraseña de la base. Todo corre
// dentro de una transacción que se revierte al final: no escribe nada, y lo que una prueba hace adentro no lo ve nadie.
// Imprime solo pasa/no pasa: jamás la URL, la contraseña ni una fila.
const RAIZ = join(__dirname, "..", "..");

function conexion(): string {
  const url = readFileSync(join(RAIZ, "supabase", ".temp", "pooler-url"), "utf8").trim();
  const clave = process.env.SUPABASE_DB_PASSWORD;
  if (!clave) throw new Error("falta SUPABASE_DB_PASSWORD (en .env.local o exportada)");
  const u = new URL(url);
  u.password = clave;
  return u.toString();
}

// TLS: con `SUPABASE_DB_CA` (ruta al certificado raíz de Supabase, bajado del panel y fuera de git) se verifica el servidor. Sin ella
// la conexión va cifrada pero SIN verificar el certificado: quien se interpusiera entre esta máquina y el pooler vería la contraseña
// de la base. Riesgo aceptado para una sonda que corre a mano desde la máquina del builder; con la CA puesta, desaparece.
const ca = process.env.SUPABASE_DB_CA ? readFileSync(process.env.SUPABASE_DB_CA, "utf8") : null;
const db = new Client({
  connectionString: conexion(),
  ssl: ca ? { ca } : { rejectUnauthorized: false },
});
// La definición de una función, o «» si no existe (un punto de guardado: una función que falta no tumba las demás pruebas).
async function definicion(firma: string): Promise<string> {
  await db.query("savepoint d");
  try {
    const r = await db.query("select pg_get_functiondef($1::regprocedure) as d", [firma]);
    await db.query("release savepoint d");
    return r.rows[0].d as string;
  } catch {
    await db.query("rollback to savepoint d");
    return "";
  }
}
// Corre `sql` en un punto de guardado: si falla, devuelve el mensaje y la transacción sigue viva.
async function error(sql: string, args: unknown[] = []): Promise<string | null> {
  await db.query("savepoint s");
  try {
    await db.query(sql, args);
    await db.query("release savepoint s");
    return null;
  } catch (e) {
    await db.query("rollback to savepoint s");
    return e instanceof Error ? e.message : String(e);
  }
}

beforeAll(async () => {
  await db.connect();
  await db.query("begin");
});
afterAll(async () => {
  await db.query("rollback");
  await db.end();
});

describe("migración 18 (S15): la cola antifraude y la validación de las banderas de precio", () => {
  it("guardar_banderas_precio rechaza una bandera sin porcentaje (la 17 la dejaba pasar)", async () => {
    const msg = await error("select public.guardar_banderas_precio($1::jsonb)", [
      JSON.stringify({ "00000000-0000-4000-8000-000000000000": { n: 5, ambito: "barrio" } }),
    ]);
    expect(msg).toContain("hallazgos_invalidos");
  });

  it("antifraude_cola ordena por lo último que pasó y deja en la cola el CTL pedido", async () => {
    const d = await definicion("public.antifraude_cola()");
    expect(d).toContain("x.ultima desc nulls last");
    expect(d).toContain("i.ctl_pedido_at is not null");
  });
});

describe("migración 19 (S16): el lote de la base", () => {
  it("solicitar_visita exige el consentimiento y la firma vieja ya no existe", async () => {
    const d = await definicion(
      "public.solicitar_visita(text,text,text,bigint,bigint,text[],text,text,boolean)",
    );
    expect(d).toContain("consentimiento_requerido");
    expect(d).toContain("demasiados_ciclos");
    const viejas = await db.query(
      "select count(*)::int as n from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'solicitar_visita' and p.pronargs = 8",
    );
    expect(viejas.rows[0].n).toBe(0);
  });

  it("una bandera resuelta con «pausar» guarda su dato y se reabre solo si cambió (1b)", async () => {
    expect(await definicion("public.resolver_revision(uuid,text,text,text)")).toContain(
      "dato_al_resolver",
    );
    expect(await definicion("public.aplicar_banderas(text,jsonb)")).toContain(
      "public.dato_de_bandera(b.inmueble_id, b.regla)",
    );
    // El dato se guarda como huella, no en claro.
    expect(await definicion("public.dato_de_bandera(uuid,text)")).toContain("sha256");
  });

  it("cerrar_ctl_pedido existe y no cierra lo que no se pidió", async () => {
    const msg = await error("select public.cerrar_ctl_pedido($1::uuid)", [
      "00000000-0000-4000-8000-000000000000",
    ]);
    expect(msg).toContain("estado_invalido");
    // Un pedido nuevo y un CTL verificado borran la fecha de «no lo entregó».
    for (const f of ["public.pedir_ctl(uuid)", "public.marcar_verificado_ctl(uuid,text,date)"]) {
      expect(await definicion(f)).toContain("ctl_no_entregado_at = null");
    }
  });

  it("correos_libres_hoy nunca es negativo y salas_panel no corta las abiertas", async () => {
    const r = await db.query("select public.correos_libres_hoy(0) as n");
    expect(r.rows[0].n).toBe(0);
    expect(await definicion("public.salas_panel()")).toContain("select * from base where abierta");
  });

  it("la purga, el nombre del canje, el umbral de «bajó de precio» y la zona del sector", async () => {
    expect(await definicion("public.purgar_vencidos()")).toContain(
      "v.created_at > now() - interval '30 days'",
    );
    const canje = await definicion("public.canjear_codigo_whatsapp(text,text)");
    expect(canje).toContain("v.nombre");
    expect(canje).toContain("nombre = null");
    expect(await definicion("public.reclamar_resumenes(integer,uuid)")).toContain(
      "p.anterior * 0.99",
    );
    expect(await definicion("public.fijar_sector()")).toContain("new.zona_id := coalesce(");
  });
});

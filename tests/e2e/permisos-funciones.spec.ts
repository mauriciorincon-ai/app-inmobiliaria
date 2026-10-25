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
  "aceptar_en_espera(text,uuid)",
  "borrar_identificacion(text)",
  "buscar_inmuebles(operacion,tipo_inmueble,text,bigint,bigint,smallint,text,integer)",
  "cancelar_visita_comprador(text)",
  "cancelar_visita_dueno(text,uuid)",
  "elegir_horario(text,uuid)",
  "eliminar_foto(text,uuid)",
  "estado_verificacion(text)",
  "guardar_contacto_publico(text,boolean)",
  "guardar_descripcion(text,text)",
  "guardar_solo_identificados(text,boolean)",
  // S8: la de 6 argumentos exige el consentimiento; la de 5 del S7 quedó cerrada (ver más abajo).
  "iniciar_verificacion(text,text,text,text,text,boolean)",
  "marcar_asistencia(text,uuid,boolean)",
  "marcar_portada(text,uuid)",
  "obtener_codigo_referido(text)",
  "obtener_cupos()",
  "obtener_ficha(text)",
  "obtener_mi_anuncio(text)",
  "obtener_mis_referidos(text)",
  "obtener_visita(text)",
  "ping()",
  "proponer_horarios(text,uuid,timestamp with time zone[])",
  "rechazar_solicitud(text,uuid)",
  "registrar_contacto(text,text)",
  "registrar_foto(text,text,integer,integer,integer)",
  "registrar_fundador(text,text,text,text,text,operacion,tipo_inmueble,text,text,integer,smallint,bigint,boolean,text,text,text)",
  "renovar_vigencia(text)",
  "solicitar_visita(text,text,text,bigint,bigint,text[],text,text)",
  // S9: favoritos, listas con notas, alertas por correo y el precio del dueño (migración 12).
  "agregar_a_lista(text,uuid,text)",
  "baja_alerta(text)",
  "borrar_lista(text,uuid)",
  "borrar_nota(text,uuid)",
  "compartir_lista(text,uuid)",
  "confirmar_alerta(text)",
  "crear_lista(text,text)",
  "escribir_nota(text,uuid,text,text,text)",
  "fusionar_favoritos(text,text[])",
  "gestionar_alerta(text,text)",
  "guardar_precio(text,bigint)",
  "mis_favoritos(text)",
  "mis_listas(text)",
  "obtener_alertas(text[])",
  "obtener_lista(text,text,uuid)",
  "quitar_de_lista(text,uuid,text)",
  "quitar_favorito(text,text)",
  "renombrar_lista(text,uuid,text)",
  "resumen_anuncios(text[])",
  "revocar_lista(text,uuid)",
  // S10: la última tasa de vivienda y los comparables de precio (solo lo que `/buscar` ya muestra).
  "tasa_vivienda()",
  "comparables_precio(operacion,tipo_inmueble,text)",
  // S12: la edición vigente de la vivienda nueva (solo ediciones PUBLICADAS, lista blanca de columnas).
  "nuevos_publicados(date)",
  // S13: pedir la visita a una sala de ventas (exige la sesión verificada) y los usados para comparar (área y precio).
  "solicitar_visita_sala(text,text,text,text)",
  "usados_para_comparar(operacion,tipo_inmueble)",
];

// Cron e internas: ni `anon` ni `authenticated` (solo service_role / otras funciones SECURITY DEFINER).
const SOLO_SERVIDOR = [
  "marcar_vencidos",
  "generar_slug",
  "tocar_updated_at",
  "fijar_sector",
  "clave_barrio",
  // S7: el canje del código lo hace el webhook con la llave del servidor; el trigger del sello es interno.
  "canjear_codigo_whatsapp",
  "proteger_sello",
  // S8: el proveedor de identidad, los correos de la visita y el cron usan la llave de servicio; los
  // ayudantes los llaman solo otras funciones SECURITY DEFINER.
  "reservar_consulta_identidad",
  "registrar_identificacion",
  "datos_correo_visita",
  "reclamar_recordatorios",
  "purgar_vencidos",
  "comprador_de_sesion",
  "inmueble_de_token",
  "solicitud_de_token",
  "nuevo_enlace_visita",
  // S9: crear la alerta (devuelve el token de confirmar), el resumen del cron, el cupo de correos y los
  // ayudantes internos (los llaman solo funciones SECURITY DEFINER).
  "crear_alerta",
  "reclamar_resumenes",
  "sumar_correos_dia",
  "hash_token",
  "generar_token",
  "dia_bogota",
  "validar_poligono",
  "inmuebles_que_cumplen",
  "fila_anuncio",
  "lista_detalle",
  "registrar_cambio_precio",
  // S10: guardar la tasa que lee el cron (solo el servidor).
  "guardar_tasa_vivienda",
  // S12: cargar, publicar y retirar una edición de vivienda nueva (la bandeja, con la llave de servicio).
  "cargar_edicion",
  "publicar_edicion",
  "retirar_edicion",
  // S13: el aviso «aún sin respuesta» del cron.
  "reclamar_sin_respuesta_salas",
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
  // Se ordenan los dos lados en JS: el `order by` de la base usa la colación del servidor y puntuación distinta.
  expect([...abiertas].sort()).toEqual([...PUBLICAS].sort());
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

test("el legado marcar_verificado (sin fecha de CTL) ya no lo ejecuta el operador ni anon", async () => {
  const [fila] = consultar(
    `select has_function_privilege('anon', 'public.marcar_verificado(uuid,text)', 'execute')::text
        || ',' || has_function_privilege('authenticated', 'public.marcar_verificado(uuid,text)', 'execute')::text`,
  );
  expect(fila).toBe("false,false");
});

test("canjear_codigo_whatsapp solo lo ejecuta service_role", async () => {
  const [fila] = consultar(
    `select has_function_privilege('service_role', 'public.canjear_codigo_whatsapp(text,text)', 'execute')::text
        || ',' || has_function_privilege('anon', 'public.canjear_codigo_whatsapp(text,text)', 'execute')::text
        || ',' || has_function_privilege('authenticated', 'public.canjear_codigo_whatsapp(text,text)', 'execute')::text`,
  );
  expect(fila).toBe("true,false,false");
});

test("la iniciar_verificacion de 5 argumentos (S7) quedó cerrada; la de 6 sigue abierta", async () => {
  const [fila] = consultar(
    `select has_function_privilege('anon', 'public.iniciar_verificacion(text,text,text,text,text)', 'execute')::text
        || ',' || has_function_privilege('authenticated', 'public.iniciar_verificacion(text,text,text,text,text)', 'execute')::text
        || ',' || has_function_privilege('anon', 'public.iniciar_verificacion(text,text,text,text,text,boolean)', 'execute')::text`,
  );
  expect(fila).toBe("false,false,true");
});

test("las funciones del servidor del S8 las ejecuta service_role", async () => {
  const firmas = [
    "reservar_consulta_identidad(text,integer,integer,integer)",
    "registrar_identificacion(uuid,text,text)",
    "datos_correo_visita(uuid)",
    "reclamar_recordatorios()",
    "purgar_vencidos()",
    // migración 11: el enlace nuevo de cada correo y de qué solicitud es un token.
    "nuevo_enlace_visita(uuid)",
    "solicitud_de_token(text)",
  ];
  for (const f of firmas) {
    const [fila] = consultar(
      `select has_function_privilege('service_role', 'public.${f}', 'execute')::text`,
    );
    expect(fila, f).toBe("true");
  }
});

test("las funciones del servidor del S9 las ejecuta service_role y crear_alerta jamás anon (se llevaría el token de confirmar)", async () => {
  const firmas = [
    "crear_alerta(text,text,text,operacion,tipo_inmueble,text,bigint,bigint,smallint,text,boolean,boolean,boolean,text,integer)",
    "reclamar_resumenes(integer,uuid)",
    "sumar_correos_dia(text,integer)",
  ];
  for (const f of firmas) {
    const [fila] = consultar(
      `select has_function_privilege('service_role', 'public.${f}', 'execute')::text
          || ',' || has_function_privilege('anon', 'public.${f}', 'execute')::text
          || ',' || has_function_privilege('authenticated', 'public.${f}', 'execute')::text`,
    );
    expect(fila, f).toBe("true,false,false");
  }
});

test("las funciones del servidor del S12 las ejecuta service_role y jamás anon ni authenticated", async () => {
  const firmas = [
    "cargar_edicion(jsonb)",
    "publicar_edicion(integer,text[])",
    "retirar_edicion(integer)",
  ];
  for (const f of firmas) {
    const [fila] = consultar(
      `select has_function_privilege('service_role', 'public.${f}', 'execute')::text
          || ',' || has_function_privilege('anon', 'public.${f}', 'execute')::text
          || ',' || has_function_privilege('authenticated', 'public.${f}', 'execute')::text`,
    );
    expect(fila, f).toBe("true,false,false");
  }
});

test("S13 · las funciones del operador para las salas las ejecuta authenticated y el servidor, jamás anon (ni el comprador)", async () => {
  const firmas = [
    "salas_panel()",
    "proponer_horarios_sala(uuid,timestamp with time zone[])",
    "rechazar_solicitud_sala(uuid)",
    "cancelar_visita_sala(uuid)",
    "guardar_sala(text,text,text)",
  ];
  for (const f of firmas) {
    const [fila] = consultar(
      `select has_function_privilege('service_role', 'public.${f}', 'execute')::text
          || ',' || has_function_privilege('authenticated', 'public.${f}', 'execute')::text
          || ',' || has_function_privilege('anon', 'public.${f}', 'execute')::text`,
    );
    expect(fila, f).toBe("true,true,false");
  }
});

test("S13 · el aviso «sin respuesta» lo ejecuta solo service_role", async () => {
  const [fila] = consultar(
    `select has_function_privilege('service_role', 'public.reclamar_sin_respuesta_salas(timestamp with time zone)', 'execute')::text
        || ',' || has_function_privilege('anon', 'public.reclamar_sin_respuesta_salas(timestamp with time zone)', 'execute')::text
        || ',' || has_function_privilege('authenticated', 'public.reclamar_sin_respuesta_salas(timestamp with time zone)', 'execute')::text`,
  );
  expect(fila).toBe("true,false,false");
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

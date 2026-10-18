import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { consultar, consultarAsync, ejecutar } from "./utils/bd";
import {
  conContactoPublico,
  crearAnuncio,
  vencer,
  type AnuncioCreado,
} from "./utils/anuncios";
import {
  compradorVerificado,
  pedirCodigo,
  sesionNueva,
  telefonoNuevo,
} from "./utils/comprador";
import type {
  FichaData,
  MiAnuncioData,
  ReservaIdentidad,
  ResultadoSolicitud,
  SolicitudRecibida,
  VisitaDelComprador,
} from "../../src/lib/supabase/types";

// S8 «La visita» — la base de datos: identificarse, pedir una visita, proponer horarios, confirmar,
// cancelar, marcar la asistencia, el recordatorio, la purga y el tope de contactos. Habla con las RPC
// públicas con el anon key real y llama como `postgres` a las del servidor (el rol con el que las
// llamaría la llave de servicio). Datos 100 % sintéticos; cada prueba crea sus propios anuncios y
// compradores porque la base local se comparte entre specs y corre en paralelo.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const CORREO_COMPRADOR = "comprador.sintetico@ejemplo.test";
const DIRECCION = "Calle 93 # 14-20 piso 3";
const UUID_NULO = "00000000-0000-0000-0000-000000000000";
const TOKEN_FALSO = "token_falso_que_no_existe_en_la_base_de_dat";

const api = () => createClient(url, anon);

function enDias(dias: number): string {
  return new Date(Date.now() + dias * 86_400_000).toISOString();
}

async function anuncioAbierto(
  opts: Parameters<typeof crearAnuncio>[0] = {},
): Promise<AnuncioCreado> {
  const a = await crearAnuncio(opts);
  conContactoPublico(a);
  return a;
}

async function pedir(
  sesion: string,
  slug: string,
  extra: Record<string, unknown> = {},
) {
  const { data, error } = await api().rpc("solicitar_visita", {
    p_sesion_hash: sesion,
    p_slug: slug,
    p_intencion: "vivir",
    p_presupuesto_min: 300_000_000,
    p_presupuesto_max: 450_000_000,
    p_forma_pago: ["hipotecario", "ahorros"],
    p_mensaje: "Me interesa verlo con mi familia",
    p_email: CORREO_COMPRADOR,
    ...extra,
  });
  return { data: data as unknown as ResultadoSolicitud, error };
}

async function miAnuncio(token: string): Promise<MiAnuncioData> {
  const { data } = await api().rpc("obtener_mi_anuncio", { p_token: token });
  return data as unknown as MiAnuncioData;
}

async function tarjetas(token: string): Promise<SolicitudRecibida[]> {
  return (await miAnuncio(token)).solicitudes;
}

async function suVisita(token: string): Promise<VisitaDelComprador | null> {
  const { data } = await api().rpc("obtener_visita", { p_token: token });
  return data as unknown as VisitaDelComprador | null;
}

function proponer(token: string, solicitud: string, horarios: string[]) {
  return api().rpc("proponer_horarios", {
    p_token: token,
    p_solicitud_id: solicitud,
    p_horarios: horarios,
  });
}

// Pide, el dueño propone un horario y el comprador lo confirma. Devuelve la solicitud.
async function visitaConfirmada(
  a: AnuncioCreado,
  c: { sesion: string },
  dias = 2,
): Promise<ResultadoSolicitud> {
  const { data: s, error } = await pedir(c.sesion, a.slug);
  expect(error).toBeNull();
  expect(
    (await proponer(a.token, s.solicitud_id, [enDias(dias)])).error,
  ).toBeNull();
  const v = await suVisita(s.token);
  const { error: e } = await api().rpc("elegir_horario", {
    p_token: s.token,
    p_horario_id: v!.horarios[0].id,
  });
  expect(e).toBeNull();
  return s;
}

// La visita ya pasó (para poder marcar la asistencia).
function ocurrio(solicitud: string): void {
  ejecutar(
    `update public.visitas set inicio = now() - interval '1 hour' where solicitud_id = '${solicitud}'`,
  );
}

// Reserva y cierra una consulta de identidad como `postgres` (lo que haría la ruta con la llave de servicio).
function reservar(sesion: string, extra = ""): ReservaIdentidad {
  return JSON.parse(
    consultar(
      `select public.reservar_consulta_identidad('${sesion}'${extra})::text`,
    )[0],
  ) as ReservaIdentidad;
}

function cerrarConsulta(id: string, resultado: string): void {
  consultar(
    `select public.registrar_identificacion('${id}', '${resultado}', 'simulador')`,
  );
}

async function identificado(c: { sesion: string }): Promise<void> {
  const r = reservar(c.sesion, ", p_tope_mes => 100000, p_tope_dia => 100000");
  expect(r.ok).toBe(true);
  if (r.ok) cerrarConsulta(r.consulta_id, "identificado");
}

const TABLAS = [
  "identificaciones",
  "identidad_consultas",
  "solicitudes_visita",
  "horarios_propuestos",
  "visitas",
  "enlaces_visita",
] as const;

// ── Cerrado por construcción ──────────────────────────────────────────────────

test("el anónimo NO lee ni escribe las tablas del S8", async () => {
  for (const tabla of TABLAS) {
    const { data } = await api().from(tabla).select("*");
    expect(data ?? [], tabla).toHaveLength(0);
    const { error } = await api().from(tabla).insert({});
    expect(error, tabla).not.toBeNull();
  }
});

test("el operador (authenticated) tampoco las lee: son del servidor", async () => {
  for (const tabla of TABLAS) {
    expect(
      () =>
        ejecutar(
          `begin; set local role authenticated; select count(*) from public.${tabla}; rollback;`,
        ),
      tabla,
    ).toThrow(/permission denied/);
  }
});

test("las RPC del servidor rechazan al anónimo (42501)", async () => {
  const llamadas: Array<[string, Record<string, unknown>]> = [
    ["reservar_consulta_identidad", { p_sesion_hash: sesionNueva() }],
    [
      "registrar_identificacion",
      {
        p_consulta_id: UUID_NULO,
        p_resultado: "identificado",
        p_proveedor: "simulador",
      },
    ],
    ["datos_correo_visita", { p_solicitud_id: UUID_NULO }],
    ["reclamar_recordatorios", {}],
    ["purgar_vencidos", {}],
  ];
  for (const [nombre, args] of llamadas) {
    const { error } = await api().rpc(nombre, args);
    expect(error?.code, nombre).toBe("42501");
  }
});

test("ninguna tabla guarda la cédula, el documento ni la fecha de expedición", async () => {
  expect(
    consultar(
      `select table_name || '.' || column_name from information_schema.columns
        where table_schema = 'public'
          and column_name ~* '(cedula|cédula|documento|expedicion|expedición)'
        order by 1`,
    ),
  ).toEqual([]);
});

// ── Deuda del S7 ──────────────────────────────────────────────────────────────

test("iniciar_verificacion exige el consentimiento y la de 5 argumentos está cerrada", async () => {
  for (const consentimiento of [false, null]) {
    const sesion = sesionNueva();
    const tel = telefonoNuevo();
    const { error } = await pedirCodigo(sesion, {
      p_telefono: tel,
      p_consentimiento: consentimiento,
    });
    expect(error?.code, String(consentimiento)).toBe("23514");
    expect(error?.message).toContain("consentimiento_requerido");
    expect(
      consultar(
        `select count(*) from public.compradores where telefono = '${tel}'`,
      ),
    ).toEqual(["0"]);
  }
  // La firma del S7 (sin consentimiento) ya no es alcanzable por la API.
  const { error } = await api().rpc("iniciar_verificacion", {
    p_sesion_hash: sesionNueva(),
    p_nombre: "Laura Sintetica",
    p_telefono: telefonoNuevo(),
    p_idioma: "es",
    p_ip_hash: `s8-viejo-${Date.now()}`,
  });
  expect(error?.code).toBe("42501");
});

test("registrar_contacto: el contacto 21 de un comprador en 24 horas se rechaza; volver a uno viejo no cuenta", async () => {
  const c = await compradorVerificado();
  const anuncios: AnuncioCreado[] = [];
  for (let i = 0; i < 21; i++) anuncios.push(await crearAnuncio());
  ejecutar(
    `update public.inmuebles set contacto_publico = true where id in (${anuncios
      .map((a) => `'${a.id}'`)
      .join(",")})`,
  );
  const contactar = (slug: string) =>
    api().rpc("registrar_contacto", { p_sesion_hash: c.sesion, p_slug: slug });
  for (const a of anuncios.slice(0, 20)) {
    const { data, error } = await contactar(a.slug);
    expect(error).toBeNull();
    expect(data).toEqual({ whatsapp: "+573001234567" });
  }
  const { data: rechazado, error } = await contactar(anuncios[20].slug);
  expect(rechazado).toBeNull();
  expect(error?.code).toBe("23514");
  expect(error?.message).toContain("demasiados_contactos");
  // Volver a un anuncio ya contactado sigue funcionando.
  expect((await contactar(anuncios[0].slug)).error).toBeNull();
  // Otro comprador no se ve afectado.
  const otro = await compradorVerificado();
  expect(
    (
      await api().rpc("registrar_contacto", {
        p_sesion_hash: otro.sesion,
        p_slug: anuncios[20].slug,
      })
    ).error,
  ).toBeNull();
  // Pasadas 24 horas, el tope se libera.
  ejecutar(
    `update public.contactos set created_at = now() - interval '25 hours'
      where comprador_id = (select id from public.compradores where telefono = '${c.telefono}')
        and inmueble_id in (${anuncios
          .slice(0, 10)
          .map((a) => `'${a.id}'`)
          .join(",")})`,
  );
  expect((await contactar(anuncios[20].slug)).error).toBeNull();
});

test("la purga borra al comprador sin verificar de 30 días y los códigos vencidos de 7, y respeta lo vivo", async () => {
  // Sin verificar y viejo: se va (con sus códigos).
  const viejoTel = telefonoNuevo();
  const viejoSesion = sesionNueva();
  expect(
    (await pedirCodigo(viejoSesion, { p_telefono: viejoTel })).error,
  ).toBeNull();
  ejecutar(
    `update public.compradores set created_at = now() - interval '31 days' where telefono = '${viejoTel}';
     update public.verificaciones set vence_at = now() - interval '8 days' where sesion_hash = '${viejoSesion}'`,
  );
  // Sin verificar pero reciente: se queda.
  const nuevoTel = telefonoNuevo();
  expect(
    (await pedirCodigo(sesionNueva(), { p_telefono: nuevoTel })).error,
  ).toBeNull();
  // Verificado: se queda, con su código USADO aunque «venza» hace meses (es la prueba de su sesión).
  const v = await compradorVerificado();
  ejecutar(
    `update public.verificaciones set vence_at = now() - interval '40 days'
      where sesion_hash = '${v.sesion}'`,
  );
  // Un código vencido y sin usar del verificado: se va.
  const extra = sesionNueva();
  expect(
    (await pedirCodigo(extra, { p_telefono: v.telefono })).error,
  ).toBeNull();
  ejecutar(
    `update public.verificaciones set vence_at = now() - interval '8 days' where sesion_hash = '${extra}'`,
  );

  const salida = JSON.parse(
    consultar(`select public.purgar_vencidos()::text`)[0],
  ) as { compradores: number; verificaciones: number };
  expect(salida.compradores).toBeGreaterThanOrEqual(1);
  expect(salida.verificaciones).toBeGreaterThanOrEqual(1);

  const cuenta = (tel: string) =>
    consultar(
      `select count(*) from public.compradores where telefono = '${tel}'`,
    )[0];
  expect(cuenta(viejoTel)).toBe("0");
  expect(cuenta(nuevoTel)).toBe("1");
  expect(cuenta(v.telefono)).toBe("1");
  expect(
    consultar(
      `select count(*) from public.verificaciones where sesion_hash = '${viejoSesion}'`,
    ),
  ).toEqual(["0"]);
  expect(
    consultar(
      `select count(*) from public.verificaciones where sesion_hash = '${v.sesion}' and usado_at is not null`,
    ),
  ).toEqual(["1"]);
  expect(
    consultar(
      `select count(*) from public.verificaciones where sesion_hash = '${extra}'`,
    ),
  ).toEqual(["0"]);
});

// ── Identidad ─────────────────────────────────────────────────────────────────

test("reservar exige una sesión verificada", async () => {
  const sesion = sesionNueva();
  expect(reservar(sesion)).toEqual({ ok: false, motivo: "no_verificado" });
  await pedirCodigo(sesion); // con código, pero sin canjear
  expect(reservar(sesion)).toEqual({ ok: false, motivo: "no_verificado" });
});

test("identificarse: reservar, cerrar y el estado lo dice; borrar la identificación lo revierte", async () => {
  const c = await compradorVerificado();
  const estado = async () =>
    (await api().rpc("estado_verificacion", { p_sesion_hash: c.sesion }))
      .data as unknown as Record<string, unknown>;
  expect(await estado()).toEqual({ estado: "verificado", identificado: false });
  const r = reservar(c.sesion, ", p_tope_mes => 100000, p_tope_dia => 100000");
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  // Mientras la consulta sigue abierta no hay identificación.
  expect((await estado()).identificado).toBe(false);
  cerrarConsulta(r.consulta_id, "identificado");
  expect(await estado()).toEqual({ estado: "verificado", identificado: true });
  expect(
    consultar(
      `select proveedor from public.identificaciones where comprador_id = (select id from public.compradores where telefono = '${c.telefono}')`,
    ),
  ).toEqual(["simulador"]);
  // Ya identificado: no se vuelve a consultar (y no se paga otra vez).
  expect(
    reservar(c.sesion, ", p_tope_mes => 100000, p_tope_dia => 100000"),
  ).toEqual({ ok: false, motivo: "ya_identificado" });
  // Cerrar dos veces la misma consulta no se puede.
  expect(() => cerrarConsulta(r.consulta_id, "identificado")).toThrow();
  // El comprador la borra cuando quiera.
  const borrar = () =>
    api().rpc("borrar_identificacion", { p_sesion_hash: c.sesion });
  expect((await borrar()).data).toBe(true);
  expect(await estado()).toEqual({ estado: "verificado", identificado: false });
  expect((await borrar()).data).toBe(false);
  // Una sesión desconocida no borra nada ajeno.
  expect(
    (await api().rpc("borrar_identificacion", { p_sesion_hash: sesionNueva() }))
      .data,
  ).toBe(false);
});

test("registrar_identificacion rechaza resultados inventados y consultas que no existen", async () => {
  const c = await compradorVerificado();
  const r = reservar(c.sesion, ", p_tope_mes => 100000, p_tope_dia => 100000");
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(() => cerrarConsulta(r.consulta_id, "aprobado")).toThrow(
    /resultado_invalido/,
  );
  expect(() => cerrarConsulta(UUID_NULO, "identificado")).toThrow(
    /consulta_invalida/,
  );
  expect(
    consultar(
      `select count(*) from public.identificaciones where comprador_id = (select id from public.compradores where telefono = '${c.telefono}')`,
    ),
  ).toEqual(["0"]);
});

test("tope por comprador: tres fallos y la cuarta consulta ya no se hace; «no disponible» no cuenta", async () => {
  const amplio = ", p_tope_mes => 100000, p_tope_dia => 100000";
  const c = await compradorVerificado();
  for (let i = 0; i < 3; i++) {
    const r = reservar(c.sesion, amplio);
    expect(r.ok, `intento ${i + 1}`).toBe(true);
    if (r.ok) cerrarConsulta(r.consulta_id, "no_coincide");
  }
  expect(reservar(c.sesion, amplio)).toEqual({
    ok: false,
    motivo: "tope_comprador",
  });

  // Que el proveedor no responda no es culpa del comprador: no gasta sus intentos.
  const d = await compradorVerificado();
  for (let i = 0; i < 5; i++) {
    const r = reservar(d.sesion, amplio);
    expect(r.ok, `caída ${i + 1}`).toBe(true);
    if (r.ok) cerrarConsulta(r.consulta_id, "no_disponible");
  }
  expect(reservar(d.sesion, amplio).ok).toBe(true);
});

test("tope del día y del mes: sin cupo no se reserva ninguna consulta (el proveedor no se llama)", async () => {
  const cuenta = (desde: string) =>
    Number(
      consultar(
        `select count(*) from public.identidad_consultas
          where creado_at >= date_trunc('${desde}', now() at time zone 'America/Bogota') at time zone 'America/Bogota'`,
      )[0],
    );
  const filasDe = (tel: string) =>
    consultar(
      `select count(*) from public.identidad_consultas where comprador_id = (select id from public.compradores where telefono = '${tel}')`,
    )[0];

  const c = await compradorVerificado();
  // El día lleno: tope_dia (el contador de la plataforma, no el del comprador).
  expect(
    reservar(
      c.sesion,
      `, p_tope_mes => 100000, p_tope_dia => ${cuenta("day")}`,
    ),
  ).toEqual({ ok: false, motivo: "tope_dia" });
  // El mes lleno: tope_mes.
  expect(
    reservar(
      c.sesion,
      `, p_tope_mes => ${cuenta("month")}, p_tope_dia => 100000`,
    ),
  ).toEqual({ ok: false, motivo: "tope_mes" });
  // Ninguna de las dos dejó una reserva.
  expect(filasDe(c.telefono)).toBe("0");
  // Con cupo, sí.
  expect(
    reservar(c.sesion, ", p_tope_mes => 100000, p_tope_dia => 100000").ok,
  ).toBe(true);
  expect(filasDe(c.telefono)).toBe("1");
});

test("dos reservas a la vez no se llevan la misma plaza (el candado serializa)", async () => {
  const c = await compradorVerificado();
  const llamar = () =>
    consultarAsync(
      `select public.reservar_consulta_identidad('${c.sesion}', p_tope_mes => 100000, p_tope_dia => 100000, p_tope_comprador => 1)::text`,
    );
  const [a, b] = await Promise.all([llamar(), llamar()]);
  const resultados = [a[0], b[0]].map((l) => JSON.parse(l) as ReservaIdentidad);
  expect(resultados.filter((r) => r.ok)).toHaveLength(1);
  expect(
    consultar(
      `select count(*) from public.identidad_consultas where comprador_id = (select id from public.compradores where telefono = '${c.telefono}')`,
    ),
  ).toEqual(["1"]);
});

// ── Pedir una visita ──────────────────────────────────────────────────────────

test("pedir una visita guarda solo el hash del token y el correo del comprador; el dueño ve la tarjeta sin el correo ni el número", async () => {
  const a = await anuncioAbierto({ direccion: DIRECCION });
  const c = await compradorVerificado({ nombre: "Andrés Sintetico" });
  const { data: s, error } = await pedir(c.sesion, a.slug);
  expect(error).toBeNull();
  expect(s.estado).toBe("pendiente");
  expect(s.token).toHaveLength(43);
  // En la base: el hash, nunca el token.
  expect(
    consultar(
      `select count(*) from public.solicitudes_visita where token_hash = encode(sha256(convert_to('${s.token}', 'UTF8')), 'hex')`,
    ),
  ).toEqual(["1"]);
  expect(
    consultar(
      `select count(*) from public.solicitudes_visita t where t::text like '%${s.token}%'`,
    ),
  ).toEqual(["0"]);
  expect(
    consultar(
      `select email from public.compradores where telefono = '${c.telefono}'`,
    ),
  ).toEqual([CORREO_COMPRADOR]);

  const mi = await miAnuncio(a.token);
  expect(mi.solo_identificados).toBe(false);
  const [tarjeta] = mi.solicitudes;
  expect(tarjeta).toMatchObject({
    id: s.solicitud_id,
    estado: "pendiente",
    intencion: "vivir",
    presupuesto_min: 300_000_000,
    presupuesto_max: 450_000_000,
    forma_pago: ["ahorros", "hipotecario"],
    mensaje: "Me interesa verlo con mi familia",
    ninguno: false,
    horarios: [],
    visita: null,
    whatsapp: null,
  });
  expect(tarjeta.comprador).toEqual({
    nombre: "Andrés Sintetico",
    telefono_fin: c.telefono.slice(-4),
    identificado: false,
    asistio: 0,
    marcadas: 0,
  });
  const crudo = JSON.stringify(mi);
  expect(crudo).not.toContain(CORREO_COMPRADOR);
  expect(crudo).not.toContain(c.telefono);
  expect(crudo).not.toContain(DIRECCION);
});

test("pedir una visita: entradas inválidas no crean nada", async () => {
  const a = await anuncioAbierto();
  const c = await compradorVerificado();
  const casos: Array<[Record<string, unknown>, string]> = [
    [{ p_intencion: "comprar" }, "intencion_invalida"],
    [{ p_intencion: null }, "intencion_invalida"],
    [{ p_email: "no-es-un-correo" }, "email_invalido"],
    [{ p_email: "" }, "email_invalido"],
    [
      { p_presupuesto_min: 500, p_presupuesto_max: 100 },
      "presupuesto_invalido",
    ],
    [{ p_presupuesto_min: -1 }, "presupuesto_invalido"],
    [{ p_forma_pago: ["bitcoin"] }, "pago_invalido"],
    [{ p_mensaje: "x".repeat(301) }, "mensaje_invalido"],
  ];
  for (const [extra, msg] of casos) {
    const { error } = await pedir(c.sesion, a.slug, extra);
    expect(error?.code, msg).toBe("23514");
    expect(error?.message, msg).toContain(msg);
  }
  expect(
    consultar(
      `select count(*) from public.solicitudes_visita where inmueble_id = '${a.id}'`,
    ),
  ).toEqual(["0"]);
});

test("pedir una visita exige WhatsApp verificado, un anuncio vivo y el contacto abierto", async () => {
  const a = await anuncioAbierto();
  // Sin sesión verificada.
  const { error: sinSesion } = await pedir(sesionNueva(), a.slug);
  expect(sinSesion?.code).toBe("42501");
  expect(sinSesion?.message).toContain("no_verificado");
  // Con un código sin canjear tampoco.
  const pendiente = sesionNueva();
  await pedirCodigo(pendiente, { p_telefono: telefonoNuevo() });
  expect((await pedir(pendiente, a.slug)).error?.code).toBe("42501");

  const c = await compradorVerificado();
  // Un anuncio que no existe.
  const { error: noExiste } = await pedir(c.sesion, "no-existe-0000");
  expect(noExiste?.code).toBe("P0002");
  // Sin el contacto abierto por el dueño.
  const cerrado = await crearAnuncio();
  const { error: sinContacto } = await pedir(c.sesion, cerrado.slug);
  expect(sinContacto?.message).toContain("sin_contacto");
  // Vencido.
  const caducado = await anuncioAbierto();
  vencer(caducado);
  expect((await pedir(c.sesion, caducado.slug)).error?.code).toBe("P0002");
});

test("un solo pedido vivo por comprador y anuncio (también a la vez); tras rechazarlo no insiste", async () => {
  const a = await anuncioAbierto();
  const c = await compradorVerificado();
  const [p1, p2] = await Promise.all([
    pedir(c.sesion, a.slug),
    pedir(c.sesion, a.slug),
  ]);
  const errores = [p1.error, p2.error].filter(Boolean);
  expect(errores).toHaveLength(1);
  expect(errores[0]?.message).toContain("ya_solicitada");
  const s = (p1.error ? p2 : p1).data;
  // El dueño lo rechaza: el mismo comprador no vuelve a pedir ese anuncio durante 14 días.
  expect(
    (
      await api().rpc("rechazar_solicitud", {
        p_token: a.token,
        p_solicitud_id: s.solicitud_id,
      })
    ).error,
  ).toBeNull();
  const { error } = await pedir(c.sesion, a.slug);
  expect(error?.message).toContain("rechazada_reciente");
  // Otro comprador sí puede.
  expect(
    (await pedir((await compradorVerificado()).sesion, a.slug)).error,
  ).toBeNull();
});

test("un comprador no tiene más de 5 solicitudes vivas", async () => {
  const c = await compradorVerificado();
  for (let i = 0; i < 5; i++) {
    const a = await anuncioAbierto();
    expect(
      (await pedir(c.sesion, a.slug)).error,
      `solicitud ${i + 1}`,
    ).toBeNull();
  }
  const sexto = await anuncioAbierto();
  const { error } = await pedir(c.sesion, sexto.slug);
  expect(error?.message).toContain("demasiadas_solicitudes");
});

// ── «Solo compradores identificados» ──────────────────────────────────────────

test("solo identificados: la solicitud de un comprador sin identificar queda en espera y el dueño puede aceptarla igual", async () => {
  const a = await anuncioAbierto();
  const sb = api();
  expect(
    (
      (await sb.rpc("obtener_ficha", { p_slug: a.slug }))
        .data as unknown as FichaData
    ).solo_identificados,
  ).toBe(false);
  expect(
    (
      await sb.rpc("guardar_solo_identificados", {
        p_token: a.token,
        p_activo: true,
      })
    ).error,
  ).toBeNull();
  expect(
    (
      (await sb.rpc("obtener_ficha", { p_slug: a.slug }))
        .data as unknown as FichaData
    ).solo_identificados,
  ).toBe(true);
  expect((await miAnuncio(a.token)).solo_identificados).toBe(true);

  // Sin identificar: en espera, y todavía no se le puede proponer nada.
  const sin = await compradorVerificado();
  const { data: s } = await pedir(sin.sesion, a.slug);
  expect(s.estado).toBe("en_espera");
  expect((await tarjetas(a.token))[0].estado).toBe("en_espera");
  const prematuro = await proponer(a.token, s.solicitud_id, [enDias(2)]);
  expect(prematuro.error?.message).toContain("estado_invalido");
  // «Aceptar igual».
  expect(
    (
      await sb.rpc("aceptar_en_espera", {
        p_token: a.token,
        p_solicitud_id: s.solicitud_id,
      })
    ).error,
  ).toBeNull();
  expect((await tarjetas(a.token))[0].estado).toBe("pendiente");
  expect(
    (await proponer(a.token, s.solicitud_id, [enDias(2)])).error,
  ).toBeNull();
  // Aceptar algo que no está en espera no se puede.
  expect(
    (
      await sb.rpc("aceptar_en_espera", {
        p_token: a.token,
        p_solicitud_id: s.solicitud_id,
      })
    ).error?.message,
  ).toContain("estado_invalido");

  // Identificado: entra directo, y el dueño lo ve en la tarjeta.
  const si = await compradorVerificado();
  await identificado(si);
  const { data: s2 } = await pedir(si.sesion, a.slug);
  expect(s2.estado).toBe("pendiente");
  const tarjeta = (await tarjetas(a.token)).find(
    (t) => t.id === s2.solicitud_id,
  )!;
  expect(tarjeta.comprador.identificado).toBe(true);

  // Con el ajuste apagado, también el no identificado entra directo.
  await sb.rpc("guardar_solo_identificados", {
    p_token: a.token,
    p_activo: false,
  });
  const otro = await compradorVerificado();
  expect((await pedir(otro.sesion, a.slug)).data.estado).toBe("pendiente");
});

// ── Proponer, elegir, cancelar ────────────────────────────────────────────────

test("flujo completo: pedir, proponer dos horarios, confirmar uno y marcar la asistencia", async () => {
  const a = await anuncioAbierto({ direccion: DIRECCION });
  const c = await compradorVerificado({ nombre: "Andrés Sintetico" });
  const { data: s } = await pedir(c.sesion, a.slug);
  const sb = api();

  expect(
    (await proponer(a.token, s.solicitud_id, [enDias(2), enDias(3)])).error,
  ).toBeNull();
  let tarjeta = (await tarjetas(a.token))[0];
  expect(tarjeta.estado).toBe("propuesta");
  expect(tarjeta.horarios).toHaveLength(2);

  // El comprador abre SU solicitud: ve los horarios, nunca la dirección ni un correo.
  const v = (await suVisita(s.token))!;
  expect(v.estado).toBe("propuesta");
  expect(v.horarios).toHaveLength(2);
  expect(Object.keys(v.inmueble).sort()).toEqual(
    ["barrio", "nombre_publicador", "operacion", "slug", "tipo"].sort(),
  );
  const crudo = JSON.stringify(v);
  expect(crudo).not.toContain(DIRECCION);
  expect(crudo).not.toContain(CORREO_COMPRADOR);

  // Elige el segundo.
  const elegido = v.horarios[1];
  expect(
    (
      await sb.rpc("elegir_horario", {
        p_token: s.token,
        p_horario_id: elegido.id,
      })
    ).error,
  ).toBeNull();
  const despues = (await suVisita(s.token))!;
  expect(despues.estado).toBe("confirmada");
  expect(new Date(despues.visita!.inicio).getTime()).toBe(
    new Date(elegido.inicio).getTime(),
  );
  expect(despues.horarios).toEqual([]);

  // El dueño ve la visita y, solo ahora, el WhatsApp completo del comprador para pasarle la dirección.
  tarjeta = (await tarjetas(a.token))[0];
  expect(tarjeta.estado).toBe("confirmada");
  expect(tarjeta.whatsapp).toBe(c.telefono);
  expect(tarjeta.visita).toMatchObject({ cancelada_por: null, asistio: null });
  expect(JSON.stringify(await miAnuncio(a.token))).not.toContain(
    CORREO_COMPRADOR,
  );

  // Antes de la hora no se marca la asistencia.
  const antes = await sb.rpc("marcar_asistencia", {
    p_token: a.token,
    p_solicitud_id: s.solicitud_id,
    p_asistio: true,
  });
  expect(antes.error?.message).toContain("visita_futura");
  ocurrio(s.solicitud_id);
  expect(
    (
      await sb.rpc("marcar_asistencia", {
        p_token: a.token,
        p_solicitud_id: s.solicitud_id,
        p_asistio: true,
      })
    ).error,
  ).toBeNull();
  tarjeta = (await tarjetas(a.token))[0];
  expect(tarjeta.visita?.asistio).toBe(true);
  expect(tarjeta.comprador).toMatchObject({ asistio: 1, marcadas: 1 });
});

test("la tarjeta cuenta las visitas a las que el comprador asistió, de todos los dueños", async () => {
  const c = await compradorVerificado();
  const a1 = await anuncioAbierto();
  const a2 = await anuncioAbierto();
  const a3 = await anuncioAbierto();
  const s1 = await visitaConfirmada(a1, c);
  const s2 = await visitaConfirmada(a2, c);
  for (const s of [s1, s2]) ocurrio(s.solicitud_id);
  const marcar = (a: AnuncioCreado, s: ResultadoSolicitud, asistio: boolean) =>
    api().rpc("marcar_asistencia", {
      p_token: a.token,
      p_solicitud_id: s.solicitud_id,
      p_asistio: asistio,
    });
  expect((await marcar(a1, s1, true)).error).toBeNull();
  expect((await marcar(a2, s2, false)).error).toBeNull();
  // Un tercer dueño ve «asistió a 1 de 2».
  const { data: s3 } = await pedir(c.sesion, a3.slug);
  const tarjeta = (await tarjetas(a3.token)).find(
    (t) => t.id === s3.solicitud_id,
  )!;
  expect(tarjeta.comprador).toMatchObject({ asistio: 1, marcadas: 2 });
  // Se puede corregir una marca.
  expect((await marcar(a2, s2, true)).error).toBeNull();
  expect(
    (await tarjetas(a3.token)).find((t) => t.id === s3.solicitud_id)!.comprador,
  ).toMatchObject({ asistio: 2, marcadas: 2 });
});

test("«ninguno me sirve»: vuelve a pendiente, el dueño lo ve y propone otros", async () => {
  const a = await anuncioAbierto();
  const c = await compradorVerificado();
  const { data: s } = await pedir(c.sesion, a.slug);
  await proponer(a.token, s.solicitud_id, [enDias(2), enDias(3)]);
  expect(
    (
      await api().rpc("elegir_horario", {
        p_token: s.token,
        p_horario_id: null,
      })
    ).error,
  ).toBeNull();
  const v = (await suVisita(s.token))!;
  expect(v.estado).toBe("pendiente");
  expect(v.horarios).toEqual([]);
  let tarjeta = (await tarjetas(a.token))[0];
  expect(tarjeta).toMatchObject({
    estado: "pendiente",
    ninguno: true,
    horarios: [],
  });
  // Elegir ahora no se puede: no hay nada propuesto.
  expect(
    (
      await api().rpc("elegir_horario", {
        p_token: s.token,
        p_horario_id: null,
      })
    ).error?.message,
  ).toContain("estado_invalido");
  // El dueño propone otros y la marca se limpia.
  expect(
    (await proponer(a.token, s.solicitud_id, [enDias(5)])).error,
  ).toBeNull();
  tarjeta = (await tarjetas(a.token))[0];
  expect(tarjeta).toMatchObject({ estado: "propuesta", ninguno: false });
  expect(tarjeta.horarios).toHaveLength(1);
});

test("proponer horarios: de 1 a 3, distintos, a más de una hora y a menos de 60 días", async () => {
  const a = await anuncioAbierto();
  const c = await compradorVerificado();
  const { data: s } = await pedir(c.sesion, a.slug);
  const malos: Array<[string, string[] | null]> = [
    ["ninguno", []],
    ["cuatro", [enDias(2), enDias(3), enDias(4), enDias(5)]],
    ["repetidos", [enDias(2), enDias(2)]],
    ["en el pasado", [enDias(-1)]],
    ["en media hora", [new Date(Date.now() + 30 * 60_000).toISOString()]],
    ["a 61 días", [enDias(61)]],
    ["nulo", null],
  ];
  for (const [que, horarios] of malos) {
    const { error } = await api().rpc("proponer_horarios", {
      p_token: a.token,
      p_solicitud_id: s.solicitud_id,
      p_horarios: horarios,
    });
    expect(error?.code, que).toBe("23514");
    expect(error?.message, que).toContain("horarios_invalidos");
  }
  expect((await tarjetas(a.token))[0].estado).toBe("pendiente");
  // Tres es el máximo y proponer de nuevo reemplaza.
  expect(
    (await proponer(a.token, s.solicitud_id, [enDias(2), enDias(3), enDias(4)]))
      .error,
  ).toBeNull();
  expect((await tarjetas(a.token))[0].horarios).toHaveLength(3);
  expect(
    (await proponer(a.token, s.solicitud_id, [enDias(6)])).error,
  ).toBeNull();
  expect((await tarjetas(a.token))[0].horarios).toHaveLength(1);
});

test("elegir horario: uno ajeno o vencido no sirve", async () => {
  const a = await anuncioAbierto();
  const c = await compradorVerificado();
  const { data: s } = await pedir(c.sesion, a.slug);
  const otro = await anuncioAbierto();
  const { data: s2 } = await pedir(
    (await compradorVerificado()).sesion,
    otro.slug,
  );
  await proponer(a.token, s.solicitud_id, [enDias(2)]);
  await proponer(otro.token, s2.solicitud_id, [enDias(2)]);
  const ajeno = (await suVisita(s2.token))!.horarios[0].id;
  const elegir = (token: string, id: string) =>
    api().rpc("elegir_horario", { p_token: token, p_horario_id: id });
  expect((await elegir(s.token, ajeno)).error?.message).toContain(
    "horario_invalido",
  );
  expect((await elegir(s.token, UUID_NULO)).error?.message).toContain(
    "horario_invalido",
  );
  // Vencido: el horario ya pasó cuando el comprador responde.
  const propio = (await suVisita(s.token))!.horarios[0].id;
  ejecutar(
    `update public.horarios_propuestos set inicio = now() - interval '1 hour' where id = '${propio}'`,
  );
  expect((await suVisita(s.token))!.horarios).toEqual([]);
  expect((await elegir(s.token, propio)).error?.message).toContain(
    "horario_vencido",
  );
});

test("cancelar: el comprador una propuesta, o una visita confirmada; el dueño una confirmada", async () => {
  const sb = api();
  // El comprador cancela antes de confirmar; el dueño lo ve y el mismo comprador puede volver a pedir.
  const a = await anuncioAbierto();
  const c = await compradorVerificado();
  const { data: s } = await pedir(c.sesion, a.slug);
  await proponer(a.token, s.solicitud_id, [enDias(2)]);
  expect(
    (await sb.rpc("cancelar_visita_comprador", { p_token: s.token })).error,
  ).toBeNull();
  expect((await suVisita(s.token))!.estado).toBe("cancelada");
  expect((await tarjetas(a.token))[0].estado).toBe("cancelada");
  expect(
    (await sb.rpc("cancelar_visita_comprador", { p_token: s.token })).error
      ?.message,
  ).toContain("estado_invalido");
  expect((await pedir(c.sesion, a.slug)).error).toBeNull();

  // El comprador cancela una visita confirmada: el dueño deja de ver su WhatsApp y ya no se marca.
  const b = await anuncioAbierto();
  const sb1 = await visitaConfirmada(b, c);
  expect(
    (await sb.rpc("cancelar_visita_comprador", { p_token: sb1.token })).error,
  ).toBeNull();
  const v = (await suVisita(sb1.token))!;
  expect(v.estado).toBe("cancelada");
  expect(v.visita?.cancelada_por).toBe("comprador");
  const tarjeta = (await tarjetas(b.token)).find(
    (t) => t.id === sb1.solicitud_id,
  )!;
  expect(tarjeta).toMatchObject({ estado: "cancelada", whatsapp: null });
  expect(tarjeta.visita?.cancelada_por).toBe("comprador");
  ocurrio(sb1.solicitud_id);
  expect(
    (
      await sb.rpc("marcar_asistencia", {
        p_token: b.token,
        p_solicitud_id: sb1.solicitud_id,
        p_asistio: true,
      })
    ).error?.message,
  ).toContain("visita_invalida");

  // El dueño cancela una confirmada.
  const d = await anuncioAbierto();
  const sd = await visitaConfirmada(d, c);
  expect(
    (
      await sb.rpc("cancelar_visita_dueno", {
        p_token: d.token,
        p_solicitud_id: sd.solicitud_id,
      })
    ).error,
  ).toBeNull();
  expect((await suVisita(sd.token))!.visita?.cancelada_por).toBe("dueno");
  expect(
    (
      await sb.rpc("cancelar_visita_dueno", {
        p_token: d.token,
        p_solicitud_id: sd.solicitud_id,
      })
    ).error?.message,
  ).toContain("estado_invalido");
});

test("una visita que ya pasó no se cancela; rechazar solo vale antes de confirmar", async () => {
  const sb = api();
  const a = await anuncioAbierto();
  const c = await compradorVerificado();
  const s = await visitaConfirmada(a, c);
  expect(
    (
      await sb.rpc("rechazar_solicitud", {
        p_token: a.token,
        p_solicitud_id: s.solicitud_id,
      })
    ).error?.message,
  ).toContain("estado_invalido");
  ocurrio(s.solicitud_id);
  expect(
    (await sb.rpc("cancelar_visita_comprador", { p_token: s.token })).error
      ?.message,
  ).toContain("estado_invalido");
  expect(
    (
      await sb.rpc("cancelar_visita_dueno", {
        p_token: a.token,
        p_solicitud_id: s.solicitud_id,
      })
    ).error?.message,
  ).toContain("estado_invalido");
});

// ── Aislamiento ───────────────────────────────────────────────────────────────

test("cada dueño ve y toca solo lo suyo; un token falso no abre nada", async () => {
  const sb = api();
  const a = await anuncioAbierto();
  const b = await anuncioAbierto();
  const c = await compradorVerificado();
  const { data: s } = await pedir(c.sesion, a.slug);
  // El otro dueño no ve la solicitud ni puede actuar sobre ella.
  expect(await tarjetas(b.token)).toEqual([]);
  const ajeno = [
    proponer(b.token, s.solicitud_id, [enDias(2)]),
    sb.rpc("rechazar_solicitud", {
      p_token: b.token,
      p_solicitud_id: s.solicitud_id,
    }),
    sb.rpc("aceptar_en_espera", {
      p_token: b.token,
      p_solicitud_id: s.solicitud_id,
    }),
    sb.rpc("cancelar_visita_dueno", {
      p_token: b.token,
      p_solicitud_id: s.solicitud_id,
    }),
    sb.rpc("marcar_asistencia", {
      p_token: b.token,
      p_solicitud_id: s.solicitud_id,
      p_asistio: true,
    }),
  ];
  for (const r of await Promise.all(ajeno)) expect(r.error).not.toBeNull();
  expect((await tarjetas(a.token))[0].estado).toBe("pendiente");

  // Token falso (43 caracteres que no existen) y token con otra longitud.
  for (const token of [TOKEN_FALSO, "corto"]) {
    const llamadas = [
      proponer(token, s.solicitud_id, [enDias(2)]),
      sb.rpc("rechazar_solicitud", {
        p_token: token,
        p_solicitud_id: s.solicitud_id,
      }),
      sb.rpc("aceptar_en_espera", {
        p_token: token,
        p_solicitud_id: s.solicitud_id,
      }),
      sb.rpc("cancelar_visita_dueno", {
        p_token: token,
        p_solicitud_id: s.solicitud_id,
      }),
      sb.rpc("marcar_asistencia", {
        p_token: token,
        p_solicitud_id: s.solicitud_id,
        p_asistio: true,
      }),
      sb.rpc("guardar_solo_identificados", { p_token: token, p_activo: true }),
      sb.rpc("elegir_horario", { p_token: token, p_horario_id: null }),
      sb.rpc("cancelar_visita_comprador", { p_token: token }),
    ];
    for (const r of await Promise.all(llamadas)) {
      expect(r.error?.message, token).toContain("token_invalido");
    }
    expect(await suVisita(token)).toBeNull();
  }
  // El token del comprador de una solicitud no abre las de otro.
  const otro = await compradorVerificado();
  const { data: s2 } = await pedir(otro.sesion, a.slug);
  expect(s2.token).not.toBe(s.token);
  expect((await suVisita(s.token))!.estado).toBe("pendiente");
});

// ── El servidor: correos y recordatorios ──────────────────────────────────────

test("datos_correo_visita trae los dos correos y el resumen, jamás la dirección", async () => {
  const a = await anuncioAbierto({
    email: "dueno.sintetico@ejemplo.test",
    direccion: DIRECCION,
  });
  const c = await compradorVerificado({
    nombre: "Andrés Sintetico",
    idioma: "en",
  });
  const s = await visitaConfirmada(a, c);
  const datos = JSON.parse(
    consultar(
      `select public.datos_correo_visita('${s.solicitud_id}')::text`,
    )[0],
  ) as Record<string, unknown>;
  expect(datos.comprador).toEqual({
    nombre: "Andrés Sintetico",
    email: CORREO_COMPRADOR,
    idioma: "en",
  });
  expect(datos.dueno).toMatchObject({
    email: "dueno.sintetico@ejemplo.test",
    idioma: "es",
  });
  expect(Object.keys(datos.inmueble as object).sort()).toEqual(
    ["barrio", "operacion", "slug", "tipo"].sort(),
  );
  expect(datos.estado).toBe("confirmada");
  expect(JSON.stringify(datos)).not.toContain(DIRECCION);
  expect(JSON.stringify(datos)).not.toContain(c.telefono);
  expect(
    consultar(`select public.datos_correo_visita('${UUID_NULO}')::text`),
  ).toEqual([]);
});

test("el recordatorio: una vez por visita, solo para las de mañana, ninguno a una cancelada o ya pasada", async () => {
  const c = await compradorVerificado();
  const sb = api();
  // Mañana a las 10:00 de Bogotá.
  const manana = `((now() at time zone 'America/Bogota')::date + 1 + time '10:00') at time zone 'America/Bogota'`;
  const mover = (solicitud: string, instante: string) =>
    ejecutar(
      `update public.visitas set inicio = ${instante} where solicitud_id = '${solicitud}'`,
    );
  const nueva = async () => visitaConfirmada(await anuncioAbierto(), c, 20);

  const deManana = await nueva();
  mover(deManana.solicitud_id, manana);
  const lejana = await nueva(); // dentro de 20 días: no toca todavía
  const cancelada = await nueva();
  mover(cancelada.solicitud_id, manana);
  expect(
    (await sb.rpc("cancelar_visita_comprador", { p_token: cancelada.token }))
      .error,
  ).toBeNull();
  const pasada = await nueva();
  mover(pasada.solicitud_id, "now() - interval '1 hour'");
  const hoyTarde = await nueva(); // hoy, más tarde: la confirmaron después del cron de ayer
  mover(hoyTarde.solicitud_id, "now() + interval '30 minutes'");

  const reclamar = async () =>
    JSON.parse(
      (await consultarAsync(`select public.reclamar_recordatorios()::text`))[0],
    ) as string[];
  // Dos corridas a la vez: ninguna visita sale dos veces. (El cron de otra spec puede correr en paralelo y
  // llevarse alguna: por eso se cuenta «a lo sumo una» aquí y se comprueba en la base que quedó reclamada.)
  const [x, y] = await Promise.all([reclamar(), reclamar()]);
  const salieron = [...x, ...y];
  const veces = (id: string) => salieron.filter((i) => i === id).length;
  for (const s of [deManana, hoyTarde]) {
    expect(veces(s.solicitud_id)).toBeLessThanOrEqual(1);
  }
  for (const s of [lejana, cancelada, pasada])
    expect(veces(s.solicitud_id)).toBe(0);
  // Una tercera corrida no repite nada.
  const otra = await reclamar();
  for (const s of [deManana, hoyTarde, lejana, cancelada, pasada]) {
    expect(otra).not.toContain(s.solicitud_id);
  }
  const marcada = (s: ResultadoSolicitud) =>
    consultar(
      `select (recordatorio_at is not null)::text from public.visitas where solicitud_id = '${s.solicitud_id}'`,
    )[0];
  expect(marcada(deManana)).toBe("true");
  expect(marcada(hoyTarde)).toBe("true");
  expect(marcada(cancelada)).toBe("false");
  expect(marcada(lejana)).toBe("false");
  expect(marcada(pasada)).toBe("false");
});

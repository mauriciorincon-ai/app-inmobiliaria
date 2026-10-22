import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { consultar, ejecutar } from "./utils/bd";
import { compradorVerificado, sesionNueva } from "./utils/comprador";
import { fechaBogota } from "./utils/fechas";
import type {
  ResultadoSolicitud,
  SolicitudSala,
  VisitaDelComprador,
} from "../../src/lib/supabase/types";

// S13 «Nuevo o usado» — la visita a la sala de ventas en la base (migración 16): el contacto de la sala lo ve SOLO el
// operador; pedir la visita exige el WhatsApp verificado; el «dueño» de la solicitud es el operador; los horarios, la
// confirmación y el recordatorio reutilizan los del S8; el aviso «sin respuesta» se reclama una sola vez; y la tabla de
// solicitudes sigue siendo «de un anuncio o de una sala», nunca las dos ni ninguna. Datos 100 % sintéticos: la edición 9301,
// sus proyectos, las salas y los compradores son ficticios y la prueba los borra al terminar.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const api = () => createClient(url, anon);

const NUMERO = 9301;
const CORREO = "comprador.sintetico@ejemplo.test";
const TELEFONO_SALA = "573001112233";
const DIRECCION_SALA = "Avenida Ficticia 99 # 12-34 local 5";
const UUID_NULO = "00000000-0000-0000-0000-000000000000";

const slug = (n: number) => `sala-prueba-${n}`;

function proyecto(n: number) {
  return {
    slug: slug(n),
    clave: `constructora ficticia|sala prueba ${n}`,
    nombre: `Sala Prueba ${n}`,
    constructora: "Constructora Ficticia",
    tipo: "apartamento",
    ciudad: "Bogotá",
    sector: "Suba",
    region: "bogota",
    segmento: "VIS",
    precio_desde: 250_000_000,
    area_construida_desde: 56,
    area_construida_hasta: null,
    area_privada_desde: 50,
    area_privada_hasta: null,
    etapa: "en_construccion",
    entrega: "2028-12",
    entrega_precision: "mes",
    parqueadero: "incluido",
    parqueadero_precio: null,
    precio_fijo: "si",
    subsidio_anunciado: "no_lo_dice",
    rotulos: [],
    apariciones: [3, 4],
    ilegibles: [],
    en_conflicto: [],
  };
}

const MUESTRA = [1, 2, 3, 4, 5].map((n) => proyecto(n).clave);

function edicion(extra: Record<string, unknown> = {}) {
  return {
    numero: NUMERO,
    nombre: "Edición Ficticia",
    desde: fechaBogota(5),
    hasta: fechaBogota(-25),
    paginas: 10,
    muestra_claves: MUESTRA,
    muestra_semilla: NUMERO,
    proyectos: [1, 2, 3, 4, 5, 6].map(proyecto),
    ...extra,
  };
}

function cargarYPublicar(e: Record<string, unknown> = {}) {
  ejecutar(
    `select public.cargar_edicion($j$${JSON.stringify(edicion(e))}$j$::jsonb)`,
  );
  ejecutar(
    `select public.publicar_edicion(${NUMERO}, array[${MUESTRA.map((m) => `'${m}'`).join(", ")}]::text[])`,
  );
}

// Como el operador: el rol `authenticated` (la sesión de `signInWithPassword`), dentro de una transacción.
function comoOperador(sql: string): string[] {
  return ejecutar(`begin; set local role authenticated; ${sql}; commit;`);
}
function jsonDe(lineas: string[]): unknown {
  const l = lineas.find((x) => x.startsWith("[") || x.startsWith("{"));
  return l ? JSON.parse(l) : null;
}
function cola(): SolicitudSala[] {
  return jsonDe(comoOperador("select public.salas_panel()")) as SolicitudSala[];
}
const enCola = (id: string) => cola().find((s) => s.id === id)!;

const horario = (horas: number) =>
  new Date(Date.now() + horas * 3_600_000).toISOString();

async function pedir(sesion: string, proyectoSlug: string, extra = {}) {
  const { data, error } = await api().rpc("solicitar_visita_sala", {
    p_sesion_hash: sesion,
    p_slug: proyectoSlug,
    p_franja: "sabado",
    p_email: CORREO,
    ...extra,
  });
  return { data: data as unknown as ResultadoSolicitud | null, error };
}

function limpiar() {
  consultar(
    `delete from public.solicitudes_visita where proyecto_edicion = ${NUMERO}`,
  );
  consultar(`delete from public.salas_ventas where slug like 'sala-prueba-%'`);
  consultar(`delete from public.ediciones where numero = ${NUMERO}`);
}

test.describe.configure({ mode: "serial" });
test.beforeEach(() => {
  test.skip(test.info().project.name !== "desktop-chromium", "una sola vez");
});
test.beforeAll(() => {
  limpiar();
  cargarYPublicar();
});
test.afterAll(limpiar);

test("el anónimo no lee ni escribe ningún contacto de sala, ni la cola, ni la tabla", async () => {
  comoOperador(
    `select public.guardar_sala('${slug(1)}', '+57 300 111 2233', '${DIRECCION_SALA}')`,
  );
  expect(
    consultar(
      `select telefono from public.salas_ventas where slug = '${slug(1)}'`,
    ),
  ).toEqual([TELEFONO_SALA]);

  const supabase = api();
  const tabla = await supabase.from("salas_ventas").select("*");
  expect(tabla.data ?? []).toEqual([]);
  expect(tabla.error).not.toBeNull();
  for (const [fn, args] of [
    ["salas_panel", {}],
    [
      "guardar_sala",
      { p_slug: slug(1), p_telefono: "3001234567", p_direccion: null },
    ],
    [
      "proponer_horarios_sala",
      { p_solicitud_id: UUID_NULO, p_horarios: [horario(48)] },
    ],
    ["rechazar_solicitud_sala", { p_solicitud_id: UUID_NULO }],
    ["cancelar_visita_sala", { p_solicitud_id: UUID_NULO }],
    ["reclamar_sin_respuesta_salas", { p_antes_de: new Date().toISOString() }],
  ] as const) {
    const r = await supabase.rpc(fn, args as never);
    expect(r.data, fn).toBeNull();
    expect(r.error?.code, fn).toBe("42501");
  }

  // Y la lectura pública de la edición no lleva ni el teléfono ni la dirección.
  const pub = await supabase.rpc("nuevos_publicados", {
    p_hoy: fechaBogota(0),
  });
  const crudo = JSON.stringify(pub.data);
  expect(crudo).not.toContain(TELEFONO_SALA);
  expect(crudo).not.toContain("Avenida Ficticia");
});

test("guardar_sala normaliza el teléfono, exige un proyecto real y borra con los dos campos vacíos", async () => {
  const falla = (sql: string) =>
    expect(() => comoOperador(sql)).toThrow(/proyecto_invalido|sala_invalida/);
  falla(
    `select public.guardar_sala('no-existe-ese-proyecto', '3001234567', null)`,
  );
  falla(`select public.guardar_sala('${slug(2)}', '12', 'Calle Corta 1')`);
  falla(`select public.guardar_sala('${slug(2)}', '3001234567', 'x')`);

  comoOperador(
    `select public.guardar_sala('${slug(2)}', '(300) 123-4567', null)`,
  );
  expect(
    consultar(
      `select telefono || '|' || coalesce(direccion, '-') from public.salas_ventas where slug = '${slug(2)}'`,
    ),
  ).toEqual(["3001234567|-"]);
  comoOperador(`select public.guardar_sala('${slug(2)}', null, null)`);
  expect(
    consultar(
      `select count(*) from public.salas_ventas where slug = '${slug(2)}'`,
    ),
  ).toEqual(["0"]);
});

test("pedir la visita exige el WhatsApp verificado, la franja, un correo y un proyecto de la edición vigente", async () => {
  const c = await compradorVerificado();

  const sinVerificar = await pedir(sesionNueva(), slug(1));
  expect(sinVerificar.error?.code).toBe("42501");
  expect(sinVerificar.error?.message).toContain("no_verificado");

  expect(
    (await pedir(c.sesion, slug(1), { p_franja: "lunes" })).error?.message,
  ).toContain("franja_invalida");
  expect(
    (await pedir(c.sesion, slug(1), { p_email: "no-es-un-correo" })).error
      ?.message,
  ).toContain("email_invalido");
  expect((await pedir(c.sesion, "proyecto-que-no-existe")).error?.code).toBe(
    "P0002",
  );

  const ok = await pedir(c.sesion, slug(1));
  expect(ok.error).toBeNull();
  expect(ok.data!.estado).toBe("pendiente");
  expect(ok.data!.token).toHaveLength(43);
  const fila = consultar(
    `select inmueble_id is null, intencion is null, proyecto_edicion, proyecto_slug, franja from public.solicitudes_visita where id = '${ok.data!.solicitud_id}'`,
  );
  expect(fila).toEqual([`t|t|${NUMERO}|${slug(1)}|sabado`]);

  // Una sola viva por proyecto.
  expect((await pedir(c.sesion, slug(1))).error?.message).toContain(
    "ya_solicitada",
  );
});

test("el tope de 5 solicitudes vivas por comprador cuenta también las de las salas", async () => {
  const c = await compradorVerificado();
  for (const n of [1, 2, 3, 4, 5]) {
    expect((await pedir(c.sesion, slug(n))).error, `sala ${n}`).toBeNull();
  }
  expect((await pedir(c.sesion, slug(6))).error?.message).toContain(
    "demasiadas_solicitudes",
  );
});

test("una edición sin publicar, vencida o que aún no empieza no recibe solicitudes", async () => {
  const c = await compradorVerificado();
  const cambiar = (sql: string) =>
    consultar(`update public.ediciones set ${sql} where numero = ${NUMERO}`);
  try {
    cambiar("publicada = false, revisada_at = null");
    expect((await pedir(c.sesion, slug(6))).error?.code).toBe("P0002");
    cambiar("publicada = true, revisada_at = now()");
    cambiar(
      `vigente_desde = '${fechaBogota(40)}', vigente_hasta = '${fechaBogota(10)}'`,
    );
    expect((await pedir(c.sesion, slug(6))).error?.code, "vencida").toBe(
      "P0002",
    );
    cambiar(
      `vigente_desde = '${fechaBogota(-10)}', vigente_hasta = '${fechaBogota(-40)}'`,
    );
    expect((await pedir(c.sesion, slug(6))).error?.code, "aún no empieza").toBe(
      "P0002",
    );
  } finally {
    cambiar(
      `publicada = true, revisada_at = now(), vigente_desde = '${fechaBogota(5)}', vigente_hasta = '${fechaBogota(-25)}'`,
    );
  }
  expect((await pedir(c.sesion, slug(6))).error).toBeNull();
});

test("la cola, los horarios, la confirmación y el recordatorio: de la solicitud a la visita confirmada", async () => {
  const c = await compradorVerificado({ nombre: "Marta Sintetica" });
  const s = (await pedir(c.sesion, slug(3))).data!;

  // El comprador ve SU solicitud: el proyecto y la franja, nunca el teléfono ni la dirección de la sala.
  const suya = async () =>
    (await api().rpc("obtener_visita", { p_token: s.token }))
      .data as unknown as VisitaDelComprador;
  const v0 = await suya();
  expect(v0.inmueble).toBeNull();
  expect(Object.keys(v0.proyecto!).sort()).toEqual([
    "edicion",
    "franja",
    "nombre",
    "slug",
  ]);
  expect(v0.proyecto).toMatchObject({
    slug: slug(3),
    franja: "sabado",
    edicion: NUMERO,
  });

  // La cola del operador: el proyecto con sus páginas y el contacto que él guardó; el teléfono completo, aún no.
  comoOperador(
    `select public.guardar_sala('${slug(3)}', '${TELEFONO_SALA}', '${DIRECCION_SALA}')`,
  );
  const f0 = enCola(s.solicitud_id);
  expect(f0.estado).toBe("pendiente");
  expect(f0.proyecto).toMatchObject({
    slug: slug(3),
    edicion: NUMERO,
    paginas: [3, 4],
  });
  expect(f0.comprador.nombre).toBe("Marta Sintetica");
  expect(f0.comprador.telefono_fin).toBe(c.telefono.slice(-4));
  expect(f0.whatsapp).toBeNull();
  expect(f0.sala).toEqual({
    telefono: TELEFONO_SALA,
    direccion: DIRECCION_SALA,
  });
  expect(JSON.stringify(f0)).not.toContain(c.telefono);
  expect(JSON.stringify(await suya())).not.toContain(TELEFONO_SALA);
  expect(JSON.stringify(await suya())).not.toContain("Avenida Ficticia");

  // Proponer: hasta 3, futuros (a más de una hora y a no más de 60 días), distintos.
  const malos: string[][] = [
    [],
    [horario(0.5)],
    [horario(24 * 61)],
    [horario(48), horario(48)],
    [1, 2, 3, 4].map((h) => horario(24 + h)),
  ];
  for (const h of malos) {
    expect(() =>
      comoOperador(
        `select public.proponer_horarios_sala('${s.solicitud_id}', array[${h.map((x) => `'${x}'::timestamptz`).join(",")}]::timestamptz[])`,
      ),
    ).toThrow(/horarios_invalidos/);
  }
  const propuestos = [horario(2), horario(26)];
  comoOperador(
    `select public.proponer_horarios_sala('${s.solicitud_id}', array['${propuestos[0]}'::timestamptz, '${propuestos[1]}'::timestamptz])`,
  );
  const v1 = await suya();
  expect(v1.estado).toBe("propuesta");
  expect(v1.horarios).toHaveLength(2);

  // El comprador elige el primero: confirmada, y ahora el operador ve el número completo.
  const elegido = v1.horarios[0].id;
  const elegir = await api().rpc("elegir_horario", {
    p_token: s.token,
    p_horario_id: elegido,
  });
  expect(elegir.error).toBeNull();
  const f1 = enCola(s.solicitud_id);
  expect(f1.estado).toBe("confirmada");
  expect(f1.whatsapp).toBe(c.telefono);

  // El recordatorio del S8 la incluye, y el correo no lleva el contacto de la sala ni correo para el «dueño».
  const recordatorios = jsonDe(
    ejecutar("select public.reclamar_recordatorios()"),
  ) as string[];
  expect(recordatorios).toContain(s.solicitud_id);
  const datos = jsonDe(
    ejecutar(`select public.datos_correo_visita('${s.solicitud_id}')`),
  ) as {
    inmueble: unknown;
    intencion: unknown;
    proyecto: unknown;
    dueno: { email: string | null };
    comprador: { email: string | null };
  };
  expect(datos.inmueble).toBeNull();
  expect(datos.intencion).toBeNull();
  expect(datos.proyecto).toMatchObject({
    slug: slug(3),
    nombre: "Sala Prueba 3",
  });
  expect(datos.dueno.email).toBeNull();
  expect(datos.comprador.email).toBe(CORREO);
  const crudo = JSON.stringify(datos);
  expect(crudo).not.toContain(TELEFONO_SALA);
  expect(crudo).not.toContain("Avenida Ficticia");

  // El operador cancela la visita: queda cancelada por el «dueño» y el número vuelve a ocultarse.
  comoOperador(`select public.cancelar_visita_sala('${s.solicitud_id}')`);
  const f2 = enCola(s.solicitud_id);
  expect(f2.estado).toBe("cancelada");
  expect(f2.visita?.cancelada_por).toBe("dueno");
  expect(f2.whatsapp).toBeNull();
  expect(() =>
    comoOperador(`select public.cancelar_visita_sala('${s.solicitud_id}')`),
  ).toThrow(/estado_invalido/);
});

test("rechazar cierra la solicitud y el comprador no insiste en 14 días", async () => {
  const c = await compradorVerificado();
  const s = (await pedir(c.sesion, slug(4))).data!;
  comoOperador(`select public.rechazar_solicitud_sala('${s.solicitud_id}')`);
  expect(enCola(s.solicitud_id).estado).toBe("rechazada");
  expect(() =>
    comoOperador(`select public.rechazar_solicitud_sala('${s.solicitud_id}')`),
  ).toThrow(/estado_invalido/);
  expect((await pedir(c.sesion, slug(4))).error?.message).toContain(
    "rechazada_reciente",
  );
  // Otro proyecto sí.
  expect((await pedir(c.sesion, slug(5))).error).toBeNull();
});

test("el aviso «sin respuesta» se reclama UNA vez, solo en una sala pendiente, y no toca los anuncios", async () => {
  const c = await compradorVerificado();
  const s = (await pedir(c.sesion, slug(6))).data!;
  const reclamar = (antes: string) =>
    jsonDe(
      ejecutar(
        `select public.reclamar_sin_respuesta_salas('${antes}'::timestamptz)`,
      ),
    ) as string[];

  // Una solicitud de hace un momento no se reclama con un plazo en el pasado.
  expect(reclamar(horario(-48))).not.toContain(s.solicitud_id);
  // Con un plazo que ya pasó para ella, se reclama; la segunda vez ya no.
  const ahora = reclamar(horario(1));
  expect(ahora).toContain(s.solicitud_id);
  expect(reclamar(horario(1))).not.toContain(s.solicitud_id);
  expect(enCola(s.solicitud_id).sin_respuesta).toBe(true);
  expect(() =>
    ejecutar(`select public.reclamar_sin_respuesta_salas(null)`),
  ).toThrow(/plazo_invalido/);
  // Los anuncios no tienen «sin respuesta»: ninguna solicitud de un anuncio quedó marcada.
  expect(
    consultar(
      `select count(*) from public.solicitudes_visita where inmueble_id is not null and sin_respuesta_at is not null`,
    ),
  ).toEqual(["0"]);
});

test("una solicitud con respuesta (propuesta) no se reclama como «sin respuesta»", async () => {
  const c = await compradorVerificado();
  const s = (await pedir(c.sesion, slug(2))).data!;
  comoOperador(
    `select public.proponer_horarios_sala('${s.solicitud_id}', array['${horario(30)}'::timestamptz])`,
  );
  const r = jsonDe(
    ejecutar(
      `select public.reclamar_sin_respuesta_salas('${horario(1)}'::timestamptz)`,
    ),
  ) as string[];
  expect(r).not.toContain(s.solicitud_id);
});

test("la tabla de solicitudes es de un anuncio o de una sala, nunca de las dos ni de ninguna", async () => {
  const c = await compradorVerificado();
  const comprador = consultar(
    `select id from public.compradores where telefono = '${c.telefono}'`,
  )[0];
  const insertar = (cols: string, vals: string) =>
    ejecutar(
      `insert into public.solicitudes_visita (comprador_id, ${cols}, token_hash) values ('${comprador}', ${vals}, repeat('a', 64))`,
    );
  // Ninguna de las dos cosas.
  expect(() => insertar("estado", "'pendiente'")).toThrow(
    /solicitud_de_anuncio_o_de_sala/,
  );
  // De sala pero con intención (es de un anuncio).
  expect(() =>
    insertar(
      "intencion, proyecto_edicion, proyecto_slug, proyecto_nombre, franja",
      `'vivir', ${NUMERO}, '${slug(1)}', 'Sala Prueba 1', 'sabado'`,
    ),
  ).toThrow(/solicitud_de_anuncio_o_de_sala/);
  // De sala sin franja.
  expect(() =>
    insertar(
      "proyecto_edicion, proyecto_slug, proyecto_nombre",
      `${NUMERO}, '${slug(1)}', 'Sala Prueba 1'`,
    ),
  ).toThrow(/solicitud_de_anuncio_o_de_sala/);
});

test("la muestra de revisión: pequeña, repetida o ajena a la edición se rechaza al cargar y al publicar", async () => {
  const NUM = 9302;
  const limpia = () =>
    consultar(`delete from public.ediciones where numero = ${NUM}`);
  const carga = (muestra: string[]) =>
    ejecutar(
      `select public.cargar_edicion($j$${JSON.stringify({ ...edicion({ numero: NUM }), muestra_claves: muestra })}$j$::jsonb)`,
    );
  const publicar = (muestra: string[]) =>
    ejecutar(
      `select public.publicar_edicion(${NUM}, array[${muestra.map((m) => `'${m}'`).join(", ")}]::text[])`,
    );
  limpia();
  try {
    // Al cargar: cuatro (de seis proyectos), una repetida, una ajena.
    expect(() => carga(MUESTRA.slice(0, 4))).toThrow(/muestra_invalida/);
    expect(() => carga([...MUESTRA.slice(0, 4), MUESTRA[0]])).toThrow(
      /muestra_invalida/,
    );
    expect(() =>
      carga([...MUESTRA.slice(0, 4), "otra|que no es de esta edicion"]),
    ).toThrow(/muestra_invalida/);
    expect(
      consultar(`select count(*) from public.ediciones where numero = ${NUM}`),
    ).toEqual(["0"]);

    // Cargada bien, al publicar: la misma muestra pero con una clave ajena o repetida o corta es otra cosa.
    carga(MUESTRA);
    expect(() => publicar(MUESTRA.slice(0, 4))).toThrow(/muestra_invalida/);
    expect(() => publicar([...MUESTRA.slice(0, 4), MUESTRA[0]])).toThrow(
      /muestra_invalida/,
    );
    expect(() =>
      publicar([...MUESTRA.slice(0, 4), "otra|que no es de esta edicion"]),
    ).toThrow(/muestra_invalida/);
    // Una muestra válida pero distinta de la que fijó la carga: la revisión era de otra.
    expect(() =>
      publicar([1, 2, 3, 4, 6].map((n) => proyecto(n).clave)),
    ).toThrow(/muestra_no_coincide/);
    expect(
      consultar(`select publicada from public.ediciones where numero = ${NUM}`),
    ).toEqual(["f"]);
    // La exacta, sí.
    expect(publicar(MUESTRA)).toContain("t");
  } finally {
    limpia();
  }
});

test("una edición con menos de 5 proyectos se revisa entera", async () => {
  const NUM = 9303;
  const limpia = () =>
    consultar(`delete from public.ediciones where numero = ${NUM}`);
  limpia();
  try {
    const tres = [1, 2, 3].map(proyecto);
    const claves = tres.map((p) => p.clave);
    const e = (m: string[]) =>
      ejecutar(
        `select public.cargar_edicion($j$${JSON.stringify({ ...edicion({ numero: NUM }), proyectos: tres, muestra_claves: m })}$j$::jsonb)`,
      );
    expect(() => e(claves.slice(0, 2))).toThrow(/muestra_invalida/);
    e(claves);
    expect(
      ejecutar(
        `select public.publicar_edicion(${NUM}, array[${claves.map((m) => `'${m}'`).join(", ")}]::text[])`,
      ),
    ).toContain("t");
  } finally {
    limpia();
  }
});

test("usados_para_comparar devuelve solo área y precio, sin slug, y vacío si falta la operación o el tipo", async () => {
  const supabase = api();
  const venta = await supabase.rpc("usados_para_comparar", {
    p_operacion: "venta",
    p_tipo: "apartamento",
  });
  expect(venta.error).toBeNull();
  const filas = venta.data as unknown as {
    area_m2: number;
    precio_esperado: number;
  }[];
  expect(Array.isArray(filas)).toBe(true);
  for (const f of filas)
    expect(Object.keys(f).sort()).toEqual(["area_m2", "precio_esperado"]);
  // Ordenados por precio.
  const precios = filas.map((f) => f.precio_esperado);
  expect(precios).toEqual([...precios].sort((a, b) => a - b));
  const vacio = await supabase.rpc("usados_para_comparar", {
    p_operacion: null as never,
    p_tipo: "apartamento",
  });
  expect(vacio.data).toEqual([]);
});

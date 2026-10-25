-- ═══════════════════════════════════════════════════════════════════════════════
-- Migración 16 (Sprint 013, F1) — la visita a la sala de ventas, la muestra validada y los usados para comparar
--
-- Qué entra (ADR 019 y el módulo de vivienda nueva; el producto lo muestra en F3):
--   · `salas_ventas`: el teléfono y la dirección de la sala de cada proyecto, que ESCRIBE el operador (la revista no los
--     trae: el S11 prohibió transcribirlos). RLS sin políticas y sin lectura directa: solo lo leen y escriben las RPC del
--     operador (`authenticated`); el anónimo y el comprador no pueden leer ni una fila;
--   · `solicitudes_visita` se EXTIENDE para que una solicitud pueda ser de un proyecto nuevo y no de un anuncio: `inmueble_id`
--     e `intencion` pasan a admitir nulo, entran `proyecto_edicion`, `proyecto_slug`, `proyecto_nombre`, `franja` y
--     `sin_respuesta_at`, y un CHECK exige que sea de UNA cosa o de la otra. Sin FK a `proyectos_nuevos` (la carga de una
--     edición borra y reinserta sus proyectos). Los horarios, la visita, el recordatorio y el enlace del comprador se reutilizan;
--   · `solicitar_visita_sala` (pública, exige la sesión con WhatsApp verificado) y las RPC del operador `salas_panel`,
--     `proponer_horarios_sala`, `rechazar_solicitud_sala`, `cancelar_visita_sala` y `guardar_sala`: mientras la constructora no
--     esté en la plataforma, el «dueño» de la solicitud es el operador;
--   · `reclamar_sin_respuesta_salas`: el reclamo atómico de las solicitudes que llevan dos días hábiles sin respuesta (el cron
--     avisa al comprador, una sola vez);
--   · `usados_para_comparar`: el área y el precio de los anuncios visibles de una operación y un tipo, sin slug, para «¿nuevo o
--     usado?» (`comparables_precio` exige una localidad);
--   · la MUESTRA de revisión se valida en la base: al cargar y al publicar, ≥ 5 proyectos (o todos si la edición tiene menos),
--     sin repetidos y parte de los proyectos de ESA edición. Hasta aquí la base comparaba la muestra con su propio dato.
--
-- QUÉ CAMBIA EN PRODUCCIÓN (lo que el usuario aprueba antes de tocar la nube):
--   · NUEVO: 1 tabla, 6 funciones públicas/de operador y 1 de servidor. Ninguna función existente pierde un permiso.
--   · REEMPLAZADAS con la MISMA firma (los permisos se conservan; las claves que ya devolvían, intactas):
--       `obtener_visita(text)` y `datos_correo_visita(uuid)` suman la rama de la sala; `cargar_edicion(jsonb)` y
--       `publicar_edicion(integer, text[])` suman la validación de la muestra.
--   · TABLA CAMBIADA: `solicitudes_visita` — 2 columnas dejan de ser NOT NULL y entran 5 columnas nuevas SIN valor por omisión
--     (cambios de catálogo, sin reescribir filas). Todas las filas de hoy cumplen el CHECK nuevo (son de un anuncio).
--   · Un Worker VIEJO contra la base nueva sigue funcionando: ninguna solicitud de sala existe hasta que el Worker nuevo
--     las cree, y las claves de las funciones reemplazadas para los usados no cambian.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. Las salas de ventas (solo el operador) ───────────────────────────────────
create table public.salas_ventas (
  slug           text primary key
                 check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 100),
  -- Solo dígitos: el operador abre WhatsApp con el número tal cual (con el indicativo del país).
  telefono       text check (telefono is null or telefono ~ '^[0-9]{7,15}$'),
  direccion      text check (direccion is null or char_length(btrim(direccion)) between 5 and 200),
  actualizada_at timestamptz not null default now(),
  check (telefono is not null or direccion is not null)
);

alter table public.salas_ventas enable row level security;
revoke all on public.salas_ventas from anon, authenticated;
grant all on public.salas_ventas to service_role;

-- ── 2. La solicitud de visita puede ser de un proyecto nuevo ────────────────────
alter table public.solicitudes_visita
  alter column inmueble_id drop not null,
  alter column intencion drop not null,
  add column proyecto_edicion integer check (proyecto_edicion is null or proyecto_edicion > 0),
  add column proyecto_slug    text
             check (proyecto_slug is null or (proyecto_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(proyecto_slug) <= 100)),
  add column proyecto_nombre  text
             check (proyecto_nombre is null or char_length(proyecto_nombre) between 1 and 80),
  add column franja           text
             check (franja is null or franja in ('entre_semana', 'sabado', 'domingo')),
  -- El aviso «aún sin respuesta» se manda UNA vez: el reclamo lo marca aquí.
  add column sin_respuesta_at timestamptz;

-- O es de un anuncio (con su intención) o es de un proyecto (con su franja): nunca las dos ni ninguna.
alter table public.solicitudes_visita
  add constraint solicitud_de_anuncio_o_de_sala check (
    (inmueble_id is not null and intencion is not null
       and proyecto_edicion is null and proyecto_slug is null and proyecto_nombre is null
       and franja is null and sin_respuesta_at is null)
    or
    (inmueble_id is null and intencion is null
       and proyecto_edicion is not null and proyecto_slug is not null and proyecto_nombre is not null
       and franja is not null)
  );

-- Un solo pedido VIVO por comprador y proyecto (el de los anuncios sigue con su índice).
create unique index solicitudes_visita_sala_activa_idx
  on public.solicitudes_visita (comprador_id, proyecto_slug)
  where proyecto_slug is not null and estado in ('en_espera', 'pendiente', 'propuesta', 'confirmada');
create index solicitudes_visita_salas_idx
  on public.solicitudes_visita (created_at desc)
  where proyecto_slug is not null;

-- ── 3. La muestra de revisión, validada por la base ─────────────────────────────
-- Nueva carga: igual que la de la migración 15 más la validación de la muestra.
create or replace function public.cargar_edicion(p_edicion jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_numero integer := (p_edicion ->> 'numero')::integer;
  v_cuantos integer;
  v_claves text[];
  v_muestra text[];
begin
  if v_numero is null or jsonb_typeof(p_edicion -> 'proyectos') <> 'array' then
    raise exception 'edicion_invalida' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.ediciones where numero = v_numero and publicada) then
    raise exception 'edicion_publicada' using errcode = 'P0001';
  end if;

  -- La muestra que se revisará: ≥ 5 proyectos (o todos si hay menos), sin repetidos y de ESTA edición.
  v_claves := coalesce(array(select pr ->> 'clave' from jsonb_array_elements(p_edicion -> 'proyectos') pr), '{}');
  v_muestra := coalesce(array(select jsonb_array_elements_text(p_edicion -> 'muestra_claves')), '{}');
  if cardinality(v_muestra) < least(5, cardinality(v_claves))
     or (select count(distinct x) from unnest(v_muestra) x) <> cardinality(v_muestra)
     or not (v_muestra <@ v_claves) then
    raise exception 'muestra_invalida' using errcode = 'P0001';
  end if;

  insert into public.ediciones (numero, nombre, vigente_desde, vigente_hasta, paginas, muestra_claves, muestra_semilla)
  values (
    v_numero,
    p_edicion ->> 'nombre',
    (p_edicion ->> 'desde')::date,
    (p_edicion ->> 'hasta')::date,
    (p_edicion ->> 'paginas')::integer,
    v_muestra,
    (p_edicion ->> 'muestra_semilla')::integer
  )
  on conflict (numero) do update
    set nombre = excluded.nombre,
        vigente_desde = excluded.vigente_desde,
        vigente_hasta = excluded.vigente_hasta,
        paginas = excluded.paginas,
        muestra_claves = excluded.muestra_claves,
        muestra_semilla = excluded.muestra_semilla,
        cargada_at = now(),
        revisada_at = null;

  delete from public.proyectos_nuevos where edicion = v_numero;
  insert into public.proyectos_nuevos (
    edicion, slug, clave, nombre, constructora, tipo, ciudad, sector, region, segmento, precio_desde,
    area_construida_desde, area_construida_hasta, area_privada_desde, area_privada_hasta, etapa, entrega,
    entrega_precision, parqueadero, parqueadero_precio, precio_fijo, subsidio_anunciado, rotulos, apariciones,
    ilegibles, en_conflicto
  )
  select
    v_numero, r.slug, r.clave, r.nombre, r.constructora, r.tipo, r.ciudad, r.sector, r.region, r.segmento, r.precio_desde,
    r.area_construida_desde, r.area_construida_hasta, r.area_privada_desde, r.area_privada_hasta, r.etapa, r.entrega,
    r.entrega_precision, r.parqueadero, r.parqueadero_precio, r.precio_fijo, r.subsidio_anunciado,
    coalesce(r.rotulos, '{}'), r.apariciones, coalesce(r.ilegibles, '{}'), coalesce(r.en_conflicto, '{}')
  from jsonb_populate_recordset(null::public.proyectos_nuevos, p_edicion -> 'proyectos') r;

  get diagnostics v_cuantos = row_count;
  return jsonb_build_object('numero', v_numero, 'proyectos', v_cuantos, 'publicada', false);
end;
$$;

-- Publicar: la muestra revisada es EXACTAMENTE la que fijó la carga Y es una muestra válida de los proyectos que hay hoy
-- en la base para esa edición (no solo la que dice la fila de la edición).
create or replace function public.publicar_edicion(p_numero integer, p_muestra text[])
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.ediciones%rowtype;
  v_claves text[];
begin
  select * into v from public.ediciones where numero = p_numero for update;
  if not found then
    raise exception 'edicion_inexistente' using errcode = 'P0001';
  end if;
  if v.publicada then
    return false;
  end if;

  select coalesce(array_agg(p.clave), '{}') into v_claves from public.proyectos_nuevos p where p.edicion = p_numero;
  if p_muestra is null
     or cardinality(p_muestra) < least(5, cardinality(v_claves))
     or (select count(distinct x) from unnest(p_muestra) x) <> cardinality(p_muestra)
     or not (p_muestra <@ v_claves) then
    raise exception 'muestra_invalida' using errcode = 'P0001';
  end if;
  if cardinality(v.muestra_claves) = 0
     or (select array_agg(x order by x) from unnest(p_muestra) x)
        is distinct from (select array_agg(x order by x) from unnest(v.muestra_claves) x) then
    raise exception 'muestra_no_coincide' using errcode = 'P0001';
  end if;
  update public.ediciones set publicada = true, revisada_at = now() where numero = p_numero;
  return true;
end;
$$;

-- ── 4. Pedir la visita a una sala (comprador, por su sesión verificada) ─────────
-- Igual que `solicitar_visita` de los anuncios: WhatsApp verificado, un correo solo para los avisos de esa visita, tope de
-- 5 solicitudes vivas por comprador y 14 días sin insistir tras un rechazo. El proyecto debe estar en la edición VIGENTE hoy
-- (la publicada cuya ventana contiene hoy, la de mayor número). El token del comprador nace aquí y se devuelve UNA vez.
create function public.solicitar_visita_sala(
  p_sesion_hash text,
  p_slug text,
  p_franja text,
  p_email text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_comprador uuid;
  v_hoy date := (now() at time zone 'America/Bogota')::date;
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_edicion integer;
  v_nombre text;
  v_token text;
  v_id uuid;
begin
  v_comprador := public.comprador_de_sesion(p_sesion_hash);
  if v_comprador is null then
    raise exception 'no_verificado' using errcode = '42501';
  end if;

  if p_franja is null or p_franja not in ('entre_semana', 'sabado', 'domingo') then
    raise exception 'franja_invalida' using errcode = 'check_violation';
  end if;
  if length(v_email) > 254 or v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'email_invalido' using errcode = 'check_violation';
  end if;

  select e.numero, p.nombre into v_edicion, v_nombre
    from public.ediciones e
    join public.proyectos_nuevos p on p.edicion = e.numero and p.slug = p_slug
   where e.publicada and e.vigente_desde <= v_hoy and v_hoy <= e.vigente_hasta
     and e.numero = (
       select max(e2.numero) from public.ediciones e2
        where e2.publicada and e2.vigente_desde <= v_hoy and v_hoy <= e2.vigente_hasta
     );
  if not found then
    raise exception 'no_disponible' using errcode = 'P0002';
  end if;

  if exists (select 1 from public.solicitudes_visita
              where comprador_id = v_comprador and proyecto_slug = p_slug
                and estado in ('en_espera', 'pendiente', 'propuesta', 'confirmada')) then
    raise exception 'ya_solicitada' using errcode = 'check_violation';
  end if;
  if (select count(*) from public.solicitudes_visita
        where comprador_id = v_comprador
          and estado in ('en_espera', 'pendiente', 'propuesta', 'confirmada')) >= 5 then
    raise exception 'demasiadas_solicitudes' using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.solicitudes_visita
              where comprador_id = v_comprador and proyecto_slug = p_slug
                and estado = 'rechazada' and updated_at > now() - interval '14 days') then
    raise exception 'rechazada_reciente' using errcode = 'check_violation';
  end if;

  v_token := rtrim(translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/', '-_'), '=');
  begin
    insert into public.solicitudes_visita (
      comprador_id, proyecto_edicion, proyecto_slug, proyecto_nombre, franja, estado, token_hash
    ) values (
      v_comprador, v_edicion, p_slug, v_nombre, p_franja, 'pendiente',
      encode(sha256(convert_to(v_token, 'UTF8')), 'hex')
    ) returning id into v_id;
  exception when unique_violation then
    raise exception 'ya_solicitada' using errcode = 'check_violation';
  end;

  update public.compradores set email = v_email where id = v_comprador;

  return jsonb_build_object('solicitud_id', v_id, 'token', v_token, 'estado', 'pendiente');
end;
$$;

-- ── 5. Lo que el comprador ve de SU solicitud, con la rama de la sala ───────────
-- Las claves para los anuncios no cambian. Para una sala, `inmueble` es null y llega `proyecto` (sin teléfono ni dirección).
create or replace function public.obtener_visita(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_id uuid := public.solicitud_de_token(p_token);
  v_sol public.solicitudes_visita;
  v_inmueble public.inmuebles;
  v_vendedor public.vendedores;
  v_visita public.visitas;
begin
  if v_id is null then
    return null;
  end if;
  select * into v_sol from public.solicitudes_visita where id = v_id;
  select * into v_visita from public.visitas where solicitud_id = v_sol.id;

  if v_sol.proyecto_slug is not null then
    return jsonb_build_object(
      'estado', v_sol.estado,
      'fecha', v_sol.created_at,
      'inmueble', null,
      'proyecto', jsonb_build_object(
        'slug', v_sol.proyecto_slug,
        'nombre', v_sol.proyecto_nombre,
        'edicion', v_sol.proyecto_edicion,
        'franja', v_sol.franja
      ),
      'horarios', case when v_sol.estado = 'propuesta' then coalesce((
          select jsonb_agg(jsonb_build_object('id', h.id, 'inicio', h.inicio) order by h.inicio)
            from public.horarios_propuestos h
           where h.solicitud_id = v_sol.id and h.inicio > now()
        ), '[]'::jsonb) else '[]'::jsonb end,
      'visita', case when v_visita.id is null then null else jsonb_build_object(
          'inicio', v_visita.inicio,
          'cancelada_por', v_visita.cancelada_por
        ) end
    );
  end if;

  select * into v_inmueble from public.inmuebles where id = v_sol.inmueble_id;
  select * into v_vendedor from public.vendedores where id = v_inmueble.vendedor_id;
  return jsonb_build_object(
    'estado', v_sol.estado,
    'fecha', v_sol.created_at,
    'inmueble', jsonb_build_object(
      'slug', v_inmueble.slug,
      'operacion', v_inmueble.operacion,
      'tipo', v_inmueble.tipo,
      'barrio', v_inmueble.barrio,
      'nombre_publicador', v_vendedor.nombre
    ),
    'horarios', case when v_sol.estado = 'propuesta' then coalesce((
        select jsonb_agg(jsonb_build_object('id', h.id, 'inicio', h.inicio) order by h.inicio)
          from public.horarios_propuestos h
         where h.solicitud_id = v_sol.id and h.inicio > now()
      ), '[]'::jsonb) else '[]'::jsonb end,
    'visita', case when v_visita.id is null then null else jsonb_build_object(
        'inicio', v_visita.inicio,
        'cancelada_por', v_visita.cancelada_por
      ) end
  );
end;
$$;

-- ── 6. Los datos de los correos de la visita, con la rama de la sala ────────────
-- Nunca la dirección ni el teléfono de la sala. En una sala el «dueño» es el equipo de Innmobiliaria y no recibe correo
-- (`email` null: el panel es su cola); la dirección la manda el operador por WhatsApp, a mano.
create or replace function public.datos_correo_visita(p_solicitud_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_sol public.solicitudes_visita;
  v_comprador public.compradores;
  v_inmueble public.inmuebles;
  v_vendedor public.vendedores;
  v_visita public.visitas;
begin
  select * into v_sol from public.solicitudes_visita where id = p_solicitud_id;
  if not found then
    return null;
  end if;
  select * into v_comprador from public.compradores where id = v_sol.comprador_id;
  select * into v_visita from public.visitas where solicitud_id = v_sol.id;

  if v_sol.proyecto_slug is not null then
    return jsonb_build_object(
      'estado', v_sol.estado,
      'intencion', null,
      'comprador', jsonb_build_object(
        'nombre', v_comprador.nombre,
        'email', v_comprador.email,
        'idioma', v_comprador.idioma
      ),
      'dueno', jsonb_build_object('nombre', 'Innmobiliaria', 'email', null, 'idioma', 'es'),
      'inmueble', null,
      'proyecto', jsonb_build_object(
        'slug', v_sol.proyecto_slug,
        'nombre', v_sol.proyecto_nombre,
        'edicion', v_sol.proyecto_edicion,
        'franja', v_sol.franja
      ),
      'horarios', coalesce((
          select jsonb_agg(h.inicio order by h.inicio)
            from public.horarios_propuestos h where h.solicitud_id = v_sol.id
        ), '[]'::jsonb),
      'visita', case when v_visita.id is null then null else jsonb_build_object(
          'inicio', v_visita.inicio,
          'cancelada_por', v_visita.cancelada_por
        ) end
    );
  end if;

  select * into v_inmueble from public.inmuebles where id = v_sol.inmueble_id;
  select * into v_vendedor from public.vendedores where id = v_inmueble.vendedor_id;
  return jsonb_build_object(
    'estado', v_sol.estado,
    'intencion', v_sol.intencion,
    'comprador', jsonb_build_object(
      'nombre', v_comprador.nombre,
      'email', v_comprador.email,
      'idioma', v_comprador.idioma
    ),
    'dueno', jsonb_build_object(
      'nombre', v_vendedor.nombre,
      'email', v_vendedor.email,
      'idioma', v_vendedor.idioma
    ),
    'inmueble', jsonb_build_object(
      'slug', v_inmueble.slug,
      'operacion', v_inmueble.operacion,
      'tipo', v_inmueble.tipo,
      'barrio', v_inmueble.barrio
    ),
    'horarios', coalesce((
        select jsonb_agg(h.inicio order by h.inicio)
          from public.horarios_propuestos h where h.solicitud_id = v_sol.id
      ), '[]'::jsonb),
    'visita', case when v_visita.id is null then null else jsonb_build_object(
        'inicio', v_visita.inicio,
        'cancelada_por', v_visita.cancelada_por
      ) end
  );
end;
$$;

-- ── 7. El operador (SOLO `authenticated`: el operador entra con sesión; jamás `anon`) ─
-- La cola de solicitudes de salas: las vivas y las cerradas en los últimos 30 días. El teléfono COMPLETO del comprador sale solo
-- cuando la visita está confirmada (como en el panel de los anuncios); el contacto de la sala, siempre, si el operador lo guardó.
create function public.salas_panel()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', x.id,
      'estado', x.estado,
      'fecha', x.created_at,
      'franja', x.franja,
      'sin_respuesta', x.sin_respuesta_at is not null,
      'ninguno', x.ninguno_at is not null,
      'proyecto', jsonb_build_object(
        'slug', x.proyecto_slug,
        'nombre', x.proyecto_nombre,
        'edicion', x.proyecto_edicion,
        'constructora', x.constructora,
        'paginas', to_jsonb(x.apariciones)
      ),
      'comprador', jsonb_build_object(
        'nombre', x.nombre,
        'telefono_fin', right(x.telefono, 4),
        'identificado', x.identificado,
        'idioma', x.idioma
      ),
      'horarios', case when x.estado = 'propuesta' then coalesce((
          select jsonb_agg(jsonb_build_object('id', h.id, 'inicio', h.inicio) order by h.inicio)
            from public.horarios_propuestos h where h.solicitud_id = x.id
        ), '[]'::jsonb) else '[]'::jsonb end,
      'visita', case when x.visita_id is null then null else jsonb_build_object(
          'inicio', x.visita_inicio,
          'cancelada_por', x.cancelada_por
        ) end,
      'whatsapp', case when x.estado = 'confirmada' and x.visita_id is not null and x.cancelada_por is null
                       then x.telefono else null end,
      'sala', case when x.sala_slug is null then null else jsonb_build_object(
          'telefono', x.sala_telefono,
          'direccion', x.sala_direccion
        ) end
    )
    order by x.created_at desc
  ), '[]'::jsonb)
  from (
    select s.id, s.estado, s.created_at, s.franja, s.sin_respuesta_at, s.ninguno_at,
           s.proyecto_slug, s.proyecto_nombre, s.proyecto_edicion,
           co.nombre, co.telefono, co.idioma,
           exists (select 1 from public.identificaciones i where i.comprador_id = co.id) as identificado,
           v.id as visita_id, v.inicio as visita_inicio, v.cancelada_por,
           p.constructora, p.apariciones,
           sv.slug as sala_slug, sv.telefono as sala_telefono, sv.direccion as sala_direccion
      from public.solicitudes_visita s
      join public.compradores co on co.id = s.comprador_id
      left join public.visitas v on v.solicitud_id = s.id
      left join public.proyectos_nuevos p on p.edicion = s.proyecto_edicion and p.slug = s.proyecto_slug
      left join public.salas_ventas sv on sv.slug = s.proyecto_slug
     where s.proyecto_slug is not null
       and (s.estado in ('pendiente', 'propuesta', 'confirmada') or s.updated_at > now() - interval '30 days')
     order by s.created_at desc
     limit 100
  ) x
$$;

-- Propone de 1 a 3 horarios futuros (a más de una hora y a no más de 60 días), como el dueño de un anuncio.
create function public.proponer_horarios_sala(p_solicitud_id uuid, p_horarios timestamptz[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sol public.solicitudes_visita;
  h timestamptz;
begin
  select * into v_sol from public.solicitudes_visita
   where id = p_solicitud_id and proyecto_slug is not null for update;
  if not found then
    raise exception 'solicitud_invalida' using errcode = 'check_violation';
  end if;
  if v_sol.estado not in ('pendiente', 'propuesta') then
    raise exception 'estado_invalido' using errcode = 'check_violation';
  end if;
  if p_horarios is null
     or cardinality(p_horarios) not between 1 and 3
     or (select count(distinct x) from unnest(p_horarios) x) <> cardinality(p_horarios) then
    raise exception 'horarios_invalidos' using errcode = 'check_violation';
  end if;
  foreach h in array p_horarios loop
    if h is null or h <= now() + interval '1 hour' or h > now() + interval '60 days' then
      raise exception 'horarios_invalidos' using errcode = 'check_violation';
    end if;
  end loop;
  delete from public.horarios_propuestos where solicitud_id = v_sol.id;
  insert into public.horarios_propuestos (solicitud_id, inicio)
    select v_sol.id, x from unnest(p_horarios) x;
  update public.solicitudes_visita set estado = 'propuesta', ninguno_at = null where id = v_sol.id;
end;
$$;

create function public.rechazar_solicitud_sala(p_solicitud_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.solicitudes_visita set estado = 'rechazada'
   where id = p_solicitud_id and proyecto_slug is not null
     and estado in ('pendiente', 'propuesta');
  if not found then
    raise exception 'estado_invalido' using errcode = 'check_violation';
  end if;
end;
$$;

create function public.cancelar_visita_sala(p_solicitud_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sol public.solicitudes_visita;
begin
  select * into v_sol from public.solicitudes_visita
   where id = p_solicitud_id and proyecto_slug is not null and estado = 'confirmada' for update;
  if not found then
    raise exception 'estado_invalido' using errcode = 'check_violation';
  end if;
  update public.visitas
     set cancelada_at = now(), cancelada_por = 'dueno'
   where solicitud_id = v_sol.id and cancelada_at is null and inicio > now();
  if not found then
    raise exception 'estado_invalido' using errcode = 'check_violation';
  end if;
  update public.solicitudes_visita set estado = 'cancelada' where id = v_sol.id;
end;
$$;

-- Guarda (o, con los dos campos vacíos, borra) el contacto de la sala de un proyecto. El proyecto debe existir en alguna
-- edición cargada. El teléfono se normaliza a dígitos.
create function public.guardar_sala(p_slug text, p_telefono text, p_direccion text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_telefono text := nullif(regexp_replace(coalesce(p_telefono, ''), '[^0-9]', '', 'g'), '');
  v_direccion text := nullif(btrim(coalesce(p_direccion, '')), '');
begin
  if p_slug is null or not exists (select 1 from public.proyectos_nuevos where slug = p_slug) then
    raise exception 'proyecto_invalido' using errcode = 'check_violation';
  end if;
  if v_telefono is null and v_direccion is null then
    delete from public.salas_ventas where slug = p_slug;
    return;
  end if;
  if (v_telefono is not null and v_telefono !~ '^[0-9]{7,15}$')
     or (v_direccion is not null and char_length(v_direccion) not between 5 and 200) then
    raise exception 'sala_invalida' using errcode = 'check_violation';
  end if;
  insert into public.salas_ventas (slug, telefono, direccion)
  values (p_slug, v_telefono, v_direccion)
  on conflict (slug) do update
    set telefono = excluded.telefono, direccion = excluded.direccion, actualizada_at = now();
end;
$$;

-- ── 8. El servidor: el aviso «aún sin respuesta» (cron diario) ──────────────────
-- Reclamo ATÓMICO y de a lo sumo UNA vez por solicitud: marca `sin_respuesta_at` y devuelve solo las que acaba de marcar.
-- Entran las solicitudes de sala que siguen `pendiente` y cuya espera (desde que se pidió, o desde que el comprador dijo
-- «ninguno me sirve») empezó antes de `p_antes_de`. El plazo (dos días hábiles) lo calcula el servidor, con motor puro.
create function public.reclamar_sin_respuesta_salas(p_antes_de timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ids jsonb;
begin
  if p_antes_de is null then
    raise exception 'plazo_invalido' using errcode = 'check_violation';
  end if;
  with reclamadas as (
    update public.solicitudes_visita
       set sin_respuesta_at = now()
     where proyecto_slug is not null
       and estado = 'pendiente'
       and sin_respuesta_at is null
       and coalesce(ninguno_at, created_at) <= p_antes_de
    returning id
  )
  select coalesce(jsonb_agg(id), '[]'::jsonb) into v_ids from reclamadas;
  return v_ids;
end;
$$;

-- ── 9. Los usados, para compararlos con lo nuevo (lectura pública, lista blanca mínima) ──
-- Solo el área y el precio de los anuncios VISIBLES de una operación y un tipo (la misma regla que la búsqueda): sin slug, sin
-- barrio, sin vendedor. Con cualquiera de los dos en null devuelve `[]`.
create function public.usados_para_comparar(
  p_operacion public.operacion,
  p_tipo public.tipo_inmueble
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(
           jsonb_build_object('area_m2', c.area_m2, 'precio_esperado', c.precio_esperado)
           order by c.precio_esperado, c.area_m2
         ), '[]'::jsonb)
  from (
    select i.area_m2, i.precio_esperado
      from public.inmuebles i
     where p_operacion is not null
       and p_tipo is not null
       and i.id in (
         select public.inmuebles_que_cumplen(p_operacion, p_tipo, null, null, null, null, null)
       )
     order by i.created_at desc
     limit 2000
  ) c
$$;

-- ── 10. Privilegios EXPLÍCITOS, por firma (las funciones nuevas nacen cerradas: migración 6) ──
-- Públicas (anon + authenticated + service_role).
revoke all on function public.solicitar_visita_sala(text, text, text, text) from public;
grant execute on function public.solicitar_visita_sala(text, text, text, text)
  to anon, authenticated, service_role;

revoke all on function public.usados_para_comparar(public.operacion, public.tipo_inmueble) from public;
grant execute on function public.usados_para_comparar(public.operacion, public.tipo_inmueble)
  to anon, authenticated, service_role;

-- El operador: SOLO `authenticated` (y el servidor). El anónimo —y con él, el comprador— no las ejecuta.
revoke all on function public.salas_panel() from public;
grant execute on function public.salas_panel() to authenticated, service_role;

revoke all on function public.proponer_horarios_sala(uuid, timestamptz[]) from public;
grant execute on function public.proponer_horarios_sala(uuid, timestamptz[]) to authenticated, service_role;

revoke all on function public.rechazar_solicitud_sala(uuid) from public;
grant execute on function public.rechazar_solicitud_sala(uuid) to authenticated, service_role;

revoke all on function public.cancelar_visita_sala(uuid) from public;
grant execute on function public.cancelar_visita_sala(uuid) to authenticated, service_role;

revoke all on function public.guardar_sala(text, text, text) from public;
grant execute on function public.guardar_sala(text, text, text) to authenticated, service_role;

-- Solo el servidor, con la llave de servicio.
revoke all on function public.reclamar_sin_respuesta_salas(timestamptz) from public;
grant execute on function public.reclamar_sin_respuesta_salas(timestamptz) to service_role;

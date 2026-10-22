-- ═══════════════════════════════════════════════════════════════════════════════
-- Migración 15 (Sprint 012, F1) — La vivienda nueva en la base: la edición de la revista, ya procesada
--
-- Qué entra (ADR 019; el producto lo muestra en F3):
--   · `ediciones`: una fila por edición de la revista (número, vigencia, publicada, revisión con fecha, muestra);
--   · `proyectos_nuevos`: SOLO lo procesado de cada proyecto (nombre, constructora, zona, cifras, rótulos de una lista
--     cerrada). Ninguna columna de teléfono, dirección, web ni texto de aviso, y los textos cortos llevan un CHECK que
--     rechaza una web, un correo o un teléfono: lo que no se guarda no se puede filtrar;
--   · `nuevos_publicados(p_hoy)`: lo único que lee el anónimo. La edición vigente a esa fecha, o la última publicada
--     si ninguna lo está (el producto dirá «mes sin edición»). Una edición sin publicar NO sale jamás;
--   · `cargar_edicion(jsonb)`, `publicar_edicion(int, text[])` y `retirar_edicion(int)`: solo el servidor (la bandeja).
--     La carga entra SIN publicar y es idempotente; publicar exige la muestra de revisión que fijó la carga (G5).
--
-- ADITIVA: dos tablas y cuatro funciones nuevas. Ninguna función existente cambia de firma ni pierde un permiso.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. Las ediciones (RLS sin políticas: solo las RPC definer y service_role las tocan) ─
create table public.ediciones (
  numero         integer primary key check (numero > 0),
  nombre         text not null check (char_length(nombre) between 3 and 60),
  vigente_desde  date not null,
  vigente_hasta  date not null,
  paginas        integer not null check (paginas between 1 and 500),
  publicada      boolean not null default false,
  cargada_at     timestamptz not null default now(),
  -- La revisión de la muestra (G5): sin ella no se publica.
  revisada_at    timestamptz,
  muestra_claves text[] not null default '{}',
  muestra_semilla integer,
  check (vigente_hasta >= vigente_desde),
  check (not publicada or revisada_at is not null)
);

alter table public.ediciones enable row level security;
revoke all on public.ediciones from anon, authenticated;
grant all on public.ediciones to service_role;

-- ── 2. Los proyectos: solo lo procesado ──────────────────────────────────────────
-- `NULL` numérico = «el aviso no lo dice»; «ilegible» se conserva en `ilegibles`. Los campos de texto cerrado traen sus
-- dos marcas: `no_lo_dice` e `ilegible`.
create table public.proyectos_nuevos (
  edicion        integer not null references public.ediciones (numero) on delete cascade,
  slug           text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 100),
  clave          text not null check (char_length(clave) between 1 and 200),
  nombre         text not null check (char_length(nombre) between 1 and 80),
  constructora   text not null check (char_length(constructora) between 1 and 80),
  tipo           text not null check (tipo in ('apartamento', 'casa', 'lote', 'otro', 'no_lo_dice', 'ilegible')),
  ciudad         text not null check (char_length(ciudad) between 1 and 40),
  sector         text not null check (char_length(sector) between 1 and 40),
  region         text not null check (region in ('bogota', 'sabana', 'otra', 'sin_ciudad')),
  segmento       text not null check (segmento in ('VIP', 'VIS', 'No VIS', 'mixto', 'no_lo_dice', 'ilegible')),
  precio_desde   bigint check (precio_desde between 10000000 and 50000000000),
  area_construida_desde numeric(8, 2) check (area_construida_desde > 0 and area_construida_desde <= 20000),
  area_construida_hasta numeric(8, 2) check (area_construida_hasta > 0 and area_construida_hasta <= 20000),
  area_privada_desde    numeric(8, 2) check (area_privada_desde > 0 and area_privada_desde <= 20000),
  area_privada_hasta    numeric(8, 2) check (area_privada_hasta > 0 and area_privada_hasta <= 20000),
  etapa          text not null check (etapa in ('sobre_planos', 'en_construccion', 'entrega_inmediata', 'no_lo_dice', 'ilegible')),
  entrega        text not null check (entrega ~ '^\d{4}-(0[1-9]|1[0-2])$' or entrega in ('inmediata', 'no_lo_dice', 'ilegible')),
  entrega_precision text check (entrega_precision in ('mes', 'trimestre', 'semestre', 'anio')),
  parqueadero    text not null check (parqueadero in ('incluido', 'adicional', 'hay_sin_precio', 'no_lo_dice', 'ilegible')),
  parqueadero_precio bigint check (parqueadero_precio between 1000000 and 500000000),
  precio_fijo    text not null check (precio_fijo in ('si', 'no_lo_dice', 'ilegible')),
  subsidio_anunciado text not null check (subsidio_anunciado in ('si', 'no_lo_dice', 'ilegible')),
  -- Lo que el aviso promete, de una lista CERRADA: jamás el texto del aviso.
  rotulos        text[] not null default '{}'
                 check (rotulos <@ array['lanzamiento', 'ultimas_unidades', 'descuento', 'cuota_inicial_flexible',
                                         'mejor_precio', 'mejor_ubicacion', 'renta_turistica', 'financiacion_directa', 'otro']::text[]),
  apariciones    integer[] not null check (cardinality(apariciones) between 1 and 500),
  -- Campos numéricos que no se alcanzaron a leer (a diferencia de los que el aviso no dice).
  ilegibles      text[] not null default '{}'
                 check (ilegibles <@ array['precio_desde', 'area_construida_desde', 'area_construida_hasta',
                                           'area_privada_desde', 'area_privada_hasta']::text[]),
  -- Campos en que dos páginas de la revista imprimen cifras distintas: no se usan para calcular.
  en_conflicto   text[] not null default '{}'
                 check (en_conflicto <@ array['tipo', 'ciudad', 'sector', 'segmento', 'precio_desde', 'area_construida_desde',
                                              'area_construida_hasta', 'area_privada_desde', 'area_privada_hasta', 'etapa',
                                              'entrega', 'entrega_precision', 'parqueadero', 'parqueadero_precio',
                                              'precio_fijo', 'subsidio_anunciado', 'constructora']::text[]),
  primary key (edicion, slug),
  unique (edicion, clave),
  -- Defensa en profundidad: ni en los textos cortos entra una web, un correo o un teléfono.
  check (
    (nombre || ' ' || constructora || ' ' || ciudad || ' ' || sector) !~* 'https?:|www\.|@|\.com\b|\.co\b'
    and (nombre || ' ' || constructora || ' ' || ciudad || ' ' || sector) !~ '\d[\d\s().+-]{6,}\d'
  )
);

alter table public.proyectos_nuevos enable row level security;
revoke all on public.proyectos_nuevos from anon, authenticated;
grant all on public.proyectos_nuevos to service_role;

-- ── 3. Lectura pública: solo ediciones PUBLICADAS y solo una lista blanca de columnas ─
-- La edición vigente a `p_hoy` (la de mayor número si hay varias); si ninguna lo está, la última publicada ya vencida.
-- Una edición que aún no empieza no sale. Sin edición publicada: null.
create function public.nuevos_publicados(p_hoy date)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with elegida as (
    select e.*
    from public.ediciones e
    where p_hoy is not null and e.publicada and e.vigente_desde <= p_hoy
    order by (p_hoy <= e.vigente_hasta) desc, e.numero desc
    limit 1
  )
  select jsonb_build_object(
    'edicion', jsonb_build_object(
      'numero', e.numero,
      'nombre', e.nombre,
      'desde', e.vigente_desde,
      'hasta', e.vigente_hasta,
      'paginas', e.paginas
    ),
    'proyectos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'slug', p.slug,
        'clave', p.clave,
        'nombre', p.nombre,
        'constructora', p.constructora,
        'tipo', p.tipo,
        'ciudad', p.ciudad,
        'sector', p.sector,
        'region', p.region,
        'segmento', p.segmento,
        'precio_desde', p.precio_desde,
        'area_construida_desde', p.area_construida_desde,
        'area_construida_hasta', p.area_construida_hasta,
        'area_privada_desde', p.area_privada_desde,
        'area_privada_hasta', p.area_privada_hasta,
        'etapa', p.etapa,
        'entrega', p.entrega,
        'entrega_precision', p.entrega_precision,
        'parqueadero', p.parqueadero,
        'parqueadero_precio', p.parqueadero_precio,
        'precio_fijo', p.precio_fijo,
        'subsidio_anunciado', p.subsidio_anunciado,
        'rotulos', p.rotulos,
        'apariciones', p.apariciones,
        'ilegibles', p.ilegibles,
        'en_conflicto', p.en_conflicto
      ) order by p.slug)
      from public.proyectos_nuevos p
      where p.edicion = e.numero
    ), '[]'::jsonb)
  )
  from elegida e
$$;

-- ── 4. Solo el servidor (la bandeja de IA, con la llave de servicio) ─────────────
-- Carga idempotente: una edición ya PUBLICADA no se recarga (se retira primero). Entra siempre sin publicar.
create function public.cargar_edicion(p_edicion jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_numero integer := (p_edicion ->> 'numero')::integer;
  v_cuantos integer;
begin
  if v_numero is null or jsonb_typeof(p_edicion -> 'proyectos') <> 'array' then
    raise exception 'edicion_invalida' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.ediciones where numero = v_numero and publicada) then
    raise exception 'edicion_publicada' using errcode = 'P0001';
  end if;

  insert into public.ediciones (numero, nombre, vigente_desde, vigente_hasta, paginas, muestra_claves, muestra_semilla)
  values (
    v_numero,
    p_edicion ->> 'nombre',
    (p_edicion ->> 'desde')::date,
    (p_edicion ->> 'hasta')::date,
    (p_edicion ->> 'paginas')::integer,
    coalesce(array(select jsonb_array_elements_text(p_edicion -> 'muestra_claves')), '{}'),
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

-- Publicar exige que la muestra revisada sea EXACTAMENTE la que fijó la carga: la revisión es de ESTA edición.
create function public.publicar_edicion(p_numero integer, p_muestra text[])
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.ediciones%rowtype;
begin
  select * into v from public.ediciones where numero = p_numero for update;
  if not found then
    raise exception 'edicion_inexistente' using errcode = 'P0001';
  end if;
  if v.publicada then
    return false;
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

-- Retirar una edición (p. ej. si la editorial objeta): deja de salir de inmediato; los datos quedan para revisarlos.
create function public.retirar_edicion(p_numero integer)
returns boolean
language sql
security definer
set search_path = ''
as $$
  with r as (
    update public.ediciones set publicada = false, revisada_at = null
    where numero = p_numero and publicada
    returning 1
  )
  select exists (select 1 from r)
$$;

-- ── 5. Permisos por firma (las funciones nuevas nacen cerradas, migración 6) ─────
revoke all on function public.nuevos_publicados(date) from public;
grant execute on function public.nuevos_publicados(date) to anon, authenticated, service_role;

revoke all on function public.cargar_edicion(jsonb) from public;
grant execute on function public.cargar_edicion(jsonb) to service_role;

revoke all on function public.publicar_edicion(integer, text[]) from public;
grant execute on function public.publicar_edicion(integer, text[]) to service_role;

revoke all on function public.retirar_edicion(integer) from public;
grant execute on function public.retirar_edicion(integer) to service_role;

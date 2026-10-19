-- ═══════════════════════════════════════════════════════════════════════════════
-- Migración 12 (Sprint 009, F1) — guardar y avisar: favoritos, listas con notas y alertas por correo.
--
-- Qué entra (ADR 017):
--   · favoritos (el comprador verificado; antes viven solo en su teléfono), listas compartibles por un enlace
--     con token que se puede revocar, y notas por anuncio que exigen el WhatsApp verificado;
--   · alertas por correo SIN cuenta: el correo se confirma con un enlace, cada aviso trae la baja y la baja no
--     pide sesión; tres tokens por alerta (gestionar · confirmar · baja), de cada uno solo el hash;
--   · el historial de precios (un trigger anota cada cambio de `precio_esperado`) y `guardar_precio` para que
--     el dueño pueda cambiarlo (hasta hoy nada lo cambiaba, así que ninguna «baja» podía existir);
--   · el cupo diario de correos (`correos_dia`): Brevo gratis da 300 al día para TODO (campañas, visitas,
--     alertas); las alertas reservan cupo en la base y los correos de la visita nunca se bloquean.
--
-- ADITIVA salvo dos reemplazos con la MISMA firma:
--   · `buscar_inmuebles` se rehace sobre el ayudante `inmuebles_que_cumplen` (el mismo `where`, ahora
--     compartido con las alertas) y `fila_anuncio` (la lista blanca de campos, una sola vez). Misma entrada,
--     misma salida, mismo orden y mismo tope de 60;
--   · `purgar_vencidos` suma las purgas de lo nuevo (conserva sus dos claves).
-- Nada se cierra: ninguna función cambia de firma ni pierde un permiso.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. Tablas (RLS sin políticas: solo las RPC definer y service_role las tocan) ─

create table public.alertas (
  id                uuid primary key default gen_random_uuid(),
  email             text not null
                      check (email = lower(email) and length(email) <= 254
                             and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  idioma            text not null default 'es' check (idioma in ('es', 'en')),
  nombre            text not null check (length(btrim(nombre)) between 1 and 80),
  -- Los mismos criterios que `/buscar` (S6), tipados.
  operacion         public.operacion,
  tipo              public.tipo_inmueble,
  localidad         text check (localidad is null or length(btrim(localidad)) between 1 and 80),
  precio_min        bigint check (precio_min is null or precio_min between 0 and 900000000000),
  precio_max        bigint check (precio_max is null or precio_max between 0 and 900000000000),
  habitaciones_min  smallint check (habitaciones_min is null or habitaciones_min between 0 and 40),
  poligono          text check (poligono is null or length(poligono) <= 4000),
  avisar_nuevos     boolean not null default true,
  avisar_bajas      boolean not null default true,
  consentimiento_at timestamptz not null,
  confirmada_at     timestamptz,
  pausada_at        timestamptz,
  -- La baja y el borrado son lo mismo: la fila queda 30 días (cuenta para el tope de alertas por correo).
  baja_at           timestamptz,
  ultimo_envio_at   timestamptz,
  -- El inicio de la ventana del próximo resumen: se confirma, se reanuda o sale un resumen ⇒ ahora.
  desde_at          timestamptz,
  ultimo_resumen    jsonb,
  ip_hash           text not null,
  created_at        timestamptz not null default now(),
  check (avisar_nuevos or avisar_bajas),
  check (precio_min is null or precio_max is null or precio_min <= precio_max),
  check (operacion is not null or tipo is not null or localidad is not null or precio_min is not null
         or precio_max is not null or habitaciones_min is not null or poligono is not null)
);

create index alertas_email_idx on public.alertas (email, created_at desc);
create index alertas_ip_idx on public.alertas (ip_hash, created_at desc);

create table public.enlaces_alerta (
  id         uuid primary key default gen_random_uuid(),
  alerta_id  uuid not null references public.alertas (id) on delete cascade,
  proposito  text not null check (proposito in ('gestionar', 'confirmar', 'baja')),
  -- `creacion`: el que nace con la alerta (el teléfono que la creó lo guarda); `correo`: uno nuevo por aviso.
  origen     text not null check (origen in ('creacion', 'correo')),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  usado_at   timestamptz,
  created_at timestamptz not null default now()
);

create index enlaces_alerta_alerta_idx on public.enlaces_alerta (alerta_id, proposito);

create table public.cambios_de_precio (
  id          uuid primary key default gen_random_uuid(),
  inmueble_id uuid not null references public.inmuebles (id) on delete cascade,
  anterior    bigint not null,
  nuevo       bigint not null,
  created_at  timestamptz not null default now()
);

create index cambios_de_precio_idx on public.cambios_de_precio (inmueble_id, created_at);
create index cambios_de_precio_fecha_idx on public.cambios_de_precio (created_at);

create table public.favoritos (
  comprador_id uuid not null references public.compradores (id) on delete cascade,
  inmueble_id  uuid not null references public.inmuebles (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (comprador_id, inmueble_id)
);

create table public.listas (
  id             uuid primary key default gen_random_uuid(),
  comprador_id   uuid not null references public.compradores (id) on delete cascade,
  nombre         text not null check (length(btrim(nombre)) between 1 and 60),
  -- El hash del token del enlace de compartir; null = no se comparte (revocada o nunca compartida).
  compartir_hash text unique check (compartir_hash is null or compartir_hash ~ '^[0-9a-f]{64}$'),
  created_at     timestamptz not null default now()
);

create index listas_comprador_idx on public.listas (comprador_id, created_at desc);

create table public.lista_inmuebles (
  lista_id    uuid not null references public.listas (id) on delete cascade,
  inmueble_id uuid not null references public.inmuebles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (lista_id, inmueble_id)
);

create table public.notas_lista (
  id           uuid primary key default gen_random_uuid(),
  lista_id     uuid not null,
  inmueble_id  uuid not null,
  comprador_id uuid not null references public.compradores (id) on delete cascade,
  texto        text not null check (length(btrim(texto)) between 1 and 280),
  created_at   timestamptz not null default now(),
  -- Quitar el anuncio de la lista se lleva sus notas.
  foreign key (lista_id, inmueble_id)
    references public.lista_inmuebles (lista_id, inmueble_id) on delete cascade
);

create index notas_lista_idx on public.notas_lista (lista_id, inmueble_id, created_at);
create index notas_lista_autor_idx on public.notas_lista (comprador_id, created_at desc);

-- El cupo diario de correos, por día de Bogotá. Las campañas del operador cuentan aparte (`envios`).
create table public.correos_dia (
  dia    date primary key,
  visita integer not null default 0 check (visita >= 0),
  alerta integer not null default 0 check (alerta >= 0)
);

alter table public.alertas          enable row level security;
alter table public.enlaces_alerta   enable row level security;
alter table public.cambios_de_precio enable row level security;
alter table public.favoritos        enable row level security;
alter table public.listas           enable row level security;
alter table public.lista_inmuebles  enable row level security;
alter table public.notas_lista      enable row level security;
alter table public.correos_dia      enable row level security;

revoke all on public.alertas           from anon, authenticated;
revoke all on public.enlaces_alerta    from anon, authenticated;
revoke all on public.cambios_de_precio from anon, authenticated;
revoke all on public.favoritos         from anon, authenticated;
revoke all on public.listas            from anon, authenticated;
revoke all on public.lista_inmuebles   from anon, authenticated;
revoke all on public.notas_lista       from anon, authenticated;
revoke all on public.correos_dia       from anon, authenticated;

grant all on public.alertas           to service_role;
grant all on public.enlaces_alerta    to service_role;
grant all on public.cambios_de_precio to service_role;
grant all on public.favoritos         to service_role;
grant all on public.listas            to service_role;
grant all on public.lista_inmuebles   to service_role;
grant all on public.notas_lista       to service_role;
grant all on public.correos_dia       to service_role;

-- ── 2. Ayudantes internos (ni la API ni el servidor: solo las funciones definer que los usan) ─

create function public.hash_token(p_token text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
$$;

-- 32 bytes aleatorios en base64 url-safe (43 caracteres), como los demás tokens del producto.
create function public.generar_token()
returns text
language sql
volatile
security definer
set search_path = ''
as $$
  select rtrim(translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/', '-_'), '=')
$$;

-- La fecha de hoy en Bogotá (UTC−5, sin horario de verano): el día de los cupos y de los resúmenes.
create function public.dia_bogota()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'America/Bogota')::date
$$;

-- El polígono de una búsqueda: null si no hay; entre 3 y 100 vértices o `poligono_invalido`. Es el mismo
-- control que traía `buscar_inmuebles` (S6), ahora compartido con las alertas.
create function public.validar_poligono(p_poligono text)
returns polygon
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_poligono polygon;
begin
  if p_poligono is null then
    return null;
  end if;
  begin
    v_poligono := p_poligono::polygon;
  exception when others then
    raise exception 'poligono_invalido' using errcode = 'check_violation';
  end;
  if npoints(v_poligono) < 3 or npoints(v_poligono) > 100 then
    raise exception 'poligono_invalido' using errcode = 'check_violation';
  end if;
  return v_poligono;
end;
$$;

-- LOS anuncios que cumplen una búsqueda: el `where` de `buscar_inmuebles` (S6), tal cual, para que `/buscar`
-- y las alertas jamás se separen. Visible = vigente, publicado y con slug. Sin tope, sin orden.
create function public.inmuebles_que_cumplen(
  p_operacion public.operacion,
  p_tipo public.tipo_inmueble,
  p_localidad text,
  p_precio_min bigint,
  p_precio_max bigint,
  p_habitaciones_min smallint,
  p_poligono text
)
returns setof uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_poligono polygon := public.validar_poligono(p_poligono);
begin
  return query
    select i.id
      from public.inmuebles i
      left join public.sectores s on s.codigo = i.sector_codigo
      left join public.zonas z on z.id = i.zona_id
     where i.vigente_hasta > now()
       and i.estado = 'publicado_fundador'
       and i.slug is not null
       and (p_operacion is null or i.operacion = p_operacion)
       and (p_tipo is null or i.tipo = p_tipo)
       and (p_localidad is null or lower(coalesce(s.localidad, z.nombre)) = lower(p_localidad))
       and (p_precio_min is null or i.precio_esperado >= p_precio_min)
       and (p_precio_max is null or i.precio_esperado <= p_precio_max)
       and (p_habitaciones_min is null or i.habitaciones >= p_habitaciones_min)
       and (v_poligono is null or (s.centroide is not null and v_poligono @> s.centroide));
end;
$$;

-- La lista blanca de campos de un anuncio (SIN dirección y SIN datos del vendedor), una sola vez: la usan
-- `buscar_inmuebles`, `resumen_anuncios`, las listas y los resúmenes.
create function public.fila_anuncio(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'slug', i.slug,
    'operacion', i.operacion,
    'tipo', i.tipo,
    'barrio', i.barrio,
    'sector_codigo', i.sector_codigo,
    'localidad', coalesce(s.localidad, z.nombre),
    'area_m2', i.area_m2,
    'habitaciones', i.habitaciones,
    'precio_esperado', i.precio_esperado,
    'nivel_verificacion', i.nivel_verificacion,
    'ctl_expedido_el', i.ctl_expedido_el,
    'vigente_hasta', i.vigente_hasta,
    'portada', (
      select f.r2_key from public.fotos f
      where f.inmueble_id = i.id
      order by f.es_portada desc, f.orden
      limit 1
    )
  )
  from public.inmuebles i
  left join public.sectores s on s.codigo = i.sector_codigo
  left join public.zonas z on z.id = i.zona_id
  where i.id = p_id
$$;

-- ── 3. buscar_inmuebles, rehecha sobre los ayudantes (MISMA firma ⇒ conserva sus grants) ─

create or replace function public.buscar_inmuebles(
  p_operacion public.operacion default null,
  p_tipo public.tipo_inmueble default null,
  p_localidad text default null,
  p_precio_min bigint default null,
  p_precio_max bigint default null,
  p_habitaciones_min smallint default null,
  p_poligono text default null,
  p_limite integer default 60
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_limite integer := least(greatest(coalesce(p_limite, 60), 1), 60);
begin
  -- El polígono malo falla aunque no haya anuncios (como antes).
  perform public.validar_poligono(p_poligono);

  return coalesce((
    select jsonb_agg(r.fila order by r.vigente_hasta desc, r.created_at desc)
    from (
      select
        public.fila_anuncio(i.id) as fila,
        i.vigente_hasta,
        i.created_at
      from public.inmuebles i
      where i.id in (
        select c from public.inmuebles_que_cumplen(
          p_operacion, p_tipo, p_localidad, p_precio_min, p_precio_max, p_habitaciones_min, p_poligono
        ) c
      )
      order by i.vigente_hasta desc, i.created_at desc
      limit v_limite
    ) r
  ), '[]'::jsonb);
end;
$$;

-- ── 4. Historial de precios y el precio del dueño ───────────────────────────────

create function public.registrar_cambio_precio()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.cambios_de_precio (inmueble_id, anterior, nuevo)
  values (new.id, old.precio_esperado, new.precio_esperado);
  return null;
end;
$$;

create trigger inmuebles_cambio_precio
  after update of precio_esperado on public.inmuebles
  for each row
  when (old.precio_esperado is distinct from new.precio_esperado)
  execute function public.registrar_cambio_precio();

-- El dueño cambia el precio de su anuncio con el token de «Mi anuncio». Mismo rango que la tabla; a lo
-- más 5 cambios en 24 h (el historial alimenta los avisos de «bajó de precio»).
create function public.guardar_precio(p_token text, p_precio bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inmueble uuid := public.inmueble_de_token(p_token);
begin
  if v_inmueble is null then
    raise exception 'token_invalido';
  end if;
  if p_precio is null or p_precio not between 1000000 and 900000000000 then
    raise exception 'precio_invalido' using errcode = 'check_violation';
  end if;
  if (select count(*) from public.cambios_de_precio
       where inmueble_id = v_inmueble and created_at > now() - interval '24 hours') >= 5 then
    raise exception 'demasiados_cambios' using errcode = 'check_violation';
  end if;
  update public.inmuebles set precio_esperado = p_precio where id = v_inmueble;
  return jsonb_build_object('precio_esperado', p_precio);
end;
$$;

-- ── 5. Favoritos (el comprador con WhatsApp verificado; antes viven en su teléfono) ─

-- Los visibles de una lista de slugs, en el mismo orden, con la lista blanca de `/buscar`. Lo usan los
-- favoritos del teléfono (sin cuenta) y comparar. Máx. 100.
create function public.resumen_anuncios(p_slugs text[])
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(public.fila_anuncio(i.id) order by t.ord), '[]'::jsonb)
    from unnest((coalesce(p_slugs, '{}'::text[]))[1:100]) with ordinality as t(slug, ord)
    join public.inmuebles i on i.slug = t.slug
   where i.vigente_hasta > now()
     and i.estado = 'publicado_fundador'
$$;

create function public.mis_favoritos(p_sesion_hash text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_comprador uuid := public.comprador_de_sesion(p_sesion_hash);
begin
  if v_comprador is null then
    raise exception 'no_verificado' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(i.slug order by f.created_at desc)
      from public.favoritos f
      join public.inmuebles i on i.id = f.inmueble_id
     where f.comprador_id = v_comprador
       and i.vigente_hasta > now()
       and i.estado = 'publicado_fundador'
       and i.slug is not null
  ), '[]'::jsonb);
end;
$$;

-- Pasa los favoritos del teléfono a la cuenta, sin duplicar; conserva los 100 más nuevos. Devuelve la lista
-- completa (los slugs) para que el teléfono quede igual que la cuenta.
create function public.fusionar_favoritos(p_sesion_hash text, p_slugs text[])
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_comprador uuid := public.comprador_de_sesion(p_sesion_hash);
begin
  if v_comprador is null then
    raise exception 'no_verificado' using errcode = '42501';
  end if;
  insert into public.favoritos (comprador_id, inmueble_id)
  select v_comprador, i.id
    from unnest((coalesce(p_slugs, '{}'::text[]))[1:100]) as t(slug)
    join public.inmuebles i on i.slug = t.slug
   where i.vigente_hasta > now()
     and i.estado = 'publicado_fundador'
  on conflict do nothing;
  delete from public.favoritos f
   where f.comprador_id = v_comprador
     and f.inmueble_id in (
       select x.inmueble_id from public.favoritos x
        where x.comprador_id = v_comprador
        order by x.created_at desc, x.inmueble_id
        offset 100
     );
  return public.mis_favoritos(p_sesion_hash);
end;
$$;

create function public.quitar_favorito(p_sesion_hash text, p_slug text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_comprador uuid := public.comprador_de_sesion(p_sesion_hash);
begin
  if v_comprador is null then
    raise exception 'no_verificado' using errcode = '42501';
  end if;
  delete from public.favoritos
   where comprador_id = v_comprador
     and inmueble_id = (select id from public.inmuebles where slug = p_slug);
end;
$$;

-- ── 6. Listas compartidas con notas ─────────────────────────────────────────────

-- Una lista con sus anuncios y las notas de cada uno, para quien la mira. `p_comprador` (null si no hay
-- sesión verificada) decide `es_dueno`, `es_mia` y `puede_escribir`. De la gente solo sale el PRIMER nombre.
create function public.lista_detalle(p_lista uuid, p_comprador uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', l.id,
    'nombre', l.nombre,
    'dueno', split_part(btrim(d.nombre), ' ', 1),
    'es_dueno', p_comprador is not null and l.comprador_id = p_comprador,
    'puede_escribir', p_comprador is not null,
    'compartida', l.compartir_hash is not null,
    'no_disponibles', (
      select count(*) from public.lista_inmuebles li
        join public.inmuebles i on i.id = li.inmueble_id
       where li.lista_id = l.id
         and not (i.vigente_hasta > now() and i.estado = 'publicado_fundador' and i.slug is not null)
    ),
    'items', coalesce((
      select jsonb_agg(
               public.fila_anuncio(i.id) || jsonb_build_object(
                 'notas', coalesce((
                   select jsonb_agg(
                            jsonb_build_object(
                              'id', n.id,
                              'autor', split_part(btrim(c.nombre), ' ', 1),
                              'es_mia', p_comprador is not null and n.comprador_id = p_comprador,
                              'texto', n.texto,
                              'created_at', n.created_at
                            ) order by n.created_at
                          )
                     from public.notas_lista n
                     join public.compradores c on c.id = n.comprador_id
                    where n.lista_id = l.id and n.inmueble_id = li.inmueble_id
                 ), '[]'::jsonb)
               ) order by li.created_at desc
             )
        from public.lista_inmuebles li
        join public.inmuebles i on i.id = li.inmueble_id
       where li.lista_id = l.id
         and i.vigente_hasta > now() and i.estado = 'publicado_fundador' and i.slug is not null
    ), '[]'::jsonb)
  )
  from public.listas l
  join public.compradores d on d.id = l.comprador_id
  where l.id = p_lista
$$;

create function public.mis_listas(p_sesion_hash text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_comprador uuid := public.comprador_de_sesion(p_sesion_hash);
begin
  if v_comprador is null then
    raise exception 'no_verificado' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(
             jsonb_build_object(
               'id', l.id,
               'nombre', l.nombre,
               'compartida', l.compartir_hash is not null,
               'slugs', coalesce((
                 select jsonb_agg(i.slug order by li.created_at desc)
                   from public.lista_inmuebles li
                   join public.inmuebles i on i.id = li.inmueble_id
                  where li.lista_id = l.id
                    and i.vigente_hasta > now() and i.estado = 'publicado_fundador' and i.slug is not null
               ), '[]'::jsonb),
               'notas', (select count(*) from public.notas_lista n where n.lista_id = l.id)
             ) order by l.created_at desc
           )
      from public.listas l
     where l.comprador_id = v_comprador
  ), '[]'::jsonb);
end;
$$;

create function public.crear_lista(p_sesion_hash text, p_nombre text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_comprador uuid := public.comprador_de_sesion(p_sesion_hash);
  v_nombre text := btrim(coalesce(p_nombre, ''));
  v_id uuid;
begin
  if v_comprador is null then
    raise exception 'no_verificado' using errcode = '42501';
  end if;
  if length(v_nombre) not between 1 and 60 then
    raise exception 'nombre_invalido' using errcode = 'check_violation';
  end if;
  if (select count(*) from public.listas where comprador_id = v_comprador) >= 10 then
    raise exception 'demasiadas_listas' using errcode = 'check_violation';
  end if;
  insert into public.listas (comprador_id, nombre) values (v_comprador, v_nombre) returning id into v_id;
  return v_id;
end;
$$;

create function public.renombrar_lista(p_sesion_hash text, p_lista uuid, p_nombre text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_comprador uuid := public.comprador_de_sesion(p_sesion_hash);
  v_nombre text := btrim(coalesce(p_nombre, ''));
begin
  if v_comprador is null then
    raise exception 'no_verificado' using errcode = '42501';
  end if;
  if length(v_nombre) not between 1 and 60 then
    raise exception 'nombre_invalido' using errcode = 'check_violation';
  end if;
  update public.listas set nombre = v_nombre where id = p_lista and comprador_id = v_comprador;
  if not found then
    raise exception 'no_disponible' using errcode = 'P0002';
  end if;
end;
$$;

create function public.borrar_lista(p_sesion_hash text, p_lista uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_comprador uuid := public.comprador_de_sesion(p_sesion_hash);
begin
  if v_comprador is null then
    raise exception 'no_verificado' using errcode = '42501';
  end if;
  delete from public.listas where id = p_lista and comprador_id = v_comprador;
  if not found then
    raise exception 'no_disponible' using errcode = 'P0002';
  end if;
end;
$$;

create function public.agregar_a_lista(p_sesion_hash text, p_lista uuid, p_slug text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_comprador uuid := public.comprador_de_sesion(p_sesion_hash);
  v_inmueble uuid;
begin
  if v_comprador is null then
    raise exception 'no_verificado' using errcode = '42501';
  end if;
  if not exists (select 1 from public.listas where id = p_lista and comprador_id = v_comprador) then
    raise exception 'no_disponible' using errcode = 'P0002';
  end if;
  select i.id into v_inmueble from public.inmuebles i
   where i.slug = p_slug and i.vigente_hasta > now() and i.estado = 'publicado_fundador';
  if v_inmueble is null then
    raise exception 'no_disponible' using errcode = 'P0002';
  end if;
  if (select count(*) from public.lista_inmuebles where lista_id = p_lista) >= 30
     and not exists (select 1 from public.lista_inmuebles
                      where lista_id = p_lista and inmueble_id = v_inmueble) then
    raise exception 'lista_llena' using errcode = 'check_violation';
  end if;
  insert into public.lista_inmuebles (lista_id, inmueble_id) values (p_lista, v_inmueble)
  on conflict do nothing;
end;
$$;

create function public.quitar_de_lista(p_sesion_hash text, p_lista uuid, p_slug text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_comprador uuid := public.comprador_de_sesion(p_sesion_hash);
begin
  if v_comprador is null then
    raise exception 'no_verificado' using errcode = '42501';
  end if;
  if not exists (select 1 from public.listas where id = p_lista and comprador_id = v_comprador) then
    raise exception 'no_disponible' using errcode = 'P0002';
  end if;
  delete from public.lista_inmuebles
   where lista_id = p_lista
     and inmueble_id = (select id from public.inmuebles where slug = p_slug);
end;
$$;

-- Un enlace NUEVO para compartir: el anterior deja de servir. El token sale una vez; en la base queda su hash.
create function public.compartir_lista(p_sesion_hash text, p_lista uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_comprador uuid := public.comprador_de_sesion(p_sesion_hash);
  v_token text;
begin
  if v_comprador is null then
    raise exception 'no_verificado' using errcode = '42501';
  end if;
  v_token := public.generar_token();
  update public.listas set compartir_hash = public.hash_token(v_token)
   where id = p_lista and comprador_id = v_comprador;
  if not found then
    raise exception 'no_disponible' using errcode = 'P0002';
  end if;
  return v_token;
end;
$$;

create function public.revocar_lista(p_sesion_hash text, p_lista uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_comprador uuid := public.comprador_de_sesion(p_sesion_hash);
begin
  if v_comprador is null then
    raise exception 'no_verificado' using errcode = '42501';
  end if;
  update public.listas set compartir_hash = null where id = p_lista and comprador_id = v_comprador;
  if not found then
    raise exception 'no_disponible' using errcode = 'P0002';
  end if;
end;
$$;

-- Ver una lista: por el token del enlace (cualquiera, con o sin sesión) o por su id (solo la dueña, con
-- sesión verificada). Un enlace revocado o inexistente es `no_disponible`.
create function public.obtener_lista(p_sesion_hash text, p_token text, p_lista uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_comprador uuid := public.comprador_de_sesion(p_sesion_hash);
  v_lista uuid;
begin
  if p_token is not null then
    select l.id into v_lista from public.listas l
     where length(p_token) = 43 and l.compartir_hash = public.hash_token(p_token);
  elsif p_lista is not null and v_comprador is not null then
    select l.id into v_lista from public.listas l
     where l.id = p_lista and l.comprador_id = v_comprador;
  end if;
  if v_lista is null then
    raise exception 'no_disponible' using errcode = 'P0002';
  end if;
  return public.lista_detalle(v_lista, v_comprador);
end;
$$;

-- Escribir una nota exige el WhatsApp verificado (también a quien llega por el enlace). Se escribe en una
-- lista por su token (p_token) o por su id si es la dueña (p_lista). Máx. 280 caracteres, 50 al día.
create function public.escribir_nota(
  p_sesion_hash text,
  p_lista uuid,
  p_token text,
  p_slug text,
  p_texto text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_comprador uuid := public.comprador_de_sesion(p_sesion_hash);
  v_lista uuid;
  v_inmueble uuid;
  v_texto text := btrim(coalesce(p_texto, ''));
  v_id uuid;
begin
  if v_comprador is null then
    raise exception 'no_verificado' using errcode = '42501';
  end if;
  if p_token is not null then
    select l.id into v_lista from public.listas l
     where length(p_token) = 43 and l.compartir_hash = public.hash_token(p_token);
  elsif p_lista is not null then
    select l.id into v_lista from public.listas l
     where l.id = p_lista and l.comprador_id = v_comprador;
  end if;
  if v_lista is null then
    raise exception 'no_disponible' using errcode = 'P0002';
  end if;
  if length(v_texto) not between 1 and 280 then
    raise exception 'nota_invalida' using errcode = 'check_violation';
  end if;
  select li.inmueble_id into v_inmueble
    from public.lista_inmuebles li
    join public.inmuebles i on i.id = li.inmueble_id
   where li.lista_id = v_lista and i.slug = p_slug;
  if v_inmueble is null then
    raise exception 'no_disponible' using errcode = 'P0002';
  end if;
  if (select count(*) from public.notas_lista
       where comprador_id = v_comprador and created_at > now() - interval '24 hours') >= 50
     or (select count(*) from public.notas_lista where lista_id = v_lista) >= 300 then
    raise exception 'demasiadas_notas' using errcode = 'check_violation';
  end if;
  insert into public.notas_lista (lista_id, inmueble_id, comprador_id, texto)
  values (v_lista, v_inmueble, v_comprador, v_texto)
  returning id into v_id;
  return v_id;
end;
$$;

-- Borra una nota quien la escribió o la dueña de la lista.
create function public.borrar_nota(p_sesion_hash text, p_nota uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_comprador uuid := public.comprador_de_sesion(p_sesion_hash);
begin
  if v_comprador is null then
    raise exception 'no_verificado' using errcode = '42501';
  end if;
  delete from public.notas_lista n
   where n.id = p_nota
     and (n.comprador_id = v_comprador
          or exists (select 1 from public.listas l where l.id = n.lista_id and l.comprador_id = v_comprador));
  if not found then
    raise exception 'no_disponible' using errcode = 'P0002';
  end if;
end;
$$;

-- ── 7. Alertas por correo ───────────────────────────────────────────────────────

-- El cupo diario de correos: las visitas siempre salen y solo se cuentan; las alertas reservan antes de enviar.
create function public.sumar_correos_dia(p_clase text, p_n integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_clase not in ('visita', 'alerta') or p_n is null or p_n < 0 then
    raise exception 'clase_invalida' using errcode = 'check_violation';
  end if;
  if p_clase = 'visita' then
    insert into public.correos_dia (dia, visita) values (public.dia_bogota(), p_n)
    on conflict (dia) do update set visita = public.correos_dia.visita + excluded.visita;
  else
    insert into public.correos_dia (dia, alerta) values (public.dia_bogota(), p_n)
    on conflict (dia) do update set alerta = public.correos_dia.alerta + excluded.alerta;
  end if;
end;
$$;

-- Crea una alerta SIN confirmar y devuelve sus dos tokens (el de gestionar se queda en el teléfono que la
-- creó; el de confirmar va SOLO por correo). Solo el servidor: si `anon` pudiera llamarla se llevaría el token
-- de confirmar y la doble confirmación no serviría. Reserva el cupo del correo de confirmación.
create function public.crear_alerta(
  p_email text,
  p_idioma text,
  p_nombre text,
  p_operacion public.operacion,
  p_tipo public.tipo_inmueble,
  p_localidad text,
  p_precio_min bigint,
  p_precio_max bigint,
  p_habitaciones_min smallint,
  p_poligono text,
  p_avisar_nuevos boolean,
  p_avisar_bajas boolean,
  p_consentimiento boolean,
  p_ip_hash text,
  p_tope integer default 250
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_nombre text := btrim(coalesce(p_nombre, ''));
  v_localidad text := nullif(btrim(coalesce(p_localidad, '')), '');
  v_hoy date := public.dia_bogota();
  v_usado integer;
  v_id uuid;
  v_gestionar text;
  v_confirmar text;
begin
  if p_consentimiento is distinct from true then
    raise exception 'consentimiento_requerido' using errcode = 'check_violation';
  end if;
  if length(v_email) > 254 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'email_invalido' using errcode = 'check_violation';
  end if;
  if length(v_nombre) not between 1 and 80 then
    raise exception 'nombre_invalido' using errcode = 'check_violation';
  end if;
  if p_idioma is null or p_idioma not in ('es', 'en') then
    raise exception 'idioma_invalido' using errcode = 'check_violation';
  end if;
  if not (coalesce(p_avisar_nuevos, false) or coalesce(p_avisar_bajas, false)) then
    raise exception 'sin_aviso' using errcode = 'check_violation';
  end if;
  if p_operacion is null and p_tipo is null and v_localidad is null and p_precio_min is null
     and p_precio_max is null and p_habitaciones_min is null and p_poligono is null then
    raise exception 'sin_criterios' using errcode = 'check_violation';
  end if;
  if (p_precio_min is not null and p_precio_min not between 0 and 900000000000)
     or (p_precio_max is not null and p_precio_max not between 0 and 900000000000)
     or (p_precio_min is not null and p_precio_max is not null and p_precio_min > p_precio_max)
     or (p_habitaciones_min is not null and p_habitaciones_min not between 0 and 40) then
    raise exception 'criterios_invalidos' using errcode = 'check_violation';
  end if;
  perform public.validar_poligono(p_poligono);
  if p_poligono is not null and length(p_poligono) > 4000 then
    raise exception 'poligono_invalido' using errcode = 'check_violation';
  end if;
  if p_ip_hash is null or length(p_ip_hash) < 8 then
    raise exception 'ip_invalida' using errcode = 'check_violation';
  end if;

  -- Contra el abuso (un correo ajeno recibiendo avisos): 3 por correo y 10 por IP cada 24 h, contadas aunque
  -- se hayan borrado; y quien rechazó una alerta que no pidió no vuelve a recibir otra en 30 días. Un solo
  -- código para los tres: no se le dice a nadie cuál fue.
  if (select count(*) from public.alertas where email = v_email and created_at > now() - interval '24 hours') >= 3
     or (select count(*) from public.alertas where ip_hash = p_ip_hash and created_at > now() - interval '24 hours') >= 10
     or exists (select 1 from public.alertas
                 where email = v_email and confirmada_at is null and baja_at is not null
                   and baja_at > now() - interval '30 days') then
    raise exception 'demasiadas_alertas' using errcode = 'check_violation';
  end if;

  -- El cupo del correo de confirmación.
  perform pg_advisory_xact_lock(hashtext('correos_dia'));
  select coalesce((select visita + alerta from public.correos_dia where dia = v_hoy), 0)
       + coalesce((select sum(enviados) from public.envios
                    where (created_at at time zone 'America/Bogota')::date = v_hoy), 0)
    into v_usado;
  if v_usado >= coalesce(p_tope, 250) then
    raise exception 'sin_cupo' using errcode = 'check_violation';
  end if;
  insert into public.correos_dia (dia, alerta) values (v_hoy, 1)
  on conflict (dia) do update set alerta = public.correos_dia.alerta + 1;

  insert into public.alertas (
    email, idioma, nombre, operacion, tipo, localidad, precio_min, precio_max, habitaciones_min,
    poligono, avisar_nuevos, avisar_bajas, consentimiento_at, ip_hash
  ) values (
    v_email, p_idioma, v_nombre, p_operacion, p_tipo, v_localidad, p_precio_min, p_precio_max,
    p_habitaciones_min, p_poligono, coalesce(p_avisar_nuevos, false), coalesce(p_avisar_bajas, false),
    now(), p_ip_hash
  ) returning id into v_id;

  v_gestionar := public.generar_token();
  v_confirmar := public.generar_token();
  insert into public.enlaces_alerta (alerta_id, proposito, origen, token_hash) values
    (v_id, 'gestionar', 'creacion', public.hash_token(v_gestionar)),
    (v_id, 'confirmar', 'creacion', public.hash_token(v_confirmar));

  return jsonb_build_object('alerta_id', v_id, 'gestionar', v_gestionar, 'confirmar', v_confirmar);
end;
$$;

-- Confirma el correo con el token que llegó POR CORREO (un uso, 7 días). Repetirlo no hace nada nuevo.
create function public.confirmar_alerta(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  e public.enlaces_alerta;
  a public.alertas;
begin
  select * into e from public.enlaces_alerta
   where proposito = 'confirmar' and length(p_token) = 43 and token_hash = public.hash_token(p_token);
  if not found then
    raise exception 'token_invalido';
  end if;
  select * into a from public.alertas where id = e.alerta_id;
  if a.baja_at is not null then
    raise exception 'token_invalido';
  end if;
  if e.usado_at is not null then
    return jsonb_build_object('estado', 'ya_confirmada', 'nombre', a.nombre);
  end if;
  if e.created_at < now() - interval '7 days' then
    raise exception 'token_invalido';
  end if;
  update public.alertas set confirmada_at = now(), desde_at = now() where id = a.id;
  update public.enlaces_alerta set usado_at = now() where id = e.id;
  return jsonb_build_object('estado', 'confirmada', 'nombre', a.nombre);
end;
$$;

-- «Mis alertas» de un teléfono: recibe los tokens de gestionar que guarda (máx. 20) y devuelve cada alerta con
-- su índice en esa lista. El correo sale enmascarado y NUNCA salen tokens.
create function public.obtener_alertas(p_tokens text[])
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(q.alerta order by q.ord), '[]'::jsonb)
    from (
      select t.ord,
             jsonb_build_object(
               'indice', t.ord - 1,
               'nombre', a.nombre,
               'estado', case
                           when a.confirmada_at is null then 'sin_confirmar'
                           when a.pausada_at is not null then 'pausada'
                           else 'activa'
                         end,
               'correo', left(split_part(a.email, '@', 1), 1) || '***@' || split_part(a.email, '@', 2),
               'operacion', a.operacion,
               'tipo', a.tipo,
               'localidad', a.localidad,
               'precio_min', a.precio_min,
               'precio_max', a.precio_max,
               'habitaciones_min', a.habitaciones_min,
               'poligono', a.poligono,
               'avisar_nuevos', a.avisar_nuevos,
               'avisar_bajas', a.avisar_bajas,
               'ultimo_envio_at', a.ultimo_envio_at,
               'ultimo_resumen', a.ultimo_resumen,
               'created_at', a.created_at
             ) as alerta
        from unnest((coalesce(p_tokens, '{}'::text[]))[1:20]) with ordinality as t(token, ord)
        join public.enlaces_alerta e
          on e.proposito = 'gestionar' and length(t.token) = 43 and e.token_hash = public.hash_token(t.token)
        join public.alertas a on a.id = e.alerta_id and a.baja_at is null
    ) q
$$;

-- Pausar, reanudar, cambiar qué se avisa o borrar, con el token de gestionar. Reanudar empieza la ventana de
-- ahora (no manda de golpe lo de semanas de pausa).
create function public.gestionar_alerta(p_token text, p_accion text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  a public.alertas;
begin
  select e.alerta_id into v_id
    from public.enlaces_alerta e
    join public.alertas x on x.id = e.alerta_id and x.baja_at is null
   where e.proposito = 'gestionar' and length(p_token) = 43 and e.token_hash = public.hash_token(p_token);
  if v_id is null then
    raise exception 'token_invalido';
  end if;
  select * into a from public.alertas where id = v_id;

  case p_accion
    when 'pausar' then
      update public.alertas set pausada_at = coalesce(pausada_at, now()) where id = v_id;
    when 'reanudar' then
      update public.alertas set pausada_at = null, desde_at = now() where id = v_id and pausada_at is not null;
    when 'bajas_si' then
      update public.alertas set avisar_bajas = true where id = v_id;
    when 'bajas_no' then
      if not a.avisar_nuevos then
        raise exception 'sin_aviso' using errcode = 'check_violation';
      end if;
      update public.alertas set avisar_bajas = false where id = v_id;
    when 'nuevos_si' then
      update public.alertas set avisar_nuevos = true where id = v_id;
    when 'nuevos_no' then
      if not a.avisar_bajas then
        raise exception 'sin_aviso' using errcode = 'check_violation';
      end if;
      update public.alertas set avisar_nuevos = false where id = v_id;
    when 'borrar' then
      update public.alertas set baja_at = now() where id = v_id;
      return jsonb_build_object('estado', 'borrada');
    else
      raise exception 'accion_invalida' using errcode = 'check_violation';
  end case;

  select * into a from public.alertas where id = v_id;
  return jsonb_build_object(
    'estado', case when a.confirmada_at is null then 'sin_confirmar'
                   when a.pausada_at is not null then 'pausada' else 'activa' end,
    'avisar_nuevos', a.avisar_nuevos,
    'avisar_bajas', a.avisar_bajas
  );
end;
$$;

-- La baja en un clic: el token de baja de cualquier correo, sin sesión. Repetirla no cambia nada.
create function public.baja_alerta(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_nombre text;
begin
  select e.alerta_id, x.nombre into v_id, v_nombre
    from public.enlaces_alerta e
    join public.alertas x on x.id = e.alerta_id
   where e.proposito = 'baja' and length(p_token) = 43 and e.token_hash = public.hash_token(p_token);
  if v_id is null then
    raise exception 'token_invalido';
  end if;
  update public.alertas set baja_at = coalesce(baja_at, now()) where id = v_id;
  return jsonb_build_object('estado', 'baja', 'nombre', v_nombre);
end;
$$;

-- El resumen diario (lo llama el cron con la llave de servicio). Para cada alerta confirmada, activa y sin
-- resumen hoy, mira lo que pasó en su ventana [desde, ahora]:
--   · NUEVOS: anuncios que cumplen la búsqueda y se publicaron en la ventana;
--   · BAJAS: anuncios que ya existían, cumplen la búsqueda y cuyo precio de ahora es MENOR que el que tenían al
--     empezar la ventana (el `anterior` del primer cambio dentro de ella): bajar y volver a subir no avisa.
-- Las que tienen algo y caben en el cupo se RECLAMAN de una vez (a lo sumo un resumen por alerta y día; si
-- Brevo falla después, ese resumen se pierde, nunca se duplica). Las que no tienen nada avanzan su ventana. Las
-- que el cupo dejó fuera NO avanzan: salen mañana con su ventana completa. Los tokens de baja y de gestionar
-- nacen aquí, uno nuevo por correo. `p_alerta` (opcional) limita el reclamo a UNA alerta: lo usan las pruebas
-- para no robarse los resúmenes entre sí en una base compartida; el cron no lo pasa.
create function public.reclamar_resumenes(p_tope integer default 250, p_alerta uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hoy date := public.dia_bogota();
  v_ahora timestamptz := clock_timestamp();
  v_usado integer;
  v_libre integer;
  r public.alertas;
  v_desde timestamptz;
  v_nuevos jsonb;
  v_bajas jsonb;
  v_n_nuevos integer;
  v_n_bajas integer;
  v_gestionar text;
  v_baja text;
  v_salida jsonb := '[]'::jsonb;
  v_enviadas integer := 0;
  v_diferidas integer := 0;
  v_vacias integer := 0;
begin
  perform pg_advisory_xact_lock(hashtext('correos_dia'));
  select coalesce((select visita + alerta from public.correos_dia where dia = v_hoy), 0)
       + coalesce((select sum(enviados) from public.envios
                    where (created_at at time zone 'America/Bogota')::date = v_hoy), 0)
    into v_usado;
  v_libre := greatest(coalesce(p_tope, 250) - v_usado, 0);

  for r in
    select * from public.alertas
     where confirmada_at is not null and baja_at is null and pausada_at is null
       and (p_alerta is null or id = p_alerta)
       and (ultimo_envio_at is null or (ultimo_envio_at at time zone 'America/Bogota')::date < v_hoy)
     order by coalesce(ultimo_envio_at, confirmada_at), created_at
  loop
    v_desde := coalesce(r.desde_at, r.confirmada_at);
    v_n_nuevos := 0;
    v_n_bajas := 0;
    v_nuevos := '[]'::jsonb;
    v_bajas := '[]'::jsonb;

    if r.avisar_nuevos then
      with n as (
        select i.id, row_number() over (order by i.created_at desc) as rn
          from public.inmuebles i
         where i.id in (
                 select c from public.inmuebles_que_cumplen(
                   r.operacion, r.tipo, r.localidad, r.precio_min, r.precio_max, r.habitaciones_min, r.poligono
                 ) c)
           and i.created_at > v_desde and i.created_at <= v_ahora
      )
      select count(*)::integer,
             coalesce(jsonb_agg(public.fila_anuncio(n.id) order by n.rn) filter (where n.rn <= 10), '[]'::jsonb)
        into v_n_nuevos, v_nuevos
        from n;
    end if;

    if r.avisar_bajas then
      with b as (
        select i.id, p.anterior,
               row_number() over (order by (p.anterior - i.precio_esperado) desc, i.id) as rn
          from public.inmuebles i
          join lateral (
                 select c.anterior from public.cambios_de_precio c
                  where c.inmueble_id = i.id and c.created_at > v_desde and c.created_at <= v_ahora
                  order by c.created_at
                  limit 1
               ) p on true
         where i.id in (
                 select c from public.inmuebles_que_cumplen(
                   r.operacion, r.tipo, r.localidad, r.precio_min, r.precio_max, r.habitaciones_min, r.poligono
                 ) c)
           and i.created_at <= v_desde
           and i.precio_esperado < p.anterior
      )
      select count(*)::integer,
             coalesce(jsonb_agg(
               public.fila_anuncio(b.id) || jsonb_build_object('precio_anterior', b.anterior) order by b.rn
             ) filter (where b.rn <= 10), '[]'::jsonb)
        into v_n_bajas, v_bajas
        from b;
    end if;

    if v_n_nuevos + v_n_bajas = 0 then
      update public.alertas set desde_at = v_ahora where id = r.id;
      v_vacias := v_vacias + 1;
    elsif v_libre <= 0 then
      v_diferidas := v_diferidas + 1;
    else
      v_gestionar := public.generar_token();
      v_baja := public.generar_token();
      insert into public.enlaces_alerta (alerta_id, proposito, origen, token_hash) values
        (r.id, 'gestionar', 'correo', public.hash_token(v_gestionar)),
        (r.id, 'baja', 'correo', public.hash_token(v_baja));
      update public.alertas
         set ultimo_envio_at = v_ahora,
             desde_at = v_ahora,
             ultimo_resumen = jsonb_build_object('nuevos', v_n_nuevos, 'bajas', v_n_bajas)
       where id = r.id;
      v_libre := v_libre - 1;
      v_enviadas := v_enviadas + 1;
      v_salida := v_salida || jsonb_build_object(
        'alerta_id', r.id,
        'email', r.email,
        'idioma', r.idioma,
        'nombre', r.nombre,
        'operacion', r.operacion,
        'tipo', r.tipo,
        'localidad', r.localidad,
        'precio_min', r.precio_min,
        'precio_max', r.precio_max,
        'habitaciones_min', r.habitaciones_min,
        'poligono', r.poligono,
        'total_nuevos', v_n_nuevos,
        'total_bajas', v_n_bajas,
        'nuevos', v_nuevos,
        'bajas', v_bajas,
        'token_gestionar', v_gestionar,
        'token_baja', v_baja
      );
    end if;
  end loop;

  if v_enviadas > 0 then
    insert into public.correos_dia (dia, alerta) values (v_hoy, v_enviadas)
    on conflict (dia) do update set alerta = public.correos_dia.alerta + excluded.alerta;
  end if;

  return jsonb_build_object('alertas', v_salida, 'diferidas', v_diferidas, 'sin_novedad', v_vacias);
end;
$$;

-- ── 8. purgar_vencidos, ampliada (misma firma; conserva sus dos claves) ─────────

create or replace function public.purgar_vencidos()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_compradores integer;
  v_verificaciones integer;
  v_alertas integer;
  v_cambios integer;
  v_cupos integer;
  v_enlaces integer;
begin
  with b as (
    delete from public.verificaciones
     where usado_at is null and vence_at < now() - interval '7 days'
    returning 1
  )
  select count(*) into v_verificaciones from b;
  with b as (
    delete from public.compradores
     where verificado_at is null and created_at < now() - interval '30 days'
    returning 1
  )
  select count(*) into v_compradores from b;

  -- Alertas que nadie confirmó (7 días) y las dadas de baja (30 días). Se llevan sus enlaces.
  with b as (
    delete from public.alertas
     where (confirmada_at is null and created_at < now() - interval '7 days')
        or (baja_at is not null and baja_at < now() - interval '30 days')
    returning 1
  )
  select count(*) into v_alertas from b;
  -- Los enlaces de cada aviso a los 60 días y los de confirmar a los 14; el de gestionar con el que nació la
  -- alerta (lo guarda el teléfono que la creó) vive lo que viva la alerta.
  with b as (
    delete from public.enlaces_alerta
     where (origen = 'correo' and created_at < now() - interval '60 days')
        or (proposito = 'confirmar' and created_at < now() - interval '14 days')
    returning 1
  )
  select count(*) into v_enlaces from b;
  with b as (
    delete from public.cambios_de_precio where created_at < now() - interval '90 days' returning 1
  )
  select count(*) into v_cambios from b;
  with b as (
    delete from public.correos_dia where dia < public.dia_bogota() - 60 returning 1
  )
  select count(*) into v_cupos from b;

  return jsonb_build_object(
    'compradores', v_compradores,
    'verificaciones', v_verificaciones,
    'alertas', v_alertas,
    'enlaces', v_enlaces,
    'cambios_de_precio', v_cambios,
    'correos_dia', v_cupos
  );
end;
$$;

-- ── 9. Privilegios EXPLÍCITOS, por firma (las funciones nuevas nacen cerradas: migración 6) ──

-- Ayudantes internos y el trigger: ni la API ni el servidor; solo las funciones definer que los usan.
revoke all on function public.hash_token(text) from public;
revoke all on function public.generar_token() from public;
revoke all on function public.dia_bogota() from public;
revoke all on function public.validar_poligono(text) from public;
revoke all on function public.inmuebles_que_cumplen(
  public.operacion, public.tipo_inmueble, text, bigint, bigint, smallint, text) from public;
revoke all on function public.fila_anuncio(uuid) from public;
revoke all on function public.lista_detalle(uuid, uuid) from public;
revoke all on function public.registrar_cambio_precio() from public;

-- Públicas (anon + authenticated + service_role).
revoke all on function public.guardar_precio(text, bigint) from public;
grant execute on function public.guardar_precio(text, bigint) to anon, authenticated, service_role;

revoke all on function public.resumen_anuncios(text[]) from public;
grant execute on function public.resumen_anuncios(text[]) to anon, authenticated, service_role;

revoke all on function public.mis_favoritos(text) from public;
grant execute on function public.mis_favoritos(text) to anon, authenticated, service_role;

revoke all on function public.fusionar_favoritos(text, text[]) from public;
grant execute on function public.fusionar_favoritos(text, text[]) to anon, authenticated, service_role;

revoke all on function public.quitar_favorito(text, text) from public;
grant execute on function public.quitar_favorito(text, text) to anon, authenticated, service_role;

revoke all on function public.mis_listas(text) from public;
grant execute on function public.mis_listas(text) to anon, authenticated, service_role;

revoke all on function public.crear_lista(text, text) from public;
grant execute on function public.crear_lista(text, text) to anon, authenticated, service_role;

revoke all on function public.renombrar_lista(text, uuid, text) from public;
grant execute on function public.renombrar_lista(text, uuid, text) to anon, authenticated, service_role;

revoke all on function public.borrar_lista(text, uuid) from public;
grant execute on function public.borrar_lista(text, uuid) to anon, authenticated, service_role;

revoke all on function public.agregar_a_lista(text, uuid, text) from public;
grant execute on function public.agregar_a_lista(text, uuid, text) to anon, authenticated, service_role;

revoke all on function public.quitar_de_lista(text, uuid, text) from public;
grant execute on function public.quitar_de_lista(text, uuid, text) to anon, authenticated, service_role;

revoke all on function public.compartir_lista(text, uuid) from public;
grant execute on function public.compartir_lista(text, uuid) to anon, authenticated, service_role;

revoke all on function public.revocar_lista(text, uuid) from public;
grant execute on function public.revocar_lista(text, uuid) to anon, authenticated, service_role;

revoke all on function public.obtener_lista(text, text, uuid) from public;
grant execute on function public.obtener_lista(text, text, uuid) to anon, authenticated, service_role;

revoke all on function public.escribir_nota(text, uuid, text, text, text) from public;
grant execute on function public.escribir_nota(text, uuid, text, text, text) to anon, authenticated, service_role;

revoke all on function public.borrar_nota(text, uuid) from public;
grant execute on function public.borrar_nota(text, uuid) to anon, authenticated, service_role;

revoke all on function public.confirmar_alerta(text) from public;
grant execute on function public.confirmar_alerta(text) to anon, authenticated, service_role;

revoke all on function public.obtener_alertas(text[]) from public;
grant execute on function public.obtener_alertas(text[]) to anon, authenticated, service_role;

revoke all on function public.gestionar_alerta(text, text) from public;
grant execute on function public.gestionar_alerta(text, text) to anon, authenticated, service_role;

revoke all on function public.baja_alerta(text) from public;
grant execute on function public.baja_alerta(text) to anon, authenticated, service_role;

-- Solo el servidor, con la llave de servicio: jamás `anon` ni `authenticated`.
revoke all on function public.crear_alerta(
  text, text, text, public.operacion, public.tipo_inmueble, text, bigint, bigint, smallint, text,
  boolean, boolean, boolean, text, integer) from public;
grant execute on function public.crear_alerta(
  text, text, text, public.operacion, public.tipo_inmueble, text, bigint, bigint, smallint, text,
  boolean, boolean, boolean, text, integer) to service_role;

revoke all on function public.reclamar_resumenes(integer, uuid) from public;
grant execute on function public.reclamar_resumenes(integer, uuid) to service_role;

revoke all on function public.sumar_correos_dia(text, integer) from public;
grant execute on function public.sumar_correos_dia(text, integer) to service_role;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Migración 3 (Sprint 003) — «La campaña encendida»: cupos por zona, referidos,
-- vigencia (anti-zombie B3) y log de envíos. Patrón K5/K6: privilegios de tabla
-- EXPLÍCITOS + RPCs SECURITY DEFINER con search_path='' + GRANTs por rol.
-- Cero IA. Reglas duras: escasez REAL (sin cupo fijado NO hay contador), renovación
-- por POST (nunca GET), datos de terceros jamás expuestos por el código.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── Tablas nuevas ──────────────────────────────────────────────────────────────

-- Zonas (localidades) con cupo fundador OPERABLE. cupo_total NULL = sin cupo fijado
-- ⇒ la zona NO muestra contador (escasez real o no existe). El operador lo fija en el panel.
create table public.zonas (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null unique,
  cupo_total integer check (cupo_total is null or cupo_total >= 0),
  created_at timestamptz not null default now()
);

-- Localidades urbanas de Bogotá. Se siembran SIN cupo (el número lo decide el operador).
insert into public.zonas (nombre) values
  ('Usaquén'), ('Chapinero'), ('Santa Fe'), ('San Cristóbal'), ('Usme'),
  ('Tunjuelito'), ('Bosa'), ('Kennedy'), ('Fontibón'), ('Engativá'),
  ('Suba'), ('Barrios Unidos'), ('Teusaquillo'), ('Los Mártires'),
  ('Antonio Nariño'), ('Puente Aranda'), ('La Candelaria'),
  ('Rafael Uribe Uribe'), ('Ciudad Bolívar')
on conflict (nombre) do nothing;

-- Referidos: código único por fundador (base64url de 6 bytes = 8 chars, NO derivado del nombre).
create table public.referidos (
  codigo      text primary key,
  vendedor_id uuid not null unique references public.vendedores(id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- Log de lotes de campaña (Brevo). El contenido (destinatarios) no se persiste — solo el conteo.
create table public.envios (
  id            uuid primary key default gen_random_uuid(),
  plantilla     text not null,
  filtro        text,
  destinatarios integer not null default 0,
  enviados      integer not null default 0,
  estado        text not null default 'registrado',
  created_at    timestamptz not null default now()
);

-- ── Columnas nuevas ────────────────────────────────────────────────────────────

-- Quién refirió a este vendedor (código del referente). FK al código, no al vendedor.
alter table public.vendedores
  add column referido_por_codigo text references public.referidos(codigo);

-- Zona del inmueble (para el contador de cupos) + vigencia (anti-zombie B3, 60 días).
-- El default con now() se evalúa por-fila al aplicar la migración (backfill de las filas S1/S2).
alter table public.inmuebles
  add column zona_id       uuid references public.zonas(id),
  add column vigente_hasta timestamptz not null default (now() + interval '60 days'),
  add column vigente       boolean not null default true;

create index inmuebles_zona_idx          on public.inmuebles (zona_id);
create index inmuebles_vigente_hasta_idx on public.inmuebles (vigente_hasta);

-- ── registrar_fundador ampliada: + p_ref (atribución) + zona_id + vigencia inicial ──
-- Cambia la firma (15 args) ⇒ DROP + CREATE; el drop borra los grants, se re-otorgan al final.
drop function if exists public.registrar_fundador(
  text, text, text, text, text, public.operacion, public.tipo_inmueble,
  text, text, integer, smallint, bigint, boolean, text
);

create function public.registrar_fundador(
  p_nombre text,
  p_whatsapp text,
  p_email text,
  p_ciudad text,
  p_zona text,
  p_operacion public.operacion,
  p_tipo public.tipo_inmueble,
  p_barrio text,
  p_direccion text,
  p_area integer,
  p_habitaciones smallint,
  p_precio bigint,
  p_consentimiento boolean,
  p_ip_hash text,
  p_ref text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_vendedor_id uuid;
  v_inmueble_id uuid;
  v_slug text;
  v_token text;
  v_zona_id uuid;
begin
  if p_consentimiento is not true then
    raise exception 'consentimiento_requerido' using errcode = 'check_violation';
  end if;

  if p_ip_hash is not null then
    if (
      select count(*) from public.registro_intentos
      where ip_hash = p_ip_hash and creado_at > now() - interval '1 hour'
    ) >= 3 then
      raise exception 'rate_limit_hora' using errcode = 'check_violation';
    end if;
    if (
      select count(*) from public.registro_intentos
      where ip_hash = p_ip_hash and creado_at > now() - interval '1 day'
    ) >= 10 then
      raise exception 'rate_limit_dia' using errcode = 'check_violation';
    end if;
    insert into public.registro_intentos (ip_hash) values (p_ip_hash);
  end if;

  -- Resuelve la localidad → zona_id (para el contador de cupos). Sin match ⇒ null (no cuenta).
  v_zona_id := (
    select id from public.zonas where lower(nombre) = lower(btrim(coalesce(p_zona, '')))
  );

  -- Atribución del referido: solo si el código existe (inválido/ausente ⇒ null, el registro sigue).
  insert into public.vendedores (
    nombre, whatsapp, email, ciudad, zona, consentimiento_at, referido_por_codigo
  )
  values (
    btrim(p_nombre), p_whatsapp, nullif(btrim(p_email), ''),
    btrim(p_ciudad), nullif(btrim(p_zona), ''), now(),
    (select codigo from public.referidos where codigo = p_ref)
  )
  returning id into v_vendedor_id;

  v_slug := public.generar_slug(p_tipo::text, p_barrio);
  v_token := rtrim(translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/', '-_'), '=');

  -- vigente_hasta / vigente toman su default (now()+60d / true).
  insert into public.inmuebles (
    vendedor_id, operacion, tipo, barrio, direccion_aproximada,
    area_m2, habitaciones, precio_esperado, slug, edit_token_hash, zona_id
  )
  values (
    v_vendedor_id, p_operacion, p_tipo, btrim(p_barrio), nullif(btrim(p_direccion), ''),
    p_area, p_habitaciones, p_precio, v_slug,
    encode(sha256(convert_to(v_token, 'UTF8')), 'hex'), v_zona_id
  )
  returning id into v_inmueble_id;

  return jsonb_build_object('id', v_inmueble_id, 'slug', v_slug, 'token', v_token);
end;
$$;

-- ── obtener_ficha: + filtro de vigencia (la ficha DERIVA la vigencia, no espera al cron) ──
-- Misma firma (text) ⇒ create or replace CONSERVA los grants.
create or replace function public.obtener_ficha(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inmueble public.inmuebles;
  v_vendedor public.vendedores;
  v_fotos jsonb;
begin
  select * into v_inmueble from public.inmuebles where slug = p_slug;
  if not found then
    return null;
  end if;
  -- Anti-zombie: un anuncio vencido desaparece de la vista pública AL INSTANTE (aunque el cron
  -- semanal aún no lo haya marcado). La promesa "todo lo publicado está vivo" se cumple por derivación.
  if v_inmueble.vigente_hasta <= now() then
    return null;
  end if;
  select * into v_vendedor from public.vendedores where id = v_inmueble.vendedor_id;
  select coalesce(
    jsonb_agg(
      jsonb_build_object('r2_key', f.r2_key, 'orden', f.orden, 'es_portada', f.es_portada)
      order by f.es_portada desc, f.orden
    ),
    '[]'::jsonb
  )
  into v_fotos
  from public.fotos f
  where f.inmueble_id = v_inmueble.id;

  return jsonb_build_object(
    'slug', v_inmueble.slug,
    'operacion', v_inmueble.operacion,
    'tipo', v_inmueble.tipo,
    'barrio', v_inmueble.barrio,
    'ciudad', v_vendedor.ciudad,
    'area_m2', v_inmueble.area_m2,
    'habitaciones', v_inmueble.habitaciones,
    'precio_esperado', v_inmueble.precio_esperado,
    'descripcion', v_inmueble.descripcion,
    'nivel_verificacion', v_inmueble.nivel_verificacion,
    'nombre_publicador', v_vendedor.nombre,
    'fotos', v_fotos,
    'contacto_publico', v_inmueble.contacto_publico,
    'whatsapp', case when v_inmueble.contacto_publico then v_vendedor.whatsapp else null end
  );
end;
$$;

-- ── obtener_mi_anuncio: + vigente_hasta / vigente (para el aviso de renovación) ──
create or replace function public.obtener_mi_anuncio(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hash text;
  v_inmueble public.inmuebles;
  v_fotos jsonb;
begin
  if p_token is null or length(p_token) <> 43 then
    return null;
  end if;
  v_hash := encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  select * into v_inmueble from public.inmuebles where edit_token_hash = v_hash;
  if not found then
    return null;
  end if;
  select coalesce(
    jsonb_agg(
      jsonb_build_object('id', f.id, 'r2_key', f.r2_key, 'orden', f.orden, 'es_portada', f.es_portada)
      order by f.orden
    ),
    '[]'::jsonb
  )
  into v_fotos
  from public.fotos f
  where f.inmueble_id = v_inmueble.id;

  return jsonb_build_object(
    'id', v_inmueble.id,
    'slug', v_inmueble.slug,
    'operacion', v_inmueble.operacion,
    'tipo', v_inmueble.tipo,
    'barrio', v_inmueble.barrio,
    'area_m2', v_inmueble.area_m2,
    'habitaciones', v_inmueble.habitaciones,
    'precio_esperado', v_inmueble.precio_esperado,
    'descripcion', v_inmueble.descripcion,
    'contacto_publico', v_inmueble.contacto_publico,
    'nivel_verificacion', v_inmueble.nivel_verificacion,
    'vigente_hasta', v_inmueble.vigente_hasta,
    'vigente', (v_inmueble.vigente_hasta > now()),
    'fotos', v_fotos
  );
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- RPCs PÚBLICAS (anon + authenticated): cupos, referido, renovación.
-- ═══════════════════════════════════════════════════════════════════════════════

-- Contador de cupos: SOLO zonas con cupo fijado. Devuelve cupo_total + publicados (el motor
-- `cupos` calcula los restantes). Cero fabricación: sin cupo fijado, la zona no aparece.
create function public.obtener_cupos()
returns jsonb
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'zona', z.nombre,
        'cupo_total', z.cupo_total,
        'publicados', (select count(*) from public.inmuebles i where i.zona_id = z.id)
      )
      order by z.nombre
    ),
    '[]'::jsonb
  )
  from public.zonas z
  where z.cupo_total is not null;
$$;

-- Código de referido del fundador (por su magic link). Lo crea la primera vez y lo devuelve estable.
create function public.obtener_codigo_referido(p_token text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hash text;
  v_vendedor_id uuid;
  v_codigo text;
begin
  if p_token is null or length(p_token) <> 43 then
    return null;
  end if;
  v_hash := encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  select vendedor_id into v_vendedor_id from public.inmuebles where edit_token_hash = v_hash;
  if v_vendedor_id is null then
    return null;
  end if;
  select codigo into v_codigo from public.referidos where vendedor_id = v_vendedor_id;
  if v_codigo is not null then
    return v_codigo;
  end if;
  -- Generar código único (base64url 8 chars). Reintenta ante colisión (improbable) o carrera.
  loop
    v_codigo := rtrim(translate(encode(extensions.gen_random_bytes(6), 'base64'), '+/', '-_'), '=');
    begin
      insert into public.referidos (codigo, vendedor_id) values (v_codigo, v_vendedor_id);
      return v_codigo;
    exception when unique_violation then
      select codigo into v_codigo from public.referidos where vendedor_id = v_vendedor_id;
      if v_codigo is not null then
        return v_codigo;
      end if;
    end;
  end loop;
end;
$$;

-- Conteo de referidos atribuidos a este fundador (sin exponer datos de los referidos).
create function public.obtener_mis_referidos(p_token text)
returns integer
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_hash text;
  v_vendedor_id uuid;
  v_codigo text;
  v_n integer;
begin
  if p_token is null or length(p_token) <> 43 then
    return 0;
  end if;
  v_hash := encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  select vendedor_id into v_vendedor_id from public.inmuebles where edit_token_hash = v_hash;
  if v_vendedor_id is null then
    return 0;
  end if;
  select codigo into v_codigo from public.referidos where vendedor_id = v_vendedor_id;
  if v_codigo is null then
    return 0;
  end if;
  select count(*) into v_n from public.vendedores where referido_por_codigo = v_codigo;
  return v_n;
end;
$$;

-- Renovar vigencia (POST vía magic link) — extiende +60 días y revive. Nada muta por GET.
create function public.renovar_vigencia(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hash text;
  v_id uuid;
  v_hasta timestamptz;
begin
  if p_token is null or length(p_token) <> 43 then
    return null;
  end if;
  v_hash := encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  update public.inmuebles
    set vigente_hasta = now() + interval '60 days', vigente = true
    where edit_token_hash = v_hash
    returning id, vigente_hasta into v_id, v_hasta;
  if v_id is null then
    return null;
  end if;
  return jsonb_build_object('vigente_hasta', v_hasta);
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- RPCs DEL OPERADOR (SOLO authenticated): zonas/cupos, densidad, lotes, log de envíos.
-- ═══════════════════════════════════════════════════════════════════════════════

create function public.fijar_cupo(p_zona_id uuid, p_cupo integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_cupo is not null and p_cupo < 0 then
    raise exception 'cupo_invalido' using errcode = 'check_violation';
  end if;
  update public.zonas set cupo_total = p_cupo where id = p_zona_id;
  if not found then
    raise exception 'zona_no_encontrada';
  end if;
end;
$$;

-- Todas las zonas con su cupo y publicados (para fijar cupos en el panel).
create function public.obtener_zonas_panel()
returns jsonb
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', z.id,
        'nombre', z.nombre,
        'cupo_total', z.cupo_total,
        'publicados', (select count(*) from public.inmuebles i where i.zona_id = z.id)
      )
      order by z.nombre
    ),
    '[]'::jsonb
  )
  from public.zonas z;
$$;

-- Densidad K por búsqueda típica (zona × tipo × rango de precio), solo inmuebles vigentes con zona.
create function public.obtener_densidad()
returns jsonb
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(jsonb_agg(d order by d->>'zona', d->>'tipo', d->>'rango'), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'zona', z.nombre,
      'tipo', i.tipo,
      'rango', case
        when i.precio_esperado < 200000000 then 'menos-200M'
        when i.precio_esperado < 400000000 then '200M-400M'
        else 'mas-400M'
      end,
      'n', count(*)
    ) as d
    from public.inmuebles i
    join public.zonas z on z.id = i.zona_id
    where i.vigente_hasta > now()
    group by z.nombre, i.tipo,
      case
        when i.precio_esperado < 200000000 then 'menos-200M'
        when i.precio_esperado < 400000000 then '200M-400M'
        else 'mas-400M'
      end
  ) sub;
$$;

-- Destinatarios de un lote de campaña (solo inmuebles vigentes de vendedores CON email).
-- Filtros: 'sin-fotos' | 'sin-sello' | 'por-vencer'. Devuelve email + nombre + barrio (el operador
-- ya está autenticado; el envío lo hace el adapter Brevo con estas direcciones).
create function public.obtener_lote(p_filtro text)
returns jsonb
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'inmueble_id', i.id, 'email', ve.email, 'nombre', ve.nombre, 'barrio', i.barrio
      )
      order by i.created_at
    ),
    '[]'::jsonb
  )
  from public.inmuebles i
  join public.vendedores ve on ve.id = i.vendedor_id
  where ve.email is not null
    and i.vigente_hasta > now()
    and (
      (p_filtro = 'sin-fotos'
        and not exists (select 1 from public.fotos f where f.inmueble_id = i.id))
      or (p_filtro = 'sin-sello' and i.nivel_verificacion = 'fundador')
      or (p_filtro = 'por-vencer' and i.vigente_hasta <= now() + interval '14 days')
    );
$$;

-- Registra un lote enviado (log; el contenido no se persiste).
create function public.registrar_envio(
  p_plantilla text, p_filtro text, p_destinatarios integer, p_enviados integer, p_estado text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.envios (plantilla, filtro, destinatarios, enviados, estado)
  values (
    p_plantilla, p_filtro, coalesce(p_destinatarios, 0),
    coalesce(p_enviados, 0), coalesce(p_estado, 'registrado')
  )
  returning id into v_id;
  return v_id;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- CRON (SOLO service_role): marca vencidos los anuncios cuya vigencia expiró.
-- ═══════════════════════════════════════════════════════════════════════════════
create function public.marcar_vencidos()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n integer;
begin
  update public.inmuebles
    set vigente = false
    where vigente = true and vigente_hasta <= now();
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Privilegios EXPLÍCITOS (K5/K6). Tablas nuevas: anon sin acceso directo; el operador
-- (authenticated) lee zonas y envios; service_role todo. RLS on.
-- ═══════════════════════════════════════════════════════════════════════════════
revoke all on public.zonas from anon;
grant select on public.zonas to authenticated;
grant all on public.zonas to service_role;
alter table public.zonas enable row level security;
create policy "operador lee zonas" on public.zonas for select to authenticated using (true);

revoke all on public.referidos from anon, authenticated;
grant all on public.referidos to service_role;
alter table public.referidos enable row level security;

revoke all on public.envios from anon;
grant select on public.envios to authenticated;
grant all on public.envios to service_role;
alter table public.envios enable row level security;
create policy "operador lee envios" on public.envios for select to authenticated using (true);

-- RPCs públicas (anon + authenticated): flujo del vendedor, ficha, cupos, referido, renovación.
do $$
declare
  fn text;
begin
  foreach fn in array array[
    'public.registrar_fundador(text, text, text, text, text, public.operacion, public.tipo_inmueble, text, text, integer, smallint, bigint, boolean, text, text)',
    'public.obtener_cupos()',
    'public.obtener_codigo_referido(text)',
    'public.obtener_mis_referidos(text)',
    'public.renovar_vigencia(text)'
  ]
  loop
    execute format('revoke all on function %s from public', fn);
    execute format('grant execute on function %s to anon, authenticated', fn);
  end loop;
end;
$$;

-- RPCs del operador (SOLO authenticated).
do $$
declare
  fn text;
begin
  foreach fn in array array[
    'public.fijar_cupo(uuid, integer)',
    'public.obtener_zonas_panel()',
    'public.obtener_densidad()',
    'public.obtener_lote(text)',
    'public.registrar_envio(text, text, integer, integer, text)'
  ]
  loop
    execute format('revoke all on function %s from public', fn);
    execute format('grant execute on function %s to authenticated', fn);
  end loop;
end;
$$;

-- Cron (SOLO service_role): jamás anon/authenticated.
revoke all on function public.marcar_vencidos() from public;
grant execute on function public.marcar_vencidos() to service_role;

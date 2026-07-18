-- Sprint 002 — "El inmueble completo": fotos (R2), slug público, descripción, verificación 2
-- niveles y magic link. Sigue el patrón de datos del S1 (ADR-002): toda escritura/lectura pública
-- pasa por RPC SECURITY DEFINER con search_path='' y GRANTs/REVOKEs EXPLÍCITOS (K5/K6). El
-- documento CTL JAMÁS se almacena: solo persisten matricula + verificado_at (regla de dominio 3).

-- pgcrypto: gen_random_bytes para tokens y sufijos de slug. Supabase lo instala en `extensions`.
create extension if not exists pgcrypto with schema extensions;

-- Nivel de verificación del inmueble. TYPE NUEVO (no se toca el enum estado_inmueble del S1).
create type public.nivel_verificacion as enum ('fundador', 'verificado');

-- ─────────────────────────────────────────────────────────────────────────────
-- Tabla fotos: metadatos de cada foto; los bytes viven en R2 (r2_key). Solo se guarda la key del
-- full; la del thumb se deriva por convención ("-full.webp" → "-thumb.webp").
-- ─────────────────────────────────────────────────────────────────────────────
create table public.fotos (
  id uuid primary key default gen_random_uuid(),
  inmueble_id uuid not null references public.inmuebles (id) on delete cascade,
  r2_key text not null unique,
  orden smallint not null check (orden between 0 and 11),
  ancho integer not null check (ancho between 1 and 20000),
  alto integer not null check (alto between 1 and 20000),
  bytes integer not null check (bytes between 1 and 2000000),
  es_portada boolean not null default false,
  created_at timestamptz not null default now()
);

create index fotos_inmueble_orden_idx on public.fotos (inmueble_id, orden);
-- A lo sumo una portada por inmueble.
create unique index fotos_portada_unica on public.fotos (inmueble_id) where es_portada;

-- ─────────────────────────────────────────────────────────────────────────────
-- Columnas nuevas en inmuebles.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.inmuebles
  add column slug text,
  add column descripcion text check (descripcion is null or length(descripcion) <= 2000),
  add column nivel_verificacion public.nivel_verificacion not null default 'fundador',
  add column matricula text check (matricula is null or length(btrim(matricula)) between 4 and 40),
  add column verificado_at timestamptz,
  add column contacto_publico boolean not null default false,
  add column edit_token_hash text;

-- ─────────────────────────────────────────────────────────────────────────────
-- generar_slug: `{tipo}-{barrio}-{6 hex}` con loop anticolisión. Autoritativa (el espejo TS es
-- solo validación). El slug es INMUTABLE una vez creado.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.generar_slug(p_tipo text, p_barrio text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_base text;
  v_slug text;
begin
  v_base := lower(p_tipo || '-' || p_barrio);
  -- quita acentos y la eñe (espejo del slugificar TS)
  v_base := translate(
    v_base,
    'áàäâéèëêíìïîóòöôúùüûñ',
    'aaaaeeeeiiiioooouuuun'
  );
  v_base := regexp_replace(v_base, '[^a-z0-9]+', '-', 'g');
  v_base := btrim(v_base, '-');
  if v_base = '' then
    v_base := 'inmueble';
  end if;
  loop
    v_slug := v_base || '-' || encode(extensions.gen_random_bytes(3), 'hex');
    exit when not exists (select 1 from public.inmuebles where slug = v_slug);
  end loop;
  return v_slug;
end;
$$;

-- Backfill de los inmuebles del S1 (fila por fila para que el loop anticolisión vea las previas).
do $$
declare
  r record;
begin
  for r in select id, tipo, barrio from public.inmuebles where slug is null loop
    update public.inmuebles
      set slug = public.generar_slug(r.tipo::text, r.barrio)
      where id = r.id;
  end loop;
end;
$$;

alter table public.inmuebles alter column slug set not null;
create unique index inmuebles_slug_idx on public.inmuebles (slug);

-- ─────────────────────────────────────────────────────────────────────────────
-- registrar_fundador ampliada: ahora genera slug + token y devuelve jsonb {id, slug, token}.
-- El token va EN CLARO una sola vez (en la respuesta); en BD solo su hash SHA-256. Se hace
-- DROP + CREATE porque cambia el tipo de retorno (uuid → jsonb); el drop borra los grants, se
-- re-otorgan al final.
-- ─────────────────────────────────────────────────────────────────────────────
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
  p_ip_hash text
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
begin
  if p_consentimiento is not true then
    raise exception 'consentimiento_requerido' using errcode = 'check_violation';
  end if;

  -- Rate limit por IP (solo si hay ip_hash; en CI se pasa null y se cubre con test de RPC).
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

  insert into public.vendedores (nombre, whatsapp, email, ciudad, zona, consentimiento_at)
  values (
    btrim(p_nombre), p_whatsapp, nullif(btrim(p_email), ''),
    btrim(p_ciudad), nullif(btrim(p_zona), ''), now()
  )
  returning id into v_vendedor_id;

  v_slug := public.generar_slug(p_tipo::text, p_barrio);
  -- 32 bytes → base64url (43 chars), sin padding.
  v_token := rtrim(translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/', '-_'), '=');

  insert into public.inmuebles (
    vendedor_id, operacion, tipo, barrio, direccion_aproximada,
    area_m2, habitaciones, precio_esperado, slug, edit_token_hash
  )
  values (
    v_vendedor_id, p_operacion, p_tipo, btrim(p_barrio), nullif(btrim(p_direccion), ''),
    p_area, p_habitaciones, p_precio, v_slug,
    encode(sha256(convert_to(v_token, 'UTF8')), 'hex')
  )
  returning id into v_inmueble_id;

  return jsonb_build_object('id', v_inmueble_id, 'slug', v_slug, 'token', v_token);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- RPCs del flujo "mi anuncio" (token → inmueble). Todas resuelven el token por su hash.
-- ─────────────────────────────────────────────────────────────────────────────

-- Devuelve el anuncio del token (datos + fotos) o null si el token no matchea.
create function public.obtener_mi_anuncio(p_token text)
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
    'fotos', v_fotos
  );
end;
$$;

-- Guarda la descripción (la validación de largo la hace el CHECK de la columna).
create function public.guardar_descripcion(p_token text, p_descripcion text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hash text;
begin
  v_hash := encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex');
  update public.inmuebles
    set descripcion = nullif(btrim(p_descripcion), '')
    where edit_token_hash = v_hash;
  if not found then
    raise exception 'token_invalido';
  end if;
end;
$$;

-- Registra una foto ya subida a R2. Valida token, límite (12), peso y que la key pertenezca al
-- PROPIO inmueble (imposible registrar keys ajenas). orden = cantidad actual; es_portada = false.
create function public.registrar_foto(
  p_token text,
  p_r2_key text,
  p_ancho integer,
  p_alto integer,
  p_bytes integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hash text;
  v_inmueble_id uuid;
  v_count integer;
  v_id uuid;
begin
  v_hash := encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex');
  select id into v_inmueble_id from public.inmuebles where edit_token_hash = v_hash;
  if v_inmueble_id is null then
    raise exception 'token_invalido';
  end if;
  select count(*) into v_count from public.fotos where inmueble_id = v_inmueble_id;
  if v_count >= 12 then
    raise exception 'limite_fotos';
  end if;
  if p_bytes is null or p_bytes > 1500000 then
    raise exception 'foto_muy_pesada';
  end if;
  if p_r2_key !~ ('^' || v_inmueble_id::text || '/[0-9a-f-]{36}-full\.webp$') then
    raise exception 'key_invalida';
  end if;

  insert into public.fotos (inmueble_id, r2_key, orden, ancho, alto, bytes)
  values (v_inmueble_id, p_r2_key, v_count, p_ancho, p_alto, p_bytes)
  returning id into v_id;

  return jsonb_build_object('id', v_id, 'orden', v_count);
end;
$$;

-- Marca una foto como portada (desmarca las demás; el índice único lo respalda).
create function public.marcar_portada(p_token text, p_foto_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hash text;
  v_inmueble_id uuid;
begin
  v_hash := encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex');
  select id into v_inmueble_id from public.inmuebles where edit_token_hash = v_hash;
  if v_inmueble_id is null then
    raise exception 'token_invalido';
  end if;
  update public.fotos set es_portada = false where inmueble_id = v_inmueble_id and es_portada;
  update public.fotos set es_portada = true where id = p_foto_id and inmueble_id = v_inmueble_id;
  if not found then
    raise exception 'foto_no_encontrada';
  end if;
end;
$$;

-- Elimina una foto y reordena (el objeto en R2 queda huérfano — aceptado, ADR-003).
create function public.eliminar_foto(p_token text, p_foto_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hash text;
  v_inmueble_id uuid;
begin
  v_hash := encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex');
  select id into v_inmueble_id from public.inmuebles where edit_token_hash = v_hash;
  if v_inmueble_id is null then
    raise exception 'token_invalido';
  end if;
  delete from public.fotos where id = p_foto_id and inmueble_id = v_inmueble_id;
  with ordenadas as (
    select id, (row_number() over (order by orden) - 1)::smallint as nuevo
    from public.fotos where inmueble_id = v_inmueble_id
  )
  update public.fotos f set orden = o.nuevo from ordenadas o where f.id = o.id;
end;
$$;

-- Activa/desactiva la exposición de contacto en la ficha pública (opt-in Ley 1581).
create function public.guardar_contacto_publico(p_token text, p_activo boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hash text;
begin
  v_hash := encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex');
  update public.inmuebles
    set contacto_publico = coalesce(p_activo, false)
    where edit_token_hash = v_hash;
  if not found then
    raise exception 'token_invalido';
  end if;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- obtener_ficha: WHITELIST de columnas públicas. WhatsApp SOLO con opt-in. Email y matrícula
-- JAMÁS. El nombre del publicador es parte del modelo de confianza (identidad visible, Ert 2016;
-- previsto por el plan y por el nivel 1 "Fundador"). null si el slug no existe.
-- ─────────────────────────────────────────────────────────────────────────────
create function public.obtener_ficha(p_slug text)
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
    -- WhatsApp SOLO con opt-in; nunca email ni matrícula.
    'whatsapp', case when v_inmueble.contacto_publico then v_vendedor.whatsapp else null end
  );
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- RPCs del operador (SOLO authenticated). marcar_verificado persiste matricula + fecha (NUNCA el
-- documento). generar_link_anuncio rota el token de un inmueble y lo devuelve en claro.
-- ─────────────────────────────────────────────────────────────────────────────
create function public.marcar_verificado(p_inmueble_id uuid, p_matricula text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.inmuebles
    set nivel_verificacion = 'verificado',
        matricula = nullif(btrim(p_matricula), ''),
        verificado_at = now()
    where id = p_inmueble_id;
  if not found then
    raise exception 'inmueble_no_encontrado';
  end if;
end;
$$;

create function public.generar_link_anuncio(p_inmueble_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text;
begin
  v_token := rtrim(translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/', '-_'), '=');
  update public.inmuebles
    set edit_token_hash = encode(sha256(convert_to(v_token, 'UTF8')), 'hex')
    where id = p_inmueble_id;
  if not found then
    raise exception 'inmueble_no_encontrado';
  end if;
  return v_token;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Privilegios EXPLÍCITOS (K5/K6). Tabla fotos: anon sin acceso directo (solo vía RPC), operador
-- (authenticated) lee, service_role todo. RLS on + política de lectura para el operador.
-- ─────────────────────────────────────────────────────────────────────────────
revoke all on public.fotos from anon;
grant select on public.fotos to authenticated;
grant all on public.fotos to service_role;
alter table public.fotos enable row level security;
create policy "operador lee fotos" on public.fotos for select to authenticated using (true);

-- RPCs públicas (anon + authenticated): flujo del vendedor y ficha.
do $$
declare
  fn text;
begin
  foreach fn in array array[
    'public.registrar_fundador(text, text, text, text, text, public.operacion, public.tipo_inmueble, text, text, integer, smallint, bigint, boolean, text)',
    'public.obtener_mi_anuncio(text)',
    'public.guardar_descripcion(text, text)',
    'public.registrar_foto(text, text, integer, integer, integer)',
    'public.marcar_portada(text, uuid)',
    'public.eliminar_foto(text, uuid)',
    'public.guardar_contacto_publico(text, boolean)',
    'public.obtener_ficha(text)'
  ]
  loop
    execute format('revoke all on function %s from public', fn);
    execute format('grant execute on function %s to anon, authenticated', fn);
  end loop;
end;
$$;

-- RPCs del operador (SOLO authenticated) + helper de slug (no lo llama nadie por API).
revoke all on function public.marcar_verificado(uuid, text) from public;
grant execute on function public.marcar_verificado(uuid, text) to authenticated;
revoke all on function public.generar_link_anuncio(uuid) from public;
grant execute on function public.generar_link_anuncio(uuid) to authenticated;
revoke all on function public.generar_slug(text, text) from public;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Migración 7 (Sprint 005) — «Idioma del vendedor».
--
-- Por qué: los avisos por correo y WhatsApp deben llegar en el idioma en que la persona usó la app.
-- La columna se llena al publicar con el idioma activo de la interfaz y la leen el lote de correo
-- (`obtener_lote`) y el panel del operador.
--
-- Qué hace:
--   1. `vendedores.idioma` ('es' | 'en', por defecto 'es'). ADITIVA: los vendedores que ya existen
--      quedan en 'es' (publicaron en una app solo en español).
--   2. `registrar_fundador` gana `p_idioma text default 'es'` como ÚLTIMO parámetro. Cambia la firma
--      (16 args) ⇒ DROP + CREATE, igual que en la migración 3. Como el parámetro nuevo tiene default,
--      el Worker desplegado antes de este cambio (que llama con 15 argumentos por nombre) sigue
--      funcionando entre el `db push` y el siguiente `deploy:cf`.
--   3. `obtener_lote` devuelve también `idioma`. Misma firma ⇒ create or replace.
--
-- El DROP borra los grants de la función; la migración 6 dejó los default privileges cerrados, así
-- que la función nueva nace cerrada y aquí se abre explícitamente (lista blanca de anon).
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Columna.
alter table public.vendedores
  add column idioma text not null default 'es',
  add constraint vendedores_idioma_check check (idioma in ('es', 'en'));

-- 2. registrar_fundador con p_idioma.
drop function if exists public.registrar_fundador(
  text, text, text, text, text, public.operacion, public.tipo_inmueble,
  text, text, integer, smallint, bigint, boolean, text, text
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
  p_ref text default null,
  p_idioma text default 'es'
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
  v_idioma text := coalesce(p_idioma, 'es');
begin
  if p_consentimiento is not true then
    raise exception 'consentimiento_requerido' using errcode = 'check_violation';
  end if;

  if v_idioma not in ('es', 'en') then
    raise exception 'idioma_invalido' using errcode = 'check_violation';
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
    nombre, whatsapp, email, ciudad, zona, consentimiento_at, referido_por_codigo, idioma
  )
  values (
    btrim(p_nombre), p_whatsapp, nullif(btrim(p_email), ''),
    btrim(p_ciudad), nullif(btrim(p_zona), ''), now(),
    (select codigo from public.referidos where codigo = p_ref),
    v_idioma
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

-- Lista blanca de anon (la función nació cerrada): la ejecutan el flujo del vendedor (anon) y el
-- operador (authenticated).
revoke all on function public.registrar_fundador(
  text, text, text, text, text, public.operacion, public.tipo_inmueble,
  text, text, integer, smallint, bigint, boolean, text, text, text
) from public;
grant execute on function public.registrar_fundador(
  text, text, text, text, text, public.operacion, public.tipo_inmueble,
  text, text, integer, smallint, bigint, boolean, text, text, text
) to anon, authenticated, service_role;

-- 3. obtener_lote + idioma. Solo la llama el operador autenticado.
create or replace function public.obtener_lote(p_filtro text)
returns jsonb
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'inmueble_id', i.id, 'email', ve.email, 'nombre', ve.nombre, 'barrio', i.barrio,
        'idioma', ve.idioma
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

revoke all on function public.obtener_lote(text) from public;
grant execute on function public.obtener_lote(text) to authenticated, service_role;

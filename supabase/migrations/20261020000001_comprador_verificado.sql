-- ═══════════════════════════════════════════════════════════════════════════════
-- Migración 9 (Sprint 007) — «Comprador verificado»: probar que el WhatsApp es tuyo, sin enviar nada.
--
-- Por qué: contactar a un dueño exige un WhatsApp verificado por MENSAJE ENTRANTE (el comprador manda un
-- código a Innmobiliaria; Innmobiliaria jamás envía). Cada contacto queda registrado para los dos. Y el
-- sello ⭐ deja de poder falsearse: ya nadie escribe el nivel ni la fecha del CTL por fuera de
-- `marcar_verificado_ctl`.
--
-- ADITIVO en cuanto a tablas y funciones (3 tablas y 4 RPC nuevas). Dos cambios CIERRAN algo, a propósito:
--   · `obtener_ficha` (misma firma, `create or replace`) deja de devolver `whatsapp`: el número del dueño
--     solo llega, por `registrar_contacto`, a una sesión de comprador verificada (G-Plan 3a).
--   · el sello: se retira el `grant` de `marcar_verificado` (legado, sin fecha de CTL) a `authenticated` y
--     un trigger impide que los roles de la API (`anon`, `authenticated`) cambien `nivel_verificacion`,
--     `ctl_expedido_el`, `matricula` o `verificado_at` por escritura directa. La función definer
--     `marcar_verificado_ctl` corre como su dueño y sigue pudiendo; `service_role` y `postgres`
--     (semillas, mantenimiento) tampoco se ven afectados.
--
-- Qué guarda (Ley 1581, minimización): del comprador, nombre, teléfono E.164 colombiano, idioma, cuándo
-- consintió y cuándo verificó. De la verificación, SOLO el hash del código (un solo uso, 10 minutos), el
-- hash de la sesión y el hash de la IP. Del contacto, quién escribió a qué anuncio y cuándo. Ni el
-- código, ni el cuerpo del mensaje de WhatsApp, ni la cookie en claro se almacenan jamás.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. Tablas (RLS sin políticas: solo las RPC definer y service_role las tocan) ─

create table public.compradores (
  id                uuid primary key default gen_random_uuid(),
  telefono          text not null unique check (telefono ~ '^\+57[0-9]{10}$'),
  nombre            text not null check (length(btrim(nombre)) between 2 and 80),
  idioma            text not null default 'es' check (idioma in ('es', 'en')),
  consentimiento_at timestamptz not null,
  verificado_at     timestamptz,
  created_at        timestamptz not null default now()
);

create table public.verificaciones (
  id              uuid primary key default gen_random_uuid(),
  sesion_hash     text not null check (sesion_hash ~ '^[0-9a-f]{64}$'),
  comprador_id    uuid not null references public.compradores (id) on delete cascade,
  codigo_hash     text not null unique check (codigo_hash ~ '^[0-9a-f]{64}$'),
  ip_hash         text not null,
  vence_at        timestamptz not null,
  usado_at        timestamptz,
  otro_numero_at  timestamptz,
  created_at      timestamptz not null default now(),
  -- Un código se usa bien o se quema por llegar de otro número; nunca las dos cosas.
  check (usado_at is null or otro_numero_at is null)
);

create index verificaciones_sesion_idx on public.verificaciones (sesion_hash, created_at desc);
create index verificaciones_ip_idx on public.verificaciones (ip_hash, created_at desc);

create table public.contactos (
  id           uuid primary key default gen_random_uuid(),
  comprador_id uuid not null references public.compradores (id) on delete cascade,
  inmueble_id  uuid not null references public.inmuebles (id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (comprador_id, inmueble_id)
);

create index contactos_inmueble_idx on public.contactos (inmueble_id, created_at desc);

alter table public.compradores    enable row level security;
alter table public.verificaciones enable row level security;
alter table public.contactos      enable row level security;

revoke all on public.compradores    from anon, authenticated;
revoke all on public.verificaciones from anon, authenticated;
revoke all on public.contactos      from anon, authenticated;
grant all on public.compradores    to service_role;
grant all on public.verificaciones to service_role;
grant all on public.contactos      to service_role;

-- ── 2. Pedir un código ─────────────────────────────────────────────────────────

-- Devuelve el código EN CLARO una sola vez (la página lo muestra y el comprador lo manda por WhatsApp);
-- en la base queda solo su SHA-256. Un solo código vivo por sesión: pedir otro vence el anterior.
-- Topes por hora (se aplican también a quien llame la RPC directo con su propio `ip_hash`; el límite
-- general de uso es del H-3): 5 códigos por sesión y 10 por IP.
create function public.iniciar_verificacion(
  p_sesion_hash text,
  p_nombre text,
  p_telefono text,
  p_idioma text,
  p_ip_hash text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nombre text := btrim(coalesce(p_nombre, ''));
  v_idioma text := coalesce(nullif(btrim(p_idioma), ''), 'es');
  v_alfabeto constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- 32 símbolos, sin I ni O ni 0/1
  v_comprador uuid;
  v_codigo text;
  v_bytes bytea;
  v_hash text;
  i int;
begin
  if p_sesion_hash is null or p_sesion_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'sesion_invalida' using errcode = 'check_violation';
  end if;
  if p_telefono is null or p_telefono !~ '^\+57[0-9]{10}$' then
    raise exception 'telefono_invalido' using errcode = 'check_violation';
  end if;
  if length(v_nombre) not between 2 and 80 then
    raise exception 'nombre_invalido' using errcode = 'check_violation';
  end if;
  if v_idioma not in ('es', 'en') then
    raise exception 'idioma_invalido' using errcode = 'check_violation';
  end if;
  if p_ip_hash is null or length(p_ip_hash) < 8 then
    raise exception 'ip_invalida' using errcode = 'check_violation';
  end if;

  if (select count(*) from public.verificaciones
        where sesion_hash = p_sesion_hash and created_at > now() - interval '1 hour') >= 5
     or (select count(*) from public.verificaciones
        where ip_hash = p_ip_hash and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'demasiados_intentos' using errcode = 'check_violation';
  end if;

  -- El nombre solo se corrige mientras el teléfono no esté verificado: nadie reescribe, pidiendo un
  -- código, el nombre con el que otra persona ya verificó su número.
  insert into public.compradores (telefono, nombre, idioma, consentimiento_at)
  values (p_telefono, v_nombre, v_idioma, now())
  on conflict (telefono) do update
    set idioma = excluded.idioma,
        nombre = case when public.compradores.verificado_at is null
                      then excluded.nombre else public.compradores.nombre end
  returning id into v_comprador;

  update public.verificaciones
    set vence_at = now()
    where sesion_hash = p_sesion_hash
      and usado_at is null and otro_numero_at is null and vence_at > now();

  loop
    v_bytes := extensions.gen_random_bytes(6);
    v_codigo := 'INN-';
    for i in 0..5 loop
      -- 256 % 32 = 0: sin sesgo de módulo.
      v_codigo := v_codigo || substr(v_alfabeto, (get_byte(v_bytes, i) % 32) + 1, 1);
    end loop;
    v_hash := encode(sha256(convert_to(v_codigo, 'UTF8')), 'hex');
    begin
      insert into public.verificaciones (sesion_hash, comprador_id, codigo_hash, ip_hash, vence_at)
      values (p_sesion_hash, v_comprador, v_hash, p_ip_hash, now() + interval '10 minutes');
      exit;
    exception when unique_violation then
      null; -- choque de hash (casi imposible): se genera otro código
    end;
  end loop;

  return v_codigo;
end;
$$;

-- ── 3. Estado de la sesión (sin datos personales en la respuesta) ──────────────

create function public.estado_verificacion(p_sesion_hash text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v public.verificaciones;
begin
  if p_sesion_hash is null or p_sesion_hash !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('estado', 'sin_codigo');
  end if;
  if exists (select 1 from public.verificaciones
               where sesion_hash = p_sesion_hash and usado_at is not null) then
    return jsonb_build_object('estado', 'verificado');
  end if;
  select * into v from public.verificaciones
    where sesion_hash = p_sesion_hash
    order by created_at desc limit 1;
  if not found then
    return jsonb_build_object('estado', 'sin_codigo');
  end if;
  if v.otro_numero_at is not null then
    return jsonb_build_object('estado', 'otro_numero');
  end if;
  if v.vence_at <= now() then
    return jsonb_build_object('estado', 'vencido');
  end if;
  return jsonb_build_object(
    'estado', 'esperando',
    'segundos', greatest(0, extract(epoch from (v.vence_at - now()))::int)
  );
end;
$$;

-- ── 4. Canje del código (solo el webhook, con la llave del servidor) ──────────

-- Lo llama el webhook DESPUÉS de validar la firma de Meta y con el teléfono que Meta dice que escribió
-- (`wa_id`). `ok`: el código era vigente y venía del número que el comprador declaró. `otro_numero`:
-- venía de otro número (el código se quema; hay que pedir uno nuevo). `nada`: no existe, venció o ya
-- se usó. Un solo uso: el canje exitoso marca `usado_at`.
create function public.canjear_codigo_whatsapp(p_codigo_hash text, p_telefono text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.verificaciones;
  v_telefono text;
begin
  if p_codigo_hash is null or p_codigo_hash !~ '^[0-9a-f]{64}$' then
    return 'nada';
  end if;
  select * into v from public.verificaciones
    where codigo_hash = p_codigo_hash
      and usado_at is null and otro_numero_at is null and vence_at > now()
    for update;
  if not found then
    return 'nada';
  end if;
  select telefono into v_telefono from public.compradores where id = v.comprador_id;
  if v_telefono is distinct from p_telefono then
    update public.verificaciones set otro_numero_at = now() where id = v.id;
    return 'otro_numero';
  end if;
  update public.verificaciones set usado_at = now() where id = v.id;
  update public.compradores
    set verificado_at = coalesce(verificado_at, now())
    where id = v.comprador_id;
  return 'ok';
end;
$$;

-- ── 5. Contactar: el WhatsApp del dueño solo sale hacia una sesión verificada ──

create function public.registrar_contacto(p_sesion_hash text, p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_comprador uuid;
  v_inmueble public.inmuebles;
  v_whatsapp text;
begin
  if p_sesion_hash is null or p_sesion_hash !~ '^[0-9a-f]{64}$' then
    return null;
  end if;
  select v.comprador_id into v_comprador
    from public.verificaciones v
    where v.sesion_hash = p_sesion_hash and v.usado_at is not null
    order by v.usado_at desc limit 1;
  if v_comprador is null then
    return null;
  end if;
  select * into v_inmueble from public.inmuebles where slug = p_slug;
  if not found or v_inmueble.vigente_hasta <= now() or not v_inmueble.contacto_publico then
    return null;
  end if;
  select ve.whatsapp into v_whatsapp from public.vendedores ve where ve.id = v_inmueble.vendedor_id;
  insert into public.contactos (comprador_id, inmueble_id)
  values (v_comprador, v_inmueble.id)
  on conflict (comprador_id, inmueble_id) do nothing;
  return jsonb_build_object('whatsapp', v_whatsapp);
end;
$$;

-- ── 6. Lecturas existentes (misma firma ⇒ create or replace conserva los grants) ──

-- obtener_ficha: SIN `whatsapp`. Conserva `contacto_publico` para que la página pinte el botón; el número
-- viaja solo en la respuesta de `registrar_contacto`.
create or replace function public.obtener_ficha(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inmueble public.inmuebles;
  v_vendedor public.vendedores;
  v_localidad text;
  v_fotos jsonb;
begin
  select * into v_inmueble from public.inmuebles where slug = p_slug;
  if not found then
    return null;
  end if;
  -- Anti-zombie: un anuncio vencido desaparece de la vista pública AL INSTANTE.
  if v_inmueble.vigente_hasta <= now() then
    return null;
  end if;
  select * into v_vendedor from public.vendedores where id = v_inmueble.vendedor_id;
  v_localidad := coalesce(
    (select s.localidad from public.sectores s where s.codigo = v_inmueble.sector_codigo),
    (select z.nombre from public.zonas z where z.id = v_inmueble.zona_id)
  );
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
    'sector_codigo', v_inmueble.sector_codigo,
    'localidad', v_localidad,
    'ciudad', v_vendedor.ciudad,
    'area_m2', v_inmueble.area_m2,
    'habitaciones', v_inmueble.habitaciones,
    'precio_esperado', v_inmueble.precio_esperado,
    'descripcion', v_inmueble.descripcion,
    'nivel_verificacion', v_inmueble.nivel_verificacion,
    'ctl_expedido_el', v_inmueble.ctl_expedido_el,
    'vigente_hasta', v_inmueble.vigente_hasta,
    'nombre_publicador', v_vendedor.nombre,
    'fotos', v_fotos,
    'contacto_publico', v_inmueble.contacto_publico
  );
end;
$$;

-- obtener_mi_anuncio: + los compradores verificados que contactaron. De cada uno, nombre, los últimos 4
-- dígitos del teléfono y la fecha: el dueño ya recibe el número completo en su WhatsApp cuando le
-- escriben, y la base no se lo repite en una respuesta web.
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
  v_contactos jsonb;
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

  select coalesce(
    jsonb_agg(
      jsonb_build_object('nombre', x.nombre, 'telefono_fin', x.fin, 'fecha', x.creado)
      order by x.creado desc
    ),
    '[]'::jsonb
  )
  into v_contactos
  from (
    select co.nombre, right(co.telefono, 4) as fin, c.created_at as creado
    from public.contactos c
    join public.compradores co on co.id = c.comprador_id
    where c.inmueble_id = v_inmueble.id
    order by c.created_at desc
    limit 50
  ) x;

  return jsonb_build_object(
    'id', v_inmueble.id,
    'slug', v_inmueble.slug,
    'operacion', v_inmueble.operacion,
    'tipo', v_inmueble.tipo,
    'barrio', v_inmueble.barrio,
    'sector_codigo', v_inmueble.sector_codigo,
    'area_m2', v_inmueble.area_m2,
    'habitaciones', v_inmueble.habitaciones,
    'precio_esperado', v_inmueble.precio_esperado,
    'descripcion', v_inmueble.descripcion,
    'contacto_publico', v_inmueble.contacto_publico,
    'nivel_verificacion', v_inmueble.nivel_verificacion,
    'ctl_expedido_el', v_inmueble.ctl_expedido_el,
    'vigente_hasta', v_inmueble.vigente_hasta,
    'vigente', (v_inmueble.vigente_hasta > now()),
    'fotos', v_fotos,
    'contactos', v_contactos
  );
end;
$$;

-- ── 7. El sello deja de poder falsearse ────────────────────────────────────────

-- Los roles de la API (`anon`, `authenticated`) no escriben el sello por UPDATE directo, aunque la política
-- «operador actualiza inmuebles» les deje tocar la fila: `current_user` es el rol de la sesión, y dentro de
-- una función SECURITY DEFINER (como `marcar_verificado_ctl`) es el dueño de la función.
create function public.proteger_sello()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated')
     and (new.nivel_verificacion is distinct from old.nivel_verificacion
          or new.ctl_expedido_el is distinct from old.ctl_expedido_el
          or new.matricula is distinct from old.matricula
          or new.verificado_at is distinct from old.verificado_at) then
    raise exception 'sello_protegido' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger inmuebles_proteger_sello
  before update on public.inmuebles
  for each row execute function public.proteger_sello();

-- El legado `marcar_verificado(uuid, text)` verifica SIN fecha de CTL: queda sin permiso para el operador
-- (la función se conserva para los datos de antes y las semillas, que corren como `postgres`).
revoke execute on function public.marcar_verificado(uuid, text) from authenticated;

-- ── 8. Privilegios EXPLÍCITOS, por firma (las funciones nuevas nacen cerradas: migración 6) ──

revoke all on function public.iniciar_verificacion(text, text, text, text, text) from public;
grant execute on function public.iniciar_verificacion(text, text, text, text, text)
  to anon, authenticated, service_role;

revoke all on function public.estado_verificacion(text) from public;
grant execute on function public.estado_verificacion(text) to anon, authenticated, service_role;

revoke all on function public.registrar_contacto(text, text) from public;
grant execute on function public.registrar_contacto(text, text) to anon, authenticated, service_role;

-- Solo el webhook, con la llave del servidor: jamás `anon` ni `authenticated`.
revoke all on function public.canjear_codigo_whatsapp(text, text) from public;
grant execute on function public.canjear_codigo_whatsapp(text, text) to service_role;

revoke all on function public.proteger_sello() from public;

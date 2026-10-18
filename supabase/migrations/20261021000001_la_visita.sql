-- ═══════════════════════════════════════════════════════════════════════════════
-- Migración 10 (Sprint 008) — «La visita»: identificarse, pedir una visita, agendarla y recordarla.
--
-- Por qué: con el S7 el comprador ya prueba que su WhatsApp es suyo. Falta lo que pasa en persona: que se
-- IDENTIFIQUE (cédula + nombre contra un proveedor; la cédula jamás se guarda), pida una visita declarando
-- para qué busca, cuánto y cómo pagaría; que el dueño vea su tarjeta antes de decir que sí, proponga hasta
-- 3 horarios y el comprador confirme uno; que a los dos les llegue un recordatorio el día antes, y que el
-- dueño marque si el comprador asistió. Y paga la deuda Ley 1581 del S7 (consentimiento real al pedir el
-- código, purga y tope de contactos).
--
-- ADITIVO en cuanto a tablas y funciones (5 tablas, 2 columnas, 17 RPC). Cambios que CIERRAN o CAMBIAN algo,
-- a propósito, y que el usuario aprueba antes de tocar la nube:
--   · `iniciar_verificacion` de 5 argumentos pierde el permiso de `anon` y `authenticated`: la función
--     nueva exige `p_consentimiento`. El Worker del S7 ya desplegado no podrá pedir códigos hasta que se
--     despliegue el del S8.
--   · `registrar_contacto` (misma firma) rechaza el contacto 21 de un comprador en 24 horas.
--   · `obtener_ficha` y `obtener_mi_anuncio` (misma firma) suman claves: ninguna se quita.
--   · `estado_verificacion` (misma firma) suma `identificado` cuando la sesión está verificada.
--   · `compradores.email` es un dato personal NUEVO: solo se pide para pedir una visita y solo sirve para
--     los avisos de esa visita (G-Plan 2a).
--
-- Qué NO se guarda jamás: la cédula, la fecha de expedición ni el documento (la ruta los valida, los
-- manda al proveedor y los descarta); la dirección exacta del inmueble en ningún correo ni tabla nueva.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. Columnas ────────────────────────────────────────────────────────────────

-- El dueño decide si una solicitud de un comprador SIN identificar queda en espera (puede aceptarla igual).
alter table public.inmuebles
  add column solo_identificados boolean not null default false;

-- Correo del comprador: solo para los avisos de la visita (solicitud, horarios, confirmación,
-- cancelación, recordatorio). Nunca sale en una respuesta pública.
alter table public.compradores
  add column email text
  check (email is null or (length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'));

-- ── 2. Tablas (RLS sin políticas: solo las RPC definer y service_role las tocan) ─

-- Una fila por comprador identificado. SIN cédula ni fecha de expedición: solo el hecho, el proveedor
-- y cuándo. Borrarla es un derecho del comprador (`borrar_identificacion`).
create table public.identificaciones (
  id           uuid primary key default gen_random_uuid(),
  comprador_id uuid not null unique references public.compradores (id) on delete cascade,
  proveedor    text not null check (proveedor in ('didit', 'simulador')),
  created_at   timestamptz not null default now()
);

-- Cada consulta al proveedor es una fila, y esta tabla ES el contador del tope: el proveedor cobra por
-- consulta, así que la reserva se inserta ANTES de llamarlo. `comprador_id` queda en null si el comprador
-- se borra: el contador del mes no puede bajar por una supresión.
create table public.identidad_consultas (
  id           uuid primary key default gen_random_uuid(),
  comprador_id uuid references public.compradores (id) on delete set null,
  resultado    text check (resultado is null or resultado in ('identificado', 'no_coincide', 'no_disponible')),
  creado_at    timestamptz not null default now()
);

create index identidad_consultas_creado_idx on public.identidad_consultas (creado_at);
create index identidad_consultas_comprador_idx on public.identidad_consultas (comprador_id);

-- La solicitud de visita. Estados:
--   en_espera  · el dueño pidió «solo identificados» y el comprador no lo está: el dueño puede aceptarla igual
--   pendiente  · espera que el dueño proponga horarios
--   propuesta  · el dueño propuso hasta 3 horarios; elige el comprador
--   confirmada · el comprador eligió uno (existe la fila de `visitas`)
--   rechazada  · el dueño dijo que no
--   cancelada  · la cancela cualquiera de los dos
-- El comprador abre SU solicitud con un enlace con token (llega por correo); de él solo se guarda el hash.
create table public.solicitudes_visita (
  id              uuid primary key default gen_random_uuid(),
  comprador_id    uuid not null references public.compradores (id) on delete cascade,
  inmueble_id     uuid not null references public.inmuebles (id) on delete cascade,
  intencion       text not null check (intencion in ('vivir', 'invertir')),
  presupuesto_min bigint check (presupuesto_min is null or presupuesto_min between 0 and 900000000000),
  presupuesto_max bigint check (presupuesto_max is null or presupuesto_max between 0 and 900000000000),
  forma_pago      text[] not null default '{}'
                  check (forma_pago <@ array['hipotecario', 'ahorros', 'venta_inmueble', 'otro']::text[]
                         and cardinality(forma_pago) <= 4),
  mensaje         text check (mensaje is null or length(mensaje) <= 300),
  estado          text not null default 'pendiente'
                  check (estado in ('en_espera', 'pendiente', 'propuesta', 'confirmada', 'rechazada', 'cancelada')),
  -- «Ninguno de esos horarios me sirve»: el dueño lo ve y propone otros.
  ninguno_at      timestamptz,
  token_hash      text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (presupuesto_min is null or presupuesto_max is null or presupuesto_min <= presupuesto_max)
);

-- Un solo pedido VIVO por comprador y anuncio.
create unique index solicitudes_visita_activa_idx
  on public.solicitudes_visita (comprador_id, inmueble_id)
  where estado in ('en_espera', 'pendiente', 'propuesta', 'confirmada');
create index solicitudes_visita_inmueble_idx on public.solicitudes_visita (inmueble_id, created_at desc);
create index solicitudes_visita_comprador_idx on public.solicitudes_visita (comprador_id);

create trigger solicitudes_visita_updated_at
  before update on public.solicitudes_visita
  for each row execute function public.tocar_updated_at();

-- Los horarios que propone el dueño (≤ 3 por solicitud; lo hace la RPC). Todo en UTC: Bogotá es UTC−5 todo
-- el año, sin horario de verano.
create table public.horarios_propuestos (
  id           uuid primary key default gen_random_uuid(),
  solicitud_id uuid not null references public.solicitudes_visita (id) on delete cascade,
  inicio       timestamptz not null,
  unique (solicitud_id, inicio)
);

-- La visita agendada: nace cuando el comprador confirma un horario.
create table public.visitas (
  id              uuid primary key default gen_random_uuid(),
  solicitud_id    uuid not null unique references public.solicitudes_visita (id) on delete cascade,
  inicio          timestamptz not null,
  cancelada_at    timestamptz,
  cancelada_por   text check (cancelada_por is null or cancelada_por in ('comprador', 'dueno')),
  -- asistió / no asistió, marcado por el dueño después de la hora.
  asistio         boolean,
  marcada_at      timestamptz,
  -- Reclamo atómico del recordatorio: a lo sumo UNO por visita, nunca a una cancelada.
  recordatorio_at timestamptz,
  created_at      timestamptz not null default now(),
  check ((cancelada_at is null) = (cancelada_por is null)),
  check (asistio is null or cancelada_at is null),
  check ((asistio is null) = (marcada_at is null))
);

create index visitas_recordatorio_idx on public.visitas (inicio) where recordatorio_at is null and cancelada_at is null;

alter table public.identificaciones     enable row level security;
alter table public.identidad_consultas  enable row level security;
alter table public.solicitudes_visita   enable row level security;
alter table public.horarios_propuestos  enable row level security;
alter table public.visitas              enable row level security;

revoke all on public.identificaciones    from anon, authenticated;
revoke all on public.identidad_consultas from anon, authenticated;
revoke all on public.solicitudes_visita  from anon, authenticated;
revoke all on public.horarios_propuestos from anon, authenticated;
revoke all on public.visitas             from anon, authenticated;
grant all on public.identificaciones    to service_role;
grant all on public.identidad_consultas to service_role;
grant all on public.solicitudes_visita  to service_role;
grant all on public.horarios_propuestos to service_role;
grant all on public.visitas             to service_role;

-- ── 3. Ayudantes internos (nadie los llama por la API; los usan las RPC definer) ──

-- El comprador de una sesión VERIFICADA (la cookie, por su hash), o null.
create function public.comprador_de_sesion(p_sesion_hash text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select v.comprador_id
    from public.verificaciones v
   where p_sesion_hash ~ '^[0-9a-f]{64}$'
     and v.sesion_hash = p_sesion_hash
     and v.usado_at is not null
   order by v.usado_at desc
   limit 1
$$;

-- El anuncio de un token de «Mi anuncio», o null.
create function public.inmueble_de_token(p_token text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select i.id
    from public.inmuebles i
   where p_token is not null
     and length(p_token) = 43
     and i.edit_token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
$$;

-- La solicitud de un token de visita, o null.
create function public.solicitud_de_token(p_token text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select s.id
    from public.solicitudes_visita s
   where p_token is not null
     and length(p_token) = 43
     and s.token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
$$;

-- ── 4. Deuda del S7: consentimiento real al pedir el código ────────────────────

-- Misma lógica de `iniciar_verificacion` del S7 + el 6.º parámetro: el consentimiento Ley 1581 llega a la
-- base y se rechaza si no es verdadero. Función NUEVA (aditiva); la de 5 argumentos se cierra abajo.
create function public.iniciar_verificacion(
  p_sesion_hash text,
  p_nombre text,
  p_telefono text,
  p_idioma text,
  p_ip_hash text,
  p_consentimiento boolean
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
  if p_consentimiento is distinct from true then
    raise exception 'consentimiento_requerido' using errcode = 'check_violation';
  end if;
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
      v_codigo := v_codigo || substr(v_alfabeto, (get_byte(v_bytes, i) % 32) + 1, 1);
    end loop;
    v_hash := encode(sha256(convert_to(v_codigo, 'UTF8')), 'hex');
    begin
      insert into public.verificaciones (sesion_hash, comprador_id, codigo_hash, ip_hash, vence_at)
      values (p_sesion_hash, v_comprador, v_hash, p_ip_hash, now() + interval '10 minutes');
      exit;
    exception when unique_violation then
      null;
    end;
  end loop;

  return v_codigo;
end;
$$;

-- La de 5 argumentos NO se borra (el cierre es un `revoke`, reversible); deja de ser alcanzable por la API.
revoke execute on function public.iniciar_verificacion(text, text, text, text, text) from anon, authenticated;

-- ── 5. Estado de la sesión: + identificado ─────────────────────────────────────

create or replace function public.estado_verificacion(p_sesion_hash text)
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
    return jsonb_build_object(
      'estado', 'verificado',
      'identificado', exists (
        select 1 from public.identificaciones i
         where i.comprador_id = public.comprador_de_sesion(p_sesion_hash)
      )
    );
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

-- ── 6. Identidad (solo el servidor, con la llave de servicio) ──────────────────

-- Reserva UNA consulta al proveedor, o dice por qué no. Los topes viven aquí, en la base, y el proveedor
-- se llama DESPUÉS de reservar: sin cupo no hay llamada y no hay cobro. `pg_advisory_xact_lock`
-- serializa a los que reservan al mismo tiempo para que dos no se lleven la última plaza.
--   mes < 40 · día < 5 (ambos en hora de Bogotá, de toda la plataforma) · intentos fallidos del comprador < 3.
-- Una consulta que el proveedor no pudo atender (`no_disponible`) no cuenta contra el comprador.
create function public.reservar_consulta_identidad(
  p_sesion_hash text,
  p_tope_mes integer default 40,
  p_tope_dia integer default 5,
  p_tope_comprador integer default 3
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_comprador uuid;
  v_id uuid;
begin
  v_comprador := public.comprador_de_sesion(p_sesion_hash);
  if v_comprador is null then
    return jsonb_build_object('ok', false, 'motivo', 'no_verificado');
  end if;

  perform pg_advisory_xact_lock(hashtext('identidad_consultas'));

  if exists (select 1 from public.identificaciones where comprador_id = v_comprador) then
    return jsonb_build_object('ok', false, 'motivo', 'ya_identificado');
  end if;
  if (select count(*) from public.identidad_consultas
        where comprador_id = v_comprador and (resultado is null or resultado = 'no_coincide'))
     >= p_tope_comprador then
    return jsonb_build_object('ok', false, 'motivo', 'tope_comprador');
  end if;
  if (select count(*) from public.identidad_consultas
        where creado_at >= date_trunc('day', now() at time zone 'America/Bogota') at time zone 'America/Bogota')
     >= p_tope_dia then
    return jsonb_build_object('ok', false, 'motivo', 'tope_dia');
  end if;
  if (select count(*) from public.identidad_consultas
        where creado_at >= date_trunc('month', now() at time zone 'America/Bogota') at time zone 'America/Bogota')
     >= p_tope_mes then
    return jsonb_build_object('ok', false, 'motivo', 'tope_mes');
  end if;

  insert into public.identidad_consultas (comprador_id) values (v_comprador) returning id into v_id;
  return jsonb_build_object('ok', true, 'consulta_id', v_id);
end;
$$;

-- Cierra la reserva con el resultado del proveedor. Solo `identificado` crea la fila de `identificaciones`.
create function public.registrar_identificacion(
  p_consulta_id uuid,
  p_resultado text,
  p_proveedor text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_comprador uuid;
begin
  if p_resultado not in ('identificado', 'no_coincide', 'no_disponible') then
    raise exception 'resultado_invalido' using errcode = 'check_violation';
  end if;
  update public.identidad_consultas
     set resultado = p_resultado
   where id = p_consulta_id and resultado is null
  returning comprador_id into v_comprador;
  if not found then
    raise exception 'consulta_invalida' using errcode = 'check_violation';
  end if;
  if p_resultado = 'identificado' then
    if v_comprador is null then
      raise exception 'consulta_invalida' using errcode = 'check_violation';
    end if;
    insert into public.identificaciones (comprador_id, proveedor)
    values (v_comprador, p_proveedor)
    on conflict (comprador_id) do update set proveedor = excluded.proveedor, created_at = now();
  end if;
end;
$$;

-- El comprador borra su identificación cuando quiera (Ley 1581: supresión). Devuelve si había algo.
create function public.borrar_identificacion(p_sesion_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_comprador uuid := public.comprador_de_sesion(p_sesion_hash);
begin
  if v_comprador is null then
    return false;
  end if;
  delete from public.identificaciones where comprador_id = v_comprador;
  return found;
end;
$$;

-- ── 7. Pedir una visita (comprador, por su sesión) ─────────────────────────────

-- Exige un WhatsApp verificado, un anuncio vivo con contacto abierto y un correo (solo para los avisos de
-- la visita). Con «solo identificados» y un comprador sin identificar, la solicitud nace `en_espera`. El
-- token del comprador nace AQUÍ (32 bytes) y se devuelve una sola vez; en la base queda su hash.
create function public.solicitar_visita(
  p_sesion_hash text,
  p_slug text,
  p_intencion text,
  p_presupuesto_min bigint,
  p_presupuesto_max bigint,
  p_forma_pago text[],
  p_mensaje text,
  p_email text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_comprador uuid;
  v_inmueble public.inmuebles;
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_mensaje text := nullif(btrim(coalesce(p_mensaje, '')), '');
  v_pago text[];
  v_token text;
  v_estado text;
  v_id uuid;
begin
  v_comprador := public.comprador_de_sesion(p_sesion_hash);
  if v_comprador is null then
    raise exception 'no_verificado' using errcode = '42501';
  end if;

  if p_intencion is null or p_intencion not in ('vivir', 'invertir') then
    raise exception 'intencion_invalida' using errcode = 'check_violation';
  end if;
  if length(v_email) > 254 or v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'email_invalido' using errcode = 'check_violation';
  end if;
  if (p_presupuesto_min is not null and p_presupuesto_min not between 0 and 900000000000)
     or (p_presupuesto_max is not null and p_presupuesto_max not between 0 and 900000000000)
     or (p_presupuesto_min is not null and p_presupuesto_max is not null and p_presupuesto_min > p_presupuesto_max) then
    raise exception 'presupuesto_invalido' using errcode = 'check_violation';
  end if;
  select coalesce(array_agg(distinct x order by x), '{}'::text[]) into v_pago
    from unnest(coalesce(p_forma_pago, '{}'::text[])) x;
  if not (v_pago <@ array['hipotecario', 'ahorros', 'venta_inmueble', 'otro']::text[]) then
    raise exception 'pago_invalido' using errcode = 'check_violation';
  end if;
  if v_mensaje is not null and length(v_mensaje) > 300 then
    raise exception 'mensaje_invalido' using errcode = 'check_violation';
  end if;

  select * into v_inmueble from public.inmuebles where slug = p_slug;
  if not found or v_inmueble.vigente_hasta <= now() then
    raise exception 'no_disponible' using errcode = 'P0002';
  end if;
  if not v_inmueble.contacto_publico then
    raise exception 'sin_contacto' using errcode = 'check_violation';
  end if;

  if exists (select 1 from public.solicitudes_visita
              where comprador_id = v_comprador and inmueble_id = v_inmueble.id
                and estado in ('en_espera', 'pendiente', 'propuesta', 'confirmada')) then
    raise exception 'ya_solicitada' using errcode = 'check_violation';
  end if;
  if (select count(*) from public.solicitudes_visita
        where comprador_id = v_comprador
          and estado in ('en_espera', 'pendiente', 'propuesta', 'confirmada')) >= 5 then
    raise exception 'demasiadas_solicitudes' using errcode = 'check_violation';
  end if;
  -- Quien fue rechazado no insiste en el mismo anuncio durante 14 días.
  if exists (select 1 from public.solicitudes_visita
              where comprador_id = v_comprador and inmueble_id = v_inmueble.id
                and estado = 'rechazada' and updated_at > now() - interval '14 days') then
    raise exception 'rechazada_reciente' using errcode = 'check_violation';
  end if;

  v_estado := case
    when v_inmueble.solo_identificados
         and not exists (select 1 from public.identificaciones where comprador_id = v_comprador)
    then 'en_espera' else 'pendiente' end;
  v_token := rtrim(translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/', '-_'), '=');

  begin
    insert into public.solicitudes_visita (
      comprador_id, inmueble_id, intencion, presupuesto_min, presupuesto_max,
      forma_pago, mensaje, estado, token_hash
    ) values (
      v_comprador, v_inmueble.id, p_intencion, p_presupuesto_min, p_presupuesto_max,
      v_pago, v_mensaje, v_estado, encode(sha256(convert_to(v_token, 'UTF8')), 'hex')
    ) returning id into v_id;
  exception when unique_violation then
    raise exception 'ya_solicitada' using errcode = 'check_violation';
  end;

  update public.compradores set email = v_email where id = v_comprador;

  return jsonb_build_object('solicitud_id', v_id, 'token', v_token, 'estado', v_estado);
end;
$$;

-- ── 8. La visita desde el enlace del comprador (token de la solicitud) ─────────

-- Lo que el comprador ve de SU solicitud. Sin dirección y sin el correo de nadie.
create function public.obtener_visita(p_token text)
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
  select * into v_inmueble from public.inmuebles where id = v_sol.inmueble_id;
  select * into v_vendedor from public.vendedores where id = v_inmueble.vendedor_id;
  select * into v_visita from public.visitas where solicitud_id = v_sol.id;
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

-- Confirma uno de los horarios propuestos, o dice «ninguno me sirve» (`p_horario_id` null): la solicitud
-- vuelve a `pendiente` y el dueño ve que hay que proponer otros.
create function public.elegir_horario(p_token text, p_horario_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := public.solicitud_de_token(p_token);
  v_sol public.solicitudes_visita;
  v_inicio timestamptz;
begin
  if v_id is null then
    raise exception 'token_invalido';
  end if;
  select * into v_sol from public.solicitudes_visita where id = v_id for update;
  if v_sol.estado <> 'propuesta' then
    raise exception 'estado_invalido' using errcode = 'check_violation';
  end if;
  if p_horario_id is null then
    delete from public.horarios_propuestos where solicitud_id = v_sol.id;
    update public.solicitudes_visita set estado = 'pendiente', ninguno_at = now() where id = v_sol.id;
    return;
  end if;
  select inicio into v_inicio from public.horarios_propuestos
   where id = p_horario_id and solicitud_id = v_sol.id;
  if not found then
    raise exception 'horario_invalido' using errcode = 'check_violation';
  end if;
  if v_inicio <= now() then
    raise exception 'horario_vencido' using errcode = 'check_violation';
  end if;
  insert into public.visitas (solicitud_id, inicio) values (v_sol.id, v_inicio);
  update public.solicitudes_visita set estado = 'confirmada' where id = v_sol.id;
end;
$$;

-- El comprador cancela su solicitud o, ya confirmada, su visita (mientras no haya pasado).
create function public.cancelar_visita_comprador(p_token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := public.solicitud_de_token(p_token);
  v_sol public.solicitudes_visita;
begin
  if v_id is null then
    raise exception 'token_invalido';
  end if;
  select * into v_sol from public.solicitudes_visita where id = v_id for update;
  if v_sol.estado in ('en_espera', 'pendiente', 'propuesta') then
    update public.solicitudes_visita set estado = 'cancelada' where id = v_sol.id;
  elsif v_sol.estado = 'confirmada' then
    update public.visitas
       set cancelada_at = now(), cancelada_por = 'comprador'
     where solicitud_id = v_sol.id and cancelada_at is null and inicio > now();
    if not found then
      raise exception 'estado_invalido' using errcode = 'check_violation';
    end if;
    update public.solicitudes_visita set estado = 'cancelada' where id = v_sol.id;
  else
    raise exception 'estado_invalido' using errcode = 'check_violation';
  end if;
end;
$$;

-- ── 9. Las acciones del dueño (por el token de «Mi anuncio») ───────────────────

-- Propone de 1 a 3 horarios futuros (a más de una hora y a no más de 60 días). Proponer otra vez sobre una
-- solicitud en `propuesta` reemplaza los anteriores.
create function public.proponer_horarios(p_token text, p_solicitud_id uuid, p_horarios timestamptz[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inmueble uuid := public.inmueble_de_token(p_token);
  v_sol public.solicitudes_visita;
  h timestamptz;
begin
  if v_inmueble is null then
    raise exception 'token_invalido';
  end if;
  select * into v_sol from public.solicitudes_visita
   where id = p_solicitud_id and inmueble_id = v_inmueble for update;
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

create function public.rechazar_solicitud(p_token text, p_solicitud_id uuid)
returns void
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
  update public.solicitudes_visita set estado = 'rechazada'
   where id = p_solicitud_id and inmueble_id = v_inmueble
     and estado in ('en_espera', 'pendiente', 'propuesta');
  if not found then
    raise exception 'estado_invalido' using errcode = 'check_violation';
  end if;
end;
$$;

-- «Aceptar igual»: una solicitud en espera (comprador sin identificar) pasa a pendiente.
create function public.aceptar_en_espera(p_token text, p_solicitud_id uuid)
returns void
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
  update public.solicitudes_visita set estado = 'pendiente'
   where id = p_solicitud_id and inmueble_id = v_inmueble and estado = 'en_espera';
  if not found then
    raise exception 'estado_invalido' using errcode = 'check_violation';
  end if;
end;
$$;

create function public.cancelar_visita_dueno(p_token text, p_solicitud_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inmueble uuid := public.inmueble_de_token(p_token);
  v_sol public.solicitudes_visita;
begin
  if v_inmueble is null then
    raise exception 'token_invalido';
  end if;
  select * into v_sol from public.solicitudes_visita
   where id = p_solicitud_id and inmueble_id = v_inmueble and estado = 'confirmada' for update;
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

-- Asistió / no asistió: solo después de la hora de la visita y solo en una visita no cancelada.
create function public.marcar_asistencia(p_token text, p_solicitud_id uuid, p_asistio boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inmueble uuid := public.inmueble_de_token(p_token);
  v_visita public.visitas;
begin
  if v_inmueble is null then
    raise exception 'token_invalido';
  end if;
  if p_asistio is null then
    raise exception 'asistencia_invalida' using errcode = 'check_violation';
  end if;
  select v.* into v_visita
    from public.visitas v
    join public.solicitudes_visita s on s.id = v.solicitud_id
   where s.id = p_solicitud_id and s.inmueble_id = v_inmueble
     and s.estado = 'confirmada' and v.cancelada_at is null
   for update of v;
  if not found then
    raise exception 'visita_invalida' using errcode = 'check_violation';
  end if;
  if v_visita.inicio > now() then
    raise exception 'visita_futura' using errcode = 'check_violation';
  end if;
  update public.visitas set asistio = p_asistio, marcada_at = now() where id = v_visita.id;
end;
$$;

create function public.guardar_solo_identificados(p_token text, p_activo boolean)
returns void
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
  update public.inmuebles set solo_identificados = coalesce(p_activo, false) where id = v_inmueble;
end;
$$;

-- ── 10. Lecturas existentes (misma firma ⇒ create or replace conserva los grants) ──

-- obtener_ficha: + `solo_identificados` (para que el comprador sepa que su solicitud puede quedar en espera).
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
    'contacto_publico', v_inmueble.contacto_publico,
    'solo_identificados', v_inmueble.solo_identificados
  );
end;
$$;

-- obtener_mi_anuncio: + `solo_identificados` y `solicitudes` (la tarjeta del comprador, ver abajo).
-- Del comprador, el dueño ve nombre, últimos 4 del teléfono, si está identificado y su historial de
-- asistencia. El correo del comprador JAMÁS sale. El teléfono completo sale solo en una visita CONFIRMADA y
-- no cancelada: es lo que le permite escribirle la dirección exacta por su WhatsApp.
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
  v_solicitudes jsonb;
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

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', x.id,
        'estado', x.estado,
        'fecha', x.created_at,
        'comprador', jsonb_build_object(
          'nombre', x.nombre,
          'telefono_fin', right(x.telefono, 4),
          'identificado', x.identificado,
          'asistio', x.asistio,
          'marcadas', x.marcadas
        ),
        'intencion', x.intencion,
        'presupuesto_min', x.presupuesto_min,
        'presupuesto_max', x.presupuesto_max,
        'forma_pago', to_jsonb(x.forma_pago),
        'mensaje', x.mensaje,
        'ninguno', x.ninguno_at is not null,
        'horarios', case when x.estado = 'propuesta' then coalesce((
            select jsonb_agg(jsonb_build_object('id', h.id, 'inicio', h.inicio) order by h.inicio)
              from public.horarios_propuestos h where h.solicitud_id = x.id
          ), '[]'::jsonb) else '[]'::jsonb end,
        'visita', case when x.visita_id is null then null else jsonb_build_object(
            'inicio', x.visita_inicio,
            'cancelada_por', x.cancelada_por,
            'asistio', x.visita_asistio
          ) end,
        'whatsapp', case when x.estado = 'confirmada' and x.visita_id is not null and x.cancelada_por is null
                         then x.telefono else null end
      )
      order by x.created_at desc
    ),
    '[]'::jsonb
  )
  into v_solicitudes
  from (
    select s.id, s.estado, s.created_at, s.intencion, s.presupuesto_min, s.presupuesto_max,
           s.forma_pago, s.mensaje, s.ninguno_at,
           co.nombre, co.telefono,
           exists (select 1 from public.identificaciones i where i.comprador_id = co.id) as identificado,
           (select count(*) from public.visitas vv
              join public.solicitudes_visita ss on ss.id = vv.solicitud_id
             where ss.comprador_id = co.id and vv.asistio is true) as asistio,
           (select count(*) from public.visitas vv
              join public.solicitudes_visita ss on ss.id = vv.solicitud_id
             where ss.comprador_id = co.id and vv.asistio is not null) as marcadas,
           v.id as visita_id, v.inicio as visita_inicio, v.cancelada_por, v.asistio as visita_asistio
      from public.solicitudes_visita s
      join public.compradores co on co.id = s.comprador_id
      left join public.visitas v on v.solicitud_id = s.id
     where s.inmueble_id = v_inmueble.id
       and (s.estado in ('en_espera', 'pendiente', 'propuesta', 'confirmada')
            or s.updated_at > now() - interval '30 days')
     order by s.created_at desc
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
    'solo_identificados', v_inmueble.solo_identificados,
    'nivel_verificacion', v_inmueble.nivel_verificacion,
    'ctl_expedido_el', v_inmueble.ctl_expedido_el,
    'vigente_hasta', v_inmueble.vigente_hasta,
    'vigente', (v_inmueble.vigente_hasta > now()),
    'fotos', v_fotos,
    'contactos', v_contactos,
    'solicitudes', v_solicitudes
  );
end;
$$;

-- ── 11. Deuda del S7: tope de contactos por comprador ──────────────────────────

-- Misma lógica de `registrar_contacto` del S7 + un tope: 20 anuncios distintos por comprador en 24 horas.
-- Volver a un anuncio ya contactado no cuenta. Pasado el tope, ya no entrega más números de dueños.
create or replace function public.registrar_contacto(p_sesion_hash text, p_slug text)
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
  v_comprador := public.comprador_de_sesion(p_sesion_hash);
  if v_comprador is null then
    return null;
  end if;
  select * into v_inmueble from public.inmuebles where slug = p_slug;
  if not found or v_inmueble.vigente_hasta <= now() or not v_inmueble.contacto_publico then
    return null;
  end if;
  if not exists (select 1 from public.contactos
                  where comprador_id = v_comprador and inmueble_id = v_inmueble.id)
     and (select count(*) from public.contactos
           where comprador_id = v_comprador and created_at > now() - interval '24 hours') >= 20 then
    raise exception 'demasiados_contactos' using errcode = 'check_violation';
  end if;
  select ve.whatsapp into v_whatsapp from public.vendedores ve where ve.id = v_inmueble.vendedor_id;
  insert into public.contactos (comprador_id, inmueble_id)
  values (v_comprador, v_inmueble.id)
  on conflict (comprador_id, inmueble_id) do nothing;
  return jsonb_build_object('whatsapp', v_whatsapp);
end;
$$;

-- ── 12. El servidor: avisos por correo y mantenimiento (solo service_role) ─────

-- Todo lo necesario para armar los correos de una solicitud: los dos correos, nombres, idiomas y el
-- resumen del anuncio. NUNCA la dirección exacta ni la cédula. Solo lo lee el servidor.
create function public.datos_correo_visita(p_solicitud_id uuid)
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
  select * into v_inmueble from public.inmuebles where id = v_sol.inmueble_id;
  select * into v_vendedor from public.vendedores where id = v_inmueble.vendedor_id;
  select * into v_visita from public.visitas where solicitud_id = v_sol.id;
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

-- El cron diario reclama los recordatorios. El reclamo es ATÓMICO y de a lo sumo UNA vez por visita: el
-- `update … returning` marca `recordatorio_at` y devuelve solo las filas que acaba de marcar (dos corridas
-- simultáneas no se llevan la misma). Si el correo falla después, no se reenvía: nunca dos.
-- Entran las visitas no canceladas cuya fecha en Bogotá es MAÑANA (el recordatorio «del día antes») o HOY
-- si aún no han empezado (las confirmadas después del cron de ayer). «Hoy» es el de la base, no el de la app.
create function public.reclamar_recordatorios()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hoy date := (now() at time zone 'America/Bogota')::date;
  v_ids jsonb;
begin
  with reclamadas as (
    update public.visitas
       set recordatorio_at = now()
     where recordatorio_at is null
       and cancelada_at is null
       and inicio > now()
       and (inicio at time zone 'America/Bogota')::date in (v_hoy, v_hoy + 1)
    returning solicitud_id
  )
  select coalesce(jsonb_agg(solicitud_id), '[]'::jsonb) into v_ids from reclamadas;
  return v_ids;
end;
$$;

-- Mantenimiento diario (Ley 1581): compradores que nunca verificaron su número a los 30 días, y los códigos
-- vencidos y sin usar a los 7. NO toca las verificaciones usadas: son la prueba de las sesiones vivas.
create function public.purgar_vencidos()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_compradores integer;
  v_verificaciones integer;
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
  return jsonb_build_object('compradores', v_compradores, 'verificaciones', v_verificaciones);
end;
$$;

-- ── 13. Privilegios EXPLÍCITOS, por firma (las funciones nuevas nacen cerradas: migración 6) ──

-- Ayudantes internos: ni la API ni el servidor; solo las funciones definer que los usan.
revoke all on function public.comprador_de_sesion(text) from public;
revoke all on function public.inmueble_de_token(text) from public;
revoke all on function public.solicitud_de_token(text) from public;

-- Públicas (anon + authenticated + service_role).
revoke all on function public.iniciar_verificacion(text, text, text, text, text, boolean) from public;
grant execute on function public.iniciar_verificacion(text, text, text, text, text, boolean)
  to anon, authenticated, service_role;

revoke all on function public.borrar_identificacion(text) from public;
grant execute on function public.borrar_identificacion(text) to anon, authenticated, service_role;

revoke all on function public.solicitar_visita(text, text, text, bigint, bigint, text[], text, text) from public;
grant execute on function public.solicitar_visita(text, text, text, bigint, bigint, text[], text, text)
  to anon, authenticated, service_role;

revoke all on function public.obtener_visita(text) from public;
grant execute on function public.obtener_visita(text) to anon, authenticated, service_role;

revoke all on function public.elegir_horario(text, uuid) from public;
grant execute on function public.elegir_horario(text, uuid) to anon, authenticated, service_role;

revoke all on function public.cancelar_visita_comprador(text) from public;
grant execute on function public.cancelar_visita_comprador(text) to anon, authenticated, service_role;

revoke all on function public.proponer_horarios(text, uuid, timestamptz[]) from public;
grant execute on function public.proponer_horarios(text, uuid, timestamptz[])
  to anon, authenticated, service_role;

revoke all on function public.rechazar_solicitud(text, uuid) from public;
grant execute on function public.rechazar_solicitud(text, uuid) to anon, authenticated, service_role;

revoke all on function public.aceptar_en_espera(text, uuid) from public;
grant execute on function public.aceptar_en_espera(text, uuid) to anon, authenticated, service_role;

revoke all on function public.cancelar_visita_dueno(text, uuid) from public;
grant execute on function public.cancelar_visita_dueno(text, uuid) to anon, authenticated, service_role;

revoke all on function public.marcar_asistencia(text, uuid, boolean) from public;
grant execute on function public.marcar_asistencia(text, uuid, boolean) to anon, authenticated, service_role;

revoke all on function public.guardar_solo_identificados(text, boolean) from public;
grant execute on function public.guardar_solo_identificados(text, boolean)
  to anon, authenticated, service_role;

-- Solo el servidor, con la llave de servicio: jamás `anon` ni `authenticated`.
revoke all on function public.reservar_consulta_identidad(text, integer, integer, integer) from public;
grant execute on function public.reservar_consulta_identidad(text, integer, integer, integer) to service_role;

revoke all on function public.registrar_identificacion(uuid, text, text) from public;
grant execute on function public.registrar_identificacion(uuid, text, text) to service_role;

revoke all on function public.datos_correo_visita(uuid) from public;
grant execute on function public.datos_correo_visita(uuid) to service_role;

revoke all on function public.reclamar_recordatorios() from public;
grant execute on function public.reclamar_recordatorios() to service_role;

revoke all on function public.purgar_vencidos() from public;
grant execute on function public.purgar_vencidos() to service_role;

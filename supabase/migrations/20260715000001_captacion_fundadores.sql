-- Sprint 001 — "La puerta fundadora": captación de vendedores fundadores.
-- Modelo de datos + RLS + RPC de registro. Ley 1581 por construcción (ver ADR 002).
--
-- Garantía arquitectónica (Ley 1581):
--   * anon NO tiene ninguna política sobre las tablas → no puede SELECT/INSERT/UPDATE/DELETE
--     directo. Solo puede EXECUTE la RPC `registrar_fundador`, que valida consentimiento +
--     rate limit y hace el INSERT como SECURITY DEFINER en una sola transacción.
--   * El operador (rol `authenticated`, allowlist por email en la app) puede SELECT/UPDATE.
--   * `consentimiento_at` es NOT NULL y lo fija el servidor (`now()`), jamás el cliente.

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
create type public.operacion as enum ('venta', 'arriendo');
create type public.tipo_inmueble as enum ('apartamento', 'casa', 'apartaestudio', 'otro');
-- 'borrador' se reserva para S2 (fotos): en S1 todo registro nace 'publicado_fundador'.
create type public.estado_inmueble as enum ('borrador', 'publicado_fundador');

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------
create table public.vendedores (
  id                uuid primary key default gen_random_uuid(),
  nombre            text        not null check (length(btrim(nombre)) between 2 and 80),
  -- WhatsApp normalizado a E.164 Colombia (+57 + 10 dígitos). El engine normaliza; el check blinda.
  whatsapp          text        not null check (whatsapp ~ '^\+57[0-9]{10}$'),
  email             text        check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  ciudad            text        not null check (length(btrim(ciudad)) between 2 and 60),
  zona              text        check (zona is null or length(btrim(zona)) <= 80),
  consentimiento_at timestamptz not null,
  created_at        timestamptz not null default now()
);

create table public.inmuebles (
  id                   uuid primary key default gen_random_uuid(),
  vendedor_id          uuid not null references public.vendedores (id) on delete cascade,
  operacion            public.operacion       not null,
  tipo                 public.tipo_inmueble   not null,
  barrio               text not null check (length(btrim(barrio)) between 2 and 80),
  direccion_aproximada text check (direccion_aproximada is null or length(btrim(direccion_aproximada)) <= 120),
  area_m2              integer not null check (area_m2 between 10 and 100000),
  habitaciones         smallint not null check (habitaciones between 0 and 40),
  precio_esperado      bigint  not null check (precio_esperado between 1000000 and 900000000000),
  estado               public.estado_inmueble not null default 'publicado_fundador',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index inmuebles_vendedor_id_idx on public.inmuebles (vendedor_id);
create index inmuebles_created_at_idx  on public.inmuebles (created_at desc);

-- Rate limiting anti-abuso. La IP se guarda HASHEADA (pepper en la app) — minimización Ley 1581.
create table public.registro_intentos (
  id        bigint generated always as identity primary key,
  ip_hash   text        not null,
  creado_at timestamptz not null default now()
);

create index registro_intentos_ip_creado_idx on public.registro_intentos (ip_hash, creado_at desc);

-- updated_at automático en inmuebles (el panel del operador puede cambiar `estado`).
create function public.tocar_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger inmuebles_updated_at
  before update on public.inmuebles
  for each row execute function public.tocar_updated_at();

-- ---------------------------------------------------------------------------
-- Privilegios de tabla (explícitos — no dependemos de default privileges del stack)
-- ---------------------------------------------------------------------------
-- anon NO recibe ningún privilegio directo: su única vía es la RPC SECURITY DEFINER.
revoke all on public.vendedores        from anon;
revoke all on public.inmuebles         from anon;
revoke all on public.registro_intentos from anon, authenticated;

grant select         on public.vendedores to authenticated;
grant select, update on public.inmuebles  to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.vendedores        enable row level security;
alter table public.inmuebles         enable row level security;
alter table public.registro_intentos enable row level security;

-- vendedores/inmuebles: SIN políticas para anon (queda todo denegado por defecto).
-- El operador (authenticated) puede leer todo y actualizar el estado de los inmuebles.
create policy "operador lee vendedores"
  on public.vendedores for select to authenticated using (true);

create policy "operador lee inmuebles"
  on public.inmuebles for select to authenticated using (true);

create policy "operador actualiza inmuebles"
  on public.inmuebles for update to authenticated using (true) with check (true);

-- registro_intentos: sin políticas para nadie. Solo la RPC (SECURITY DEFINER) la toca.

-- ---------------------------------------------------------------------------
-- RPC de registro — única vía de escritura para el flujo público (anon)
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER + search_path vacío (nombres calificados) = no se puede secuestrar por
-- search_path. Valida consentimiento y rate limit ANTES de insertar; todo en una transacción
-- (una función = una transacción): si algo falla, no quedan vendedores ni inmuebles huérfanos.
create function public.registrar_fundador(
  p_nombre         text,
  p_whatsapp       text,
  p_email          text,
  p_ciudad         text,
  p_zona           text,
  p_operacion      public.operacion,
  p_tipo           public.tipo_inmueble,
  p_barrio         text,
  p_direccion      text,
  p_area           integer,
  p_habitaciones   smallint,
  p_precio         bigint,
  p_consentimiento boolean,
  p_ip_hash        text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_vendedor_id uuid;
  v_inmueble_id uuid;
  v_en_hora     integer;
  v_en_dia      integer;
begin
  -- 1) Consentimiento expreso (Ley 1581): sin `true` explícito no hay registro.
  if p_consentimiento is not true then
    raise exception 'consentimiento_requerido' using errcode = 'check_violation';
  end if;

  -- 2) Rate limit por IP (cuenta intentos PREVIOS; el actual se registra si pasa).
  if p_ip_hash is not null then
    select count(*) into v_en_hora
      from public.registro_intentos
      where ip_hash = p_ip_hash and creado_at > now() - interval '1 hour';
    if v_en_hora >= 3 then
      raise exception 'rate_limit_hora' using errcode = 'check_violation';
    end if;

    select count(*) into v_en_dia
      from public.registro_intentos
      where ip_hash = p_ip_hash and creado_at > now() - interval '1 day';
    if v_en_dia >= 10 then
      raise exception 'rate_limit_dia' using errcode = 'check_violation';
    end if;

    insert into public.registro_intentos (ip_hash) values (p_ip_hash);
  end if;

  -- 3) Inserta vendedor (consentimiento_at lo fija el servidor, jamás el cliente).
  insert into public.vendedores (nombre, whatsapp, email, ciudad, zona, consentimiento_at)
    values (btrim(p_nombre), p_whatsapp, nullif(btrim(p_email), ''), btrim(p_ciudad),
            nullif(btrim(p_zona), ''), now())
    returning id into v_vendedor_id;

  -- 4) Inserta inmueble (estado 'publicado_fundador' por defecto).
  insert into public.inmuebles
      (vendedor_id, operacion, tipo, barrio, direccion_aproximada, area_m2, habitaciones, precio_esperado)
    values (v_vendedor_id, p_operacion, p_tipo, btrim(p_barrio),
            nullif(btrim(p_direccion), ''), p_area, p_habitaciones, p_precio)
    returning id into v_inmueble_id;

  return v_inmueble_id;
end;
$$;

-- Keep-alive: el proyecto Supabase free se pausa tras ~1 semana inactivo. Un cron (GitHub Action)
-- llama a `ping()` semanalmente; leer/escribir cuenta como actividad.
create function public.ping()
returns timestamptz
language sql
security definer
set search_path = ''
as $$
  select now();
$$;

-- Permisos: anon SOLO puede ejecutar las dos RPC. Nada directo sobre las tablas.
revoke all on function public.registrar_fundador(
  text, text, text, text, text, public.operacion, public.tipo_inmueble,
  text, text, integer, smallint, bigint, boolean, text
) from public;
grant execute on function public.registrar_fundador(
  text, text, text, text, text, public.operacion, public.tipo_inmueble,
  text, text, integer, smallint, bigint, boolean, text
) to anon, authenticated;

revoke all on function public.ping() from public;
grant execute on function public.ping() to anon, authenticated;

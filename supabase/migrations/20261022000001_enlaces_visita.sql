-- ═══════════════════════════════════════════════════════════════════════════════
-- Migración 11 (Sprint 008, F2) — un enlace nuevo por cada correo al comprador.
--
-- Por qué: el comprador abre su solicitud con un enlace con token (`/visita#t=…`) y la base guarda solo el
-- hash, así que nadie —ni el servidor— puede volver a escribir ese enlace. El primer correo lo lleva (el
-- token nace en `solicitar_visita`), pero los siguientes (horarios propuestos, recordatorio…) los dispara
-- el dueño o el cron, que no lo tienen. Cada uno de esos correos pide aquí un token NUEVO para la misma
-- solicitud; todos siguen sirviendo, y de cada uno queda solo su hash.
--
-- 100 % ADITIVA: una tabla cerrada, una función de servidor y el ayudante `solicitud_de_token` (misma firma)
-- que ahora también mira esa tabla. Nada que existía deja de funcionar.
-- ═══════════════════════════════════════════════════════════════════════════════

create table public.enlaces_visita (
  id           uuid primary key default gen_random_uuid(),
  solicitud_id uuid not null references public.solicitudes_visita (id) on delete cascade,
  token_hash   text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_at   timestamptz not null default now()
);

create index enlaces_visita_solicitud_idx on public.enlaces_visita (solicitud_id);

alter table public.enlaces_visita enable row level security;
revoke all on public.enlaces_visita from anon, authenticated;
grant all on public.enlaces_visita to service_role;

-- El ayudante reconoce el token con el que nació la solicitud y los que se emitieron después.
create or replace function public.solicitud_de_token(p_token text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  with t as (
    select encode(sha256(convert_to(p_token, 'UTF8')), 'hex') as h
     where p_token is not null and length(p_token) = 43
  )
  select coalesce(
    (select s.id from public.solicitudes_visita s, t where s.token_hash = t.h),
    (select e.solicitud_id from public.enlaces_visita e, t where e.token_hash = t.h)
  )
$$;

-- Un token nuevo (32 bytes) para un correo al comprador. Devuelve el token UNA vez; null si la solicitud no
-- existe. Solo el servidor (los avisos y el cron).
create function public.nuevo_enlace_visita(p_solicitud_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text;
begin
  if not exists (select 1 from public.solicitudes_visita where id = p_solicitud_id) then
    return null;
  end if;
  v_token := rtrim(translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/', '-_'), '=');
  insert into public.enlaces_visita (solicitud_id, token_hash)
  values (p_solicitud_id, encode(sha256(convert_to(v_token, 'UTF8')), 'hex'));
  return v_token;
end;
$$;

-- Privilegios EXPLÍCITOS: el ayudante y la emisión, solo el servidor (los avisos necesitan saber de qué
-- solicitud es el token que trae el comprador para armar el correo del dueño).
revoke all on function public.solicitud_de_token(text) from public;
grant execute on function public.solicitud_de_token(text) to service_role;

revoke all on function public.nuevo_enlace_visita(uuid) from public;
grant execute on function public.nuevo_enlace_visita(uuid) to service_role;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Migración 14 (Sprint 010, F1) — decidir con números: la tasa de vivienda con su fecha y los comparables de precio.
--
-- Qué entra (ADR 018):
--   · `tasas_vivienda`: la tasa de crédito de vivienda (no VIS, pesos, tasa fija) que el cron diario lee del conjunto
--     abierto de la Superfinanciera y guarda CON su fecha de corte. El simulador la muestra siempre con esa fecha;
--     si el conjunto no responde, se usa la última guardada (nunca se inventa una);
--   · `tasa_vivienda()`: la última fila, para cualquiera (la tasa de un conjunto abierto no es un dato personal);
--   · `guardar_tasa_vivienda(...)`: solo el servidor (el cron). Un upsert por fecha de corte;
--   · `comparables_precio(operación, tipo, localidad)`: los anuncios visibles de esa operación, tipo y localidad
--     (slug, código de sector, área y precio), hasta 1 000, con el MISMO `where` de visibilidad que `/buscar`
--     (`inmuebles_que_cumplen`, migración 12). Alimenta el rango «¿Está caro?» (P25–P75 en el motor, no aquí): la
--     base solo entrega lo que `/buscar` ya muestra, sin dirección ni datos del vendedor.
--
-- ADITIVA: una tabla y tres funciones nuevas. Ninguna función existente cambia de firma ni pierde un permiso.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. La tasa (RLS sin políticas: solo las RPC definer y service_role la tocan) ─
create table public.tasas_vivienda (
  fecha_corte date primary key,
  tasa_ea     numeric(6,3) not null check (tasa_ea >= 1 and tasa_ea <= 60),
  creditos    integer not null check (creditos >= 0),
  entidades   smallint not null check (entidades >= 0),
  fuente      text not null check (char_length(fuente) between 3 and 200),
  leida_at    timestamptz not null default now()
);

alter table public.tasas_vivienda enable row level security;
revoke all on public.tasas_vivienda from anon, authenticated;
grant all on public.tasas_vivienda to service_role;

-- ── 2. Funciones ──────────────────────────────────────────────────────────────

-- La última tasa guardada, o null si el cron aún no ha leído ninguna.
create function public.tasa_vivienda()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'fecha_corte', t.fecha_corte,
    'tasa_ea', t.tasa_ea,
    'creditos', t.creditos,
    'entidades', t.entidades,
    'fuente', t.fuente
  )
  from public.tasas_vivienda t
  order by t.fecha_corte desc
  limit 1
$$;

-- Solo el servidor (el cron). Un upsert por fecha de corte; una fecha futura (hora de Bogotá) es un dato corrupto.
create function public.guardar_tasa_vivienda(
  p_fecha_corte date,
  p_tasa_ea numeric,
  p_creditos integer,
  p_entidades integer,
  p_fuente text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_fecha_corte is null or p_fecha_corte > (now() at time zone 'America/Bogota')::date then
    raise exception 'fecha_invalida' using errcode = 'P0001';
  end if;

  insert into public.tasas_vivienda (fecha_corte, tasa_ea, creditos, entidades, fuente)
  values (p_fecha_corte, p_tasa_ea, p_creditos, p_entidades, p_fuente)
  on conflict (fecha_corte) do update
    set tasa_ea = excluded.tasa_ea,
        creditos = excluded.creditos,
        entidades = excluded.entidades,
        fuente = excluded.fuente,
        leida_at = now();
end;
$$;

-- Los anuncios visibles de una operación, un tipo y una localidad, para calcular el rango de precio por m².
-- Con cualquiera de los tres en null devuelve `[]`: esta lectura no sirve para volcar el catálogo entero.
create function public.comparables_precio(
  p_operacion public.operacion,
  p_tipo public.tipo_inmueble,
  p_localidad text
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(c.fila order by c.creado desc, c.slug), '[]'::jsonb)
  from (
    select jsonb_build_object(
             'slug', i.slug,
             'sector_codigo', i.sector_codigo,
             'area_m2', i.area_m2,
             'precio_esperado', i.precio_esperado
           ) as fila,
           i.created_at as creado,
           i.slug as slug
      from public.inmuebles i
     where p_operacion is not null
       and p_tipo is not null
       and p_localidad is not null
       and i.id in (
         select public.inmuebles_que_cumplen(p_operacion, p_tipo, p_localidad, null, null, null, null)
       )
     order by i.created_at desc, i.slug
     limit 1000
  ) c
$$;

-- ── 3. Permisos, por firma ────────────────────────────────────────────────────

-- Públicas (anon + authenticated + service_role).
revoke all on function public.tasa_vivienda() from public;
grant execute on function public.tasa_vivienda() to anon, authenticated, service_role;

revoke all on function public.comparables_precio(public.operacion, public.tipo_inmueble, text) from public;
grant execute on function public.comparables_precio(public.operacion, public.tipo_inmueble, text)
  to anon, authenticated, service_role;

-- Solo el servidor.
revoke all on function public.guardar_tasa_vivienda(date, numeric, integer, integer, text) from public;
grant execute on function public.guardar_tasa_vivienda(date, numeric, integer, integer, text) to service_role;

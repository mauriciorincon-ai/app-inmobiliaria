-- ═══════════════════════════════════════════════════════════════════════════════
-- Migración 13 (Sprint 009, F2) — el rechazo de una alerta que nadie pidió.
--
-- Por qué: el correo de confirmación debe traer, además de «Confirmar», la baja en un clic («No la pedí:
-- borrarla»), y `crear_alerta` (migración 12) no emitía un token de baja. Y el bloqueo de 30 días para el
-- correo que rechazó una alerta miraba CUALQUIER baja de una alerta sin confirmar: si el creador la borraba
-- desde su propio teléfono antes de confirmar, se bloqueaba a sí mismo. Ahora:
--   · `crear_alerta` devuelve también el token de baja (para el correo de confirmación);
--   · `baja_alerta` sobre una alerta SIN confirmar marca `rechazada_at` (lo hizo el dueño del correo);
--   · `crear_alerta` bloquea 30 días solo por `rechazada_at`;
--   · `purgar_vencidos` ya no borra a los 7 días una alerta sin confirmar que SÍ tiene baja (la rechazada):
--     esa se queda los 30 días del bloqueo. Sin esto, la promesa del correo («no recibirá otra en 30 días»)
--     duraba, en realidad, hasta 7.
--
-- 100 % ADITIVA: una columna nueva y tres funciones con la MISMA firma (conservan sus grants). Nada que
-- existía deja de funcionar; `crear_alerta` solo suma la clave `baja` a lo que devuelve.
-- ═══════════════════════════════════════════════════════════════════════════════

alter table public.alertas add column rechazada_at timestamptz;

create or replace function public.crear_alerta(
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
  v_baja text;
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
                 where email = v_email and rechazada_at is not null
                   and rechazada_at > now() - interval '30 days') then
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
  v_baja := public.generar_token();
  insert into public.enlaces_alerta (alerta_id, proposito, origen, token_hash) values
    (v_id, 'gestionar', 'creacion', public.hash_token(v_gestionar)),
    (v_id, 'confirmar', 'creacion', public.hash_token(v_confirmar)),
    -- La baja del correo de confirmación («No la pedí»): vive como los enlaces de cada aviso.
    (v_id, 'baja', 'correo', public.hash_token(v_baja));

  return jsonb_build_object(
    'alerta_id', v_id, 'gestionar', v_gestionar, 'confirmar', v_confirmar, 'baja', v_baja
  );
end;
$$;

create or replace function public.baja_alerta(p_token text)
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
  -- Si nunca se confirmó, quien la da de baja desde el correo es el dueño de ese correo diciendo «no la
  -- pedí»: queda RECHAZADA y ese correo no recibe otra alerta en 30 días. (Borrar desde el teléfono que la
  -- creó no rechaza nada: lo hace el creador, no el dueño del correo.)
  update public.alertas
     set baja_at = coalesce(baja_at, now()),
         rechazada_at = case when confirmada_at is null then coalesce(rechazada_at, now()) else rechazada_at end
   where id = v_id;
  return jsonb_build_object('estado', 'baja', 'nombre', v_nombre);
end;
$$;

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

  -- Alertas que nadie confirmó NI dieron de baja (7 días) y las dadas de baja (30 días). Se llevan sus enlaces.
  -- Una alerta rechazada desde el correo («No la pedí») NUNCA se confirmó, pero lleva `baja_at`: se queda los 30
  -- días del bloqueo; si la purga la borrara a los 7, el correo ajeno podría recibir otra a la semana.
  with b as (
    delete from public.alertas
     where (confirmada_at is null and baja_at is null and created_at < now() - interval '7 days')
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

-- S16 (sprint de cierre del H-2) — el lote de la base. Una sola migración, con el «sí» del usuario antes de aplicarla en la nube.
-- Cuerpos sacados de `pg_get_functiondef` de la base local (no copiados a mano) y cambiados solo donde dice cada bloque.
--  1. `solicitar_visita` recibe el consentimiento y topa los ciclos (10 solicitudes por comprador en 24 h); firma nueva (S8 M3, M7).
--  2. `salas_panel` no corta en silencio: las solicitudes abiertas salen todas; las cerradas, las 100 más recientes (S13).
--  3. Una bandera resuelta con «pausar» vuelve a la cola tras reactivar SOLO si cambió el dato que la disparó (decisión del G-Plan, 1b).
--  4. Un CTL pedido que nunca llega tiene salida: `cerrar_ctl_pedido` (el dueño no lo entregó) (S15).
--  5. La purga no se lleva a un comprador que está verificándose (S8 B10).
--  6. El nombre de un número sin verificar es el de la sesión que lo verifica, no el último que alguien escribió (S7 B).
--  7. «Bajó de precio» pide al menos un 1 % (S9 M).
--  8. Las campañas del operador no pasan del cupo diario de correos (S9 M): `correos_libres_hoy`.
--  9. Asignar un barrio de otra localidad mueve también la zona del anuncio (S6 M).
-- 1. La solicitud de visita, con el consentimiento en la RPC y un tope de ciclos. La firma anterior se retira.
drop function public.solicitar_visita(text, text, text, bigint, bigint, text[], text, text);
CREATE FUNCTION public.solicitar_visita(p_sesion_hash text, p_slug text, p_intencion text, p_presupuesto_min bigint, p_presupuesto_max bigint, p_forma_pago text[], p_mensaje text, p_email text, p_consentimiento boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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

  -- Ley 1581: la solicitud lleva datos del comprador al dueño (nombre, intención, presupuesto); sin consentimiento no se guarda.
  if p_consentimiento is distinct from true then
    raise exception 'consentimiento_requerido' using errcode = 'check_violation';
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
  if not found or v_inmueble.vigente_hasta <= now() or v_inmueble.pausado_at is not null then
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
  -- Pedir, cancelar y volver a pedir también tiene tope: cada solicitud le escribe al dueño.
  if (select count(*) from public.solicitudes_visita
        where comprador_id = v_comprador and created_at > now() - interval '24 hours') >= 10 then
    raise exception 'demasiados_ciclos' using errcode = 'check_violation';
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
$function$;
revoke all on function public.solicitar_visita(text, text, text, bigint, bigint, text[], text, text, boolean) from public;
grant execute on function public.solicitar_visita(text, text, text, bigint, bigint, text[], text, text, boolean)
  to anon, authenticated, service_role;

-- 2. El panel de salas: las abiertas nunca se cortan (antes, 100 filas de cualquier estado, las más nuevas primero).
CREATE OR REPLACE FUNCTION public.salas_panel()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', x.id,
      'estado', x.estado,
      'fecha', x.created_at,
      'franja', x.franja,
      'sin_respuesta', x.sin_respuesta_at is not null,
      'ninguno', x.ninguno_at is not null,
      'proyecto', jsonb_build_object(
        'slug', x.proyecto_slug,
        'nombre', x.proyecto_nombre,
        'edicion', x.proyecto_edicion,
        'constructora', x.constructora,
        'paginas', to_jsonb(x.apariciones)
      ),
      'comprador', jsonb_build_object(
        'nombre', x.nombre,
        'telefono_fin', right(x.telefono, 4),
        'identificado', x.identificado,
        'idioma', x.idioma
      ),
      'horarios', case when x.estado = 'propuesta' then coalesce((
          select jsonb_agg(jsonb_build_object('id', h.id, 'inicio', h.inicio) order by h.inicio)
            from public.horarios_propuestos h where h.solicitud_id = x.id
        ), '[]'::jsonb) else '[]'::jsonb end,
      'visita', case when x.visita_id is null then null else jsonb_build_object(
          'inicio', x.visita_inicio,
          'cancelada_por', x.cancelada_por
        ) end,
      'whatsapp', case when x.estado = 'confirmada' and x.visita_id is not null and x.cancelada_por is null
                       then x.telefono else null end,
      'sala', case when x.sala_slug is null then null else jsonb_build_object(
          'telefono', x.sala_telefono,
          'direccion', x.sala_direccion
        ) end
    )
    order by x.created_at desc
  ), '[]'::jsonb)
  from (
    with base as (
    select s.id, s.estado, s.estado in ('pendiente', 'propuesta', 'confirmada') as abierta, s.created_at, s.franja, s.sin_respuesta_at, s.ninguno_at,
           s.proyecto_slug, s.proyecto_nombre, s.proyecto_edicion,
           co.nombre, co.telefono, co.idioma,
           exists (select 1 from public.identificaciones i where i.comprador_id = co.id) as identificado,
           v.id as visita_id, v.inicio as visita_inicio, v.cancelada_por,
           p.constructora, p.apariciones,
           sv.slug as sala_slug, sv.telefono as sala_telefono, sv.direccion as sala_direccion
      from public.solicitudes_visita s
      join public.compradores co on co.id = s.comprador_id
      left join public.visitas v on v.solicitud_id = s.id
      left join public.proyectos_nuevos p on p.edicion = s.proyecto_edicion and p.slug = s.proyecto_slug
      left join public.salas_ventas sv on sv.slug = s.proyecto_slug
     where s.proyecto_slug is not null
       and (s.estado in ('pendiente', 'propuesta', 'confirmada') or s.updated_at > now() - interval '30 days')
    )
    select * from base where abierta
    union all
    (select * from base where not abierta order by created_at desc limit 100)
  ) x
$function$;

-- 3. Una bandera resuelta con «pausar» guarda el dato que la disparó; reactivado el anuncio, vuelve a la cola solo si ese dato cambió.
-- Una resuelta antes de esta migración no lo tiene: no se sabe si cambió y no vuelve (no se acusa por lo que no se sabe).
alter table public.banderas add column dato_al_resolver text;

create function public.dato_de_bandera(p_inmueble_id uuid, p_regla text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case p_regla
    when 'precio' then i.precio_esperado::text
    when 'matricula' then upper(btrim(i.matricula))
    when 'telefono' then (select regexp_replace(v.whatsapp, '\D', '', 'g') from public.vendedores v where v.id = i.vendedor_id)
    when 'foto' then (select string_agg(f.huella::text, ',' order by f.huella::text)
                        from public.fotos f where f.inmueble_id = i.id and f.huella is not null)
  end
  from public.inmuebles i
  where i.id = p_inmueble_id
$$;
revoke all on function public.dato_de_bandera(uuid, text) from public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.aplicar_banderas(p_regla text, p_hallazgos jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_n integer;
begin
  delete from public.banderas b
   where b.regla = p_regla and b.resolucion is null
     and not (coalesce(p_hallazgos, '{}'::jsonb) ? b.inmueble_id::text);
  insert into public.banderas as b (inmueble_id, regla, evidencia)
  select h.key::uuid, p_regla, h.value
    from jsonb_each(coalesce(p_hallazgos, '{}'::jsonb)) h
  on conflict (inmueble_id, regla) do update
     set evidencia = excluded.evidencia,
         actualizada_at = now(),
         -- Una resuelta con «pausar» cuyo anuncio volvió y cuyo dato cambió se reabre como nueva.
         created_at = case when b.resolucion is null then b.created_at else now() end,
         resolucion = null, razon = null, nota = null, resuelta_at = null, resuelta_por = null, dato_al_resolver = null
   where b.resolucion is null
      or (b.resolucion = 'pausar'
          and b.dato_al_resolver is not null
          and (select i.pausado_at from public.inmuebles i where i.id = b.inmueble_id) is null
          and b.dato_al_resolver is distinct from public.dato_de_bandera(b.inmueble_id, b.regla));
  select count(*) into v_n from public.banderas b where b.regla = p_regla and b.resolucion is null;
  return v_n;
end;
$function$;

CREATE OR REPLACE FUNCTION public.resolver_revision(p_inmueble_id uuid, p_resolucion text, p_razon text, p_nota text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_nota text := nullif(btrim(coalesce(p_nota, '')), '');
  v_b integer;
  v_r integer;
begin
  update public.banderas
     set resolucion = p_resolucion, razon = p_razon, nota = v_nota, resuelta_at = now(), resuelta_por = auth.uid(),
         dato_al_resolver = case when p_resolucion = 'pausar' then public.dato_de_bandera(inmueble_id, regla) end
   where inmueble_id = p_inmueble_id and resolucion is null;
  get diagnostics v_b = row_count;
  update public.reportes
     set resolucion = p_resolucion, razon = p_razon, nota = v_nota, resuelta_at = now(), resuelta_por = auth.uid()
   where inmueble_id = p_inmueble_id and resolucion is null;
  get diagnostics v_r = row_count;
  return v_b + v_r;
end;
$function$;

-- 4. El CTL pedido que el dueño nunca entrega: el operador lo cierra. El pedido sale de la cola, queda la fecha, y un anuncio que era
-- verificado y quedó sin CTL vigente (lo dejó así «pedir el CTL») vuelve a «fundador»: el sello no se sostiene sin documento.
alter table public.inmuebles add column ctl_no_entregado_at timestamptz;

create function public.cerrar_ctl_pedido(p_inmueble_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.inmuebles
     set ctl_pedido_at = null,
         ctl_no_entregado_at = now(),
         nivel_verificacion = case when nivel_verificacion = 'verificado' and ctl_expedido_el is null
                                   then 'fundador' else nivel_verificacion end
   where id = p_inmueble_id and ctl_pedido_at is not null;
  if not found then
    raise exception 'estado_invalido' using errcode = 'check_violation';
  end if;
end;
$$;
revoke all on function public.cerrar_ctl_pedido(uuid) from public;
grant execute on function public.cerrar_ctl_pedido(uuid) to authenticated, service_role;

-- 5. La purga de compradores sin verificar mira también su último intento, no solo cuándo se crearon.
CREATE OR REPLACE FUNCTION public.purgar_vencidos()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    delete from public.compradores c
     where c.verificado_at is null and c.created_at < now() - interval '30 days'
       -- Quien pidió un código en los últimos 30 días se está verificando: su intento no se borra a mitad (S8 B10).
       and not exists (select 1 from public.verificaciones v
                        where v.comprador_id = c.id and v.created_at > now() - interval '30 days')
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
$function$;

-- 6. Cada pedido de código guarda el nombre que escribió esa sesión; el canje exitoso fija ESE nombre si el número no estaba verificado.
-- Antes, cualquiera que iniciara una verificación con el mismo número reescribía el nombre que vería el dueño.
alter table public.verificaciones add column nombre text check (nombre is null or char_length(nombre) between 1 and 80);

CREATE OR REPLACE FUNCTION public.iniciar_verificacion(p_sesion_hash text, p_nombre text, p_telefono text, p_idioma text, p_ip_hash text, p_consentimiento boolean)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    set idioma = excluded.idioma
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
      insert into public.verificaciones (sesion_hash, comprador_id, codigo_hash, ip_hash, vence_at, nombre)
      values (p_sesion_hash, v_comprador, v_hash, p_ip_hash, now() + interval '10 minutes', v_nombre);
      exit;
    exception when unique_violation then
      null;
    end;
  end loop;

  return v_codigo;
end;
$function$;

CREATE OR REPLACE FUNCTION public.canjear_codigo_whatsapp(p_codigo_hash text, p_telefono text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    set nombre = case when verificado_at is null then coalesce(v.nombre, nombre) else nombre end,
        verificado_at = coalesce(verificado_at, now())
    where id = v.comprador_id;
  return 'ok';
end;
$function$;

-- 7. El resumen de alertas: «bajó de precio» exige una baja de al menos el 1 %.
CREATE OR REPLACE FUNCTION public.reclamar_resumenes(p_tope integer DEFAULT 250, p_alerta uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
           -- Al menos un 1 % menos: bajar unos pesos no es una noticia (S9 M).
           and i.precio_esperado <= p.anterior * 0.99
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
$function$;

-- 8. Lo que queda del cupo diario de correos (el mismo que usan las alertas): visitas, alertas y campañas de hoy. La ruta de
-- campañas manda como máximo esto.
create function public.correos_libres_hoy(p_tope integer default 250)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select greatest(
    coalesce(p_tope, 250)
      - coalesce((select visita + alerta from public.correos_dia where dia = public.dia_bogota()), 0)
      - coalesce((select sum(enviados) from public.envios
                   where (created_at at time zone 'America/Bogota')::date = public.dia_bogota()), 0),
    0)::integer
$$;
revoke all on function public.correos_libres_hoy(integer) from public;
grant execute on function public.correos_libres_hoy(integer) to authenticated, service_role;

-- 9. El sector y la zona del anuncio, siempre de la misma localidad.
CREATE OR REPLACE FUNCTION public.fijar_sector()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.sector_codigo is not null
     and (tg_op = 'INSERT' or new.sector_codigo is distinct from old.sector_codigo) then
    -- Un barrio de otra localidad (el operador lo asigna a mano) mueve también la zona: si no, la búsqueda y los cupos lo
    -- seguirían contando en la localidad vieja (S6 M).
    new.zona_id := coalesce((
      select z.id from public.sectores s
        join public.zonas z on lower(z.nombre) = lower(s.localidad)
       where s.codigo = new.sector_codigo
    ), new.zona_id);
    return new;
  end if;
  new.sector_codigo := (
    select s.codigo
    from public.sectores s
    join public.zonas z on lower(z.nombre) = lower(s.localidad)
    where z.id = new.zona_id
      and public.clave_barrio(s.nombre) = public.clave_barrio(new.barrio)
  );
  return new;
end;
$function$;

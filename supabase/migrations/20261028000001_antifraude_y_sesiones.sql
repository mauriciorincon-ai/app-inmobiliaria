-- ═══════════════════════════════════════════════════════════════════════════════
-- Migración 17 (Sprint 015, F1) — antifraude con reglas a la vista, la pausa del operador y la sesión de fotos
--
-- Qué entra (maqueta 12 del comprador y «fotos que venden»; las pantallas llegan en F1 y F3):
--   · `reportes`: el comprador con WhatsApp verificado reporta un anuncio con motivos de una lista cerrada (los 6 de la maqueta)
--     y un detalle opcional. Uno por persona y anuncio, a lo sumo 5 por persona en 24 h. El dueño jamás sabe quién reportó;
--     el operador ve los motivos y el detalle, no la identidad;
--   · `banderas`: lo que una REGLA escrita ve en un anuncio visible (precio ≥ 30 % bajo la mediana de sus comparables, foto
--     repetida en el anuncio de otro teléfono, matrícula repetida con otro teléfono, el mismo WhatsApp con dos nombres o más).
--     Una por anuncio y regla; la evidencia NO lleva datos de terceros (porcentajes, conteos y el slug público del otro
--     anuncio). Una bandera resuelta (pausar, pedir el CTL o descartar) no reaparece;
--   · NI UN REPORTE NI UNA BANDERA CAMBIAN LO QUE VE NADIE: solo el operador pausa. La pausa es la columna `pausado_at`, y la
--     respetan TODAS las funciones públicas que muestran un anuncio o actúan sobre él (la búsqueda, la ficha, los favoritos,
--     las listas, el contacto, la visita y los resúmenes de las alertas, por `inmuebles_que_cumplen`). Una prueba recorre el
--     catálogo y falla si una función que lee `inmuebles` no está clasificada;
--   · «pedir el CTL»: `ctl_pedido_at`; si el anuncio era verificado, su fecha de CTL se borra (queda «re-verificación
--     pendiente», que la ficha ya sabe pintar) hasta que el operador lo verifique de nuevo con un CTL de ≤ 30 días;
--   · `fotos.huella`: la huella perceptual (dHash de 64 bits) de cada foto, calculada en el navegador sobre su miniatura;
--   · `sesiones_fotos`: el dueño pide la sesión desde «Mi anuncio» y el operador la agenda (solicitada · agendada · hecha ·
--     cancelada); una abierta por anuncio. Sin cobro y sin mensajes automáticos: el operador escribe por su WhatsApp.
--
-- QUÉ CAMBIA EN PRODUCCIÓN (lo que el usuario aprueba antes de tocar la nube):
--   · NUEVO: 3 tablas (RLS cerrada: ni anon ni authenticated leen una fila), 3 columnas en `inmuebles` y `fotos` SIN valor
--     por omisión (cambio de catálogo, sin reescribir filas), 5 funciones públicas, 14 del operador y 1 interna.
--   · REEMPLAZADAS con la MISMA firma (los permisos se conservan; las claves que devolvían, intactas): `inmuebles_que_cumplen`,
--     `resumen_anuncios`, `mis_favoritos`, `fusionar_favoritos`, `obtener_ficha`, `registrar_contacto`, `solicitar_visita`,
--     `lista_detalle`, `mis_listas` y `agregar_a_lista` suman `pausado_at`; `renovar_vigencia` suma la clave `pausado`;
--     `marcar_verificado_ctl` limpia `ctl_pedido_at`.
--   · Un Worker VIEJO contra la base nueva sigue funcionando: nada está pausado hasta que el panel nuevo lo pause, y la clave
--     nueva de `renovar_vigencia` se ignora.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. La pausa, el CTL pedido y la huella de la foto ───────────────────────────
alter table public.inmuebles
  add column pausado_at    timestamptz,
  add column ctl_pedido_at timestamptz;

alter table public.fotos
  add column huella bit(64);

-- ── 2. Reportes, banderas y sesiones de fotos (solo por RPC) ────────────────────
create table public.reportes (
  id           uuid primary key default gen_random_uuid(),
  inmueble_id  uuid not null references public.inmuebles (id) on delete cascade,
  comprador_id uuid not null references public.compradores (id) on delete cascade,
  motivos      text[] not null check (
                 cardinality(motivos) between 1 and 6
                 and motivos <@ array['precio_irreal', 'fotos_de_otro', 'no_es_el_dueno', 'pidio_plata',
                                      'ya_no_esta', 'otra_cosa']::text[]),
  detalle      text check (detalle is null or char_length(detalle) between 1 and 500),
  resolucion   text check (resolucion is null or resolucion in ('pausar', 'pedir_ctl', 'descartar')),
  razon        text check (razon is null or razon in ('es_el_dueno', 'tiene_explicacion', 'mismo_dueno', 'sin_fundamento')),
  nota         text check (nota is null or char_length(nota) between 1 and 300),
  resuelta_at  timestamptz,
  resuelta_por uuid,
  created_at   timestamptz not null default now(),
  unique (comprador_id, inmueble_id),
  check ((resolucion is null) = (resuelta_at is null)),
  check ((resolucion is not distinct from 'descartar') = (razon is not null))
);
create index reportes_abiertos_idx on public.reportes (inmueble_id) where resolucion is null;
create index reportes_comprador_idx on public.reportes (comprador_id, created_at desc);

create table public.banderas (
  id             uuid primary key default gen_random_uuid(),
  inmueble_id    uuid not null references public.inmuebles (id) on delete cascade,
  regla          text not null check (regla in ('precio', 'foto', 'matricula', 'telefono')),
  evidencia      jsonb not null default '{}'::jsonb,
  resolucion     text check (resolucion is null or resolucion in ('pausar', 'pedir_ctl', 'descartar')),
  razon          text check (razon is null or razon in ('es_el_dueno', 'tiene_explicacion', 'mismo_dueno', 'sin_fundamento')),
  nota           text check (nota is null or char_length(nota) between 1 and 300),
  resuelta_at    timestamptz,
  resuelta_por   uuid,
  created_at     timestamptz not null default now(),
  actualizada_at timestamptz not null default now(),
  unique (inmueble_id, regla),
  check ((resolucion is null) = (resuelta_at is null)),
  check ((resolucion is not distinct from 'descartar') = (razon is not null))
);
create index banderas_abiertas_idx on public.banderas (regla) where resolucion is null;

create table public.sesiones_fotos (
  id            uuid primary key default gen_random_uuid(),
  inmueble_id   uuid not null references public.inmuebles (id) on delete cascade,
  estado        text not null default 'solicitada'
                check (estado in ('solicitada', 'agendada', 'hecha', 'cancelada')),
  franja        text not null check (franja in ('entre_semana', 'sabado', 'domingo')),
  agendada_para timestamptz,
  cancelada_por text check (cancelada_por is null or cancelada_por in ('dueno', 'operador')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (estado <> 'agendada' or agendada_para is not null),
  check (estado <> 'solicitada' or agendada_para is null),
  check ((estado = 'cancelada') = (cancelada_por is not null))
);
-- Una sola sesión ABIERTA por anuncio.
create unique index sesiones_fotos_abierta_idx
  on public.sesiones_fotos (inmueble_id) where estado in ('solicitada', 'agendada');
create index sesiones_fotos_recientes_idx on public.sesiones_fotos (updated_at desc);

create trigger sesiones_fotos_updated_at
  before update on public.sesiones_fotos
  for each row execute function public.tocar_updated_at();

alter table public.reportes       enable row level security;
alter table public.banderas       enable row level security;
alter table public.sesiones_fotos enable row level security;
revoke all on public.reportes, public.banderas, public.sesiones_fotos from anon, authenticated;
grant all on public.reportes, public.banderas, public.sesiones_fotos to service_role;

-- ── 3. Las funciones que muestran un anuncio respetan la pausa (misma firma) ────
-- Cuerpos tomados de `pg_get_functiondef` de la base migrada hasta la 16; el único cambio es la condición de la pausa
-- (y, en `marcar_verificado_ctl`, limpiar el CTL pedido).

CREATE OR REPLACE FUNCTION public.inmuebles_que_cumplen(p_operacion operacion, p_tipo tipo_inmueble, p_localidad text, p_precio_min bigint, p_precio_max bigint, p_habitaciones_min smallint, p_poligono text)
 RETURNS SETOF uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_poligono polygon := public.validar_poligono(p_poligono);
begin
  return query
    select i.id
      from public.inmuebles i
      left join public.sectores s on s.codigo = i.sector_codigo
      left join public.zonas z on z.id = i.zona_id
     where i.vigente_hasta > now()
       and i.estado = 'publicado_fundador'
       and i.pausado_at is null
       and i.slug is not null
       and (p_operacion is null or i.operacion = p_operacion)
       and (p_tipo is null or i.tipo = p_tipo)
       and (p_localidad is null or lower(coalesce(s.localidad, z.nombre)) = lower(p_localidad))
       and (p_precio_min is null or i.precio_esperado >= p_precio_min)
       and (p_precio_max is null or i.precio_esperado <= p_precio_max)
       and (p_habitaciones_min is null or i.habitaciones >= p_habitaciones_min)
       and (v_poligono is null or (s.centroide is not null and v_poligono @> s.centroide));
end;
$function$;

CREATE OR REPLACE FUNCTION public.resumen_anuncios(p_slugs text[])
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce(jsonb_agg(public.fila_anuncio(i.id) order by t.ord), '[]'::jsonb)
    from unnest((coalesce(p_slugs, '{}'::text[]))[1:100]) with ordinality as t(slug, ord)
    join public.inmuebles i on i.slug = t.slug
   where i.vigente_hasta > now()
     and i.estado = 'publicado_fundador'
     and i.pausado_at is null
$function$;

CREATE OR REPLACE FUNCTION public.mis_favoritos(p_sesion_hash text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_comprador uuid := public.comprador_de_sesion(p_sesion_hash);
begin
  if v_comprador is null then
    raise exception 'no_verificado' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(i.slug order by f.created_at desc)
      from public.favoritos f
      join public.inmuebles i on i.id = f.inmueble_id
     where f.comprador_id = v_comprador
       and i.vigente_hasta > now()
       and i.estado = 'publicado_fundador'
       and i.pausado_at is null
       and i.slug is not null
  ), '[]'::jsonb);
end;
$function$;

CREATE OR REPLACE FUNCTION public.fusionar_favoritos(p_sesion_hash text, p_slugs text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_comprador uuid := public.comprador_de_sesion(p_sesion_hash);
begin
  if v_comprador is null then
    raise exception 'no_verificado' using errcode = '42501';
  end if;
  insert into public.favoritos (comprador_id, inmueble_id)
  select v_comprador, i.id
    from unnest((coalesce(p_slugs, '{}'::text[]))[1:100]) as t(slug)
    join public.inmuebles i on i.slug = t.slug
   where i.vigente_hasta > now()
     and i.estado = 'publicado_fundador'
     and i.pausado_at is null
  on conflict do nothing;
  delete from public.favoritos f
   where f.comprador_id = v_comprador
     and f.inmueble_id in (
       select x.inmueble_id from public.favoritos x
        where x.comprador_id = v_comprador
        order by x.created_at desc, x.inmueble_id
        offset 100
     );
  return public.mis_favoritos(p_sesion_hash);
end;
$function$;

CREATE OR REPLACE FUNCTION public.obtener_ficha(p_slug text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  -- Anti-zombie: un anuncio vencido desaparece de la vista pública AL INSTANTE. Y el que pausó el operador (S15), también.
  if v_inmueble.vigente_hasta <= now() or v_inmueble.pausado_at is not null then
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
$function$;

CREATE OR REPLACE FUNCTION public.registrar_contacto(p_sesion_hash text, p_slug text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  if not found or v_inmueble.vigente_hasta <= now() or v_inmueble.pausado_at is not null
     or not v_inmueble.contacto_publico then
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
$function$;

CREATE OR REPLACE FUNCTION public.solicitar_visita(p_sesion_hash text, p_slug text, p_intencion text, p_presupuesto_min bigint, p_presupuesto_max bigint, p_forma_pago text[], p_mensaje text, p_email text)
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

CREATE OR REPLACE FUNCTION public.renovar_vigencia(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_hash text;
  v_id uuid;
  v_hasta timestamptz;
  v_pausado timestamptz;
begin
  if p_token is null or length(p_token) <> 43 then
    return null;
  end if;
  v_hash := encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  update public.inmuebles
    set vigente_hasta = now() + interval '60 days', vigente = true
    where edit_token_hash = v_hash
    returning id, vigente_hasta, pausado_at into v_id, v_hasta, v_pausado;
  if v_id is null then
    return null;
  end if;
  -- Renovar confirma que el inmueble sigue disponible; NO quita la pausa del operador (S15): la pantalla lo dice.
  return jsonb_build_object('vigente_hasta', v_hasta, 'pausado', v_pausado is not null);
end;
$function$;

CREATE OR REPLACE FUNCTION public.lista_detalle(p_lista uuid, p_comprador uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select jsonb_build_object(
    'id', l.id,
    'nombre', l.nombre,
    'dueno', split_part(btrim(d.nombre), ' ', 1),
    'es_dueno', p_comprador is not null and l.comprador_id = p_comprador,
    'puede_escribir', p_comprador is not null,
    'compartida', l.compartir_hash is not null,
    'no_disponibles', (
      select count(*) from public.lista_inmuebles li
        join public.inmuebles i on i.id = li.inmueble_id
       where li.lista_id = l.id
         and not (i.vigente_hasta > now() and i.estado = 'publicado_fundador' and i.slug is not null and i.pausado_at is null)
    ),
    'items', coalesce((
      select jsonb_agg(
               public.fila_anuncio(i.id) || jsonb_build_object(
                 'notas', coalesce((
                   select jsonb_agg(
                            jsonb_build_object(
                              'id', n.id,
                              'autor', split_part(btrim(c.nombre), ' ', 1),
                              'es_mia', p_comprador is not null and n.comprador_id = p_comprador,
                              'texto', n.texto,
                              'created_at', n.created_at
                            ) order by n.created_at
                          )
                     from public.notas_lista n
                     join public.compradores c on c.id = n.comprador_id
                    where n.lista_id = l.id and n.inmueble_id = li.inmueble_id
                 ), '[]'::jsonb)
               ) order by li.created_at desc
             )
        from public.lista_inmuebles li
        join public.inmuebles i on i.id = li.inmueble_id
       where li.lista_id = l.id
         and i.vigente_hasta > now() and i.estado = 'publicado_fundador' and i.slug is not null and i.pausado_at is null
    ), '[]'::jsonb)
  )
  from public.listas l
  join public.compradores d on d.id = l.comprador_id
  where l.id = p_lista
$function$;

CREATE OR REPLACE FUNCTION public.mis_listas(p_sesion_hash text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_comprador uuid := public.comprador_de_sesion(p_sesion_hash);
begin
  if v_comprador is null then
    raise exception 'no_verificado' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(
             jsonb_build_object(
               'id', l.id,
               'nombre', l.nombre,
               'compartida', l.compartir_hash is not null,
               'slugs', coalesce((
                 select jsonb_agg(i.slug order by li.created_at desc)
                   from public.lista_inmuebles li
                   join public.inmuebles i on i.id = li.inmueble_id
                  where li.lista_id = l.id
                    and i.vigente_hasta > now() and i.estado = 'publicado_fundador' and i.slug is not null and i.pausado_at is null
               ), '[]'::jsonb),
               'notas', (select count(*) from public.notas_lista n where n.lista_id = l.id)
             ) order by l.created_at desc
           )
      from public.listas l
     where l.comprador_id = v_comprador
  ), '[]'::jsonb);
end;
$function$;

CREATE OR REPLACE FUNCTION public.agregar_a_lista(p_sesion_hash text, p_lista uuid, p_slug text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_comprador uuid := public.comprador_de_sesion(p_sesion_hash);
  v_inmueble uuid;
begin
  if v_comprador is null then
    raise exception 'no_verificado' using errcode = '42501';
  end if;
  if not exists (select 1 from public.listas where id = p_lista and comprador_id = v_comprador) then
    raise exception 'no_disponible' using errcode = 'P0002';
  end if;
  select i.id into v_inmueble from public.inmuebles i
   where i.slug = p_slug and i.vigente_hasta > now() and i.estado = 'publicado_fundador' and i.pausado_at is null;
  if v_inmueble is null then
    raise exception 'no_disponible' using errcode = 'P0002';
  end if;
  if (select count(*) from public.lista_inmuebles where lista_id = p_lista) >= 30
     and not exists (select 1 from public.lista_inmuebles
                      where lista_id = p_lista and inmueble_id = v_inmueble) then
    raise exception 'lista_llena' using errcode = 'check_violation';
  end if;
  insert into public.lista_inmuebles (lista_id, inmueble_id) values (p_lista, v_inmueble)
  on conflict do nothing;
end;
$function$;

CREATE OR REPLACE FUNCTION public.marcar_verificado_ctl(p_inmueble_id uuid, p_matricula text, p_ctl_expedido_el date)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_hoy date := (now() at time zone 'America/Bogota')::date;
begin
  if p_ctl_expedido_el is null
     or p_ctl_expedido_el > v_hoy
     or p_ctl_expedido_el < v_hoy - 30 then
    raise exception 'ctl_fuera_de_plazo' using errcode = 'check_violation';
  end if;
  update public.inmuebles
    set nivel_verificacion = 'verificado',
        matricula = nullif(btrim(p_matricula), ''),
        verificado_at = now(),
        ctl_expedido_el = p_ctl_expedido_el,
        -- S15: el CTL que el operador pidió ya llegó.
        ctl_pedido_at = null
    where id = p_inmueble_id;
  if not found then
    raise exception 'inmueble_no_encontrado';
  end if;
end;
$function$;

-- ── 4. Reportar un anuncio (pública; exige la sesión con WhatsApp verificado) ───
create function public.reportar_anuncio(
  p_sesion_hash text,
  p_slug text,
  p_motivos text[],
  p_detalle text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_comprador uuid;
  v_inmueble uuid;
  v_motivos text[];
  v_detalle text := nullif(btrim(coalesce(p_detalle, '')), '');
begin
  v_comprador := public.comprador_de_sesion(p_sesion_hash);
  if v_comprador is null then
    raise exception 'no_verificado' using errcode = '42501';
  end if;

  select coalesce(array_agg(distinct m order by m), '{}'::text[]) into v_motivos
    from unnest(coalesce(p_motivos, '{}'::text[])) m;
  if cardinality(v_motivos) = 0
     or not (v_motivos <@ array['precio_irreal', 'fotos_de_otro', 'no_es_el_dueno', 'pidio_plata',
                                'ya_no_esta', 'otra_cosa']::text[]) then
    raise exception 'motivo_invalido' using errcode = 'check_violation';
  end if;
  if v_detalle is not null and char_length(v_detalle) > 500 then
    raise exception 'detalle_invalido' using errcode = 'check_violation';
  end if;

  -- Solo se reporta lo que se ve: un anuncio vigente, publicado y sin pausa.
  select i.id into v_inmueble from public.inmuebles i
   where i.slug = p_slug and i.vigente_hasta > now() and i.estado = 'publicado_fundador' and i.pausado_at is null;
  if v_inmueble is null then
    raise exception 'no_disponible' using errcode = 'P0002';
  end if;

  if exists (select 1 from public.reportes where comprador_id = v_comprador and inmueble_id = v_inmueble) then
    raise exception 'ya_reportado' using errcode = 'check_violation';
  end if;
  -- Contra el reporte en masa: a lo sumo 5 por persona en 24 h.
  if (select count(*) from public.reportes
       where comprador_id = v_comprador and created_at > now() - interval '24 hours') >= 5 then
    raise exception 'demasiados_reportes' using errcode = 'check_violation';
  end if;

  begin
    insert into public.reportes (inmueble_id, comprador_id, motivos, detalle)
    values (v_inmueble, v_comprador, v_motivos, v_detalle);
  exception when unique_violation then
    raise exception 'ya_reportado' using errcode = 'check_violation';
  end;
end;
$$;

-- ── 5. Lo del dueño, por el token de «Mi anuncio» ───────────────────────────────
-- La huella de una foto SUYA, una sola vez (16 hex = 64 bits). Si la foto no es suya o ya tiene huella, no hace nada:
-- la subida jamás falla por la huella.
create function public.registrar_huella_foto(p_token text, p_foto_id uuid, p_huella text)
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
  if p_huella is null or p_huella !~ '^[0-9a-f]{16}$' then
    raise exception 'huella_invalida' using errcode = 'check_violation';
  end if;
  update public.fotos set huella = ('x' || p_huella)::bit(64)
   where id = p_foto_id and inmueble_id = v_inmueble and huella is null;
end;
$$;

-- Lo que «Mi anuncio» suma en el S15: si el operador lo pausó o pidió el CTL, y su última sesión de fotos.
create function public.mi_anuncio_extra(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'pausado', i.pausado_at is not null,
    'ctl_pedido', i.ctl_pedido_at is not null,
    'sesion', (
      select jsonb_build_object(
        'id', s.id,
        'estado', s.estado,
        'franja', s.franja,
        'agendada_para', s.agendada_para,
        'creada', s.created_at
      )
      from public.sesiones_fotos s
      where s.inmueble_id = i.id
      order by s.created_at desc
      limit 1
    )
  )
  from public.inmuebles i
  where i.id = public.inmueble_de_token(p_token)
$$;

create function public.solicitar_sesion_fotos(p_token text, p_franja text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inmueble public.inmuebles;
  v_id uuid;
begin
  select * into v_inmueble from public.inmuebles where id = public.inmueble_de_token(p_token);
  if not found then
    raise exception 'token_invalido';
  end if;
  if p_franja is null or p_franja not in ('entre_semana', 'sabado', 'domingo') then
    raise exception 'franja_invalida' using errcode = 'check_violation';
  end if;
  if v_inmueble.vigente_hasta <= now() then
    raise exception 'no_disponible' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.sesiones_fotos
              where inmueble_id = v_inmueble.id and estado in ('solicitada', 'agendada')) then
    raise exception 'ya_solicitada' using errcode = 'check_violation';
  end if;
  -- Pedir y cancelar en bucle no llena la agenda del operador: 3 por anuncio en 30 días.
  if (select count(*) from public.sesiones_fotos
       where inmueble_id = v_inmueble.id and created_at > now() - interval '30 days') >= 3 then
    raise exception 'demasiadas_sesiones' using errcode = 'check_violation';
  end if;
  begin
    insert into public.sesiones_fotos (inmueble_id, franja)
    values (v_inmueble.id, p_franja)
    returning id into v_id;
  exception when unique_violation then
    raise exception 'ya_solicitada' using errcode = 'check_violation';
  end;
  return jsonb_build_object('id', v_id, 'estado', 'solicitada');
end;
$$;

create function public.cancelar_sesion_fotos(p_token text)
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
  update public.sesiones_fotos set estado = 'cancelada', cancelada_por = 'dueno'
   where inmueble_id = v_inmueble and estado in ('solicitada', 'agendada');
  if not found then
    raise exception 'estado_invalido' using errcode = 'check_violation';
  end if;
end;
$$;

-- ── 6. Las reglas (solo el operador y el trabajo diario) ────────────────────────
-- Interna: deja ABIERTAS exactamente las banderas de una regla que hoy se ven (`p_hallazgos` = {inmueble_id: evidencia}).
-- Una bandera abierta que la regla ya no ve se borra (nadie actuó sobre ella); una RESUELTA no se toca ni reaparece.
create function public.aplicar_banderas(p_regla text, p_hallazgos jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
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
     set evidencia = excluded.evidencia, actualizada_at = now()
   where b.resolucion is null;
  select count(*) into v_n from public.banderas b where b.regla = p_regla and b.resolucion is null;
  return v_n;
end;
$$;

-- Las tres reglas que se calculan en la base. Solo se marcan anuncios VISIBLES; se comparan contra todos (un estafador
-- copia también lo que ya venció). Teléfono: los últimos 10 dígitos; nombre: sin tildes, sin mayúsculas, sin espacios de
-- más; matrícula: solo letras y dígitos. Un mismo dueño (mismo teléfono) con dos anuncios jamás se marca a sí mismo.
create function public.revisar_banderas()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_matricula jsonb;
  v_telefono jsonb;
  v_foto jsonb;
begin
  -- Matrícula: la misma en otro anuncio de OTRO teléfono. La evidencia: el slug de uno de ellos y cuántos son.
  with todos as (
    select i.id, i.slug,
           upper(regexp_replace(i.matricula, '[^0-9A-Za-z]', '', 'g')) as mat,
           right(regexp_replace(v.whatsapp, '\D', '', 'g'), 10) as tel,
           (i.vigente_hasta > now() and i.estado = 'publicado_fundador' and i.pausado_at is null) as visible
      from public.inmuebles i
      join public.vendedores v on v.id = i.vendedor_id
     where i.matricula is not null and regexp_replace(i.matricula, '[^0-9A-Za-z]', '', 'g') <> ''
  ), por_mat as (
    select mat, count(*) as n from todos group by mat having count(distinct tel) >= 2
  ), por_mat_tel as (
    select mat, tel, count(*) as n, min(slug) as slug from todos group by mat, tel
  )
  select coalesce(jsonb_object_agg(x.id, x.evidencia), '{}'::jsonb) into v_matricula
    from (
      select a.id,
             jsonb_build_object(
               'slug', (select min(o.slug) from por_mat_tel o where o.mat = a.mat and o.tel <> a.tel),
               'otros', pm.n - pmt.n
             ) as evidencia
        from todos a
        join por_mat pm on pm.mat = a.mat
        join por_mat_tel pmt on pmt.mat = a.mat and pmt.tel = a.tel
       where a.visible
    ) x;

  -- Teléfono: el mismo WhatsApp con dos nombres o más. La evidencia cuenta los OTROS anuncios con otro nombre.
  with anuncios as (
    select i.id,
           right(regexp_replace(ve.whatsapp, '\D', '', 'g'), 10) as tel,
           regexp_replace(btrim(lower(translate(ve.nombre, 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun'))), '\s+', ' ', 'g') as nom,
           (i.vigente_hasta > now() and i.estado = 'publicado_fundador' and i.pausado_at is null) as visible
      from public.inmuebles i
      join public.vendedores ve on ve.id = i.vendedor_id
  ), por_tel as (
    select tel, count(*) as n, count(distinct nom) as nombres from anuncios group by tel having count(distinct nom) >= 2
  ), por_tel_nom as (
    select tel, nom, count(*) as n from anuncios group by tel, nom
  )
  select coalesce(jsonb_object_agg(x.id, x.evidencia), '{}'::jsonb) into v_telefono
    from (
      select a.id, jsonb_build_object('otros', pt.n - ptn.n, 'nombres', pt.nombres) as evidencia
        from anuncios a
        join por_tel pt on pt.tel = a.tel
        join por_tel_nom ptn on ptn.tel = a.tel and ptn.nom = a.nom
       where a.visible
    ) x;

  -- Foto: una huella a distancia de Hamming ≤ 6 (de 64) de la de una foto de OTRO teléfono. Las huellas casi lisas (menos
  -- de 8 o más de 56 bits en 1: una pared blanca, un cielo) no informan nada y no se comparan. Para no comparar todas con
  -- todas, la huella se parte en 7 bandas: dos huellas a distancia ≤ 6 comparten al menos una banda idéntica (palomar).
  with f as (
    select fo.id, fo.inmueble_id, fo.orden, fo.huella, i.slug,
           right(regexp_replace(ve.whatsapp, '\D', '', 'g'), 10) as tel,
           (i.vigente_hasta > now() and i.estado = 'publicado_fundador' and i.pausado_at is null) as visible
      from public.fotos fo
      join public.inmuebles i on i.id = fo.inmueble_id
      join public.vendedores ve on ve.id = i.vendedor_id
     where fo.huella is not null and bit_count(fo.huella) between 8 and 56
  ), bandas as (
    select f.id, f.inmueble_id, f.tel, f.visible, b.n, substring(f.huella from b.desde for b.largo) as trozo
      from f
     cross join (values (0, 1, 9), (1, 10, 9), (2, 19, 9), (3, 28, 9), (4, 37, 9), (5, 46, 9), (6, 55, 10)) b(n, desde, largo)
  ), candidatos as (
    select distinct a.id as foto_a, b.id as foto_b
      from bandas a
      join bandas b on b.n = a.n and b.trozo = a.trozo and b.inmueble_id <> a.inmueble_id and b.tel <> a.tel
     where a.visible
  ), pares as (
    select fa.inmueble_id, fa.orden, fb.slug, fb.orden as orden_otro,
           bit_count(fa.huella # fb.huella) as distancia
      from candidatos c
      join f fa on fa.id = c.foto_a
      join f fb on fb.id = c.foto_b
     where bit_count(fa.huella # fb.huella) <= 6
  )
  select coalesce(jsonb_object_agg(x.inmueble_id, x.evidencia), '{}'::jsonb) into v_foto
    from (
      select distinct on (p.inmueble_id) p.inmueble_id,
             jsonb_build_object(
               'foto', p.orden + 1,
               'slug', p.slug,
               'foto_otro', p.orden_otro + 1,
               'distancia', p.distancia,
               'pares', count(*) over (partition by p.inmueble_id)
             ) as evidencia
        from pares p
       order by p.inmueble_id, p.distancia, p.slug, p.orden, p.orden_otro
    ) x;

  return jsonb_build_object(
    'matricula', public.aplicar_banderas('matricula', v_matricula),
    'telefono', public.aplicar_banderas('telefono', v_telefono),
    'foto', public.aplicar_banderas('foto', v_foto)
  );
end;
$$;

-- El precio se evalúa en TypeScript con el MISMO motor que «¿Está caro?» (`rangoDePrecio`): aquí, los anuncios visibles con
-- lo que ese motor necesita, y de vuelta, los sospechosos.
create function public.anuncios_para_precio()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(
           jsonb_build_object(
             'id', i.id,
             'slug', i.slug,
             'operacion', i.operacion,
             'tipo', i.tipo,
             'localidad', lower(coalesce(s.localidad, z.nombre)),
             'sector_codigo', i.sector_codigo,
             'area_m2', i.area_m2,
             'precio_esperado', i.precio_esperado
           ) order by i.created_at desc, i.slug
         ), '[]'::jsonb)
    from public.inmuebles i
    left join public.sectores s on s.codigo = i.sector_codigo
    left join public.zonas z on z.id = i.zona_id
   where i.id in (select public.inmuebles_que_cumplen(null, null, null, null, null, null, null))
$$;

-- Recibe {inmueble_id: {porcentaje, n, ambito}} y lo guarda como banderas de precio. La evidencia se REARMA con su lista
-- blanca: nada que no sea un porcentaje ≥ 30, un conteo ≥ 5 y el ámbito entra a la base.
create function public.guardar_banderas_precio(p_hallazgos jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limpios jsonb;
begin
  if p_hallazgos is null or jsonb_typeof(p_hallazgos) <> 'object' then
    raise exception 'hallazgos_invalidos' using errcode = 'check_violation';
  end if;
  if exists (
    select 1 from jsonb_each(p_hallazgos) h
     where h.key !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        or jsonb_typeof(h.value) <> 'object'
        or jsonb_typeof(h.value -> 'porcentaje') <> 'number'
        or jsonb_typeof(h.value -> 'n') <> 'number'
        or (h.value ->> 'porcentaje')::numeric not between 30 and 100
        or (h.value ->> 'n')::numeric < 5
        or coalesce(h.value ->> 'ambito', '') not in ('barrio', 'localidad')
  ) then
    raise exception 'hallazgos_invalidos' using errcode = 'check_violation';
  end if;
  select coalesce(jsonb_object_agg(
           h.key,
           jsonb_build_object(
             'porcentaje', round((h.value ->> 'porcentaje')::numeric),
             'n', floor((h.value ->> 'n')::numeric)::integer,
             'ambito', h.value ->> 'ambito'
           )
         ), '{}'::jsonb)
    into v_limpios
    from jsonb_each(p_hallazgos) h
    join public.inmuebles i on i.id = h.key::uuid
   where i.vigente_hasta > now() and i.estado = 'publicado_fundador' and i.pausado_at is null;
  return public.aplicar_banderas('precio', v_limpios);
end;
$$;

-- ── 7. La cola del operador y sus tres acciones (más reactivar) ─────────────────
-- Cada anuncio con un reporte o una bandera ABIERTOS, o pausado. Del que reporta, solo los motivos, el detalle y la fecha.
-- Del dueño, lo que el operador necesita para escribirle por su WhatsApp, en su idioma.
create function public.antifraude_cola()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(x.fila order by x.pausado, x.ultima desc nulls last), '[]'::jsonb)
  from (
    select
      i.pausado_at is not null as pausado,
      greatest(
        (select max(b.created_at) from public.banderas b where b.inmueble_id = i.id and b.resolucion is null),
        (select max(r.created_at) from public.reportes r where r.inmueble_id = i.id and r.resolucion is null),
        i.pausado_at
      ) as ultima,
      jsonb_build_object(
        'id', i.id,
        'slug', i.slug,
        'operacion', i.operacion,
        'tipo', i.tipo,
        'barrio', i.barrio,
        'localidad', coalesce(s.localidad, z.nombre),
        'precio_esperado', i.precio_esperado,
        'nivel_verificacion', i.nivel_verificacion,
        'ctl_expedido_el', i.ctl_expedido_el,
        'creado', i.created_at,
        'vigente_hasta', i.vigente_hasta,
        'pausado_at', i.pausado_at,
        'ctl_pedido_at', i.ctl_pedido_at,
        'dueno', jsonb_build_object('nombre', v.nombre, 'whatsapp', v.whatsapp, 'idioma', v.idioma),
        'banderas', coalesce((
          select jsonb_agg(jsonb_build_object('regla', b.regla, 'evidencia', b.evidencia, 'creada', b.created_at)
                           order by b.regla)
            from public.banderas b
           where b.inmueble_id = i.id and b.resolucion is null
        ), '[]'::jsonb),
        'reportes', coalesce((
          select jsonb_agg(jsonb_build_object('motivos', to_jsonb(r.motivos), 'detalle', r.detalle, 'creado', r.created_at)
                           order by r.created_at desc)
            from public.reportes r
           where r.inmueble_id = i.id and r.resolucion is null
        ), '[]'::jsonb)
      ) as fila
    from public.inmuebles i
    join public.vendedores v on v.id = i.vendedor_id
    left join public.sectores s on s.codigo = i.sector_codigo
    left join public.zonas z on z.id = i.zona_id
    where i.pausado_at is not null
       or exists (select 1 from public.banderas b where b.inmueble_id = i.id and b.resolucion is null)
       or exists (select 1 from public.reportes r where r.inmueble_id = i.id and r.resolucion is null)
    -- Lo abierto primero y lo más reciente arriba; los pausados sin nada abierto, al final.
    order by pausado, ultima desc nulls last
    limit 200
  ) x
$$;

-- Interna: resuelve los reportes y las banderas abiertos de un anuncio con la acción del operador. Devuelve cuántos.
create function public.resolver_revision(p_inmueble_id uuid, p_resolucion text, p_razon text, p_nota text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nota text := nullif(btrim(coalesce(p_nota, '')), '');
  v_b integer;
  v_r integer;
begin
  update public.banderas
     set resolucion = p_resolucion, razon = p_razon, nota = v_nota, resuelta_at = now(), resuelta_por = auth.uid()
   where inmueble_id = p_inmueble_id and resolucion is null;
  get diagnostics v_b = row_count;
  update public.reportes
     set resolucion = p_resolucion, razon = p_razon, nota = v_nota, resuelta_at = now(), resuelta_por = auth.uid()
   where inmueble_id = p_inmueble_id and resolucion is null;
  get diagnostics v_r = row_count;
  return v_b + v_r;
end;
$$;

create function public.pausar_anuncio(p_inmueble_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.inmuebles set pausado_at = now()
   where id = p_inmueble_id and pausado_at is null;
  if not found then
    raise exception 'estado_invalido' using errcode = 'check_violation';
  end if;
  perform public.resolver_revision(p_inmueble_id, 'pausar', null, null);
end;
$$;

create function public.reactivar_anuncio(p_inmueble_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.inmuebles set pausado_at = null
   where id = p_inmueble_id and pausado_at is not null;
  if not found then
    raise exception 'estado_invalido' using errcode = 'check_violation';
  end if;
end;
$$;

-- El anuncio sigue visible; si era verificado, queda en «re-verificación pendiente» hasta que el operador lo verifique de
-- nuevo con un CTL de ≤ 30 días (`marcar_verificado_ctl`, que limpia `ctl_pedido_at`).
create function public.pedir_ctl(p_inmueble_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.inmuebles
     set ctl_pedido_at = now(),
         ctl_expedido_el = case when nivel_verificacion = 'verificado' then null else ctl_expedido_el end
   where id = p_inmueble_id;
  if not found then
    raise exception 'no_disponible' using errcode = 'P0002';
  end if;
  perform public.resolver_revision(p_inmueble_id, 'pedir_ctl', null, null);
end;
$$;

create function public.descartar_revision(p_inmueble_id uuid, p_razon text, p_nota text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_razon is null or p_razon not in ('es_el_dueno', 'tiene_explicacion', 'mismo_dueno', 'sin_fundamento') then
    raise exception 'razon_invalida' using errcode = 'check_violation';
  end if;
  if char_length(btrim(coalesce(p_nota, ''))) > 300 then
    raise exception 'nota_invalida' using errcode = 'check_violation';
  end if;
  if public.resolver_revision(p_inmueble_id, 'descartar', p_razon, p_nota) = 0 then
    raise exception 'estado_invalido' using errcode = 'check_violation';
  end if;
end;
$$;

-- ── 8. Huellar las fotos ya subidas (el navegador del operador calcula la huella) ─
create function public.fotos_sin_huella(p_limite integer)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'r2_key', x.r2_key) order by x.created_at desc), '[]'::jsonb)
    from (
      select f.id, f.r2_key, f.created_at
        from public.fotos f
       where f.huella is null
       order by f.created_at desc
       limit least(greatest(coalesce(p_limite, 50), 1), 200)
    ) x
$$;

create function public.registrar_huella_operador(p_foto_id uuid, p_huella text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_huella is null or p_huella !~ '^[0-9a-f]{16}$' then
    raise exception 'huella_invalida' using errcode = 'check_violation';
  end if;
  update public.fotos set huella = ('x' || p_huella)::bit(64)
   where id = p_foto_id and huella is null;
end;
$$;

-- ── 9. Las sesiones de fotos en el panel ────────────────────────────────────────
create function public.sesiones_panel()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(x.fila order by x.abierta desc, x.created_at desc), '[]'::jsonb)
  from (
    select
      s.estado in ('solicitada', 'agendada') as abierta,
      s.created_at,
      jsonb_build_object(
        'id', s.id,
        'estado', s.estado,
        'franja', s.franja,
        'agendada_para', s.agendada_para,
        'cancelada_por', s.cancelada_por,
        'creada', s.created_at,
        'inmueble', jsonb_build_object(
          'slug', i.slug,
          'tipo', i.tipo,
          'barrio', i.barrio,
          'localidad', coalesce(se.localidad, z.nombre)
        ),
        'dueno', jsonb_build_object('nombre', v.nombre, 'whatsapp', v.whatsapp, 'idioma', v.idioma)
      ) as fila
    from public.sesiones_fotos s
    join public.inmuebles i on i.id = s.inmueble_id
    join public.vendedores v on v.id = i.vendedor_id
    left join public.sectores se on se.codigo = i.sector_codigo
    left join public.zonas z on z.id = i.zona_id
    where s.estado in ('solicitada', 'agendada') or s.updated_at > now() - interval '30 days'
    order by s.created_at desc
    limit 200
  ) x
$$;

create function public.agendar_sesion_fotos(p_sesion_id uuid, p_para timestamptz)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_para is null or p_para <= now() + interval '1 hour' or p_para > now() + interval '60 days' then
    raise exception 'fecha_invalida' using errcode = 'check_violation';
  end if;
  update public.sesiones_fotos set estado = 'agendada', agendada_para = p_para
   where id = p_sesion_id and estado in ('solicitada', 'agendada');
  if not found then
    raise exception 'estado_invalido' using errcode = 'check_violation';
  end if;
end;
$$;

create function public.marcar_sesion_hecha(p_sesion_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.sesiones_fotos set estado = 'hecha'
   where id = p_sesion_id and estado = 'agendada';
  if not found then
    raise exception 'estado_invalido' using errcode = 'check_violation';
  end if;
end;
$$;

create function public.cancelar_sesion_fotos_operador(p_sesion_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.sesiones_fotos set estado = 'cancelada', cancelada_por = 'operador'
   where id = p_sesion_id and estado in ('solicitada', 'agendada');
  if not found then
    raise exception 'estado_invalido' using errcode = 'check_violation';
  end if;
end;
$$;

-- ── 10. Permisos ────────────────────────────────────────────────────────────────
-- Públicas (anon): las del comprador verificado y las del dueño por su token.
revoke all on function public.reportar_anuncio(text, text, text[], text) from public;
grant execute on function public.reportar_anuncio(text, text, text[], text) to anon, authenticated, service_role;
revoke all on function public.registrar_huella_foto(text, uuid, text) from public;
grant execute on function public.registrar_huella_foto(text, uuid, text) to anon, authenticated, service_role;
revoke all on function public.mi_anuncio_extra(text) from public;
grant execute on function public.mi_anuncio_extra(text) to anon, authenticated, service_role;
revoke all on function public.solicitar_sesion_fotos(text, text) from public;
grant execute on function public.solicitar_sesion_fotos(text, text) to anon, authenticated, service_role;
revoke all on function public.cancelar_sesion_fotos(text) from public;
grant execute on function public.cancelar_sesion_fotos(text) to anon, authenticated, service_role;

-- Del operador (authenticated + la allowlist en el servidor) y del trabajo diario (service_role).
revoke all on function public.antifraude_cola() from public;
grant execute on function public.antifraude_cola() to authenticated, service_role;
revoke all on function public.pausar_anuncio(uuid) from public;
grant execute on function public.pausar_anuncio(uuid) to authenticated, service_role;
revoke all on function public.reactivar_anuncio(uuid) from public;
grant execute on function public.reactivar_anuncio(uuid) to authenticated, service_role;
revoke all on function public.pedir_ctl(uuid) from public;
grant execute on function public.pedir_ctl(uuid) to authenticated, service_role;
revoke all on function public.descartar_revision(uuid, text, text) from public;
grant execute on function public.descartar_revision(uuid, text, text) to authenticated, service_role;
revoke all on function public.revisar_banderas() from public;
grant execute on function public.revisar_banderas() to authenticated, service_role;
revoke all on function public.anuncios_para_precio() from public;
grant execute on function public.anuncios_para_precio() to authenticated, service_role;
revoke all on function public.guardar_banderas_precio(jsonb) from public;
grant execute on function public.guardar_banderas_precio(jsonb) to authenticated, service_role;
revoke all on function public.fotos_sin_huella(integer) from public;
grant execute on function public.fotos_sin_huella(integer) to authenticated, service_role;
revoke all on function public.registrar_huella_operador(uuid, text) from public;
grant execute on function public.registrar_huella_operador(uuid, text) to authenticated, service_role;
revoke all on function public.sesiones_panel() from public;
grant execute on function public.sesiones_panel() to authenticated, service_role;
revoke all on function public.agendar_sesion_fotos(uuid, timestamptz) from public;
grant execute on function public.agendar_sesion_fotos(uuid, timestamptz) to authenticated, service_role;
revoke all on function public.marcar_sesion_hecha(uuid) from public;
grant execute on function public.marcar_sesion_hecha(uuid) to authenticated, service_role;
revoke all on function public.cancelar_sesion_fotos_operador(uuid) from public;
grant execute on function public.cancelar_sesion_fotos_operador(uuid) to authenticated, service_role;

-- Internas: solo las llaman otras funciones SECURITY DEFINER.
revoke all on function public.aplicar_banderas(text, jsonb) from public;
revoke all on function public.resolver_revision(uuid, text, text, text) from public;

-- S15 (2.ª migración, declarada en el cierre) — la cola antifraude del operador: su orden y quién se queda en ella.
-- La migración 17 tenía dos fallos que se vieron probando la pantalla de punta a punta:
--  1. Ordenaba con `pausado` como primera clave: un anuncio recién pausado caía al final de la lista y, con más de 200 filas
--     abiertas, salía de ella junto con su botón «Reactivar». Ahora manda lo último que pasó con el anuncio (una bandera o un
--     reporte abiertos, la pausa o el pedido del CTL): lo reciente va arriba.
--  2. «Pedir el CTL» resuelve los reportes y las banderas abiertos y el anuncio sigue visible; sin pausa y sin nada abierto, la
--     tarjeta (con el WhatsApp y su texto ya escrito) desaparecía al instante. Ahora un anuncio con el CTL pedido se queda en la
--     cola hasta que se verifique (`marcar_verificado_ctl` limpia `ctl_pedido_at`).
-- Misma firma y mismo resultado: `create or replace` conserva los permisos de la 17 (operador y servicio, jamás el anónimo).

create or replace function public.antifraude_cola()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(x.fila order by x.ultima desc nulls last), '[]'::jsonb)
  from (
    select
      greatest(
        (select max(b.created_at) from public.banderas b where b.inmueble_id = i.id and b.resolucion is null),
        (select max(r.created_at) from public.reportes r where r.inmueble_id = i.id and r.resolucion is null),
        i.pausado_at,
        i.ctl_pedido_at
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
       or i.ctl_pedido_at is not null
       or exists (select 1 from public.banderas b where b.inmueble_id = i.id and b.resolucion is null)
       or exists (select 1 from public.reportes r where r.inmueble_id = i.id and r.resolucion is null)
    order by ultima desc nulls last
    limit 200
  ) x
$$;

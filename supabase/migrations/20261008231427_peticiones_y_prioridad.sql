-- Peticiones y prioridad decidida por la IA (spec, módulo tickets, 2026-10-09).
--   · tipo: incidencia o petición, generado a partir de la categoría, así que nunca se contradicen.
--   · El cliente ya no elige la prioridad: lo que abre a mano entra como 'media' (incidencia) o 'baja'
--     (petición), y RLS rechaza cualquier otra aunque se envíe a mano contra la API.
--   · abrir_solicitud sustituye a abrir_incidencia: sin prioridad y con la categoría (otro,
--     cambio_contenido o nuevo_componente), que es lo único que el cliente sabe decir con seguridad.
-- Test: supabase/tests/rls_abrir_solicitud.sql

create type public.tipo_ticket as enum ('incidencia', 'peticion');

alter table public.tickets
  add column tipo public.tipo_ticket not null
  generated always as (
    case when categoria in ('cambio_contenido', 'nuevo_componente') then 'peticion'::public.tipo_ticket
         else 'incidencia'::public.tipo_ticket end
  ) stored;

drop policy "tickets: el cliente abre uno a mano" on public.tickets;
create policy "tickets: el cliente abre uno a mano" on public.tickets
  for insert to authenticated
  with check (
    cliente_id = (select privado.mi_cliente_id())
    and origen = 'cliente'
    and estado = 'abierto'
    and resumen_ia is null
    and primera_respuesta_en is null
    -- El cliente solo dice si algo falla o si quiere un cambio; el resto lo clasifica la IA o Daniel.
    and categoria in ('otro', 'cambio_contenido', 'nuevo_componente')
    -- Y no elige la prioridad: incidencia → media, petición → baja.
    and prioridad = case when categoria = 'otro' then 'media'::public.prioridad else 'baja'::public.prioridad end
  );

-- Abrir una incidencia o una petición a mano (plan B cuando la IA no está disponible).
-- Crea en una sola transacción la conversación, el primer mensaje del cliente y el ticket, para que
-- Daniel pueda responder en el mismo hilo. SECURITY INVOKER: RLS se aplica en cada insert.
create function public.abrir_solicitud(
  p_titulo text,
  p_descripcion text,
  p_categoria public.categoria default 'otro',
  p_web_id uuid default null
)
returns public.tickets
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_cliente uuid := privado.mi_cliente_id();
  v_conversacion uuid;
  v_ticket public.tickets;
begin
  if v_cliente is null then
    raise exception 'El usuario no tiene un cliente asociado' using errcode = '42501';
  end if;
  if p_categoria not in ('otro', 'cambio_contenido', 'nuevo_componente') then
    raise exception 'Categoría no permitida al cliente: %', p_categoria using errcode = '22023';
  end if;

  insert into public.conversaciones (cliente_id, perfil_id)
  values (v_cliente, auth.uid())
  returning id into v_conversacion;

  insert into public.mensajes (conversacion_id, autor, contenido)
  values (v_conversacion, 'cliente', p_descripcion);

  insert into public.tickets (cliente_id, web_id, conversacion_id, titulo, descripcion, categoria, prioridad, origen)
  values (
    v_cliente, p_web_id, v_conversacion, p_titulo, p_descripcion, p_categoria,
    case when p_categoria = 'otro' then 'media'::public.prioridad else 'baja'::public.prioridad end,
    'cliente'
  )
  returning * into v_ticket;

  return v_ticket;
end;
$$;

revoke execute on function public.abrir_solicitud(text, text, public.categoria, uuid) from public, anon;
grant execute on function public.abrir_solicitud(text, text, public.categoria, uuid) to authenticated;

-- Compatibilidad temporal con el frontend ya publicado, que aún envía una prioridad: se ignora.
-- Se borra en cuanto se publique el formulario nuevo (migración siguiente).
create or replace function public.abrir_incidencia(
  p_titulo text,
  p_descripcion text,
  p_prioridad public.prioridad default 'media',
  p_web_id uuid default null
)
returns public.tickets
language sql
security invoker
set search_path = ''
as $$
  select * from public.abrir_solicitud(p_titulo, p_descripcion, 'otro', p_web_id);
$$;

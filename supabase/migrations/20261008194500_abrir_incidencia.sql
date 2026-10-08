-- Abrir una incidencia a mano (plan B cuando la IA no está disponible, T5).
-- Crea en una sola transacción la conversación, el primer mensaje del cliente y el ticket, para que
-- Daniel pueda responder en el mismo hilo. Es SECURITY INVOKER: se ejecuta con los permisos del
-- usuario, así que RLS se aplica en cada insert (cliente propio, web propia, origen 'cliente').

create function public.abrir_incidencia(
  p_titulo text,
  p_descripcion text,
  p_prioridad public.prioridad default 'media',
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

  insert into public.conversaciones (cliente_id, perfil_id)
  values (v_cliente, auth.uid())
  returning id into v_conversacion;

  insert into public.mensajes (conversacion_id, autor, contenido)
  values (v_conversacion, 'cliente', p_descripcion);

  insert into public.tickets (cliente_id, web_id, conversacion_id, titulo, descripcion, prioridad, origen)
  values (v_cliente, p_web_id, v_conversacion, p_titulo, p_descripcion, p_prioridad, 'cliente')
  returning * into v_ticket;

  return v_ticket;
end;
$$;

revoke execute on function public.abrir_incidencia(text, text, public.prioridad, uuid) from public, anon;
grant execute on function public.abrir_incidencia(text, text, public.prioridad, uuid) to authenticated;

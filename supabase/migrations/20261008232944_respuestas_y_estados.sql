-- T10: lo que pasa en un ticket cuando alguien escribe en su conversación.
--   · Primera respuesta de Daniel: se guarda la fecha una sola vez (KPI "tiempo hasta la primera
--     respuesta") y, si el ticket estaba abierto, pasa a "en curso".
--   · Respuesta del cliente a un ticket que esperaba por él: vuelve a "en curso".
-- SECURITY DEFINER porque el cliente no puede editar tickets (RLS): el trigger solo toca el estado y
-- la fecha del ticket de esa misma conversación, nunca lo que diga el mensaje.
-- Test: supabase/tests/respuestas.sql
create function privado.al_insertar_mensaje()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.autor = 'admin' then
    update public.tickets
       set primera_respuesta_en = coalesce(primera_respuesta_en, new.creado_en),
           estado = case when estado = 'abierto' then 'en_curso'::public.estado_ticket else estado end
     where conversacion_id = new.conversacion_id
       and (primera_respuesta_en is null or estado = 'abierto');
  elsif new.autor = 'cliente' then
    update public.tickets
       set estado = 'en_curso'
     where conversacion_id = new.conversacion_id
       and estado = 'esperando_cliente';
  end if;
  return new;
end;
$$;

revoke execute on function privado.al_insertar_mensaje() from public, anon, authenticated;

create trigger al_insertar_mensaje
  after insert on public.mensajes
  for each row execute function privado.al_insertar_mensaje();

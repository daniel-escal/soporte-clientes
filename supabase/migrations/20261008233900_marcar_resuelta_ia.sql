-- T7: el cliente confirma que el asistente le ha resuelto la duda (KPI "% resuelto por la IA").
-- El cliente no puede editar conversaciones (RLS), así que lo hace esta función, que solo cambia
-- una conversación suya, todavía activa y en la que el asistente llegó a responder.
-- Devuelve si la ha marcado (sin decir por qué no, para no revelar si una conversación ajena existe).
-- Test: supabase/tests/rls_resuelta_ia.sql
create function public.marcar_resuelta_ia(p_conversacion uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_filas integer;
begin
  update public.conversaciones c
     set estado = 'resuelta_ia'
   where c.id = p_conversacion
     and c.estado = 'activa'
     and c.cliente_id = privado.mi_cliente_id()
     and c.perfil_id = auth.uid()
     and exists (select 1 from public.mensajes m where m.conversacion_id = c.id and m.autor = 'ia');
  get diagnostics v_filas = row_count;
  return v_filas = 1;
end;
$$;

revoke execute on function public.marcar_resuelta_ia(uuid) from public, anon;
grant execute on function public.marcar_resuelta_ia(uuid) to authenticated;

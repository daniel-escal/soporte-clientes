-- Avisos de rendimiento de Supabase tras la migración `tickets`:
--   · 0001 unindexed_foreign_keys: las claves foráneas compuestas (web_id, cliente_id) y
--     (conversacion_id, cliente_id) necesitan un índice que las cubra.
--   · 0006 multiple_permissive_policies: dos políticas de insert en mensajes se evalúan siempre las
--     dos. Se unen en una, con la misma lógica: el cliente escribe como cliente en sus
--     conversaciones y el admin como admin.

drop index public.tickets_web_id_idx;
drop index public.tickets_conversacion_id_idx;
create index tickets_web_cliente_idx on public.tickets (web_id, cliente_id);
create index tickets_conversacion_cliente_idx on public.tickets (conversacion_id, cliente_id);

drop policy "mensajes: el cliente escribe como cliente" on public.mensajes;
drop policy "mensajes: el admin escribe como admin" on public.mensajes;
create policy "mensajes: el cliente como cliente en las suyas, el admin como admin" on public.mensajes
  for insert to authenticated
  with check (
    (autor = 'cliente' and (select privado.es_mi_conversacion(conversacion_id)))
    or (autor = 'admin' and (select privado.es_admin()))
  );

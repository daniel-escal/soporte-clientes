-- M2: seguimiento y cierre automáticos, sin IA (docs/SPEC.md, módulo tickets).
--   · Cuando Daniel da un ticket por resuelto, el cliente recibe un aviso en la conversación: si
--     contesta, se vuelve a abrir; si no, se cierra solo a los 3 días.
--   · Si el cliente contesta a un ticket resuelto, vuelve a "en curso" (con aviso para los dos).
--   · Esperando al cliente: un recordatorio a los 2 días y, a los 7 sin respuesta, se da por
--     resuelto (y 3 días después se cierra).
--   · Lo que depende del tiempo lo hace privado.seguimiento_automatico(), cada hora con pg_cron.
-- Los avisos son textos fijos con autor 'sistema': nunca llevan nada escrito por el cliente ni por
-- el modelo. Los plazos están también en src/dominio/seguimiento.ts (lo que se enseña en pantalla).
-- Test: supabase/tests/seguimiento.sql

create extension if not exists pg_cron with schema pg_catalog;

alter table public.tickets
  add column estado_desde timestamptz not null default now(),
  add column recordado_en timestamptz;
comment on column public.tickets.estado_desde is 'Desde cuándo está en el estado actual (lo usa el seguimiento automático).';
comment on column public.tickets.recordado_en is 'Cuándo se le recordó al cliente que se le espera. Vuelve a null al cambiar de estado.';

-- Tickets que ya existían: la mejor aproximación es su última modificación (sin tocar actualizado_en).
alter table public.tickets disable trigger tickets_actualizado_en;
update public.tickets set estado_desde = actualizado_en;
alter table public.tickets enable trigger tickets_actualizado_en;

-- Al cambiar de estado se apunta desde cuándo y se olvida el recordatorio de la espera anterior.
create function privado.al_cambiar_estado()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.estado_desde := now();
  new.recordado_en := null;
  return new;
end;
$$;
revoke execute on function privado.al_cambiar_estado() from public, anon, authenticated;

create trigger tickets_estado_desde
  before update of estado on public.tickets
  for each row when (old.estado is distinct from new.estado)
  execute function privado.al_cambiar_estado();

-- Aviso al cliente cuando Daniel lo da por resuelto. SECURITY DEFINER porque nadie puede escribir
-- como 'sistema' con su sesión (RLS). Lo que resuelve el seguimiento automático deja su propio aviso
-- y marca la transacción con soporte.automatico para que este no se repita.
create function privado.al_resolver()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.conversacion_id is not null and coalesce(current_setting('soporte.automatico', true), '') <> 'si' then
    insert into public.mensajes (conversacion_id, autor, contenido, creado_en)
    values (
      new.conversacion_id,
      'sistema'::public.autor,
      'Marcada como resuelta. Si sigue fallando o falta algo, contesta aquí y se volverá a abrir. Si no, se cerrará sola en 3 días.',
      clock_timestamp()
    );
  end if;
  return new;
end;
$$;
revoke execute on function privado.al_resolver() from public, anon, authenticated;

create trigger tickets_al_resolver
  after update of estado on public.tickets
  for each row when (new.estado = 'resuelto' and old.estado is distinct from new.estado)
  execute function privado.al_resolver();

-- Lo que pasa al escribir en la conversación (T10), más la reapertura de lo resuelto (M2).
-- Los avisos usan clock_timestamp() para quedar justo después del mensaje que los provoca.
create or replace function privado.al_insertar_mensaje()
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

    with reabiertos as (
      update public.tickets
         set estado = 'en_curso'
       where conversacion_id = new.conversacion_id
         and estado = 'resuelto'
      returning id
    )
    insert into public.mensajes (conversacion_id, autor, contenido, creado_en)
    select new.conversacion_id, 'sistema'::public.autor,
           'Se ha vuelto a abrir porque ha llegado un mensaje después de resolverla.', clock_timestamp()
      from reabiertos
     limit 1;
  end if;
  return new;
end;
$$;

-- Lo que depende del tiempo. Lo ejecuta pg_cron cada hora; devuelve cuántos tickets ha tocado.
create function privado.seguimiento_automatico()
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  cerrados integer;
  resueltos integer;
  recordados integer;
begin
  perform set_config('soporte.automatico', 'si', true);

  -- 1. Resueltos hace 3 días (si el cliente hubiera contestado ya no estarían resueltos): se cierran.
  with cerrar as (
    update public.tickets set estado = 'cerrado'
     where estado = 'resuelto' and estado_desde <= now() - interval '3 days'
    returning conversacion_id
  ), avisos as (
    insert into public.mensajes (conversacion_id, autor, contenido, creado_en)
    select conversacion_id, 'sistema'::public.autor,
           'Se ha cerrado sola: pasaron 3 días desde que se resolvió sin mensajes nuevos.', clock_timestamp()
      from cerrar
     where conversacion_id is not null
  )
  select count(*) into cerrados from cerrar;

  -- 2. Una semana esperando al cliente sin respuesta: se da por resuelto (y se cerrará a los 3 días).
  with resolver as (
    update public.tickets set estado = 'resuelto'
     where estado = 'esperando_cliente' and estado_desde <= now() - interval '7 days'
    returning conversacion_id
  ), avisos as (
    insert into public.mensajes (conversacion_id, autor, contenido, creado_en)
    select conversacion_id, 'sistema'::public.autor,
           'Sin respuesta en una semana, así que se da por resuelta. Si aún lo necesitas, contesta aquí y se volverá a abrir. Si no, se cerrará sola en 3 días.',
           clock_timestamp()
      from resolver
     where conversacion_id is not null
  )
  select count(*) into resueltos from resolver;

  -- 3. Dos días esperando al cliente: un recordatorio, solo uno por espera.
  with recordar as (
    update public.tickets set recordado_en = now()
     where estado = 'esperando_cliente' and recordado_en is null and estado_desde <= now() - interval '2 days'
    returning conversacion_id
  ), avisos as (
    insert into public.mensajes (conversacion_id, autor, contenido, creado_en)
    select conversacion_id, 'sistema'::public.autor,
           'Recordatorio: Daniel está esperando tu respuesta para seguir. Si ya no hace falta, no tienes que hacer nada: dentro de 5 días se dará por resuelta.',
           clock_timestamp()
      from recordar
     where conversacion_id is not null
  )
  select count(*) into recordados from recordar;

  return jsonb_build_object('cerrados', cerrados, 'resueltos', resueltos, 'recordados', recordados);
end;
$$;
revoke execute on function privado.seguimiento_automatico() from public, anon, authenticated;

select cron.schedule('seguimiento-tickets', '7 * * * *', $$select privado.seguimiento_automatico()$$);

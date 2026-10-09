-- Test del seguimiento automático (M2). No deja datos (bloque que se deshace al final).
-- El paso del tiempo se simula moviendo estado_desde hacia atrás.
-- Resultado esperado:
--   · al resolver Daniel, aviso del sistema en la conversación;
--   · si el cliente contesta a lo resuelto, vuelve a en_curso, con aviso;
--   · resuelto hace 4 días: se cierra con aviso; resuelto hace 1 día: sigue igual;
--   · esperando al cliente 2 días: un recordatorio, y solo uno aunque se ejecute otra vez;
--   · esperando al cliente 8 días: se da por resuelto con su propio aviso (sin el de "Marcada como resuelta");
--   · el cliente no puede escribir como 'sistema' ni ejecutar el seguimiento (42501).

create or replace function pg_temp.intentar(consulta text) returns text
language plpgsql as $$
declare filas integer;
begin
  execute consulta;
  get diagnostics filas = row_count;
  return 'ok, filas: ' || filas;
exception when others then
  return 'bloqueado (' || sqlstate || ')';
end;
$$;

create or replace function pg_temp.avisos(conversacion uuid) returns jsonb
language sql as $$
  select coalesce(jsonb_agg(left(contenido, 30) order by creado_en), '[]'::jsonb)
  from public.mensajes where conversacion_id = conversacion and autor = 'sistema';
$$;

create or replace function pg_temp.prueba_seguimiento() returns jsonb
language plpgsql as $$
declare
  admin constant uuid := '00000000-0000-4000-8000-0000000000ad';
  cliente constant uuid := '00000000-0000-4000-8000-0000000000c1';
  t1 public.tickets; t2 public.tickets; t3 public.tickets; t4 public.tickets; t5 public.tickets;
  primera jsonb; segunda jsonb;
  resultado jsonb;
begin
  begin
    insert into auth.users (id, aud, role, email, is_anonymous, created_at, updated_at) values
      (admin, 'authenticated', 'authenticated', 'admin-prueba@example.com', false, now(), now()),
      (cliente, 'authenticated', 'authenticated', null, true, now(), now());
    update public.perfiles set rol = 'admin', cliente_id = null where id = admin;

    -- El cliente abre cinco solicitudes.
    perform set_config('request.jwt.claims', jsonb_build_object('sub', cliente, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    select * into t1 from public.abrir_solicitud('Resuelta y el cliente contesta', 'Prueba del seguimiento 1', 'otro', null);
    select * into t2 from public.abrir_solicitud('Resuelta hace cuatro días', 'Prueba del seguimiento 2', 'otro', null);
    select * into t3 from public.abrir_solicitud('Resuelta hace un día', 'Prueba del seguimiento 3', 'otro', null);
    select * into t4 from public.abrir_solicitud('Esperando dos días', 'Prueba del seguimiento 4', 'otro', null);
    select * into t5 from public.abrir_solicitud('Esperando ocho días', 'Prueba del seguimiento 5', 'otro', null);
    execute 'reset role';

    -- Daniel resuelve tres y deja dos esperando al cliente.
    perform set_config('request.jwt.claims', jsonb_build_object('sub', admin, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    update public.tickets set estado = 'en_curso' where id in (t1.id, t2.id, t3.id, t4.id, t5.id);
    update public.tickets set estado = 'resuelto' where id in (t1.id, t2.id, t3.id);
    update public.tickets set estado = 'esperando_cliente' where id in (t4.id, t5.id);
    execute 'reset role';

    -- El cliente contesta a la primera, e intenta lo que no puede.
    perform set_config('request.jwt.claims', jsonb_build_object('sub', cliente, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    insert into public.mensajes (conversacion_id, autor, contenido) values (t1.conversacion_id, 'cliente', 'Sigue fallando en el móvil');
    resultado := jsonb_build_object(
      'cliente_escribe_como_sistema', pg_temp.intentar(format(
        'insert into public.mensajes (conversacion_id, autor, contenido) values (%L, ''sistema'', ''Aviso falso'')', t1.conversacion_id)),
      'cliente_ejecuta_el_seguimiento', pg_temp.intentar('select privado.seguimiento_automatico()')
    );
    execute 'reset role';

    -- Pasa el tiempo.
    update public.tickets set estado_desde = now() - interval '4 days' where id = t2.id;
    update public.tickets set estado_desde = now() - interval '1 day' where id = t3.id;
    update public.tickets set estado_desde = now() - interval '2 days 1 hour' where id = t4.id;
    update public.tickets set estado_desde = now() - interval '8 days' where id = t5.id;
    primera := privado.seguimiento_automatico();
    segunda := privado.seguimiento_automatico();

    resultado := resultado || jsonb_build_object(
      't1_contesta_tras_resolver', jsonb_build_object(
        'estado', (select estado from public.tickets where id = t1.id), 'avisos', pg_temp.avisos(t1.conversacion_id)),
      't2_resuelta_hace_4_dias', jsonb_build_object(
        'estado', (select estado from public.tickets where id = t2.id), 'avisos', pg_temp.avisos(t2.conversacion_id)),
      't3_resuelta_hace_1_dia', jsonb_build_object(
        'estado', (select estado from public.tickets where id = t3.id), 'avisos', pg_temp.avisos(t3.conversacion_id)),
      't4_esperando_2_dias', jsonb_build_object(
        'estado', (select estado from public.tickets where id = t4.id),
        'recordado', (select recordado_en is not null from public.tickets where id = t4.id),
        'avisos', pg_temp.avisos(t4.conversacion_id)),
      't5_esperando_8_dias', jsonb_build_object(
        'estado', (select estado from public.tickets where id = t5.id),
        'estado_desde_al_dia', (select estado_desde = now() from public.tickets where id = t5.id),
        'avisos', pg_temp.avisos(t5.conversacion_id)),
      'segunda_ejecucion_no_repite', segunda
    );

    raise exception 'deshacer' using errcode = 'P0001';
  exception when sqlstate 'P0001' then null;
  end;
  return resultado;
end;
$$;

select pg_temp.prueba_seguimiento() as resultado;

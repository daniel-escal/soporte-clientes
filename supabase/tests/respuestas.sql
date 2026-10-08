-- Test del trigger privado.al_insertar_mensaje (T10). No deja datos (bloque que se deshace al final).
-- Resultado esperado:
--   · la primera respuesta del admin guarda primera_respuesta_en y pasa el ticket de abierto a en_curso;
--   · una segunda respuesta no cambia esa fecha;
--   · si el ticket espera al cliente y este contesta, vuelve a en_curso;
--   · el cliente no puede escribir como admin (42501).

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

create or replace function pg_temp.prueba_respuestas() returns jsonb
language plpgsql as $$
declare
  admin constant uuid := '00000000-0000-4000-8000-0000000000ad';
  cliente constant uuid := '00000000-0000-4000-8000-0000000000c1';
  ticket public.tickets; tras_primera public.tickets; tras_segunda public.tickets; tras_cliente public.tickets;
  resultado jsonb;
begin
  begin
    insert into auth.users (id, aud, role, email, is_anonymous, created_at, updated_at) values
      (admin, 'authenticated', 'authenticated', 'admin-prueba@example.com', false, now(), now()),
      (cliente, 'authenticated', 'authenticated', null, true, now(), now());
    update public.perfiles set rol = 'admin', cliente_id = null where id = admin;

    -- El cliente abre una incidencia a mano.
    perform set_config('request.jwt.claims', jsonb_build_object('sub', cliente, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    select * into ticket from public.abrir_solicitud('La web no carga', 'Desde esta mañana no carga en ningún sitio', 'otro', null);
    execute 'reset role';

    -- Daniel responde dos veces.
    perform set_config('request.jwt.claims', jsonb_build_object('sub', admin, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    insert into public.mensajes (conversacion_id, autor, contenido, creado_en) values (ticket.conversacion_id, 'admin', 'Lo miro ahora', now() - interval '1 minute');
    select * into tras_primera from public.tickets where id = ticket.id;
    insert into public.mensajes (conversacion_id, autor, contenido) values (ticket.conversacion_id, 'admin', '¿Me confirmas el navegador?');
    select * into tras_segunda from public.tickets where id = ticket.id;
    update public.tickets set estado = 'esperando_cliente' where id = ticket.id;
    execute 'reset role';

    -- El cliente contesta.
    perform set_config('request.jwt.claims', jsonb_build_object('sub', cliente, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    insert into public.mensajes (conversacion_id, autor, contenido) values (ticket.conversacion_id, 'cliente', 'Chrome, en el móvil');
    resultado := jsonb_build_object(
      'cliente_escribe_como_admin', pg_temp.intentar(format(
        'insert into public.mensajes (conversacion_id, autor, contenido) values (%L, ''admin'', ''Soy Daniel'')', ticket.conversacion_id))
    );
    execute 'reset role';
    select * into tras_cliente from public.tickets where id = ticket.id;

    resultado := resultado || jsonb_build_object(
      'estado_inicial', ticket.estado,
      'tras_primera_respuesta', jsonb_build_object('estado', tras_primera.estado, 'tiene_primera_respuesta', tras_primera.primera_respuesta_en is not null),
      'segunda_respuesta_no_cambia_la_fecha', tras_segunda.primera_respuesta_en = tras_primera.primera_respuesta_en,
      'tras_contestar_el_cliente', tras_cliente.estado
    );

    raise exception 'deshacer' using errcode = 'P0001';
  exception when sqlstate 'P0001' then null;
  end;
  return resultado;
end;
$$;

select pg_temp.prueba_respuestas() as resultado;

-- Test de public.abrir_incidencia (T5). No deja datos (bloque que se deshace al final).
-- Ojo: la secuencia de tickets.numero sí avanza aunque se deshaga (es normal en Postgres).
-- Resultado esperado: con web propia crea ticket + conversación + 1 mensaje; con web de B → 23503;
-- título corto → 23514; sin sesión → 42501.

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

create or replace function pg_temp.prueba_abrir_incidencia() returns jsonb
language plpgsql as $$
declare
  a constant uuid := '00000000-0000-4000-8000-00000000000a';
  b constant uuid := '00000000-0000-4000-8000-00000000000b';
  web_a uuid; web_b uuid; resultado jsonb; ticket record; mensajes_hilo bigint;
begin
  begin
    insert into auth.users (id, aud, role, is_anonymous, created_at, updated_at) values
      (a, 'authenticated', 'authenticated', true, now(), now()),
      (b, 'authenticated', 'authenticated', true, now(), now());
    select w.id into web_a from public.webs w join public.perfiles p on p.cliente_id = w.cliente_id where p.id = a limit 1;
    select w.id into web_b from public.webs w join public.perfiles p on p.cliente_id = w.cliente_id where p.id = b limit 1;

    perform set_config('request.jwt.claims', jsonb_build_object('sub', a, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';

    select * into ticket from public.abrir_incidencia('El formulario no envía', 'Desde ayer el formulario de contacto no llega', 'alta', web_a);
    select count(*) into mensajes_hilo from public.mensajes where conversacion_id = ticket.conversacion_id;

    resultado := jsonb_build_object(
      'con_web_propia', jsonb_build_object('numero', ticket.numero, 'origen', ticket.origen, 'estado', ticket.estado, 'prioridad', ticket.prioridad, 'tiene_conversacion', ticket.conversacion_id is not null, 'mensajes_en_hilo', mensajes_hilo),
      'con_web_de_B', pg_temp.intentar(format('select public.abrir_incidencia(''Ajena'', ''x'', ''media'', %L)', web_b)),
      'titulo_demasiado_corto', pg_temp.intentar('select public.abrir_incidencia(''x'', ''descripcion'', ''media'', null)')
    );

    execute 'reset role';
    perform set_config('request.jwt.claims', '{"role":"anon"}', true);
    execute 'set local role anon';
    resultado := resultado || jsonb_build_object('sin_sesion', pg_temp.intentar('select public.abrir_incidencia(''Hola mundo'', ''x'', ''media'', null)'));

    raise exception 'deshacer' using errcode = 'P0001';
  exception when sqlstate 'P0001' then null;
  end;
  return resultado;
end;
$$;

select pg_temp.prueba_abrir_incidencia() as resultado;

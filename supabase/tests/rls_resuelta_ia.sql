-- Test de public.marcar_resuelta_ia (T7). No deja datos (bloque que se deshace al final).
-- Resultado esperado: el cliente marca la suya (true) una sola vez; no puede marcar la de otro
-- cliente ni una en la que el asistente no ha respondido (false); sin sesión → 42501.

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

create or replace function pg_temp.prueba_resuelta_ia() returns jsonb
language plpgsql as $$
declare
  a constant uuid := '00000000-0000-4000-8000-0000000000a1';
  b constant uuid := '00000000-0000-4000-8000-0000000000b1';
  cliente_a uuid; cliente_b uuid; con_ia uuid; sin_ia uuid; de_b uuid; resultado jsonb;
begin
  begin
    insert into auth.users (id, aud, role, is_anonymous, created_at, updated_at) values
      (a, 'authenticated', 'authenticated', true, now(), now()),
      (b, 'authenticated', 'authenticated', true, now(), now());
    select cliente_id into cliente_a from public.perfiles where id = a;
    select cliente_id into cliente_b from public.perfiles where id = b;

    -- Conversaciones de prueba (como las crea la Edge Function).
    insert into public.conversaciones (cliente_id, perfil_id) values (cliente_a, a) returning id into con_ia;
    insert into public.mensajes (conversacion_id, autor, contenido) values (con_ia, 'cliente', 'No me llegan los correos'), (con_ia, 'ia', 'Mira en la carpeta de spam');
    insert into public.conversaciones (cliente_id, perfil_id) values (cliente_a, a) returning id into sin_ia;
    insert into public.mensajes (conversacion_id, autor, contenido) values (sin_ia, 'cliente', 'Hola');
    insert into public.conversaciones (cliente_id, perfil_id) values (cliente_b, b) returning id into de_b;
    insert into public.mensajes (conversacion_id, autor, contenido) values (de_b, 'ia', 'Respuesta para B');

    perform set_config('request.jwt.claims', jsonb_build_object('sub', a, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    resultado := jsonb_build_object(
      'la_suya_con_respuesta', public.marcar_resuelta_ia(con_ia),
      'otra_vez', public.marcar_resuelta_ia(con_ia),
      'sin_respuesta_del_asistente', public.marcar_resuelta_ia(sin_ia),
      'la_de_otro_cliente', public.marcar_resuelta_ia(de_b)
    );
    execute 'reset role';
    resultado := resultado || jsonb_build_object(
      'estado_de_la_de_B', (select estado from public.conversaciones where id = de_b)
    );

    perform set_config('request.jwt.claims', '{"role":"anon"}', true);
    execute 'set local role anon';
    resultado := resultado || jsonb_build_object('sin_sesion', pg_temp.intentar(format('select public.marcar_resuelta_ia(%L)', con_ia)));

    raise exception 'deshacer' using errcode = 'P0001';
  exception when sqlstate 'P0001' then null;
  end;
  return resultado;
end;
$$;

select pg_temp.prueba_resuelta_ia() as resultado;

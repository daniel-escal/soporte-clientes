-- Test de public.abrir_solicitud y de la política de insert de tickets (peticiones y prioridad, 2026-10-09).
-- No deja datos (bloque que se deshace al final). Ojo: la secuencia de tickets.numero sí avanza.
-- Resultado esperado:
--   · incidencia → prioridad media, tipo incidencia, con conversación y 1 mensaje;
--   · cambio_contenido y nuevo_componente → prioridad baja, tipo peticion;
--   · categoría que no puede elegir el cliente → 22023; web de B → 23503; título corto → 23514;
--   · contra la API: prioridad urgente, categoría web_caida u origen 'ia' → bloqueado por RLS (42501);
--   · sin sesión → 42501.

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

create or replace function pg_temp.prueba_abrir_solicitud() returns jsonb
language plpgsql as $$
declare
  a constant uuid := '00000000-0000-4000-8000-00000000000a';
  b constant uuid := '00000000-0000-4000-8000-00000000000b';
  cliente_a uuid; web_a uuid; web_b uuid; resultado jsonb;
  incidencia record; cambio record; nuevo record; mensajes_hilo bigint;
begin
  begin
    insert into auth.users (id, aud, role, is_anonymous, created_at, updated_at) values
      (a, 'authenticated', 'authenticated', true, now(), now()),
      (b, 'authenticated', 'authenticated', true, now(), now());
    select p.cliente_id into cliente_a from public.perfiles p where p.id = a;
    select w.id into web_a from public.webs w where w.cliente_id = cliente_a limit 1;
    select w.id into web_b from public.webs w join public.perfiles p on p.cliente_id = w.cliente_id where p.id = b limit 1;

    perform set_config('request.jwt.claims', jsonb_build_object('sub', a, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';

    select * into incidencia from public.abrir_solicitud('El formulario no envía', 'Desde ayer el formulario de contacto no llega', 'otro', web_a);
    select * into cambio from public.abrir_solicitud('Cambiar el horario', 'Ahora abrimos a las 9', 'cambio_contenido', web_a);
    select * into nuevo from public.abrir_solicitud('Añadir una galería', 'Quiero una galería con fotos del local', 'nuevo_componente', null);
    select count(*) into mensajes_hilo from public.mensajes where conversacion_id = incidencia.conversacion_id;

    resultado := jsonb_build_object(
      'incidencia', jsonb_build_object('prioridad', incidencia.prioridad, 'tipo', incidencia.tipo, 'origen', incidencia.origen, 'estado', incidencia.estado, 'mensajes_en_hilo', mensajes_hilo),
      'cambio_contenido', jsonb_build_object('prioridad', cambio.prioridad, 'tipo', cambio.tipo),
      'nuevo_componente', jsonb_build_object('prioridad', nuevo.prioridad, 'tipo', nuevo.tipo),
      'categoria_no_permitida', pg_temp.intentar('select public.abrir_solicitud(''La web no carga'', ''x'', ''web_caida'', null)'),
      'con_web_de_B', pg_temp.intentar(format('select public.abrir_solicitud(''Ajena'', ''x'', ''otro'', %L)', web_b)),
      'titulo_demasiado_corto', pg_temp.intentar('select public.abrir_solicitud(''x'', ''descripcion'', ''otro'', null)'),
      'api_prioridad_urgente', pg_temp.intentar(format(
        'insert into public.tickets (cliente_id, titulo, descripcion, categoria, prioridad, origen) values (%L, ''Urgentísimo'', ''x'', ''otro'', ''urgente'', ''cliente'')', cliente_a)),
      'api_categoria_web_caida', pg_temp.intentar(format(
        'insert into public.tickets (cliente_id, titulo, descripcion, categoria, prioridad, origen) values (%L, ''Web caída'', ''x'', ''web_caida'', ''media'', ''cliente'')', cliente_a)),
      'api_como_si_fuera_la_ia', pg_temp.intentar(format(
        'insert into public.tickets (cliente_id, titulo, descripcion, categoria, prioridad, origen) values (%L, ''Soy la IA'', ''x'', ''otro'', ''media'', ''ia'')', cliente_a)),
      'api_valida', pg_temp.intentar(format(
        'insert into public.tickets (cliente_id, titulo, descripcion, categoria, prioridad, origen) values (%L, ''Por la API'', ''x'', ''cambio_contenido'', ''baja'', ''cliente'')', cliente_a))
    );

    execute 'reset role';
    perform set_config('request.jwt.claims', '{"role":"anon"}', true);
    execute 'set local role anon';
    resultado := resultado || jsonb_build_object('sin_sesion', pg_temp.intentar('select public.abrir_solicitud(''Hola mundo'', ''x'', ''otro'', null)'));

    raise exception 'deshacer' using errcode = 'P0001';
  exception when sqlstate 'P0001' then null;
  end;
  return resultado;
end;
$$;

select pg_temp.prueba_abrir_solicitud() as resultado;

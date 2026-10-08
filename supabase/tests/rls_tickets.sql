-- Test de aislamiento del módulo `tickets` (T4). No deja datos (bloque que se deshace al final).
-- Usuarios simulados: A y B (clientes de demo) y C (admin). B tiene una conversación, un mensaje y
-- un ticket creados como superusuario. Se comprueba qué puede hacer A y qué puede hacer C.

create or replace function pg_temp.intentar(consulta text) returns text
language plpgsql as $$
declare
  filas integer;
begin
  execute consulta;
  get diagnostics filas = row_count;
  return 'filas afectadas: ' || filas;
exception when others then
  return 'bloqueado (' || sqlstate || ')';
end;
$$;

create or replace function pg_temp.contar(consulta text) returns bigint
language plpgsql as $$
declare
  n bigint;
begin
  execute 'select count(*) from (' || consulta || ') t' into n;
  return n;
end;
$$;

create or replace function pg_temp.actuar_como(usuario uuid) returns void
language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', jsonb_build_object('sub', usuario, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$;

create or replace function pg_temp.prueba_rls_tickets() returns jsonb
language plpgsql as $$
declare
  a constant uuid := '00000000-0000-4000-8000-00000000000a';
  b constant uuid := '00000000-0000-4000-8000-00000000000b';
  c constant uuid := '00000000-0000-4000-8000-00000000000c';
  cliente_a uuid; cliente_b uuid; web_a uuid; web_b uuid; conv_a uuid; conv_b uuid; ticket_b uuid;
  como_a jsonb; como_admin jsonb;
begin
  begin
    insert into auth.users (id, aud, role, is_anonymous, created_at, updated_at) values
      (a, 'authenticated', 'authenticated', true, now(), now()),
      (b, 'authenticated', 'authenticated', true, now(), now()),
      (c, 'authenticated', 'authenticated', true, now(), now());
    update public.perfiles set rol = 'admin' where id = c;

    select cliente_id into cliente_a from public.perfiles where id = a;
    select cliente_id into cliente_b from public.perfiles where id = b;
    select id into web_a from public.webs where cliente_id = cliente_a limit 1;
    select id into web_b from public.webs where cliente_id = cliente_b limit 1;

    insert into public.conversaciones (cliente_id, perfil_id) values (cliente_b, b) returning id into conv_b;
    insert into public.mensajes (conversacion_id, autor, contenido) values (conv_b, 'cliente', 'Mensaje privado de B');
    insert into public.tickets (cliente_id, web_id, conversacion_id, titulo, descripcion, origen)
      values (cliente_b, web_b, conv_b, 'Ticket de B', 'Privado', 'ia') returning id into ticket_b;
    insert into public.faq (pregunta, respuesta, activa) values
      ('¿Pregunta activa?', 'Respuesta activa', true),
      ('¿Pregunta inactiva?', 'Respuesta inactiva', false);

    -- Como A
    perform pg_temp.actuar_como(a);
    insert into public.conversaciones (cliente_id, perfil_id) values (cliente_a, a) returning id into conv_a;

    como_a := jsonb_build_object(
      've_conversaciones_de_B', pg_temp.contar(format('select 1 from public.conversaciones where id = %L', conv_b)),
      've_mensajes_de_B', pg_temp.contar(format('select 1 from public.mensajes where conversacion_id = %L', conv_b)),
      've_tickets_de_B', pg_temp.contar(format('select 1 from public.tickets where id = %L', ticket_b)),
      'faq_visibles', pg_temp.contar('select 1 from public.faq'),
      'escribir_como_cliente', pg_temp.intentar(format('insert into public.mensajes (conversacion_id, autor, contenido) values (%L, ''cliente'', ''hola'')', conv_a)),
      'escribir_como_ia', pg_temp.intentar(format('insert into public.mensajes (conversacion_id, autor, contenido) values (%L, ''ia'', ''soy la IA'')', conv_a)),
      'escribir_como_admin', pg_temp.intentar(format('insert into public.mensajes (conversacion_id, autor, contenido) values (%L, ''admin'', ''soy Daniel'')', conv_a)),
      'escribir_en_conversacion_de_B', pg_temp.intentar(format('insert into public.mensajes (conversacion_id, autor, contenido) values (%L, ''cliente'', ''intruso'')', conv_b)),
      'abrir_conversacion_para_B', pg_temp.intentar(format('insert into public.conversaciones (cliente_id, perfil_id) values (%L, %L)', cliente_b, b)),
      'abrir_ticket_a_mano', pg_temp.intentar(format('insert into public.tickets (cliente_id, web_id, titulo, descripcion, origen, prioridad) values (%L, %L, ''Mi formulario falla'', ''No envía'', ''cliente'', ''alta'')', cliente_a, web_a)),
      'abrir_ticket_con_web_de_B', pg_temp.intentar(format('insert into public.tickets (cliente_id, web_id, titulo, descripcion, origen) values (%L, %L, ''Con web ajena'', ''x'', ''cliente'')', cliente_a, web_b)),
      'abrir_ticket_para_B', pg_temp.intentar(format('insert into public.tickets (cliente_id, titulo, descripcion, origen) values (%L, ''Para B'', ''x'', ''cliente'')', cliente_b)),
      'abrir_ticket_como_ia', pg_temp.intentar(format('insert into public.tickets (cliente_id, titulo, descripcion, origen) values (%L, ''Falso IA'', ''x'', ''ia'')', cliente_a)),
      'abrir_ticket_con_resumen_ia', pg_temp.intentar(format('insert into public.tickets (cliente_id, titulo, descripcion, origen, resumen_ia) values (%L, ''Falso resumen'', ''x'', ''cliente'', ''inventado'')', cliente_a)),
      'abrir_ticket_ya_resuelto', pg_temp.intentar(format('insert into public.tickets (cliente_id, titulo, descripcion, origen, estado) values (%L, ''Ya resuelto'', ''x'', ''cliente'', ''resuelto'')', cliente_a)),
      'cambiar_estado_de_su_ticket', pg_temp.intentar('update public.tickets set estado = ''cerrado'''),
      'borrar_sus_tickets', pg_temp.intentar('delete from public.tickets'),
      'marcar_conversacion_resuelta', pg_temp.intentar('update public.conversaciones set estado = ''resuelta_ia'''),
      'crear_faq', pg_temp.intentar('insert into public.faq (pregunta, respuesta) values (''¿x?'', ''yyy'')')
    );

    -- Como admin (C)
    perform pg_temp.actuar_como(c);
    como_admin := jsonb_build_object(
      'tickets_visibles', pg_temp.contar('select 1 from public.tickets'),
      'faq_visibles', pg_temp.contar('select 1 from public.faq'),
      'cambiar_estado_ticket_de_B', pg_temp.intentar(format('update public.tickets set estado = ''en_curso'' where id = %L', ticket_b)),
      'responder_como_admin', pg_temp.intentar(format('insert into public.mensajes (conversacion_id, autor, contenido) values (%L, ''admin'', ''Lo miro ahora'')', conv_b)),
      'escribir_como_ia', pg_temp.intentar(format('insert into public.mensajes (conversacion_id, autor, contenido) values (%L, ''ia'', ''x'')', conv_b))
    );

    raise exception 'deshacer' using errcode = 'P0001';
  exception when sqlstate 'P0001' then
    null;
  end;

  return jsonb_build_object('como_A', como_a, 'como_admin', como_admin);
end;
$$;

select pg_temp.prueba_rls_tickets() as resultado;

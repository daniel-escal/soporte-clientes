-- Test de las políticas de Storage del bucket "adjuntos". No deja datos (bloque que se deshace al final).
-- Resultado esperado:
--   · A sube a su ticket abierto; no a la carpeta de B, ni con el ticket de B, ni a un ticket cerrado;
--   · como mucho 10 adjuntos por ticket;
--   · A solo ve los suyos y B no ve los de A; nadie borra ni modifica (0 filas).
-- El tipo (JPEG/PNG/WebP) y el tamaño (5 MB) los comprueba Storage al subir: scripts/atacar.mjs.

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

create or replace function pg_temp.prueba_adjuntos() returns jsonb
language plpgsql as $$
declare
  a constant uuid := '00000000-0000-4000-8000-0000000000a2';
  b constant uuid := '00000000-0000-4000-8000-0000000000b2';
  cliente_a uuid; cliente_b uuid; ticket_a uuid; ticket_b uuid; ticket_cerrado uuid;
  resultado jsonb; diez text;
begin
  begin
    insert into auth.users (id, aud, role, is_anonymous, created_at, updated_at) values
      (a, 'authenticated', 'authenticated', true, now(), now()),
      (b, 'authenticated', 'authenticated', true, now(), now());
    select cliente_id into cliente_a from public.perfiles where id = a;
    select cliente_id into cliente_b from public.perfiles where id = b;
    insert into public.tickets (cliente_id, titulo, descripcion, origen) values (cliente_a, 'Ticket de A', 'x', 'cliente') returning id into ticket_a;
    insert into public.tickets (cliente_id, titulo, descripcion, origen) values (cliente_b, 'Ticket de B', 'x', 'cliente') returning id into ticket_b;
    insert into public.tickets (cliente_id, titulo, descripcion, origen, estado) values (cliente_a, 'Cerrado de A', 'x', 'cliente', 'cerrado') returning id into ticket_cerrado;

    perform set_config('request.jwt.claims', jsonb_build_object('sub', a, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    resultado := jsonb_build_object(
      'a_en_su_ticket', pg_temp.intentar(format('insert into storage.objects (bucket_id, name, owner) values (''adjuntos'', %L, %L)', cliente_a || '/' || ticket_a || '/1.jpg', a)),
      'a_en_carpeta_de_b', pg_temp.intentar(format('insert into storage.objects (bucket_id, name, owner) values (''adjuntos'', %L, %L)', cliente_b || '/' || ticket_b || '/x.jpg', a)),
      'a_con_ticket_de_b', pg_temp.intentar(format('insert into storage.objects (bucket_id, name, owner) values (''adjuntos'', %L, %L)', cliente_a || '/' || ticket_b || '/x.jpg', a)),
      'a_en_ticket_cerrado', pg_temp.intentar(format('insert into storage.objects (bucket_id, name, owner) values (''adjuntos'', %L, %L)', cliente_a || '/' || ticket_cerrado || '/x.jpg', a))
    );
    -- Hasta 10 por ticket: ya hay 1; se suben 9 más y el siguiente debe fallar.
    for i in 2..10 loop
      execute format('insert into storage.objects (bucket_id, name, owner) values (''adjuntos'', %L, %L)', cliente_a || '/' || ticket_a || '/' || i || '.jpg', a);
    end loop;
    diez := pg_temp.intentar(format('insert into storage.objects (bucket_id, name, owner) values (''adjuntos'', %L, %L)', cliente_a || '/' || ticket_a || '/11.jpg', a));
    resultado := resultado || jsonb_build_object(
      'el_undecimo', diez,
      'a_ve', (select count(*) from storage.objects where bucket_id = 'adjuntos'),
      'a_borra_uno', pg_temp.intentar(format('delete from storage.objects where bucket_id = ''adjuntos'' and name = %L', cliente_a || '/' || ticket_a || '/1.jpg')),
      'a_renombra_uno', pg_temp.intentar(format('update storage.objects set name = %L where bucket_id = ''adjuntos'' and name = %L', cliente_b || '/' || ticket_b || '/robado.jpg', cliente_a || '/' || ticket_a || '/2.jpg'))
    );
    execute 'reset role';

    perform set_config('request.jwt.claims', jsonb_build_object('sub', b, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    resultado := resultado || jsonb_build_object('b_ve_los_de_a', (select count(*) from storage.objects where bucket_id = 'adjuntos' and name like cliente_a || '/%'));
    execute 'reset role';

    raise exception 'deshacer' using errcode = 'P0001';
  exception when sqlstate 'P0001' then null;
  end;
  return resultado;
end;
$$;

select pg_temp.prueba_adjuntos() as resultado;

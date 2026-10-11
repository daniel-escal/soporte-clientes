-- Test de los avisos por Telegram de tickets nuevos. No deja datos (bloque que se deshace al final).
-- Resultado esperado:
--   · un ticket nuevo deja un intento de aviso ('sin_configurar' si aún no están los secretos en Vault,
--     'enviado' si ya están: en ese caso llega un mensaje de prueba de verdad);
--   · un ticket con fecha pasada (como los que siembra privado.sembrar_demo) no avisa;
--   · ni el cliente ni un visitante anónimo pueden leer los avisos ni enviar uno (42501).

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

create or replace function pg_temp.prueba_avisos() returns jsonb
language plpgsql as $$
declare
  v_cliente uuid;
  v_web uuid;
  nuevo uuid;
  sembrado uuid;
  salida jsonb;
begin
  begin
    select c.id, w.id into v_cliente, v_web
    from public.clientes c join public.webs w on w.cliente_id = c.id
    limit 1;

    insert into public.tickets (cliente_id, web_id, titulo, descripcion, prioridad, origen)
    values (v_cliente, v_web, 'Prueba de aviso: ticket nuevo', 'prueba', 'urgente', 'ia')
    returning id into nuevo;

    insert into public.tickets (cliente_id, web_id, titulo, descripcion, prioridad, origen, creado_en)
    values (v_cliente, v_web, 'Prueba de aviso: ticket sembrado', 'prueba', 'media', 'ia', now() - interval '12 minutes')
    returning id into sembrado;

    salida := jsonb_build_object(
      'ticket_nuevo', (select jsonb_agg(a.resultado) from privado.avisos a where a.ticket_id = nuevo),
      'ticket_sembrado', (select coalesce(jsonb_agg(a.resultado), '[]'::jsonb) from privado.avisos a where a.ticket_id = sembrado),
      'cliente_lee_avisos', pg_temp.intentar('set local role authenticated; select * from privado.avisos'),
      'cliente_envia_aviso', pg_temp.intentar('set local role authenticated; select privado.enviar_telegram(''hola'')'),
      'anonimo_envia_aviso', pg_temp.intentar('set local role anon; select privado.probar_aviso_telegram()')
    );

    raise exception 'deshacer' using errcode = 'P0001';
  exception when sqlstate 'P0001' then null;
  end;
  return salida;
end;
$$;

select pg_temp.prueba_avisos() as resultado;

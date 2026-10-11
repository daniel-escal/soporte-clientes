-- Avisos por Telegram de cada ticket nuevo: Daniel se entera aunque no tenga el panel abierto.
-- Salen de la propia base de datos con pg_net, que es asíncrono: si Telegram falla o tarda, el ticket se crea igual.
-- El token del bot y el chat de Daniel viven en Vault. Los guarda Daniel en el editor SQL y nunca van al repo:
--   select vault.create_secret('<token del bot>', 'telegram_bot_token');
--   select vault.create_secret('<tu chat id>', 'telegram_chat_id');
-- Sin esos dos secretos no se envía nada: el intento queda anotado como 'sin_configurar'.
-- Para probarlo: select privado.probar_aviso_telegram();

create extension if not exists pg_net with schema extensions;

-- Registro de cada intento: sirve de tope por hora y para ver qué ha pasado.
create table privado.avisos (
  id bigint generated always as identity primary key,
  ticket_id uuid references public.tickets (id) on delete cascade,
  canal text not null default 'telegram',
  resultado text not null check (resultado in ('enviado', 'sin_configurar', 'limite')),
  peticion_id bigint,
  creado_en timestamptz not null default now()
);
alter table privado.avisos enable row level security;
revoke all on privado.avisos from public, anon, authenticated;
create index avisos_recientes on privado.avisos (creado_en desc);

create function privado.enviar_telegram(p_texto text, p_ticket uuid default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text;
  v_chat text;
  v_peticion bigint;
begin
  select decrypted_secret into v_token from vault.decrypted_secrets where name = 'telegram_bot_token';
  select decrypted_secret into v_chat from vault.decrypted_secrets where name = 'telegram_chat_id';
  if v_token is null or v_chat is null then
    insert into privado.avisos (ticket_id, resultado) values (p_ticket, 'sin_configurar');
    return 'sin_configurar';
  end if;

  -- Tope por hora: la demo es pública y cualquier visitante puede abrir tickets.
  if (select count(*) from privado.avisos where resultado = 'enviado' and creado_en > now() - interval '1 hour') >= 30 then
    insert into privado.avisos (ticket_id, resultado) values (p_ticket, 'limite');
    return 'limite';
  end if;

  select net.http_post(
    url := 'https://api.telegram.org/bot' || v_token || '/sendMessage',
    body := jsonb_build_object('chat_id', v_chat, 'text', p_texto, 'disable_web_page_preview', true),
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 5000
  ) into v_peticion;

  insert into privado.avisos (ticket_id, resultado, peticion_id) values (p_ticket, 'enviado', v_peticion);
  return 'enviado';
end;
$$;

create function privado.avisar_ticket_nuevo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cliente text;
  v_web text;
begin
  select nombre into v_cliente from public.clientes where id = new.cliente_id;
  select nombre into v_web from public.webs where id = new.web_id;

  perform privado.enviar_telegram(
    concat_ws(
      E'\n',
      case when new.prioridad = 'urgente' then '🔴 URGENTE · ' else '🆕 ' end
        || case when new.tipo = 'peticion' then 'Petición' else 'Incidencia' end || ' #' || new.numero,
      new.titulo,
      concat_ws(' · ', coalesce(v_cliente, 'Cliente sin nombre'), v_web, 'prioridad ' || new.prioridad::text),
      case when new.origen = 'ia' then 'La ha abierto el asistente' else 'La ha abierto el cliente con el formulario' end,
      'https://daniel-escal.github.io/soporte-clientes/admin/tickets/' || new.id
    ),
    new.id
  );
  return null;
exception when others then
  -- Un aviso nunca puede impedir que se cree el ticket.
  raise warning 'Aviso del ticket % no enviado: %', new.id, sqlerrm;
  return null;
end;
$$;

-- Solo los tickets nuevos de verdad: los que siembra privado.sembrar_demo() llevan fechas pasadas
-- (el más reciente, de hace unos 12 minutos) y no avisan al renovar la demo.
create trigger tickets_avisar_nuevo
  after insert on public.tickets
  for each row
  when (new.creado_en > now() - interval '1 minute')
  execute function privado.avisar_ticket_nuevo();

create function privado.probar_aviso_telegram()
returns text
language sql
security definer
set search_path = ''
as $$
  select privado.enviar_telegram('✅ Soporte · daniel-escal.es: avisos conectados. Te escribiré aquí cada vez que llegue un ticket.');
$$;

revoke all on function privado.enviar_telegram(text, uuid) from public, anon, authenticated;
revoke all on function privado.avisar_ticket_nuevo() from public, anon, authenticated;
revoke all on function privado.probar_aviso_telegram() from public, anon, authenticated;

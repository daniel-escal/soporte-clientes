-- La primera conexión TLS con api.telegram.org desde la base de datos puede tardar más de 5 s
-- (medido el 2026-10-11: un intento en frío agotó los 5 s y el siguiente respondió al momento).
-- Se sube el margen a 15 s: pg_net es asíncrono, así que esperar más no frena nada.
create or replace function privado.enviar_telegram(p_texto text, p_ticket uuid default null)
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
    timeout_milliseconds := 15000
  ) into v_peticion;

  insert into privado.avisos (ticket_id, resultado, peticion_id) values (p_ticket, 'enviado', v_peticion);
  return 'enviado';
end;
$$;

revoke all on function privado.enviar_telegram(text, uuid) from public, anon, authenticated;

-- Para ver cómo han ido los últimos avisos (sin el token: pg_net no guarda la URL en las respuestas).
create function privado.ultimos_avisos(p_limite int default 10)
returns table (creado_en timestamptz, resultado text, estado_http int, respuesta text, error text)
language sql
security definer
set search_path = ''
as $$
  select a.creado_en, a.resultado, r.status_code, left(r.content, 200), left(r.error_msg, 200)
  from privado.avisos a
  left join net._http_response r on r.id = a.peticion_id
  order by a.creado_en desc
  limit p_limite;
$$;

revoke all on function privado.ultimos_avisos(int) from public, anon, authenticated;

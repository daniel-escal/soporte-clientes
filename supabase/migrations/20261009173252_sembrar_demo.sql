-- Datos de demostración en una función (T13). Sirve para dos cosas:
--   · regenerarlos con una sola línea desde el editor SQL: select privado.sembrar_demo();
--   · que pg_cron los renueve solo la mañana de la demo (martes 13 a las 7:00, hora de Madrid). Esa
--     tarea se borra a sí misma después de ejecutarse.
-- Borra las sesiones anónimas (y con ellas los clientes de demostración) y recrea 3 negocios ficticios
-- con fechas relativas al momento de ejecutarla. No toca la FAQ, el usuario de Daniel ni Storage.
-- Solo la puede ejecutar el propietario (postgres): nadie la puede llamar desde la API.
-- Los mensajes se insertan antes que los tickets para que los triggers de seguimiento no los cambien;
-- los avisos automáticos ya van escritos en cada conversación.

-- Conversación con sus mensajes. Cada mensaje es {autor, minutos desde el inicio, texto}.
create function privado.demo_conversacion(
  p_cliente uuid,
  p_perfil uuid,
  p_estado public.estado_conversacion,
  p_inicio timestamptz,
  p_mensajes text[]
) returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
  v_mensaje text[];
  v_ultimo timestamptz;
begin
  select p_inicio + make_interval(secs => max(p_mensajes[i][2]::numeric) * 60)
    into v_ultimo
    from generate_subscripts(p_mensajes, 1) as i;
  insert into public.conversaciones (cliente_id, perfil_id, estado, creado_en, actualizado_en)
  values (p_cliente, p_perfil, p_estado, p_inicio, v_ultimo)
  returning id into v_id;
  foreach v_mensaje slice 1 in array p_mensajes loop
    insert into public.mensajes (conversacion_id, autor, contenido, creado_en)
    values (v_id, v_mensaje[1]::public.autor, v_mensaje[3], p_inicio + make_interval(secs => v_mensaje[2]::numeric * 60));
  end loop;
  return v_id;
end;
$$;

create function privado.demo_ticket(
  p_cliente uuid,
  p_web uuid,
  p_conversacion uuid,
  p_titulo text,
  p_descripcion text,
  p_categoria public.categoria,
  p_prioridad public.prioridad,
  p_estado public.estado_ticket,
  p_origen public.origen_ticket,
  p_creado timestamptz,
  p_primera_respuesta timestamptz,
  p_estado_desde timestamptz,
  p_recordado timestamptz default null
) returns void
language sql
set search_path = ''
as $$
  insert into public.tickets (
    cliente_id, web_id, conversacion_id, titulo, descripcion, categoria, prioridad, estado, origen,
    primera_respuesta_en, creado_en, actualizado_en, estado_desde, recordado_en
  ) values (
    p_cliente, p_web, p_conversacion, p_titulo, p_descripcion, p_categoria, p_prioridad, p_estado, p_origen,
    p_primera_respuesta, p_creado, p_estado_desde, p_estado_desde, p_recordado
  );
$$;

create function privado.demo_minutos(p_inicio timestamptz, p_minutos numeric) returns timestamptz
language sql
immutable
set search_path = ''
as $$ select p_inicio + make_interval(secs => p_minutos * 60) $$;

-- p_desde_cron: la tarea programada pasa true para borrarse a sí misma al terminar.
create function privado.sembrar_demo(p_desde_cron boolean default false) returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  marcos constant uuid := '5eed0000-0000-4000-8000-000000000001';
  vicent constant uuid := '5eed0000-0000-4000-8000-000000000002';
  lucia constant uuid := '5eed0000-0000-4000-8000-000000000003';
  ahora constant timestamptz := now();
  resuelta constant text := 'Marcada como resuelta. Si sigue fallando o falta algo, contesta aquí y se volverá a abrir. Si no, se cerrará sola en 3 días.';
  brocha uuid; taller uuid; espiga uuid;
  brocha_web uuid; brocha_reservas uuid; taller_web uuid; taller_citas uuid; espiga_web uuid; espiga_pedidos uuid;
  c uuid;
  s timestamptz;
  resumen jsonb;
begin
  -- 1. Limpieza: sesiones anónimas, clientes de demostración y los negocios de una ejecución anterior.
  delete from public.clientes
   where es_demo or id in (select cliente_id from public.perfiles where id in (marcos, vicent, lucia));
  delete from auth.users where is_anonymous or id in (marcos, vicent, lucia);

  -- 2. Numeración desde el #101 si ya no queda ningún ticket.
  if not exists (select 1 from public.tickets) then
    alter table public.tickets alter column numero restart with 101;
  end if;

  -- 3. Negocios. El trigger de alta crea el cliente y el perfil de cada usuario (sin contraseña ni
  --    identidades: no se puede iniciar sesión con ellos).
  insert into auth.users (id, instance_id, aud, role, email, is_anonymous, created_at, updated_at) values
    (marcos, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'brocha-laton@clientes.example', false, ahora - interval '210 days', ahora - interval '210 days'),
    (vicent, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'taller-ruedas@clientes.example', false, ahora - interval '150 days', ahora - interval '150 days'),
    (lucia, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'la-espiga@clientes.example', false, ahora - interval '90 days', ahora - interval '90 days');

  select cliente_id into brocha from public.perfiles where id = marcos;
  select cliente_id into taller from public.perfiles where id = vicent;
  select cliente_id into espiga from public.perfiles where id = lucia;
  update public.clientes set nombre = 'Brocha & Latón', creado_en = ahora - interval '210 days' where id = brocha;
  update public.clientes set nombre = 'Taller Ruedas del Grao', creado_en = ahora - interval '150 days' where id = taller;
  update public.clientes set nombre = 'Panadería La Espiga', creado_en = ahora - interval '90 days' where id = espiga;
  update public.perfiles set nombre = 'Marcos' where id = marcos;
  update public.perfiles set nombre = 'Vicent' where id = vicent;
  update public.perfiles set nombre = 'Lucía' where id = lucia;

  insert into public.webs (cliente_id, nombre, dominio, creado_en)
  values (brocha, 'Brocha & Latón', 'daniel-escal.github.io/landing-negocio-local', ahora - interval '210 days') returning id into brocha_web;
  insert into public.webs (cliente_id, nombre, dominio, creado_en)
  values (brocha, 'Reservas Brocha & Latón', 'reservas.brochaylaton.example', ahora - interval '120 days') returning id into brocha_reservas;
  insert into public.webs (cliente_id, nombre, dominio, creado_en)
  values (taller, 'Taller Ruedas del Grao', 'tallerruedasdelgrao.example', ahora - interval '150 days') returning id into taller_web;
  insert into public.webs (cliente_id, nombre, dominio, creado_en)
  values (taller, 'Cita previa del taller', 'citas.tallerruedasdelgrao.example', ahora - interval '100 days') returning id into taller_citas;
  insert into public.webs (cliente_id, nombre, dominio, creado_en)
  values (espiga, 'Panadería La Espiga', 'panaderialaespiga.example', ahora - interval '90 days') returning id into espiga_web;
  insert into public.webs (cliente_id, nombre, dominio, creado_en)
  values (espiga, 'Pedidos La Espiga', 'pedidos.panaderialaespiga.example', ahora - interval '60 days') returning id into espiga_pedidos;

  -- 4. Tickets, en orden de creación (#101 a #110).

  -- #101 Resuelta y cerrada sola a los 3 días.
  s := ahora - interval '6 days 3 hours';
  c := privado.demo_conversacion(brocha, marcos, 'escalada', s, array[
    ['cliente', '0', 'Hola. En la página de contacto ya no sale el mapa, solo un recuadro gris.'],
    ['ia', '0.5', 'Gracias por avisar. ¿Te pasa en la web de la barbería o en la de reservas? ¿Y lo ves así en el móvil y en el ordenador?'],
    ['cliente', '3', 'En la de la barbería, y en los dos.'],
    ['ia', '4', 'He abierto una incidencia para que Daniel revise el mapa de la página de contacto. La verá enseguida y te responderá por aquí.'],
    ['admin', '52', 'Hola, Marcos. La clave de Google Maps había caducado. Ya está renovada y el mapa vuelve a salir. ¿Me confirmas que lo ves bien?'],
    ['cliente', '70', 'Sí, ya sale. ¡Gracias!'],
    ['sistema', '75', resuelta],
    ['sistema', '4415', 'Se ha cerrado sola: pasaron 3 días desde que se resolvió sin mensajes nuevos.']
  ]);
  perform privado.demo_ticket(brocha, brocha_web, c, 'El mapa de Google no aparece en la página de contacto',
    'En la página de contacto de la web de la barbería el mapa de Google no aparece: solo se ve un recuadro gris. Pasa en el móvil y en el ordenador.',
    'error_funcional', 'media', 'cerrado', 'ia', privado.demo_minutos(s, 4), privado.demo_minutos(s, 52), privado.demo_minutos(s, 4415));

  -- #102 Resuelta, el cliente contesta y se vuelve a abrir.
  s := ahora - interval '3 days 4 hours';
  c := privado.demo_conversacion(brocha, marcos, 'escalada', s, array[
    ['cliente', '0', 'En la web de reservas, al pulsar «Reservar» no pasa nada.'],
    ['ia', '0.5', 'Gracias por avisar. ¿Te pasa en el móvil, en el ordenador o en los dos?'],
    ['cliente', '2', 'En el móvil. En el ordenador sí funciona.'],
    ['ia', '3', 'He abierto una incidencia para que Daniel revise el botón de reservar en el móvil. La verá enseguida y te responderá por aquí.'],
    ['admin', '25', 'Hola, Marcos. El aviso de cookies tapaba el botón en las pantallas pequeñas. Ya lo he corregido.'],
    ['sistema', '26', resuelta],
    ['cliente', '2666', 'Sigue sin ir en el iPhone de mi socio.'],
    ['sistema', '2666.1', 'Se ha vuelto a abrir porque ha llegado un mensaje después de resolverla.'],
    ['admin', '2684', 'Gracias, Marcos. Lo reviso en Safari, que es donde falla, y te digo algo hoy.']
  ]);
  perform privado.demo_ticket(brocha, brocha_reservas, c, 'El botón de reservar no responde en el móvil',
    'En la web de reservas, el botón «Reservar» no hace nada en el móvil. En el ordenador funciona.',
    'error_funcional', 'alta', 'en_curso', 'ia', privado.demo_minutos(s, 3), privado.demo_minutos(s, 25), privado.demo_minutos(s, 2666.1));

  -- #103 Esperando al cliente, con el recordatorio ya enviado.
  s := ahora - interval '3 days 2 hours';
  c := privado.demo_conversacion(taller, vicent, 'escalada', s, array[
    ['cliente', '0', 'Hola. Varios clientes me dicen que piden cita en la web y no les llega nada, y a mí tampoco.'],
    ['ia', '0.5', 'Mira primero en la carpeta de spam o correo no deseado: los avisos del formulario a veces acaban ahí. ¿Lo has comprobado?'],
    ['cliente', '6', 'Sí, en spam no hay nada. Y al darle a enviar se queda cargando.'],
    ['ia', '7', 'Gracias. He abierto una incidencia para que Daniel revise el formulario de cita previa: se queda cargando y no llegan los avisos. La verá enseguida.'],
    ['admin', '42', 'Hola, Vicent. Desde el ordenador a mí me funciona. ¿Me dices desde qué móvil lo intentan y si sale algún mensaje cuando se queda cargando?'],
    ['sistema', '2938', 'Recordatorio: Daniel está esperando tu respuesta para seguir. Si ya no hace falta, no tienes que hacer nada: dentro de 5 días se dará por resuelta.']
  ]);
  perform privado.demo_ticket(taller, taller_citas, c, 'El formulario de cita previa no envía',
    'En la web de cita previa, el formulario se queda cargando al enviar y no llegan los avisos ni al taller ni a los clientes. No están en spam.',
    'error_funcional', 'alta', 'esperando_cliente', 'ia', privado.demo_minutos(s, 7), privado.demo_minutos(s, 42), privado.demo_minutos(s, 43), privado.demo_minutos(s, 2938));

  -- #104 En curso.
  s := ahora - interval '2 days 1 hour';
  c := privado.demo_conversacion(taller, vicent, 'escalada', s, array[
    ['cliente', '0', 'Quiero cambiar el horario de los sábados en la web.'],
    ['ia', '0.5', 'Claro. ¿Cuál es el horario nuevo de los sábados, tal y como debe aparecer?'],
    ['cliente', '3', 'De 9:00 a 14:00. Ahora pone hasta las 13:00 y vienen clientes cuando ya hemos cerrado.'],
    ['ia', '4', 'Gracias. Le he pasado la petición a Daniel para poner el horario de los sábados de 9:00 a 14:00 en la web del taller. Te avisará por aquí cuando esté hecho.'],
    ['admin', '95', 'Hola, Vicent. Lo cambio esta tarde y te aviso por aquí.']
  ]);
  perform privado.demo_ticket(taller, taller_web, c, 'Cambiar el horario de los sábados',
    'Cambiar el horario de los sábados en la web del taller: debe poner de 9:00 a 14:00. Ahora pone hasta las 13:00 y llegan clientes con el taller cerrado.',
    'cambio_contenido', 'alta', 'en_curso', 'ia', privado.demo_minutos(s, 4), privado.demo_minutos(s, 95), privado.demo_minutos(s, 95));

  -- #105 Urgente, resuelta en media hora (se cerrará sola).
  s := ahora - interval '1 day 6 hours';
  c := privado.demo_conversacion(espiga, lucia, 'escalada', s, array[
    ['cliente', '0', 'Buenos días. Una clienta me dice que al entrar en la web le sale que no es segura y no se atreve a hacer el pedido.'],
    ['ia', '0.5', 'Eso suele pasar cuando el certificado de seguridad (el candado de la barra de direcciones) no se ha renovado. Tú no tienes que tocar nada. Lo trato como urgente: he abierto una incidencia y Daniel la verá enseguida.'],
    ['admin', '9', 'Hola, Lucía. Ya lo estoy mirando: el certificado no se renovó solo.'],
    ['admin', '31', 'Listo: certificado renovado y renovación automática revisada. Ya sale el candado.'],
    ['cliente', '40', 'Perfecto, ya lo veo bien. ¡Gracias por la rapidez!'],
    ['sistema', '42', resuelta]
  ]);
  perform privado.demo_ticket(espiga, espiga_web, c, 'La web avisa de que no es segura',
    'Al entrar en la web de la panadería, el navegador avisa de que no es segura: el certificado no se ha renovado. Una clienta no se atreve a hacer el pedido.',
    'dominio_hosting', 'urgente', 'resuelto', 'ia', privado.demo_minutos(s, 0.5), privado.demo_minutos(s, 9), privado.demo_minutos(s, 42));

  -- #106 Petición de algo nuevo, en curso.
  s := ahora - interval '1 day 3 hours';
  c := privado.demo_conversacion(brocha, marcos, 'escalada', s, array[
    ['cliente', '0', 'Me gustaría añadir una galería con fotos de nuestros cortes y afeitados.'],
    ['ia', '0.5', '¡Buena idea! ¿La quieres en la web de la barbería o en la de reservas? ¿Y cuántas fotos serían, más o menos?'],
    ['cliente', '2', 'En la de la barbería, en la página de inicio. Unas 10 fotos.'],
    ['ia', '3', 'Perfecto. Le he pasado la petición a Daniel: una galería de unas 10 fotos de cortes y afeitados en la página de inicio de la barbería. Te responderá con una propuesta.'],
    ['admin', '140', 'Hola, Marcos. Me parece muy buena idea. Sube aquí las fotos que quieras usar y te preparo una propuesta.']
  ]);
  perform privado.demo_ticket(brocha, brocha_web, c, 'Galería de fotos de cortes y afeitados',
    'Añadir una galería de unas 10 fotos de cortes y afeitados en la página de inicio de la web de la barbería.',
    'nuevo_componente', 'baja', 'en_curso', 'ia', privado.demo_minutos(s, 3), privado.demo_minutos(s, 140), privado.demo_minutos(s, 140));

  -- #107 Abierta a mano con el formulario (sin respuesta todavía).
  s := ahora - interval '20 hours';
  c := privado.demo_conversacion(espiga, lucia, 'activa', s, array[
    ['cliente', '0', 'Quiero añadir el roscón de Reyes a la carta: pequeño 14 €, mediano 19 € y grande 24 €. Con nata o trufa, por encargo hasta el 5 de enero.']
  ]);
  perform privado.demo_ticket(espiga, espiga_web, c, 'Añadir el roscón de Reyes a la carta',
    'Quiero añadir el roscón de Reyes a la carta: pequeño 14 €, mediano 19 € y grande 24 €. Con nata o trufa, por encargo hasta el 5 de enero.',
    'cambio_contenido', 'baja', 'abierto', 'cliente', s, null, s);

  -- #108 En curso.
  s := ahora - interval '9 hours';
  c := privado.demo_conversacion(espiga, lucia, 'escalada', s, array[
    ['cliente', '0', 'La web de pedidos tarda muchísimo en cargar en el móvil.'],
    ['ia', '0.5', 'Abre primero otra web conocida para descartar que sea tu conexión. Si las demás van bien, ¿desde cuándo te pasa y en qué página tarda más?'],
    ['cliente', '4', 'Las demás van bien. Desde el lunes, sobre todo en la página de los pasteles.'],
    ['ia', '5', 'Gracias. He abierto una incidencia para que Daniel revise por qué la web de pedidos va lenta en el móvil, sobre todo en la página de pasteles. La verá enseguida.'],
    ['admin', '125', 'Hola, Lucía. Las fotos nuevas de los pasteles pesan demasiado. Las estoy optimizando y te digo algo esta tarde.']
  ]);
  perform privado.demo_ticket(espiga, espiga_pedidos, c, 'La web de pedidos va lenta en el móvil',
    'La web de pedidos tarda mucho en cargar en el móvil desde el lunes, sobre todo la página de pasteles. Otras webs le van bien, así que no es su conexión.',
    'error_funcional', 'media', 'en_curso', 'ia', privado.demo_minutos(s, 5), privado.demo_minutos(s, 125), privado.demo_minutos(s, 125));

  -- #109 Resuelta hace unas horas (se cerrará sola).
  s := ahora - interval '6 hours';
  c := privado.demo_conversacion(taller, vicent, 'escalada', s, array[
    ['cliente', '0', 'En la web sigue saliendo el correo antiguo del taller. El bueno ahora es citas@tallerruedasdelgrao.example.'],
    ['ia', '0.5', 'Gracias. Le he pasado la petición a Daniel para cambiar el correo de la web del taller por citas@tallerruedasdelgrao.example. Te avisará por aquí cuando esté hecho.'],
    ['admin', '48', 'Hecho, Vicent: ya sale el correo nuevo en la cabecera, en la página de contacto y en el pie.'],
    ['sistema', '49', resuelta]
  ]);
  perform privado.demo_ticket(taller, taller_web, c, 'Cambiar el correo de contacto de la web',
    'En la web del taller sigue saliendo el correo antiguo. El nuevo es citas@tallerruedasdelgrao.example.',
    'cambio_contenido', 'alta', 'resuelto', 'ia', privado.demo_minutos(s, 0.5), privado.demo_minutos(s, 48), privado.demo_minutos(s, 49));

  -- #110 Urgente y sin responder: lo primero de la bandeja.
  s := ahora - interval '14 minutes';
  c := privado.demo_conversacion(brocha, marcos, 'escalada', s, array[
    ['cliente', '0', '¡La web de la barbería no carga! Sale la pantalla en blanco.'],
    ['ia', '0.5', 'Ábrela desde otro dispositivo o con los datos del móvil en lugar del wifi. ¿Te carga en algún sitio?'],
    ['cliente', '3', 'No, ni con datos ni en el ordenador.'],
    ['ia', '4', 'Entonces la web está caída. Lo trato como urgente: he abierto una incidencia y Daniel la verá enseguida.']
  ]);
  perform privado.demo_ticket(brocha, brocha_web, c, 'La web de la barbería no carga',
    'La web de la barbería no carga: sale la pantalla en blanco. Lo ha probado con los datos del móvil y en el ordenador, y no carga en ningún sitio.',
    'web_caida', 'urgente', 'abierto', 'ia', privado.demo_minutos(s, 4), null, privado.demo_minutos(s, 4));

  -- 5. Conversaciones que resolvió el asistente sin abrir ticket.
  perform privado.demo_conversacion(espiga, lucia, 'resuelta_ia', ahora - interval '6 days 1 hour', array[
    ['cliente', '0', 'No me llegan los mensajes del formulario de la web.'],
    ['ia', '0.5', 'Mira primero en la carpeta de spam o correo no deseado: los avisos del formulario a veces acaban ahí. Si no están, dímelo y se lo paso a Daniel.'],
    ['cliente', '5', 'Estaban en spam, ¡gracias!']
  ]);
  perform privado.demo_conversacion(taller, vicent, 'resuelta_ia', ahora - interval '5 days 4 hours', array[
    ['cliente', '0', '¿Puedo cambiar yo los precios de la web?'],
    ['ia', '0.5', 'No hace falta que toques nada: los cambios los hace Daniel. Cuando quieras, dime qué precios cambian y cómo deben quedar, y se lo paso.'],
    ['cliente', '2', 'Vale, te lo paso la semana que viene con la lista nueva.']
  ]);
  perform privado.demo_conversacion(brocha, marcos, 'resuelta_ia', ahora - interval '5 days 1 hour', array[
    ['cliente', '0', 'Mi web no aparece en Google.'],
    ['ia', '0.5', 'Prueba a buscar el nombre exacto de tu negocio entre comillas, por ejemplo «Brocha & Latón». Las webs nuevas pueden tardar unas semanas en aparecer.'],
    ['cliente', '2', 'Ah, así sí sale. Gracias.']
  ]);
  perform privado.demo_conversacion(espiga, lucia, 'resuelta_ia', ahora - interval '4 days 2 hours', array[
    ['cliente', '0', 'La web se ve rara en el móvil, con todo descolocado.'],
    ['ia', '0.5', 'Recarga la página y prueba a girar el móvil. Si sigue habiendo algo descolocado, como textos cortados o botones que no se pueden pulsar, dímelo y se lo paso a Daniel.'],
    ['cliente', '3', 'Al recargar ya se ve bien. Gracias.']
  ]);
  perform privado.demo_conversacion(taller, vicent, 'resuelta_ia', ahora - interval '3 days 6 hours', array[
    ['cliente', '0', 'El botón de WhatsApp de la web no abre nada.'],
    ['ia', '0.5', 'Comprueba que el dispositivo desde el que lo pruebas tiene WhatsApp instalado. Si aun así no abre la conversación, dímelo y se lo paso a Daniel.'],
    ['cliente', '2', 'Era eso, lo estaba probando desde la tablet. Gracias.']
  ]);
  perform privado.demo_conversacion(brocha, marcos, 'resuelta_ia', ahora - interval '2 days 5 hours', array[
    ['cliente', '0', 'La web va muy lenta.'],
    ['ia', '0.5', 'Abre primero otra web conocida para descartar que sea tu conexión. Si las demás van bien y la tuya tarda mucho, dime en qué página y desde cuándo, y se lo paso a Daniel.'],
    ['cliente', '4', 'Era el wifi de la barbería: con datos va bien.']
  ]);
  perform privado.demo_conversacion(taller, vicent, 'resuelta_ia', ahora - interval '1 day 8 hours', array[
    ['cliente', '0', 'No me llegan los correos a info@tallerruedasdelgrao.example.'],
    ['ia', '0.5', 'Revisa la carpeta de spam y que el buzón no esté lleno. Si sigues sin recibir correos, dime desde cuándo y se lo paso a Daniel.'],
    ['cliente', '6', 'El buzón estaba lleno. Ya llegan, gracias.']
  ]);
  perform privado.demo_conversacion(espiga, lucia, 'resuelta_ia', ahora - interval '1 day 1 hour', array[
    ['cliente', '0', '¿Puedo subir yo las fotos nuevas de los pasteles?'],
    ['ia', '0.5', 'No hace falta que toques nada: los cambios los hace Daniel. Cuando las tengas, pídelo aquí indicando qué fotos cambian y en qué página.'],
    ['cliente', '2', 'Perfecto, así lo haré.']
  ]);
  perform privado.demo_conversacion(taller, vicent, 'resuelta_ia', ahora - interval '4 hours', array[
    ['cliente', '0', 'La web no carga.'],
    ['ia', '0.5', 'Ábrela desde otro dispositivo o con los datos del móvil en lugar del wifi. ¿Te carga en algún sitio?'],
    ['cliente', '2', 'Con los datos sí carga, será el wifi del taller. Gracias.']
  ]);

  -- La tarea programada solo tiene que ejecutarse una vez.
  if p_desde_cron then
    perform cron.unschedule(jobid) from cron.job where jobname = 'renovar-demo-martes';
  end if;

  select jsonb_build_object(
    'clientes', (select count(*) from public.clientes),
    'webs', (select count(*) from public.webs),
    'tickets', (select string_agg('#' || numero || ' ' || estado, ', ' order by numero) from public.tickets),
    'resueltas_por_ia', (select count(*) from public.conversaciones where estado = 'resuelta_ia'),
    'escaladas', (select count(*) from public.conversaciones where estado = 'escalada'),
    'sesiones_anonimas', (select count(*) from auth.users where is_anonymous)
  ) into resumen;
  return resumen;
end;
$$;

revoke execute on function privado.demo_conversacion(uuid, uuid, public.estado_conversacion, timestamptz, text[]) from public, anon, authenticated;
revoke execute on function privado.demo_ticket(uuid, uuid, uuid, text, text, public.categoria, public.prioridad, public.estado_ticket, public.origen_ticket, timestamptz, timestamptz, timestamptz, timestamptz) from public, anon, authenticated;
revoke execute on function privado.demo_minutos(timestamptz, numeric) from public, anon, authenticated;
revoke execute on function privado.sembrar_demo(boolean) from public, anon, authenticated;

-- Martes 13 de octubre a las 05:00 UTC (07:00 en Madrid): datos frescos para la demo. Se borra sola.
select cron.schedule('renovar-demo-martes', '0 5 13 10 *', $$select privado.sembrar_demo(true)$$);

-- Test de aislamiento del módulo `identidad` (T3). No deja datos: todo ocurre en un bloque que
-- se deshace al final (raise 'deshacer'). Ejecutar con el MCP de Supabase (execute_sql) o con psql.
--
-- Simula dos sesiones anónimas, A y B (el trigger les crea su cliente y sus webs), y comprueba,
-- actuando como A con el rol `authenticated`, que RLS bloquea los abusos del modelo de amenazas.
-- También comprueba que el rol `anon` (sin sesión) no ve nada.

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

create or replace function pg_temp.prueba_rls_identidad() returns jsonb
language plpgsql as $$
declare
  usuario_a constant uuid := '00000000-0000-4000-8000-00000000000a';
  usuario_b constant uuid := '00000000-0000-4000-8000-00000000000b';
  cliente_b uuid;
  como_a jsonb;
  sin_sesion jsonb;
begin
  begin
    insert into auth.users (id, aud, role, is_anonymous, created_at, updated_at)
    values (usuario_a, 'authenticated', 'authenticated', true, now(), now()),
           (usuario_b, 'authenticated', 'authenticated', true, now(), now());

    select cliente_id into cliente_b from public.perfiles where id = usuario_b;

    -- Actuar como A
    perform set_config('request.jwt.claims', jsonb_build_object('sub', usuario_a, 'role', 'authenticated', 'is_anonymous', true)::text, true);
    execute 'set local role authenticated';

    como_a := jsonb_build_object(
      'clientes_visibles', pg_temp.contar('select 1 from public.clientes'),
      'perfiles_visibles', pg_temp.contar('select 1 from public.perfiles'),
      'webs_visibles', pg_temp.contar('select 1 from public.webs'),
      'webs_de_B_visibles', pg_temp.contar(format('select 1 from public.webs where cliente_id = %L', cliente_b)),
      'es_admin', privado.es_admin(),
      'subirse_a_admin', pg_temp.intentar('update public.perfiles set rol = ''admin'' where id = auth.uid()'),
      'renombrar_su_cliente', pg_temp.intentar('update public.clientes set nombre = ''x'''),
      'crear_web_para_B', pg_temp.intentar(format('insert into public.webs (cliente_id, nombre, dominio) values (%L, ''x'', ''x.example'')', cliente_b)),
      'crear_web_propia', pg_temp.intentar('insert into public.webs (cliente_id, nombre, dominio) values (privado.mi_cliente_id(), ''x'', ''x.example'')'),
      'borrar_clientes', pg_temp.intentar('delete from public.clientes'),
      'crear_cliente', pg_temp.intentar('insert into public.clientes (nombre) values (''x'')'),
      'crear_perfil_para_otro', pg_temp.intentar(format('insert into public.perfiles (id, cliente_id) values (%L, privado.mi_cliente_id())', usuario_b))
    );

    -- Sin sesión
    execute 'reset role';
    perform set_config('request.jwt.claims', '{"role":"anon"}', true);
    execute 'set local role anon';

    sin_sesion := jsonb_build_object(
      'clientes_visibles', pg_temp.contar('select 1 from public.clientes'),
      'perfiles_visibles', pg_temp.contar('select 1 from public.perfiles'),
      'webs_visibles', pg_temp.contar('select 1 from public.webs'),
      'llamar_es_admin', pg_temp.intentar('select privado.es_admin()')
    );

    raise exception 'deshacer' using errcode = 'P0001';
  exception when sqlstate 'P0001' then
    null; -- Se deshace todo lo de arriba (usuarios, clientes, rol); los resultados se conservan.
  end;

  return jsonb_build_object('como_A', como_a, 'sin_sesion', sin_sesion);
end;
$$;

select pg_temp.prueba_rls_identidad() as resultado;

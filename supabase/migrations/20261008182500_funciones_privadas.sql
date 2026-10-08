-- Aviso de seguridad de Supabase (lint 0029): las funciones security definer de public se podían
-- llamar por la API (/rest/v1/rpc/es_admin). No filtraban nada (cada usuario solo pregunta por sí
-- mismo), pero no deben estar expuestas.
-- Se mueven a un esquema que la API no publica. Las políticas y el trigger las referencian por OID,
-- así que siguen funcionando. El rol authenticated necesita USAGE para que las políticas puedan
-- evaluarlas.

create schema if not exists privado;
revoke all on schema privado from public;
grant usage on schema privado to authenticated;

alter function public.es_admin() set schema privado;
alter function public.mi_cliente_id() set schema privado;
alter function public.crear_perfil_al_registrarse() set schema privado;

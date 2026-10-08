-- Módulo `tickets` (docs/SPEC.md): conversaciones con el asistente, incidencias, mensajes y la base
-- de conocimiento (faq).
--
-- Modelo de amenazas (T4):
--   · Un cliente no puede leer ni escribir conversaciones, mensajes ni tickets de otro cliente.
--   · Un cliente no cambia el estado, la prioridad ni la categoría de un ticket (solo el admin).
--   · Un cliente no puede hacerse pasar por la IA ni por el admin: solo escribe mensajes con
--     autor 'cliente' y tickets con origen 'cliente', sin resumen_ia.
--   · La web de un ticket tiene que ser del mismo cliente (clave foránea compuesta).
-- Datos personales: el contenido de los mensajes y la descripción de los tickets pueden traer datos
-- personales que escriba el cliente. Se borran en cascada con su cliente.

create type public.estado_ticket as enum ('abierto', 'en_curso', 'esperando_cliente', 'resuelto', 'cerrado');
create type public.prioridad as enum ('baja', 'media', 'alta', 'urgente');
create type public.categoria as enum (
  'web_caida', 'error_funcional', 'cambio_contenido', 'correo', 'dominio_hosting', 'facturacion', 'otro'
);
create type public.estado_conversacion as enum ('activa', 'resuelta_ia', 'escalada');
create type public.autor as enum ('cliente', 'ia', 'admin');
create type public.origen_ticket as enum ('ia', 'cliente');

create table public.conversaciones (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  perfil_id uuid not null references public.perfiles (id) on delete cascade,
  estado public.estado_conversacion not null default 'activa',
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint conversaciones_id_cliente_unico unique (id, cliente_id)
);
create index conversaciones_cliente_id_idx on public.conversaciones (cliente_id);
create index conversaciones_perfil_id_idx on public.conversaciones (perfil_id);

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  numero bigint generated always as identity unique,
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  web_id uuid,
  conversacion_id uuid,
  titulo text not null check (char_length(titulo) between 3 and 140),
  descripcion text not null check (char_length(descripcion) between 1 and 4000),
  resumen_ia text check (char_length(resumen_ia) <= 2000),
  categoria public.categoria not null default 'otro',
  prioridad public.prioridad not null default 'media',
  estado public.estado_ticket not null default 'abierto',
  origen public.origen_ticket not null,
  primera_respuesta_en timestamptz,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  -- La web y la conversación tienen que ser del mismo cliente que el ticket.
  constraint tickets_web_del_cliente foreign key (web_id, cliente_id) references public.webs (id, cliente_id) on delete set null (web_id),
  constraint tickets_conversacion_del_cliente foreign key (conversacion_id, cliente_id) references public.conversaciones (id, cliente_id) on delete set null (conversacion_id)
);
create index tickets_cliente_id_idx on public.tickets (cliente_id);
create index tickets_bandeja_idx on public.tickets (estado, prioridad, creado_en desc);
create index tickets_web_id_idx on public.tickets (web_id);
create index tickets_conversacion_id_idx on public.tickets (conversacion_id);

create table public.mensajes (
  id uuid primary key default gen_random_uuid(),
  conversacion_id uuid not null references public.conversaciones (id) on delete cascade,
  autor public.autor not null,
  contenido text not null check (char_length(contenido) between 1 and 4000),
  creado_en timestamptz not null default now()
);
create index mensajes_conversacion_idx on public.mensajes (conversacion_id, creado_en);

create table public.faq (
  id uuid primary key default gen_random_uuid(),
  pregunta text not null check (char_length(pregunta) between 3 and 300),
  respuesta text not null check (char_length(respuesta) between 3 and 2000),
  categoria public.categoria not null default 'otro',
  activa boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

-- Mantener actualizado_en
create function privado.tocar_actualizado_en()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

create trigger tickets_actualizado_en before update on public.tickets
  for each row execute function privado.tocar_actualizado_en();
create trigger conversaciones_actualizado_en before update on public.conversaciones
  for each row execute function privado.tocar_actualizado_en();
create trigger faq_actualizado_en before update on public.faq
  for each row execute function privado.tocar_actualizado_en();

-- Propiedad de una conversación (para las políticas de mensajes, sin recursión entre tablas).
create function privado.es_mi_conversacion(conversacion uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.conversaciones c
    where c.id = conversacion and c.cliente_id = privado.mi_cliente_id()
  );
$$;
revoke execute on function privado.es_mi_conversacion(uuid) from public, anon;
grant execute on function privado.es_mi_conversacion(uuid) to authenticated;

-- RLS
alter table public.conversaciones enable row level security;
alter table public.tickets enable row level security;
alter table public.mensajes enable row level security;
alter table public.faq enable row level security;

-- Conversaciones: el cliente ve y abre las suyas. Solo el admin las edita o borra (el estado lo
-- cambia la Edge Function del asistente con privilegios de servidor).
create policy "conversaciones: las propias, o todas si admin" on public.conversaciones
  for select to authenticated
  using (cliente_id = (select privado.mi_cliente_id()) or (select privado.es_admin()));
create policy "conversaciones: el cliente abre las suyas" on public.conversaciones
  for insert to authenticated
  with check (cliente_id = (select privado.mi_cliente_id()) and perfil_id = (select auth.uid()) and estado = 'activa');
create policy "conversaciones: solo admin edita" on public.conversaciones
  for update to authenticated
  using ((select privado.es_admin()))
  with check ((select privado.es_admin()));
create policy "conversaciones: solo admin borra" on public.conversaciones
  for delete to authenticated
  using ((select privado.es_admin()));

-- Tickets: el cliente ve los suyos y puede abrir uno a mano (plan B), sin hacerse pasar por la IA.
-- Solo el admin edita o borra.
create policy "tickets: los propios, o todos si admin" on public.tickets
  for select to authenticated
  using (cliente_id = (select privado.mi_cliente_id()) or (select privado.es_admin()));
create policy "tickets: el cliente abre uno a mano" on public.tickets
  for insert to authenticated
  with check (
    cliente_id = (select privado.mi_cliente_id())
    and origen = 'cliente'
    and estado = 'abierto'
    and resumen_ia is null
    and primera_respuesta_en is null
  );
create policy "tickets: solo admin edita" on public.tickets
  for update to authenticated
  using ((select privado.es_admin()))
  with check ((select privado.es_admin()));
create policy "tickets: solo admin borra" on public.tickets
  for delete to authenticated
  using ((select privado.es_admin()));

-- Mensajes: el cliente lee los de sus conversaciones y solo escribe como 'cliente'. El admin
-- escribe como 'admin'. Los de la IA los escribe la Edge Function con privilegios de servidor.
create policy "mensajes: los de mis conversaciones, o todos si admin" on public.mensajes
  for select to authenticated
  using ((select privado.es_mi_conversacion(conversacion_id)) or (select privado.es_admin()));
create policy "mensajes: el cliente escribe como cliente" on public.mensajes
  for insert to authenticated
  with check (autor = 'cliente' and (select privado.es_mi_conversacion(conversacion_id)));
create policy "mensajes: el admin escribe como admin" on public.mensajes
  for insert to authenticated
  with check (autor = 'admin' and (select privado.es_admin()));

-- FAQ: cualquier usuario con sesión lee las activas; el admin gestiona todas.
create policy "faq: activas para todos, todas para admin" on public.faq
  for select to authenticated
  using (activa or (select privado.es_admin()));
create policy "faq: solo admin crea" on public.faq
  for insert to authenticated
  with check ((select privado.es_admin()));
create policy "faq: solo admin edita" on public.faq
  for update to authenticated
  using ((select privado.es_admin()))
  with check ((select privado.es_admin()));
create policy "faq: solo admin borra" on public.faq
  for delete to authenticated
  using ((select privado.es_admin()));

-- Tiempo real para la bandeja del panel y el chat (Realtime respeta RLS).
alter publication supabase_realtime add table public.tickets, public.mensajes;

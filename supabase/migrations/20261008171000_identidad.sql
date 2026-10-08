-- Módulo `identidad` (docs/SPEC.md): clientes, perfiles (1 a 1 con auth.users) y webs.
--
-- Modelo de amenazas (T3):
--   · Cualquiera puede abrir una sesión anónima (demo pública), así que cada sesión recibe su
--     propio cliente aislado.
--   · Un cliente no puede ver datos de otro, subirse el rol a admin, ni crear o editar clientes
--     y webs.
--   · Sin sesión (rol anon) no se ve nada: todas las políticas son "to authenticated".
-- Datos personales: perfiles.nombre y clientes.nombre (en las sesiones anónimas no hay datos
-- personales). Se borran en cascada al borrar el usuario o el cliente.

create type public.rol as enum ('cliente', 'admin');

create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(nombre) between 1 and 120),
  es_demo boolean not null default false,
  creado_en timestamptz not null default now()
);
comment on table public.clientes is 'Negocios con web mantenida por Daniel. es_demo = creado por una sesión anónima de la demo pública.';

create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  cliente_id uuid references public.clientes (id) on delete cascade,
  rol public.rol not null default 'cliente',
  nombre text not null default '' check (char_length(nombre) <= 120),
  creado_en timestamptz not null default now(),
  constraint perfiles_cliente_obligatorio check (rol = 'admin' or cliente_id is not null)
);
create index perfiles_cliente_id_idx on public.perfiles (cliente_id);

create table public.webs (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  nombre text not null check (char_length(nombre) between 1 and 120),
  dominio text not null check (char_length(dominio) between 3 and 253),
  creado_en timestamptz not null default now(),
  -- Permite la clave foránea compuesta (web_id, cliente_id) de los tickets: la web de un ticket
  -- tiene que ser del mismo cliente.
  constraint webs_id_cliente_unico unique (id, cliente_id)
);
create index webs_cliente_id_idx on public.webs (cliente_id);

-- Funciones de ayuda para RLS. Son security definer para leer perfiles sin pasar por su propia
-- RLS (así no hay recursión entre políticas), con search_path vacío y esquemas explícitos.
create function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfiles
    where id = (select auth.uid()) and rol = 'admin'
  );
$$;

create function public.mi_cliente_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select cliente_id from public.perfiles where id = (select auth.uid());
$$;

revoke execute on function public.es_admin() from public, anon;
revoke execute on function public.mi_cliente_id() from public, anon;
grant execute on function public.es_admin() to authenticated;
grant execute on function public.mi_cliente_id() to authenticated;

-- RLS
alter table public.clientes enable row level security;
alter table public.perfiles enable row level security;
alter table public.webs enable row level security;

create policy "clientes: el propio, o todos si admin" on public.clientes
  for select to authenticated
  using (id = (select public.mi_cliente_id()) or (select public.es_admin()));
create policy "clientes: solo admin crea" on public.clientes
  for insert to authenticated
  with check ((select public.es_admin()));
create policy "clientes: solo admin edita" on public.clientes
  for update to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));
create policy "clientes: solo admin borra" on public.clientes
  for delete to authenticated
  using ((select public.es_admin()));

-- Perfiles: sin políticas de insert ni delete. Los crea el trigger y se borran en cascada con el
-- usuario. Solo el admin edita, así que un cliente no puede cambiarse el rol.
create policy "perfiles: el propio, o todos si admin" on public.perfiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.es_admin()));
create policy "perfiles: solo admin edita" on public.perfiles
  for update to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));

create policy "webs: las propias, o todas si admin" on public.webs
  for select to authenticated
  using (cliente_id = (select public.mi_cliente_id()) or (select public.es_admin()));
create policy "webs: solo admin crea" on public.webs
  for insert to authenticated
  with check ((select public.es_admin()));
create policy "webs: solo admin edita" on public.webs
  for update to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));
create policy "webs: solo admin borra" on public.webs
  for delete to authenticated
  using ((select public.es_admin()));

-- Alta de usuarios: cada usuario nuevo recibe su cliente y su perfil. Las sesiones anónimas
-- (demo pública) reciben además dos webs de ejemplo ficticias.
create function public.crear_perfil_al_registrarse()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  nuevo_cliente uuid;
  anonimo boolean := coalesce(new.is_anonymous, false);
  alias text := coalesce(nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'Cliente');
begin
  insert into public.clientes (nombre, es_demo)
  values (case when anonimo then 'Negocio de demostración' else alias end, anonimo)
  returning id into nuevo_cliente;

  insert into public.perfiles (id, cliente_id, nombre)
  values (new.id, nuevo_cliente, case when anonimo then 'Cliente demo' else alias end);

  if anonimo then
    insert into public.webs (cliente_id, nombre, dominio) values
      (nuevo_cliente, 'Brocha & Latón', 'daniel-escal.github.io/landing-negocio-local'),
      (nuevo_cliente, 'Taller Ruedas del Grao', 'taller-ruedas.example');
  end if;

  return new;
end;
$$;

revoke execute on function public.crear_perfil_al_registrarse() from public, anon, authenticated;

create trigger al_registrarse_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil_al_registrarse();

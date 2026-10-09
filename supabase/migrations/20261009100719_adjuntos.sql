-- Mejora (2026-10-09): fotos y capturas en incidencias y peticiones.
--   · Bucket privado "adjuntos": solo JPEG, PNG o WebP de hasta 5 MB (lo comprueba Storage al subir).
--     Sin SVG: podría llevar scripts.
--   · Ruta: {cliente_id}/{ticket_id}/{archivo}. El cliente solo sube a sus tickets no cerrados (máx. 10
--     por ticket) y solo ve los suyos; el admin ve y sube en todos. Sin políticas de update ni delete:
--     nadie modifica ni borra adjuntos desde la API.
-- Test: supabase/tests/rls_adjuntos.sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('adjuntos', 'adjuntos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']);

-- SECURITY DEFINER para poder contar los adjuntos del ticket sin depender de RLS. Está en el esquema
-- privado: la API no la expone; solo la usa la política de insert.
create function privado.puede_adjuntar(p_nombre text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
      select 1
        from public.tickets t
       where t.id::text = (storage.foldername(p_nombre))[2]
         and t.cliente_id::text = (storage.foldername(p_nombre))[1]
         and t.estado <> 'cerrado'
         and (t.cliente_id = privado.mi_cliente_id() or privado.es_admin())
    )
    and (
      select count(*)
        from storage.objects o
       where o.bucket_id = 'adjuntos'
         and (storage.foldername(o.name))[2] = (storage.foldername(p_nombre))[2]
    ) < 10;
$$;

revoke execute on function privado.puede_adjuntar(text) from public, anon;
grant execute on function privado.puede_adjuntar(text) to authenticated;

create policy "adjuntos: subir a un ticket propio y abierto" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'adjuntos' and privado.puede_adjuntar(name));

create policy "adjuntos: cada cliente ve los suyos y el admin todos" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'adjuntos'
    and ((storage.foldername(name))[1] = (select privado.mi_cliente_id())::text or (select privado.es_admin()))
  );

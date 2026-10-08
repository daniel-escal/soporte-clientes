-- Peticiones (2026-10-09): categoría para "añadir algo nuevo" a la web. Va en su propia migración
-- porque Postgres no deja usar un valor de enum nuevo en la misma transacción que lo crea.
alter type public.categoria add value if not exists 'nuevo_componente' after 'cambio_contenido';

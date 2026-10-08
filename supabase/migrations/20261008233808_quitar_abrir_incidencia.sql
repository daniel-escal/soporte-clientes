-- Fin del cambio en dos fases de la migración peticiones_y_prioridad: el frontend publicado ya usa
-- abrir_solicitud, así que el envoltorio de compatibilidad (que ignoraba la prioridad) sobra.
drop function public.abrir_incidencia(text, text, public.prioridad, uuid);

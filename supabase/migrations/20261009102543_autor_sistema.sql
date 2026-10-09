-- M2 (seguimiento automático): los avisos automáticos de una conversación los firma el "sistema",
-- no Daniel ni la IA. Va en su propia migración: un valor nuevo de un enum no se puede usar en la
-- misma transacción que lo añade. Nadie puede escribir como 'sistema' desde la API: la política de
-- insert de mensajes solo deja 'cliente' (al cliente) y 'admin' (al admin).
alter type public.autor add value if not exists 'sistema';

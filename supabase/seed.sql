-- Datos de demostración (T12). La lógica está en privado.sembrar_demo()
-- (supabase/migrations/20261009173252_sembrar_demo.sql). Se puede ejecutar cuantas veces haga falta:
--   · borra las sesiones anónimas y los clientes de demostración que dejan las pruebas y las visitas;
--   · si ya no queda ningún ticket, la numeración vuelve a empezar en el 101;
--   · crea 3 negocios ficticios con 2 webs cada uno, 10 tickets en todos los estados (uno reabierto,
--     uno con recordatorio y uno cerrado solo) y 9 conversaciones resueltas por el asistente.
-- Las fechas son relativas al momento de ejecutarla. La tarea de pg_cron "renovar-demo-martes" la
-- lanza sola el martes 13 a las 7:00 (hora de Madrid) y después se borra.
-- No toca la FAQ, el usuario de Daniel ni las fotos de Storage.

select privado.sembrar_demo() as resultado;

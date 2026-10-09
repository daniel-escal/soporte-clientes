# Plan de implementación: plataforma de soporte con IA

> Basado en [`docs/SPEC.md`](../docs/SPEC.md) (aprobada el 2026-10-08) y [`docs/ESTETICA.md`](../docs/ESTETICA.md).
> Lista de tareas: [`tasks/todo.md`](todo.md). Demo: **martes 13 de octubre**.

## Resumen

13 tareas en 4 fases, construidas en **rebanadas verticales**: cada tarea deja algo funcionando de punta a punta (base de datos, seguridad, interfaz y tests), verificado en el navegador y con su commit.

El orden va **por riesgo**:
- primero la base visual y el despliegue, para que la URL exista desde el primer día;
- luego la seguridad de los datos (RLS);
- después la IA, que es la pieza más incierta;
- y al final el panel, que es lo más conocido.

El lunes queda libre para verificar, cargar los datos de demostración y ensayar.

## Decisiones de arquitectura

- **SPA en GitHub Pages** con `base` `/soporte-clientes/` y `404.html` como copia de `index.html`, para que funcionen los enlaces profundos. Se despliega con GitHub Actions, que ejecuta los tests antes de publicar.
- **Configuración pública por variables de entorno de Vite:**
  - la URL de Supabase y la clave publicable van en `.env.local` en local y como variables del repositorio en Actions;
  - la clave publicable es pública por diseño: la seguridad la da RLS.
- **Migraciones SQL versionadas por módulo** (`identidad`, `tickets`…), aplicadas con el MCP de Supabase y revisadas con sus avisos de seguridad (`get_advisors`) después de cada una.
- **RLS con funciones de ayuda** `es_admin()` y `mi_cliente_id()` (`security definer`, `search_path` vacío) para no tener recursión entre políticas.
- **Usuarios nuevos:** un trigger en `auth.users` crea cliente y perfil. Si la sesión es anónima, crea además un cliente de demostración con dos webs. Así cada visitante de la demo está aislado.
- **Pruebas de RLS en dos niveles:**
  1. SQL con usuarios simulados dentro de una transacción que se deshace al acabar (no deja datos);
  2. Vitest con sesiones anónimas reales, en cuanto Daniel active ese inicio de sesión.
- **La IA en una Edge Function**, con el prompt y el esquema de respuesta en `_shared/` como TypeScript puro, testeable con Vitest.
  - La identidad del cliente, su `cliente_id` y sus webs salen **siempre de la sesión verificada, nunca de lo que diga el modelo**.
  - La forma exacta de escribir los mensajes y tickets de la IA se cierra en la T6 con la skill de seguridad, y se documenta en la spec.
- **El panel se carga aparte** (`React.lazy`) para que no pese en el portal del cliente.

## Grafo de dependencias

```
T1 Esqueleto + tema
 ├── T2 Publicación continua (GitHub Pages)
 └── T3 Identidad y webs (Supabase + "Probar como cliente")
       └── T4 Incidencias: esquema y RLS
             └── T5 Incidencias del cliente (plan B manual)
                   └── T6 Asistente: prueba de riesgo con Gemini
                         └── T7 Asistente: escalar a ticket + FAQ + límites
                               └── T8 Evaluación de la IA (10 casos + 3 ataques)
             └── T9 Panel: acceso admin + bandeja en tiempo real   (necesita T4; mejor tras T7)
                   └── T10 Panel: detalle, estados y respuesta
                         └── T11 Panel: KPI y editor de FAQ
T12 Datos de demostración + verificación completa  ← todo
T13 Guion y ensayo de la demo                       ← T12
```

## Lista de tareas (detalle en `todo.md`)

### Fase 1: Base (jueves 8 noche – viernes 9)
- [x] T1: Esqueleto Vite + React + Tailwind + shadcn con el tema de ESTETICA y la pantalla de entrada
- [x] T2: Publicación continua en GitHub Pages
- [x] T3: Identidad y webs: proyecto Supabase, RLS y "Probar como cliente"
- [x] T4: Incidencias: esquema, RLS y tests de aislamiento
- [x] T5: Incidencias del cliente: abrir a mano (plan B), lista y detalle

### Checkpoint 1: base segura y visible
- [ ] Tests, typecheck, lint y build en verde; publicado en Pages
- [ ] RLS probada (SQL y sesiones reales); avisos de seguridad de Supabase sin errores
- [ ] **Estética aprobada por Daniel** (criterio de éxito 8)

### Fase 2: Asistente (viernes 9 – sábado 10)
- [x] T6: Asistente: Edge Function con Gemini, chat con el orbe (responder y pedir dato)
- [x] T7: Asistente: escalar a ticket, FAQ inicial, límites de uso y plan B
- [x] T7b: Peticiones de cambio y prioridad decidida por la IA (añadida el 09/10 a petición de Daniel)
- [x] T8: Evaluación de la IA: 10 conversaciones + 3 ataques (ampliada a 27 ataques)

### Checkpoint 2: la IA funciona
- [ ] ≥ 9/10 casos y 3/3 ataques bloqueados; mediana ≤ 6 s
- [ ] Revisión con Daniel y push

### Fase 3: Panel (domingo 11)
- [x] T9: Panel: acceso de administrador y bandeja en tiempo real
- [x] T10: Panel: detalle del ticket, estados, prioridad y respuesta
- [x] T11: Panel: KPI y editor de la FAQ

### Checkpoint 3: el flujo completo
- [ ] Cliente → IA → ticket → panel → respuesta → cliente, en dos pantallas y sin recargar
- [ ] Revisión con Daniel y push

### Mejoras propuestas (viernes 9; se revierten si Daniel no las quiere)
- [x] M1 (importante): fotos y capturas en incidencias y peticiones (Supabase Storage privado, en directo)
- [x] M2 (media): seguimiento y cierre automáticos (aviso al resolver, reapertura si el cliente contesta, recordatorio y cierre por tiempo con pg_cron, sin IA)

### Fase 4: Demo (lunes 12)
- [x] T12: Datos de demostración y verificación completa de los 12 criterios (10/12; faltan la aprobación de la estética y el ensayo, ver `docs/VERIFICACION.md`)
- [ ] T13: Guion de 5 minutos, ensayo y plan B sin conexión

### Checkpoint final
- [ ] Los 12 criterios de éxito con evidencia en `docs/VERIFICACION.md`
- [ ] Supabase activo el martes por la mañana

## Lo que necesita Daniel (y cuándo)

| Paso | Necesario para | Cuándo |
| --- | --- | --- |
| Activar el inicio de sesión anónimo en Supabase | Verificar la T3 en el navegador y los tests de la T4 | En cuanto exista el proyecto (lo aviso) |
| Crear la clave de Gemini en AI Studio y guardarla como secreto `GEMINI_API_KEY` | T6 | Antes del viernes por la tarde |
| Crear su usuario administrador (email y contraseña) | T9 | Hecho el viernes 9 (rol asignado con SQL) |

## Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
| --- | --- | --- |
| Versiones muy recientes (Vite 8, TypeScript 7, React Router 8, shadcn 4) con incompatibilidades en plantillas o CLI | Medio | Detectarlo en la T1; si el CLI de shadcn falla, copiar los componentes a mano |
| Gemini: cuota, latencia o salida que no cumple el esquema | Alto | Prueba de riesgo en la T6 (lo antes posible), modelo configurable, validación con zod y plan B manual (T5) |
| Errores en RLS: fuga entre clientes o recursión | Alto | Funciones de ayuda, tests de aislamiento en la T4 antes de construir encima y `get_advisors` tras cada migración |
| Inicio de sesión anónimo desactivado por defecto | Medio | Lo activa Daniel; mientras tanto, RLS se prueba con SQL simulado |
| Enlaces profundos de la SPA en GitHub Pages | Medio | Resuelto en la T2 con `404.html` y `basename` |
| Tiempo real con RLS | Medio | Probado en la T9; plan B: refresco cada 10 s |
| Tiempo: 5 días | Alto | Alcance cerrado (fuera de alcance en la spec), puntos de revisión y el lunes como colchón |
| Abuso de la demo pública | Bajo | Límites por usuario y globales; se puede desactivar el acceso anónimo tras el martes |
| Proyecto Supabase en pausa el martes | Bajo | Uso diario y comprobación el martes por la mañana |

## Preguntas abiertas

Ninguna bloqueante. Los pasos de Daniel están en la tabla de arriba.

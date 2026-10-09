# Tareas: plataforma de soporte con IA

Plan: [`plan.md`](plan.md) · Spec: [`../docs/SPEC.md`](../docs/SPEC.md) · Estética: [`../docs/ESTETICA.md`](../docs/ESTETICA.md)

**Definition of Done de cada tarea:**
- se cumplen sus criterios de aceptación;
- `npm test`, `npm run typecheck`, `npm run lint` y `npm run build` sin errores;
- verificada en el navegador (MCP de Chrome DevTools) con la consola limpia;
- un commit atómico.

---

## Fase 1: Base

### Task 1: Esqueleto Vite + React + Tailwind + shadcn con el tema y la pantalla de entrada

**Description:**
- Crear el proyecto (Vite 8, React 19, TypeScript, React Router con `basename`, Tailwind 4, shadcn/ui, Inter alojada en el proyecto, Vitest y ESLint).
- Pasar los tokens de `ESTETICA.md` a `src/estilos/tema.css` y crear el componente `OrbeAsistente`.
- Construir la pantalla de entrada: marca, propuesta, "Probar como cliente", acceso de Daniel y "Cómo funciona".
- Añadir `CLAUDE.md` y `AGENTS.md` con las reglas del proyecto, para Claude Code y Cursor.

**Acceptance criteria:**
- [x] Un test lee `tema.css` y comprueba los contrastes mínimos de `ESTETICA.md` (texto ≥ 4,5; foco y borde de control ≥ 3; blanco sobre el botón ≥ 4,5)
- [x] La pantalla de entrada se ve bien a 375 y 1280 px, sin scroll horizontal y con la consola limpia
- [x] Con `prefers-reduced-motion` el orbe no se anima

**Verification:** `npm test` · `npm run typecheck` · `npm run lint` · `npm run build` · MCP: capturas a 375 y 1280 px y emulación de movimiento reducido
**Dependencies:** Ninguna
**Files:** andamiaje de Vite (configuración), `src/estilos/tema.css`, `src/App.tsx`, `src/paginas/Entrada.tsx`, `src/componentes/OrbeAsistente.tsx`, `tests/tema.test.ts`, `CLAUDE.md`, `AGENTS.md`
**Scope:** M (el andamiaje no cuenta para el límite de archivos)

### Task 2: Publicación continua en GitHub Pages

**Description:** repositorio público `soporte-clientes` y un workflow de GitHub Actions que instala, ejecuta los tests y el build, copia `index.html` a `404.html` y publica en Pages.

**Acceptance criteria:**
- [x] Al hacer push a `main` se publica en `https://daniel-escal.github.io/soporte-clientes/`
- [x] Un enlace profundo (`/soporte-clientes/portal`) abre la aplicación, no un 404 de GitHub
- [x] Si un test falla, no se publica

**Verification:** ejecución del workflow en verde y comprobación de la URL y de un enlace profundo con el MCP
**Dependencies:** T1
**Files:** `.github/workflows/publicar.yml`, `vite.config.ts`, `package.json`
**Scope:** S

### Task 3: Identidad y webs: proyecto Supabase, RLS y "Probar como cliente"

**Description:**
- Crear el proyecto `soporte-clientes` en Frankfurt.
- Migración `identidad`:
  - tablas `clientes`, `perfiles` y `webs`, con RLS;
  - funciones de ayuda `es_admin()` y `mi_cliente_id()`;
  - trigger que crea cliente y perfil al registrarse un usuario, y un cliente de demostración con 2 webs si la sesión es anónima.
- Generar los tipos TypeScript.
- En la aplicación: cliente de Supabase, "Probar como cliente" (inicio de sesión anónimo), ruta protegida `/portal` y lista "Mis webs".

**Acceptance criteria:**
- [x] SQL simulado: dos usuarios anónimos solo ven su cliente, su perfil y sus webs; sin sesión no se ve nada
- [x] Un cliente no puede cambiarse el rol a `admin` ni editar clientes o webs
- [x] `get_advisors` (seguridad) sin errores
- [x] (Cuando Daniel active el acceso anónimo) "Probar como cliente" entra en menos de 3 s y muestra las 2 webs de ejemplo

**Verification:** consultas SQL de RLS (en transacción que se deshace) · `get_advisors` · MCP: flujo en el navegador
**Dependencies:** T1
**Files:** `supabase/migrations/…_identidad.sql`, `src/lib/supabase.ts`, `src/lib/tipos-bd.ts`, `src/paginas/cliente/Portal.tsx`, `src/componentes/RutaProtegida.tsx`
**Scope:** M

### Task 4: Incidencias: esquema, RLS y tests de aislamiento

**Description:**
- Migración `tickets`:
  - enums;
  - `conversaciones`, `tickets`, `mensajes` y `faq`;
  - clave foránea compuesta para que la web de un ticket sea del mismo cliente;
  - políticas RLS y publicación de Realtime para `tickets` y `mensajes`.
- `src/dominio/tickets.ts` con las transiciones de estado y sus tests.
- Suite `tests/rls/` con sesiones anónimas reales.

**Acceptance criteria:**
- [x] El cliente A no lee ni escribe tickets, conversaciones ni mensajes del cliente B
- [x] El cliente no puede cambiar el estado o la prioridad de un ticket, ni crearlo con `origen = 'ia'`
- [x] Las transiciones de estado inválidas se rechazan (tests unitarios)
- [x] `get_advisors` sin errores

**Verification:** `npm test` · `npm run test:rls` (cuando esté activo el acceso anónimo) · SQL simulado · `get_advisors`
**Dependencies:** T3
**Files:** `supabase/migrations/…_tickets.sql`, `src/dominio/tickets.ts`, `tests/dominio/tickets.test.ts`, `tests/rls/aislamiento.test.ts`, `src/lib/tipos-bd.ts`
**Scope:** M

### Task 5: Incidencias del cliente: abrir a mano (plan B), lista y detalle

**Description:** en el portal, el cliente:
- abre una incidencia a mano (título, web, descripción y urgencia);
- consulta "Mis incidencias" con su estado (insignias de `ESTETICA.md`);
- ve el detalle con los mensajes.

**Acceptance criteria:**
- [x] El cliente crea una incidencia y aparece en su lista sin recargar
- [x] El formulario valida con zod y muestra los errores junto a cada campo
- [x] Insignias de estado con texto e icono, no solo color

**Verification:** MCP: flujo completo a 375 y 1280 px, teclado y consola · `npm test`
**Dependencies:** T4
**Files:** `src/paginas/cliente/MisIncidencias.tsx`, `src/paginas/cliente/DetalleIncidencia.tsx`, `src/componentes/FormularioIncidencia.tsx`, `src/componentes/InsigniaEstado.tsx`
**Scope:** M

### Checkpoint 1: base segura y visible
- [ ] Todo en verde y publicado
- [ ] RLS probada con SQL y con sesiones reales
- [ ] Estética aprobada por Daniel
- [ ] Push

---

## Fase 2: Asistente

### Task 6: Asistente: Edge Function con Gemini y chat con el orbe

**Description:**
- Edge Function `asistente`:
  - verifica el JWT y valida el cuerpo con zod;
  - carga el contexto del cliente;
  - llama a Gemini con salida estructurada y valida la respuesta;
  - guarda los mensajes.
- Acciones: `responder` y `pedir_dato`.
- `_shared/prompt.ts` y `_shared/esquema.ts` con sus tests.
- Chat del cliente con el orbe (en reposo y pensando).
- Cerrar con la skill de seguridad cómo se escriben los mensajes de la IA, y documentarlo en la spec.

**Acceptance criteria:**
- [x] Una pregunta que está en la FAQ recibe respuesta en ≤ 6 s (2,5 s medidos el 09/10)
- [x] El prompt solo contiene datos del cliente que pregunta (test)
- [x] Una salida inválida del modelo no rompe nada: hay mensaje claro y enlace al plan B (verificado sin conexión en el navegador)

**Verification:** `npm test` · invocación real de la función · MCP: chat en el navegador
**Dependencies:** T5 · **Daniel:** `GEMINI_API_KEY`
**Files:** `supabase/functions/asistente/index.ts`, `supabase/functions/_shared/{prompt,esquema,ia}.ts`, `src/paginas/cliente/Chat.tsx`, `tests/asistente/*.test.ts`
**Scope:** M

### Task 7: Asistente: escalar a ticket, FAQ inicial, límites de uso y plan B

**Description:**
- Acción `abrir_ticket`: el ticket se crea con `cliente_id` y webs verificados, y en el chat aparece la tarjeta "Incidencia creada" con enlace al detalle.
- FAQ inicial de 15–25 entradas.
- Límites: 30 mensajes por usuario y hora, más un tope global.
- Si la IA falla, el chat ofrece el formulario de la T5.

**Acceptance criteria:**
- [x] Un problema que no está en la FAQ abre un ticket con título, resumen, categoría, prioridad y web (adelantado en la T6)
- [x] Al superar el límite, el cliente recibe un mensaje claro y no se llama a Gemini (`scripts/probar-limite.mjs`)
- [x] La conversación queda marcada como `resuelta_ia` (botón "¿Te ha servido?", `supabase/tests/rls_resuelta_ia.sql`) o `escalada`

**Verification:** `npm test` · flujo real en el MCP · consulta SQL de los datos creados
**Dependencies:** T6
**Files:** `supabase/functions/asistente/index.ts`, `supabase/migrations/…_faq_inicial.sql`, `src/paginas/cliente/Chat.tsx`, `src/componentes/TarjetaTicketCreado.tsx`
**Scope:** M

### Task 7b: Peticiones de cambio y prioridad decidida por la IA (añadida el 2026-10-09)

**Description:** Daniel pidió que los clientes puedan pedir cambios (actualizar contenido o añadir componentes), porque no modifican sus webs, y que la urgencia la decida la IA y no el cliente: "para los clientes cualquier mínima cosa de su web es una urgencia".

**Acceptance criteria:**
- [x] `tipo` (incidencia o petición) generado a partir de la categoría, con la nueva categoría `nuevo_componente`
- [x] El formulario no pide la urgencia (incidencia → media, petición → baja) y RLS rechaza otra prioridad contra la API (`supabase/tests/rls_abrir_solicitud.sql`, 12 casos tras quitar el de compatibilidad)
- [x] La IA clasifica las peticiones y decide la prioridad aunque el cliente diga que es urgente, sin comunicársela
- [x] El cliente ve el tipo y el estado, no la prioridad
- [x] Borrar el envoltorio temporal `abrir_incidencia` cuando el frontend nuevo esté publicado

**Verification:** tests · SQL de RLS · flujo real en el navegador (petición por chat y por formulario)

### Task 8: Evaluación de la IA

**Description:** `docs/EVALUACION-IA.md` con 10 conversaciones (entrada, resultado esperado y resultado real) y 3 ataques. Ajustar el prompt hasta cumplir.

**Acceptance criteria:**
- [x] ≥ 9/10 casos correctos (10/10 tras ajustar el prompt; ver docs/EVALUACION-IA.md)
- [x] 3/3 ataques sin fuga ni ejecución (7/7 de prompt + 20/20 a la API y RLS)
- [x] Mediana de respuesta ≤ 6 s (medida: 2,2 s)

**Verification:** ejecución documentada · MCP
**Dependencies:** T7
**Files:** `docs/EVALUACION-IA.md`, `supabase/functions/_shared/prompt.ts`
**Scope:** S

### Checkpoint 2: la IA funciona
- [ ] Criterios de la T8 cumplidos · revisión con Daniel · push

---

## Fase 3: Panel

### Task 9: Panel: acceso de administrador y bandeja en tiempo real

**Description:**
- Rol `admin` para el usuario de Daniel.
- Inicio de sesión con email y contraseña, y guardia de ruta para `/admin`.
- Panel cargado aparte.
- Bandeja con filtros (estado, prioridad y cliente) y Realtime: el ticket nuevo entra destacado.

**Acceptance criteria:**
- [x] Un cliente no puede entrar en `/admin` (ni por la ruta ni por los datos)
- [x] Un ticket nuevo aparece en la bandeja en ≤ 3 s sin recargar (entra destacado)
- [x] El panel no se descarga en el portal del cliente (comprobado en la red y en los trozos del build)

**Verification:** MCP con dos pestañas (cliente y admin) y la pestaña de red
**Dependencies:** T7 · **Daniel:** su usuario administrador
**Files:** `src/paginas/Acceso.tsx`, `src/paginas/admin/Panel.tsx`, `src/paginas/admin/Bandeja.tsx`, `src/componentes/FiltrosBandeja.tsx`
**Scope:** M

### Task 10: Panel: detalle del ticket, estados, prioridad y respuesta

**Description:** detalle con el resumen de la IA y la conversación, cambio de estado (solo transiciones válidas) y de prioridad, y respuesta del administrador. El cliente la recibe en tiempo real y se registra la fecha de la primera respuesta.

**Acceptance criteria:**
- [x] Solo se ofrecen las transiciones válidas
- [x] La respuesta llega al cliente sin recargar (y el cliente puede contestar; el estado se ajusta solo)
- [x] `primera_respuesta_en` se guarda una sola vez (`supabase/tests/respuestas.sql`)

**Verification:** MCP con dos pestañas · SQL
**Dependencies:** T9
**Files:** `src/paginas/admin/DetalleTicket.tsx`, `src/componentes/CuadroRespuesta.tsx`, `supabase/migrations/…_primera_respuesta.sql`
**Scope:** M

### Task 11: Panel: KPI y editor de la FAQ

**Description:**
- KPI en tarjetas: abiertos, urgentes, % resuelto por la IA, tiempo medio hasta la primera respuesta y tickets por categoría (en barras).
- Lógica en `src/dominio/kpi.ts` con tests.
- Editor de la FAQ: crear, editar y activar o desactivar.

**Acceptance criteria:**
- [x] Los KPI coinciden con una consulta SQL de control
- [x] Una entrada de la FAQ desactivada deja de usarse en el prompt (la función solo pide las activas y RLS solo deja leer esas al cliente)

**Verification:** `npm test` · SQL · MCP
**Dependencies:** T10
**Files:** `src/dominio/kpi.ts`, `tests/dominio/kpi.test.ts`, `src/paginas/admin/Resumen.tsx`, `src/paginas/admin/Faq.tsx`
**Scope:** M

### Checkpoint 3: el flujo completo
- [ ] Flujo de punta a punta en dos pantallas · revisión con Daniel · push

---

## Fase 4: Demo

### Task 12: Datos de demostración y verificación completa

**Description:**
- Datos ficticios para que el panel tenga vida: 3 negocios, 6 webs y unos 10 tickets en distintos estados.
- Verificación de los 12 criterios en `docs/VERIFICACION.md`: Lighthouse, responsive, teclado, consola, búsqueda de claves en `dist/` y RLS.

**Acceptance criteria:**
- [x] Los 12 criterios de éxito, con evidencia (`docs/VERIFICACION.md`: 10 cumplidos; la aprobación de la estética y el ensayo dependen de Daniel y del lunes)

**Dependencies:** T11
**Files:** `supabase/seed.sql`, `docs/VERIFICACION.md` (+ arreglos)
**Scope:** M

### Task 13: Guion de la demo, ensayo y plan B

**Description:**
- `docs/GUION-DEMO.md` con los 5 minutos: qué se enseña, en qué orden y qué se dice.
- Plan B sin conexión: capturas o un vídeo corto.
- Ensayo de principio a fin.
- Comprobar que Supabase sigue activo.

**Acceptance criteria:**
- [x] Guion escrito: presentación de 5 minutos dentro del plan de proyecto en PDF (fuera del repo)
- [ ] Guion ensayado de principio a fin con la URL pública (lunes 12)
- [x] Plan B preparado: formulario si la IA falla y capturas en el PDF por si no hay conexión
- [x] Datos de demostración renovados solos el martes a las 7:00 (`privado.sembrar_demo()` con pg_cron)

**Dependencies:** T12
**Files:** `docs/GUION-DEMO.md`
**Scope:** S

### Checkpoint final
- [ ] Criterios de éxito con evidencia
- [ ] Supabase activo el martes por la mañana

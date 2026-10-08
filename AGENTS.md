# Reglas del proyecto: soporte-clientes

Plataforma de soporte con IA para los clientes de las webs de Daniel Escalante. Lee antes de cada tarea:

- `docs/SPEC.md`: qué se construye, los límites y los criterios de éxito.
- `docs/ESTETICA.md`: tokens y reglas visuales.
- `tasks/todo.md`: la tarea en curso.

## Stack

Vite 8 · React 19 · TypeScript 6 · React Router 8 · Tailwind CSS 4 · shadcn/ui (Radix) · Supabase (Postgres con RLS, Auth, Realtime, Edge Functions) · Gemini API · zod · Vitest · oxlint

## Comandos

- `npm run dev`: servidor local, en `http://localhost:5173/soporte-clientes/`
- `npm test`: tests unitarios
- `npm run typecheck`: comprobación de tipos
- `npm run lint`: lint
- `npm run build`: build de producción

## Estructura

- `src/dominio/`: lógica pura y testeable (estados, transiciones, KPI). Los componentes no llevan lógica de negocio.
- `src/componentes/ui/`: componentes de shadcn. Se añaden con `npx shadcn@latest add <nombre>`.
- `src/componentes/`: componentes propios.
- `src/paginas/`: pantallas.
- `src/estilos/tema.css`: tokens. `tests/tema.test.ts` comprueba sus contrastes.
- `supabase/migrations/`: SQL versionado (esquema, RLS, funciones).
- `supabase/functions/`: Edge Functions. `_shared/` contiene TypeScript puro, testeable con Vitest.

## Convenciones

- Nombres de dominio en español (`estado`, `prioridad`, `puedeCambiar`) y los del framework en inglés.
- Colores, radios y sombras salen de los tokens. Nada de hexadecimales sueltos en los componentes.
- El degradado y el brillo solo se usan donde dice `ESTETICA.md`: botón principal, barras de datos, franja activa y orbe.
- Estados y prioridades siempre con texto e icono.
- Los mensajes de clientes y de la IA se pintan como texto: nunca `dangerouslySetInnerHTML`.
- Toda entrada externa (respuesta de la IA, cuerpo de una petición) se valida con zod.

## Límites

- **Siempre:** RLS en cada tabla, con tests de aislamiento; tests, typecheck y lint antes de cada commit; un commit por tarea.
- **Preguntar antes:** servicios de pago, dependencias nuevas fuera del stack y acciones fuera del plan con efecto externo.
- **Nunca:**
  - la clave secreta de Supabase o la de Gemini en el frontend o en el repositorio;
  - desactivar RLS;
  - que la IA cambie estados o responda en nombre de Daniel;
  - usar datos reales de clientes en la demo.

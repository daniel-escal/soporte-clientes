# Verificación de los criterios de éxito (T12)

Fecha: 2026-10-09 · Commit `bc080f1` · Web pública: https://daniel-escal.github.io/soporte-clientes/

**Resultado: 10 de 12 criterios cumplidos con evidencia.** Faltan dos cosas que no dependen del código: que Daniel apruebe la estética (criterio 8) y el ensayo de la demo el lunes con Supabase activo el martes (criterio 12).

| # | Criterio | Estado | Evidencia |
| --- | --- | --- | --- |
| 1 | Demo pública | ✅ | La URL responde 200. De pulsar "Probar como cliente" a estar dentro con las webs: **0,29 s** (límite 3 s) |
| 2 | Asistente | ✅ | **10/10** conversaciones y mediana de **2,2 s** (`docs/EVALUACION-IA.md`). Plan B: formulario manual |
| 3 | Aislamiento | ✅ | `npm run test:rls` 7/7 con dos sesiones anónimas reales, más 7 tests SQL de RLS y triggers (abajo) |
| 4 | Ataques | ✅ | **28/28** a la API, RLS y Storage, y **7/7** de inyección de prompt, incluidos los 3 documentados |
| 5 | Claves | ✅ | `dist/` sin claves secretas de Supabase (`sb_secret_…`) ni de Google (`AIza…`). La de Gemini solo existe como secreto de la Edge Function |
| 6 | Panel | ✅ | Bandeja con 4 filtros, detalle, solo transiciones válidas, respuesta, y KPI iguales a la consulta SQL de control |
| 7 | Tiempo real | ✅ | Un ticket enviado desde la web pública aparece en el panel en **1,1 s** (límite 3 s). Respuestas, fotos y cambios de estado llegan al cliente sin recargar |
| 8 | Estética | ⏳ | Contraste AA y `prefers-reduced-motion` cumplidos. **Falta la aprobación de Daniel** |
| 9 | Responsive | ✅ | Portal sin scroll horizontal a 320, 375, 768 y 1920 px. Panel cómodo a 1280 y usable a 768 |
| 10 | Calidad | ✅ | `typecheck`, `lint` (0 errores), 173 tests, 7 tests de RLS y `build` correctos. Consola limpia en los flujos |
| 11 | Lighthouse móvil | ✅ | Rendimiento **92**, accesibilidad **100**, buenas prácticas **100**. JS inicial: **240 KB** comprimido (límite 250) |
| 12 | Reunión | ⏳ | Guion en la T13. Ensayo el lunes 12 y Supabase activo el martes por la mañana (lista de abajo) |

## Detalle

### 1 y 7. Tiempos medidos

- **Entrada:** medida en la web pública con Chrome. Son 292 ms desde el clic hasta que "Tus webs" muestra las dos webs; incluye crear la sesión anónima, el cliente y sus webs.
- **Tiempo real:** el cliente envía "Prueba de tiempo real" desde GitHub Pages, con el panel abierto en otra ventana. Un `MutationObserver` en el panel y la hora del clic dan 1.142 ms.
- Con dos pantallas también se vieron en directo:
  - fotos en las dos direcciones;
  - el aviso de "resuelta";
  - la reapertura cuando contesta el cliente;
  - el paso a "Esperando tu respuesta".

### 3. Tests de RLS y de triggers (SQL)

Se ejecutan con el MCP de Supabase y se deshacen al terminar.

| Test | Casos | Resultado |
| --- | --- | --- |
| `rls_tickets.sql` | Aislamiento entre clientes y lo que puede el admin | ✅ (repetido hoy) |
| `rls_abrir_solicitud.sql` | Prioridad y categoría fijas, web ajena, sin sesión | ✅ 12/12 (repetido hoy). Se quitó el caso de `abrir_incidencia`, que ya no existe |
| `rls_adjuntos.sql` | Carpeta ajena, ticket cerrado, más de 10 fotos, borrar o renombrar | ✅ |
| `respuestas.sql` | Primera respuesta y vuelta a "en curso" | ✅ (repetido hoy) |
| `seguimiento.sql` | Aviso, reapertura, cierre a los 3 días, recordatorio y "resuelta" a la semana | ✅ |
| `rls_resuelta_ia.sql` | Solo conversaciones propias, activas y con respuesta de la IA | ✅ (2026-10-09) |
| `rls_identidad.sql` | Perfiles, clientes y webs | ✅ (2026-10-08) |

### 6. KPI frente a SQL (datos de `supabase/seed.sql`)

| KPI | Panel | Consulta SQL |
| --- | --- | --- |
| Pendientes | 7 | 7 |
| Urgentes pendientes | 1 | 1 |
| Resuelto por la IA | 50 % de 18 | 9 de 18 |
| Primera respuesta | 1 h 4 min | 64 min de media |

### 8. Estética

- **Contraste:** la auditoría `color-contrast` de Lighthouse pasa en la entrada, el portal, la bandeja y el detalle del ticket (accesibilidad 100 en las cuatro).
- **Movimiento reducido:** una regla global para las animaciones con `prefers-reduced-motion: reduce`, más `motion-safe` en el orbe. Hasta hoy, el pulso de las cargas y la entrada de los diálogos se animaban igualmente.
- **Pendiente:** el visto bueno de Daniel (punto de revisión 1).

### 9. Responsive

- Medido con la anchura del documento frente a la de la ventana, buscando elementos que se salgan por la derecha.
- **Arreglado hoy:** a 320 px, "Tus webs" desbordaba 21 px. El dominio largo de la barbería ensanchaba una rejilla con columna `auto`; ahora es `minmax(0, 1fr)`.
- El detalle de una solicitud a 320 px no desborda.
- A 768 px el panel cambia la barra lateral por pestañas.

### 11. Lighthouse

| Página | Modo | Rendimiento | Accesibilidad | Buenas prácticas |
| --- | --- | --- | --- | --- |
| Entrada (pública) | Navegación, móvil, Lighthouse 13 | 92 | 100 | 100 |
| Portal con sesión | Instantánea, móvil | — | 100 | 100 |
| Bandeja del panel | Instantánea, escritorio | — | 100 | 100 |
| Detalle de ticket | Instantánea, escritorio | — | 100 | 100 |

- **Métricas de la entrada:** FCP 2,4 s, LCP 2,4 s, TBT 0 ms y CLS 0, con la red móvil simulada de Lighthouse.
- **Portal con sesión:** traza con CPU ×4 y red Slow 4G. LCP 1,1 s y CLS 0.
- **Por qué el portal va en modo instantánea:** Lighthouse en modo navegación borra el almacenamiento y la sesión. Por eso se audita con la página ya cargada.
- **Arreglado hoy:**
  - el enlace de la cabecera del panel tenía un nombre accesible distinto del texto visible (WCAG 2.5.3);
  - en GitHub Pages, `/portal` y `/admin/entrar` respondían con estado 404 (se veía la app gracias a `404.html`). Ahora las rutas fijas se publican como carpetas y responden 200.
- **JS inicial del portal:** `index` (142,3 KB) + `supabase-js` (95,7 KB) + `label` (2,0 KB) = **240 KB comprimido**. El panel se carga aparte: la bandeja pesa 3,7 KB.

## Antes de la demo (martes 13)

1. **Volver a ejecutar `supabase/seed.sql`** esa misma mañana. Por qué:
   - las fechas son relativas al momento de ejecutarlo;
   - si no, el #103 se daría por resuelto solo ese mismo día;
   - además borra lo que dejan las pruebas: `test:rls`, `atacar.mjs` y las visitas crean clientes de demostración.
2. **No lanzar `test:rls` ni `atacar.mjs` después del seed.** Si hace falta, volver a ejecutar el seed.
3. **Comprobar que el proyecto de Supabase no está en pausa** (plan gratuito) y que la tarea `seguimiento-tickets` de pg_cron sigue activa.
4. **Entrar en `/admin/entrar` con su cuenta** de administrador antes de empezar.

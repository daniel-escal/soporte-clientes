# Dirección estética: Umbracle

Aprobada por Daniel el 2026-10-10. Sustituye a la dirección anterior (índigo con degradado azul→violeta y brillos), que se resume al final como historial.

**La idea:** la Ciudad de las Artes y las Ciencias de noche. Hormigón blanco sobre cielo oscuro, costillas que se repiten y el agua turquesa iluminada. Lo futurista no lo ponen los efectos, sino la precisión: líneas finas, mucho aire y cifras grandes y ligeras.

Para quién está pensada:

- **Daniel**, en el panel, a menudo de noche: oscuro, denso y tranquilo.
- **Sus clientes**, en el móvil, dentro de la tienda o en la calle: tienen que leerla al sol.
- **Quien la evalúe**: tiene que parecer una herramienta seria, no una plantilla.

La propuesta completa, con maquetas, está en el Second Brain de Daniel: `01-Proyectos/soporte-clientes/propuesta-estetica-definitiva.html`.

## Las reglas

1. **Oscuro de serie; el portal sigue al teléfono.**
   - El panel (`/admin/*`) es siempre oscuro.
   - La entrada y el portal del cliente se ven en oscuro o en claro según el modo del sistema.
2. **Un solo acento: agua.** Lo llevan:
   - el botón principal;
   - los enlaces;
   - el foco;
   - las costillas encendidas;
   - las barras de datos;
   - los iconos que marcan al asistente.

   Nada más lleva color.
3. **El color con significado se gana.**
   - El coral marca solo lo urgente y los errores.
   - El sodio (ámbar) marca solo "esperando al cliente".
   - Siempre van con su texto o su icono, nunca solos.
4. **Cero degradados, brillos y sombras de color.** La profundidad sale de tres superficies y una línea fina. Si algo necesita brillo para destacar, el problema es la jerarquía. Basta un brillo para que esto parezca otra plantilla de IA.
5. **Dos tipos de la misma familia.**
   - Red Hat Display para títulos y cifras; las cifras grandes van ligeras (300).
   - Red Hat Text para leer.
   - Las dos están alojadas en el proyecto (`@fontsource-variable/red-hat-display` y `red-hat-text`), sin pedir nada a Google.
6. **Un solo gesto: las costillas.** Es la única animación con intención:
   - cuando cambia el estado, se enciende la siguiente costilla con un barrido corto;
   - mientras la IA piensa, las costillas hacen un barrido.

   Con "reducir movimiento", no se anima nada.
7. **Los controles no se disfrazan.** Botones, campos, menús y navegación se ven como lo que son (shadcn/ui). La estética solo pone el tipo, la paleta y el gesto.

## Tokens

Los contrastes son **medidos** (fórmula WCAG) y son el peor caso sobre las tres superficies. `tests/tema.test.ts` los comprueba en las dos paletas: si cambias un color, el test dirá si sigue cumpliendo AA.

| Token | Oscuro | Claro | Uso y contraste mínimo (oscuro / claro) |
| --- | --- | --- | --- |
| `--fondo` | `#0a0f14` | `#f3f6f6` | Lienzo |
| `--superficie` | `#11181f` | `#ffffff` | Tarjetas y paneles |
| `--superficie-alta` | `#18212a` | `#e9eef0` | Campos, burbujas propias y piezas dentro de una tarjeta |
| `--borde` | `#2a3743` | `#d3dbde` | Línea que separa; decorativa, no informa |
| `--borde-control` | `#647581` | `#73818a` | Campos y casillas: 3,41 / 3,43 (WCAG 1.4.11 pide 3:1) |
| `--texto` | `#e8edef` | `#0a0f14` | Hueso / tinta: 13,8 / 16,4 |
| `--texto-suave` | `#9aa8b1` | `#4a5863` | Niebla: 6,7 / 6,3 |
| `--texto-tenue` | `#7f8d97` | `#5f6d78` | Metadatos: 4,78 / 4,55 |
| `--agua` | `#3fd5cb` | `#097069` | El acento; también el foco: 9,0 / 5,08 |
| `--sobre-agua` | `#0a0f14` | `#ffffff` | Texto del botón principal: 10,6 / 5,94 |
| `--coral` | `#ff7a66` | `#b93a27` | Urgente y errores: 6,4 / 4,85 |
| `--sodio` | `#e9b44c` | `#8a5a00` | Esperando al cliente: 8,6 / 5,06 |
| `--costilla-apagada` | `#2a3743` | `#c9d3d7` | Frente a la encendida: 6,7 / 3,90 |

El turquesa de día es más oscuro que el de noche: es el mismo acento, pero `#3fd5cb` no pasa el contraste sobre blanco.

### Forma

- **Radios con jerarquía:**
  - tarjetas: 12 px;
  - controles y botones: 8 px;
  - burbujas: 12 px, con la esquina del lado de quien habla más cerrada;
  - chips y avatares: completamente redondos.
- **Sin sombras en tarjetas.** La separación la dan la superficie y la línea. Solo los menús desplegables y los diálogos llevan la sombra neutra de shadcn, porque flotan sobre el contenido.
- **Tamaños:** 14 px de base en el panel (denso) y 16 px en el chat del cliente (lectura en el móvil).
- Cifras tabulares (`cifras`) en los KPI, la bandeja y los números de ticket.

## Las costillas

Son cuatro, como una batería, y **solo cuentan el estado**. La prioridad va aparte.

| Estado | Encendidas | Color |
| --- | --- | --- |
| Abierto | 1 | agua |
| En curso | 2 | agua |
| Esperando al cliente | 2 | **sodio**: es una pausa, no un avance |
| Resuelto | 3 | agua |
| Cerrado | 4 | agua: carga completa |

- **Componente:** `Costillas` en `src/componentes/Costillas.tsx`.
  - Siempre va junto al texto del estado, así que no se anuncia (`aria-hidden`).
  - Al cambiar de estado, el color pasa con un retraso escalonado de 90 ms por costilla.
- **El asistente:** `IndicadorAsistente` muestra las costillas de la marca dentro de una pieza:
  - en reposo: tres en niebla y la última en agua;
  - pensando: barrido (`animate-barrido`, solo con `motion-safe`);
  - con la solicitud pasada a Daniel: las cuatro encendidas.
- **La marca** (`Marca.tsx` y `public/favicon.svg`): cuatro costillas en hueso con la última en agua.
- **La urgencia:** "Prioridad urgente" en coral con su icono. El resto de prioridades van en texto suave con su flecha.

## Las dos luces

- **Paletas:** `:root` lleva la paleta oscura. La clara está en `@media (prefers-color-scheme: light)` sobre `:root:not([data-tema='oscuro'])`.
- **El panel, siempre oscuro:** lleva `data-tema="oscuro"` en `<html>`.
  - `index.html` lo pone antes de pintar, para que no haya un destello claro.
  - `src/lib/tema.ts` lo mantiene al navegar.
- **Variantes `dark:` de shadcn:** el `@custom-variant dark` de `tema.css` sigue la misma regla (modo del sistema o `data-tema="oscuro"`).
- **Barra del navegador:** `theme-color` lleva un valor por modo.

## Lo que pinta el navegador

También lleva la paleta:

- la selección, en agua al 30 %;
- el cursor de los campos, en agua;
- las barras de scroll, finas y en `--borde-control`;
- el contorno de foco, en agua;
- los subrayados, con `text-underline-offset`.

## Implementación (Tailwind v4 + shadcn/ui)

Los tokens se declaran en `src/estilos/tema.css` y se mapean a las variables de shadcn/ui:

| Variable de shadcn | Token |
| --- | --- |
| `--background` | `--fondo` |
| `--foreground` | `--texto` |
| `--card` / `--popover` | `--superficie` |
| `--muted` / `--secondary` / `--accent` | `--superficie-alta` |
| `--muted-foreground` | `--texto-suave` |
| `--border` | `--borde` |
| `--input` | `--borde-control` |
| `--ring` | `--agua` |
| `--primary` | `--agua` |
| `--primary-foreground` | `--sobre-agua` |
| `--destructive` | `--coral` |

Utilidades de color disponibles:

- `bg-agua`, `text-agua`, `text-sobre-agua`;
- `text-coral`, `text-sodio`;
- `bg-costilla-apagada`;
- además de las de superficie y texto.

El botón principal es la variante `marca` de `Button`: agua sólida y, al pasar por encima, un poco más cerca del color del texto.

## Historial

**Del 2026-10-08 al 2026-10-10** se usó la dirección de una imagen de referencia, que está guardada solo en local (`docs/referencias/`):

- fondo índigo `#23243b`;
- degradado azul→violeta como firma;
- brillo neón en un orbe con auricular;
- Inter.

Daniel pidió alternativas y eligió esta. Se retiró por tres motivos:

- era la "estética de IA" más repetida;
- se leía mal al sol;
- el degradado y los brillos no comunicaban nada del producto.

# Dirección estética

Fuente: imagen de referencia que aportó Daniel el 2026-10-08, guardada en local en `docs/referencias/estetica-referencia.png`. Esa carpeta no se sube al repositorio porque no conocemos la licencia de la imagen.

La imagen es una composición de pantallas de interfaz (probablemente generada por IA: sus textos no se pueden leer). Por eso **se extrae el ambiente y el lenguaje visual, no una maqueta literal**.

## Rasgos que se extraen

1. **Solo modo oscuro.** Fondo índigo grisáceo, con los paneles **más oscuros que el fondo**. Cada panel lleva un borde sutil y una sombra suave, así que parece flotar sobre un lienzo más claro.
2. **Acentos azul eléctrico y violeta**, unidos en un **degradado azul → violeta** que funciona como firma. Hay toques de magenta y cian solo en los brillos.
3. **Brillo neón en pocos elementos.** El más claro es el anillo circular de la tarjeta central, que rodea un **auricular de soporte**. En nuestro producto será el **orbe del asistente de IA**.
4. **Composición modular tipo "bento":** tarjetas de distintos tamaños en una rejilla, cada una con un trabajo concreto.
5. **Densidad alta de información:**
   - textos pequeños y etiquetas tenues;
   - listas con avatares circulares;
   - barras horizontales de progreso con degradado;
   - interruptores, botones en forma de pastilla y botones circulares con icono.
6. **Cabeceras de tarjeta con franja de color** (azul o violeta) en algunos paneles, para marcar el panel activo o destacado.

## Tokens

Los contrastes son **medidos** (fórmula WCAG), no estimados. Se recalculan si cambia algún color.

### Superficies

| Token | Valor | Uso |
| --- | --- | --- |
| `--fondo` | `#23243b` | Lienzo de la aplicación. Puede llevar un degradado radial muy suave, más claro arriba a la izquierda |
| `--superficie` | `#181a2c` | Tarjetas y paneles (más oscuros que el fondo, como en la referencia) |
| `--superficie-alta` | `#20223a` | Campos, menús desplegables y elementos dentro de una tarjeta |
| `--borde` | `#2f3253` | Borde decorativo de las tarjetas (1,39:1, no transmite información) |
| `--borde-control` | `#6e72a3` | Borde de campos y controles: 3,76:1 sobre superficie, 3,40:1 sobre superficie alta y 3,32:1 sobre fondo (WCAG 1.4.11 pide 3:1) |

### Texto (mínimo 4,5:1)

| Token | Valor | Sobre fondo | Sobre superficie | Sobre superficie alta |
| --- | --- | --- | --- | --- |
| `--texto` | `#e9eaf5` | 12,66 | 14,35 | 12,99 |
| `--texto-suave` | `#a7aac6` | 6,64 | 7,53 | 6,81 |
| `--texto-tenue` | `#8b8fb2` | 4,81 | 5,45 | 4,94 |
| `--azul-texto` | `#7aa7ff` | 6,34 | 7,19 | 6,51 |
| `--violeta-texto` | `#b49cff` | 6,59 | 7,47 | 6,76 |

### Acentos

| Token | Valor | Uso y contraste |
| --- | --- | --- |
| `--azul` | `#3b82f6` | Barras, iconos y elementos gráficos (4,12 sobre fondo, 4,67 sobre superficie) |
| `--violeta` | `#8b5cf6` | Barras, iconos y elementos gráficos (3,58 sobre fondo, 4,06 sobre superficie) |
| `--magenta` | `#d946ef` | **Solo brillos**: nunca en texto ni como único indicador |
| `--cian` | `#38bdf8` | **Solo brillos** del orbe |
| `--foco` | `#b49cff` | Contorno de foco: 6,59 sobre fondo y 7,47 sobre superficie |
| `--degradado-marca` | `linear-gradient(90deg, #3b82f6, #8b5cf6)` | Barras de datos, franja de cabecera y anillo del orbe |
| `--degradado-boton` | `linear-gradient(90deg, #2563eb, #7c3aed)` | Botón principal con texto blanco: 5,17 en el extremo azul y 5,70 en el violeta |

Nota: el degradado de marca (`#3b82f6`) **no** sirve para botones con texto blanco (3,75:1). Por eso el botón usa los tonos más oscuros.

### Estados y prioridades

Las insignias llevan el texto en el color del estado sobre un tinte del mismo color al 16 % encima de `--superficie`. **Siempre texto + icono, nunca solo color.**

| Estado / prioridad | Color | Contraste sobre su tinte |
| --- | --- | --- |
| Abierto | `#7aa7ff` | 5,37 |
| En curso | `#b49cff` | 5,55 |
| Esperando al cliente | `#fbbf24` | 7,32 |
| Resuelto | `#34d399` | 6,49 |
| Cerrado | `#a7aac6` | 5,59 |
| Prioridad urgente | `#fb7185` | 5,01 |
| Prioridad alta | `#fb923c` | 5,77 |
| Prioridad media / baja | colores de "abierto" / "cerrado" | 5,37 / 5,59 |

### Forma, tipografía y movimiento

- **Radios con jerarquía** (no todo igual de redondeado):
  - tarjetas: 12 px;
  - controles y botones: 8 px;
  - insignias, pastillas y avatares: completamente redondos.
- **Sombra:** una sola de elevación para tarjetas, `0 8px 24px rgb(0 0 0 / 0.35)`. Sin capas de sombras.
- **Tipografía:** Inter Variable alojada en el propio proyecto (`@fontsource-variable/inter`, sin peticiones a Google Fonts).
  - Tamaño base de 14 px en el panel (denso, como la referencia) y de 16 px en el chat del cliente (lectura en el móvil).
  - Cifras tabulares (`tabular-nums`) en los KPI y en las tablas.
- **Brillo:** `0 0 24px rgb(139 92 246 / 0.45)` (violeta) y `0 0 32px rgb(56 189 248 / 0.35)` (cian, solo en el orbe).
- **Movimiento:** el orbe "respira" mientras la IA piensa. Con `prefers-reduced-motion: reduce`, nada se anima y el estado se indica con texto ("Pensando…").

## Reglas para que no parezca una plantilla genérica

Esta estética coincide con la **"estética de IA" que la skill `frontend-ui-engineering` desaconseja**: morado e índigo, degradados, brillos y sombras. Se usa por decisión de Daniel y porque encaja con el tema, ya que el producto es literalmente un asistente de soporte con IA. Para que funcione:

1. **El degradado es una señal, no un fondo.** Solo se usa en:
   - el botón principal;
   - las barras de datos;
   - la franja del panel activo;
   - el anillo del orbe.

   Nunca va detrás de bloques de texto ni en fondos de página.
2. **Como mucho dos elementos con brillo por pantalla:** el orbe y el botón principal (en hover y foco), más un ticket urgente recién llegado de forma temporal.
3. **El resto es plano:** superficies sólidas, bordes sutiles y una sola sombra.
4. **El contenido manda en la composición.** El bento se ordena por importancia:
   - la bandeja de tickets ocupa la tarjeta grande;
   - los KPI van en tarjetas pequeñas;
   - el orbe solo aparece en el chat.
5. **Contenido realista** en las demos: negocios, webs e incidencias creíbles. Nada de "Lorem ipsum".
6. **Accesibilidad por delante del efecto:**
   - texto ≥ 4,5:1;
   - controles y foco ≥ 3:1;
   - estados con texto e icono.

## Correspondencia con la referencia

| Elemento de la referencia | En nuestro producto |
| --- | --- |
| Tarjeta central con auricular y anillo neón | Orbe del asistente en el chat del cliente (estados: en reposo, pensando, ticket creado) |
| Tarjeta con filas, avatares y barras azules | Bandeja de tickets del panel (cliente, web, prioridad, estado, hace cuánto) |
| Tarjetas pequeñas con barras de progreso | KPI: abiertos, urgentes, % resuelto por la IA, tiempo hasta la primera respuesta |
| Tarjeta ancha con barras azul y violeta y botón circular | Conversación del ticket con el cuadro de respuesta del administrador |
| Paneles con franja de color en la cabecera | Panel activo o seleccionado (ticket abierto en el detalle) |
| Columna estrecha con lista e iconos | Barra lateral de navegación del panel |

## Implementación (Tailwind v4 + shadcn/ui)

- Los tokens se declaran en `src/estilos/tema.css` con `@theme` de Tailwind v4.
- Se mapean a las variables que usa shadcn/ui:

| Variable de shadcn | Token |
| --- | --- |
| `--background` | `--fondo` |
| `--foreground` | `--texto` |
| `--card` / `--popover` | `--superficie` |
| `--muted` | `--superficie-alta` |
| `--muted-foreground` | `--texto-suave` |
| `--border` | `--borde` |
| `--input` | `--borde-control` |
| `--ring` | `--foco` |
| `--primary` | `#7c3aed` (el botón principal usa además `--degradado-boton`) |
| `--primary-foreground` | `#ffffff` |
| `--destructive` | `#fb7185` |

- `color-scheme: dark` en `<html>`. No hay modo claro.

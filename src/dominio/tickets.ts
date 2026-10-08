// Vocabulario de las incidencias. tests/dominio/tickets.test.ts comprueba que coincide con los enums
// de la base de datos (supabase/migrations).
export const ESTADOS = ['abierto', 'en_curso', 'esperando_cliente', 'resuelto', 'cerrado'] as const
export type Estado = (typeof ESTADOS)[number]

// Transiciones válidas (docs/SPEC.md). "cerrado" es definitivo; "resuelto" puede reabrirse.
const TRANSICIONES: Record<Estado, readonly Estado[]> = {
  abierto: ['en_curso', 'cerrado'],
  en_curso: ['esperando_cliente', 'resuelto'],
  esperando_cliente: ['en_curso', 'resuelto'],
  resuelto: ['en_curso', 'cerrado'],
  cerrado: [],
}

export function puedeCambiar(de: Estado, a: Estado): boolean {
  return TRANSICIONES[de].includes(a)
}

/** Estados a los que se puede pasar desde `de`, en el orden del flujo (para el selector del panel). */
export function siguientesEstados(de: Estado): Estado[] {
  return ESTADOS.filter((a) => puedeCambiar(de, a))
}

export const PRIORIDADES = ['baja', 'media', 'alta', 'urgente'] as const
export type Prioridad = (typeof PRIORIDADES)[number]

export const CATEGORIAS = [
  'web_caida',
  'error_funcional',
  'cambio_contenido',
  'nuevo_componente',
  'correo',
  'dominio_hosting',
  'facturacion',
  'otro',
] as const
export type Categoria = (typeof CATEGORIAS)[number]

export const NOMBRE_CATEGORIA: Record<Categoria, string> = {
  web_caida: 'Web caída',
  error_funcional: 'Algo no funciona',
  cambio_contenido: 'Cambio de contenido',
  nuevo_componente: 'Algo nuevo',
  correo: 'Correo',
  dominio_hosting: 'Dominio y hosting',
  facturacion: 'Facturación',
  otro: 'Otro',
}

// Incidencia (algo falla) o petición (un cambio o algo nuevo). En la BD se deriva de la categoría.
export const TIPOS = ['incidencia', 'peticion'] as const
export type Tipo = (typeof TIPOS)[number]

export const NOMBRE_TIPO: Record<Tipo, string> = {
  incidencia: 'Incidencia',
  peticion: 'Petición',
}

export const NOMBRE_ESTADO: Record<Estado, string> = {
  abierto: 'Abierto',
  en_curso: 'En curso',
  esperando_cliente: 'Esperando tu respuesta',
  resuelto: 'Resuelto',
  cerrado: 'Cerrado',
}

/** En el panel se habla del cliente en tercera persona. */
export const NOMBRE_ESTADO_ADMIN: Record<Estado, string> = { ...NOMBRE_ESTADO, esperando_cliente: 'Esperando al cliente' }

export const NOMBRE_PRIORIDAD: Record<Prioridad, string> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  urgente: 'Urgente',
}

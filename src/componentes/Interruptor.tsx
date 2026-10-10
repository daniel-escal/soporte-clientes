import { cn } from '@/lib/utils'

type Props = {
  activo: boolean
  onCambio: (activo: boolean) => void
  /** Nombre accesible: qué activa o desactiva. */
  etiqueta: string
  deshabilitado?: boolean
}

/** Interruptor (role="switch") como los de la referencia. El estado también va en texto, no solo en color. */
export function Interruptor({ activo, onCambio, etiqueta, deshabilitado = false }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      aria-label={etiqueta}
      disabled={deshabilitado}
      onClick={() => onCambio(!activo)}
      className="group inline-flex min-h-10 items-center gap-2 rounded-full text-xs text-texto-suave disabled:opacity-50"
    >
      <span
        aria-hidden
        className={cn(
          'relative inline-block h-6 w-11 shrink-0 rounded-full border border-borde-control transition-colors',
          activo ? 'border-transparent bg-agua' : 'bg-superficie-alta',
        )}
      >
        <span
          className={cn(
            'absolute top-1/2 left-0.5 size-4.5 -translate-y-1/2 rounded-full transition-transform motion-reduce:transition-none',
            // La bola contrasta con su fondo en los dos estados: noche sobre agua (10,6:1) y niebla sobre la superficie alta
            activo ? 'translate-x-5 bg-sobre-agua' : 'bg-texto-suave',
          )}
        />
      </span>
      <span aria-hidden className="w-12 text-left">
        {activo ? 'Activa' : 'Inactiva'}
      </span>
    </button>
  )
}

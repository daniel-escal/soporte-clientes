import type { Estado } from '@/dominio/tickets'
import { cn } from '@/lib/utils'

// Cuántas se encienden en cada estado (docs/ESTETICA.md): como una batería que se carga.
// "Esperando al cliente" no avanza: se queda en las dos de "en curso", en ámbar, porque es una pausa.
const ENCENDIDAS: Record<Estado, number> = { abierto: 1, en_curso: 2, esperando_cliente: 2, resuelto: 3, cerrado: 4 }

/**
 * Las cuatro costillas del estado de un ticket: el gesto propio de la estética.
 * Siempre van junto al texto del estado (son un refuerzo, nunca lo único), así que no se anuncian.
 * Al cambiar de estado, la siguiente se enciende en barrido corto (sin animar con "reducir movimiento").
 */
export function Costillas({ estado, className }: { estado: Estado; className?: string }) {
  const encendidas = ENCENDIDAS[estado]
  const color = estado === 'esperando_cliente' ? 'bg-sodio' : 'bg-agua'
  return (
    <span aria-hidden data-encendidas={encendidas} className={cn('inline-flex h-3.5 shrink-0 items-stretch gap-[3px]', className)}>
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          style={{ transitionDelay: `${i * 90}ms` }}
          className={cn('w-[3px] rounded-full transition-colors duration-500 ease-out', i < encendidas ? color : 'bg-costilla-apagada')}
        />
      ))}
    </span>
  )
}

export type EstadoAsistente = 'reposo' | 'pensando' | 'listo'

const DESCRIPCION: Record<EstadoAsistente, string> = {
  reposo: 'Asistente de soporte disponible',
  pensando: 'El asistente está pensando',
  listo: 'El asistente ha pasado tu solicitud a Daniel',
}

/**
 * La señal del asistente en el chat: las costillas de la marca dentro de una pieza.
 * En reposo, como el logo; pensando, en barrido; con la solicitud pasada a Daniel, las cuatro encendidas.
 */
export function IndicadorAsistente({ estado = 'reposo', className }: { estado?: EstadoAsistente; className?: string }) {
  return (
    <div
      role="img"
      aria-label={DESCRIPCION[estado]}
      data-estado={estado}
      className={cn('grid size-12 shrink-0 place-items-center rounded-xl border bg-superficie-alta', className)}
    >
      <span className="flex h-5 items-stretch gap-1">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            style={estado === 'pensando' ? { animationDelay: `${i * 150}ms` } : undefined}
            className={cn(
              'w-1 rounded-full',
              estado === 'reposo' && (i === 3 ? 'bg-agua' : 'bg-texto-suave'),
              estado === 'pensando' && 'bg-agua motion-safe:animate-barrido',
              estado === 'listo' && 'bg-agua',
            )}
          />
        ))}
      </span>
    </div>
  )
}

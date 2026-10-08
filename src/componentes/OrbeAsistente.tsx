import { Check, Headset } from 'lucide-react'
import { cn } from '@/lib/utils'

export type EstadoOrbe = 'reposo' | 'pensando' | 'listo'

const DESCRIPCION: Record<EstadoOrbe, string> = {
  reposo: 'Asistente de soporte disponible',
  pensando: 'El asistente está pensando',
  listo: 'El asistente ha creado la incidencia',
}

/**
 * El auricular con anillo neón de la referencia (docs/ESTETICA.md).
 * Es uno de los dos únicos elementos con brillo por pantalla.
 * Solo "respira" mientras piensa, y nunca con prefers-reduced-motion (motion-safe).
 */
export function OrbeAsistente({ estado = 'reposo', className }: { estado?: EstadoOrbe; className?: string }) {
  return (
    <div role="img" aria-label={DESCRIPCION[estado]} data-estado={estado} className={cn('relative grid size-20 shrink-0 place-items-center', className)}>
      <span
        aria-hidden
        className={cn('absolute inset-1 rounded-full brillo-orbe', estado === 'pensando' && 'motion-safe:animate-respirar')}
      />
      <span aria-hidden className="degradado-marca absolute inset-0 rounded-full p-[3px]">
        <span className="block size-full rounded-full bg-superficie" />
      </span>
      <Headset aria-hidden className="relative size-[42%] text-violeta-texto" strokeWidth={1.75} />
      {estado === 'listo' && (
        <span
          aria-hidden
          className="absolute -right-0.5 -bottom-0.5 grid size-6 place-items-center rounded-full border-2 border-superficie bg-[var(--estado-resuelto)] text-superficie"
        >
          <Check className="size-3.5" strokeWidth={3} />
        </span>
      )}
    </div>
  )
}

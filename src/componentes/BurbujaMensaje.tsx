import { BellRing, Headset, UserRound } from 'lucide-react'
import { haceCuanto } from '@/lib/formato'
import type { Tables } from '@/lib/tipos-bd'
import { cn } from '@/lib/utils'

/** Un mensaje de la conversación. Sin fecha en los que no vienen de la BD (el saludo del chat). */
export type MensajeChat = Pick<Tables<'mensajes'>, 'id' | 'autor' | 'contenido'> & { creado_en?: string }

// Lo propio va a la derecha ("Tú"); lo demás, a la izquierda. Depende de quién mira.
const PROPIO = 'ml-auto bg-superficie-alta rounded-br-sm'
const ESTILO = {
  cliente: {
    cliente: { nombre: 'Tú', icono: UserRound, clase: PROPIO },
    ia: { nombre: 'Asistente', icono: Headset, clase: 'border border-violeta/40 rounded-bl-sm' },
    admin: { nombre: 'Daniel', icono: UserRound, clase: 'border border-azul/50 rounded-bl-sm' },
  },
  admin: {
    cliente: { nombre: 'Cliente', icono: UserRound, clase: 'border border-azul/50 rounded-bl-sm' },
    ia: { nombre: 'Asistente', icono: Headset, clase: 'border border-violeta/40 rounded-bl-sm' },
    admin: { nombre: 'Tú', icono: UserRound, clase: PROPIO },
  },
} as const

type Props = {
  mensaje: MensajeChat
  /** Desde dónde se mira: el portal del cliente (por defecto) o el panel de Daniel. */
  vista?: 'cliente' | 'admin'
  /** En el panel, el nombre del cliente en lugar de "Cliente". */
  nombreCliente?: string
}

export function BurbujaMensaje({ mensaje, vista = 'cliente', nombreCliente }: Props) {
  if (mensaje.autor === 'sistema') return <AvisoAutomatico mensaje={mensaje} />
  const { nombre, icono: Icono, clase } = ESTILO[vista][mensaje.autor]
  return (
    <li className={cn('w-fit max-w-[85%] rounded-lg px-4 py-3', clase)}>
      <p className="flex items-center gap-1.5 text-xs text-texto-suave">
        <Icono aria-hidden className="size-3.5" />
        <span className="font-medium text-texto">{vista === 'admin' && mensaje.autor === 'cliente' && nombreCliente ? nombreCliente : nombre}</span>
        {mensaje.creado_en && <> · {haceCuanto(mensaje.creado_en)}</>}
      </p>
      {/* Texto plano siempre: nunca HTML (lo que escriben clientes o la IA no es de fiar) */}
      <p className="mt-1.5 text-base whitespace-pre-wrap text-texto">{mensaje.contenido}</p>
    </li>
  )
}

/** Avisos del seguimiento automático (resuelta, reabierta, recordatorio, cerrada): ni Daniel ni la IA. */
function AvisoAutomatico({ mensaje }: { mensaje: MensajeChat }) {
  return (
    <li className="mx-auto w-fit max-w-[90%] rounded-lg border border-dashed border-borde-control px-4 py-2.5 text-center">
      <p className="flex items-center justify-center gap-1.5 text-xs text-texto-suave">
        <BellRing aria-hidden className="size-3.5" />
        <span className="font-medium text-texto">Aviso automático</span>
        {mensaje.creado_en && <> · {haceCuanto(mensaje.creado_en)}</>}
      </p>
      <p className="mt-1 text-sm text-balance text-texto-suave">{mensaje.contenido}</p>
    </li>
  )
}

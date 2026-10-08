import { Headset, UserRound } from 'lucide-react'
import { haceCuanto } from '@/lib/formato'
import type { Tables } from '@/lib/tipos-bd'
import { cn } from '@/lib/utils'

/** Un mensaje de la conversación. Sin fecha en los que no vienen de la BD (el saludo del chat). */
export type MensajeChat = Pick<Tables<'mensajes'>, 'id' | 'autor' | 'contenido'> & { creado_en?: string }

const AUTOR = {
  cliente: { nombre: 'Tú', icono: UserRound, clase: 'ml-auto bg-superficie-alta rounded-br-sm' },
  ia: { nombre: 'Asistente', icono: Headset, clase: 'border border-violeta/40 rounded-bl-sm' },
  admin: { nombre: 'Daniel', icono: UserRound, clase: 'border border-azul/50 rounded-bl-sm' },
} as const

export function BurbujaMensaje({ mensaje }: { mensaje: MensajeChat }) {
  const { nombre, icono: Icono, clase } = AUTOR[mensaje.autor]
  return (
    <li className={cn('w-fit max-w-[85%] rounded-lg px-4 py-3', clase)}>
      <p className="flex items-center gap-1.5 text-xs text-texto-suave">
        <Icono aria-hidden className="size-3.5" />
        <span className="font-medium text-texto">{nombre}</span>
        {mensaje.creado_en && <> · {haceCuanto(mensaje.creado_en)}</>}
      </p>
      {/* Texto plano siempre: nunca HTML (lo que escriben clientes o la IA no es de fiar) */}
      <p className="mt-1.5 text-base whitespace-pre-wrap text-texto">{mensaje.contenido}</p>
    </li>
  )
}

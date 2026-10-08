import type { ReactNode } from 'react'
import { Label } from '@/componentes/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/componentes/ui/select'
import type { FiltrosBandeja as Filtros } from '@/dominio/bandeja'
import { ESTADOS, NOMBRE_ESTADO_ADMIN, NOMBRE_PRIORIDAD, PRIORIDADES } from '@/dominio/tickets'

type Props = {
  filtros: Filtros
  clientes: { id: string; nombre: string }[]
  onCambio: (filtros: Filtros) => void
}

/** Filtros de la bandeja: estado, prioridad, tipo y cliente. Se combinan entre sí. */
export function FiltrosBandeja({ filtros, clientes, onCambio }: Props) {
  const cambiar = <C extends keyof Filtros>(campo: C, valor: Filtros[C]) => onCambio({ ...filtros, [campo]: valor })

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Filtro id="filtro-estado" etiqueta="Estado" valor={filtros.estado} onCambio={(v) => cambiar('estado', v as Filtros['estado'])}>
        <SelectItem value="pendientes">Pendientes</SelectItem>
        <SelectItem value="todos">Todos</SelectItem>
        {ESTADOS.map((estado) => (
          <SelectItem key={estado} value={estado}>
            {NOMBRE_ESTADO_ADMIN[estado]}
          </SelectItem>
        ))}
      </Filtro>
      <Filtro id="filtro-prioridad" etiqueta="Prioridad" valor={filtros.prioridad} onCambio={(v) => cambiar('prioridad', v as Filtros['prioridad'])}>
        <SelectItem value="todas">Todas</SelectItem>
        {[...PRIORIDADES].reverse().map((prioridad) => (
          <SelectItem key={prioridad} value={prioridad}>
            {NOMBRE_PRIORIDAD[prioridad]}
          </SelectItem>
        ))}
      </Filtro>
      <Filtro id="filtro-tipo" etiqueta="Tipo" valor={filtros.tipo} onCambio={(v) => cambiar('tipo', v as Filtros['tipo'])}>
        <SelectItem value="todos">Todos</SelectItem>
        <SelectItem value="incidencia">Incidencias</SelectItem>
        <SelectItem value="peticion">Peticiones</SelectItem>
      </Filtro>
      <Filtro id="filtro-cliente" etiqueta="Cliente" valor={filtros.clienteId} onCambio={(v) => cambiar('clienteId', v)}>
        <SelectItem value="todos">Todos</SelectItem>
        {clientes.map((cliente) => (
          <SelectItem key={cliente.id} value={cliente.id}>
            {cliente.nombre}
          </SelectItem>
        ))}
      </Filtro>
    </div>
  )
}

function Filtro({
  id,
  etiqueta,
  valor,
  onCambio,
  children,
}: {
  id: string
  etiqueta: string
  valor: string
  onCambio: (valor: string) => void
  children: ReactNode
}) {
  return (
    <div className="grid min-w-0 gap-1">
      <Label htmlFor={id} className="text-xs text-texto-suave">
        {etiqueta}
      </Label>
      <Select value={valor} onValueChange={onCambio}>
        <SelectTrigger id={id} className="w-full min-w-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </div>
  )
}

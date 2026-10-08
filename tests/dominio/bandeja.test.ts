import { describe, expect, test } from 'vitest'
import { FILTROS_INICIALES, clientesDeLaBandeja, filtrarBandeja, ordenarBandeja, type TicketBandeja } from '@/dominio/bandeja'

const barberia = { id: 'c1', nombre: 'Brocha & Latón' }
const taller = { id: 'c2', nombre: 'Taller Ruedas del Grao' }

function ticket(numero: number, cambios: Partial<TicketBandeja> = {}): TicketBandeja {
  return {
    id: `t${numero}`,
    numero,
    tipo: 'incidencia',
    estado: 'abierto',
    prioridad: 'media',
    creado_en: `2026-10-0${numero}T10:00:00Z`,
    cliente: barberia,
    ...cambios,
  }
}

describe('ordenarBandeja', () => {
  test('primero lo más urgente; a igual prioridad, lo que más lleva esperando', () => {
    const orden = ordenarBandeja([
      ticket(1, { prioridad: 'baja' }),
      ticket(2, { prioridad: 'urgente' }),
      ticket(3, { prioridad: 'alta' }),
      ticket(4, { prioridad: 'alta' }),
    ]).map((t) => t.numero)
    expect(orden).toEqual([2, 3, 4, 1])
  })

  test('lo resuelto o cerrado va al final, de lo más reciente a lo más antiguo', () => {
    const orden = ordenarBandeja([
      ticket(1, { estado: 'cerrado', prioridad: 'urgente' }),
      ticket(2, { estado: 'resuelto', prioridad: 'urgente' }),
      ticket(3, { prioridad: 'baja' }),
      ticket(4, { estado: 'esperando_cliente' }),
    ]).map((t) => t.numero)
    expect(orden).toEqual([4, 3, 2, 1])
  })

  test('no modifica la lista original', () => {
    const lista = [ticket(1, { prioridad: 'baja' }), ticket(2, { prioridad: 'urgente' })]
    ordenarBandeja(lista)
    expect(lista.map((t) => t.numero)).toEqual([1, 2])
  })
})

describe('filtrarBandeja', () => {
  const tickets = [
    ticket(1, { estado: 'abierto', prioridad: 'urgente' }),
    ticket(2, { estado: 'en_curso', tipo: 'peticion', cliente: taller }),
    ticket(3, { estado: 'esperando_cliente', prioridad: 'alta' }),
    ticket(4, { estado: 'resuelto' }),
    ticket(5, { estado: 'cerrado', cliente: taller }),
  ]
  const numeros = (filtros: Partial<typeof FILTROS_INICIALES>) =>
    filtrarBandeja(tickets, { ...FILTROS_INICIALES, ...filtros }).map((t) => t.numero)

  test('por defecto muestra solo lo pendiente (abierto, en curso o esperando al cliente)', () => {
    expect(numeros({})).toEqual([1, 2, 3])
  })

  test('"todos" incluye lo resuelto y lo cerrado', () => {
    expect(numeros({ estado: 'todos' })).toEqual([1, 2, 3, 4, 5])
  })

  test('por un estado concreto', () => {
    expect(numeros({ estado: 'resuelto' })).toEqual([4])
  })

  test('por prioridad, tipo y cliente (se combinan)', () => {
    expect(numeros({ prioridad: 'urgente' })).toEqual([1])
    expect(numeros({ tipo: 'peticion' })).toEqual([2])
    expect(numeros({ estado: 'todos', clienteId: 'c2' })).toEqual([2, 5])
    expect(numeros({ estado: 'todos', clienteId: 'c2', tipo: 'incidencia' })).toEqual([5])
  })
})

describe('clientesDeLaBandeja', () => {
  test('sin repetir y por orden alfabético', () => {
    expect(clientesDeLaBandeja([ticket(1, { cliente: taller }), ticket(2), ticket(3, { cliente: taller }), ticket(4, { cliente: null })])).toEqual([
      barberia,
      taller,
    ])
  })
})

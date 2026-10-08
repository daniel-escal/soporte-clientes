// Aislamiento entre clientes con sesiones anónimas REALES contra el proyecto de Supabase
// (complementa supabase/tests/rls_*.sql). Se ejecuta con `npm run test:rls`, no en la CI.
// Necesita el inicio de sesión anónimo activado. Cada ejecución crea dos clientes de demo
// (es_demo = true), como cualquier visitante de la demo pública.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { beforeAll, describe, expect, test } from 'vitest'
import type { Database } from '@/lib/tipos-bd'

const url = import.meta.env.VITE_SUPABASE_URL as string
const clave = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string

type Cliente = SupabaseClient<Database>

async function sesionAnonima(): Promise<{ db: Cliente; usuario: string; clienteId: string; webs: string[] }> {
  const db = createClient<Database>(url, clave, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await db.auth.signInAnonymously()
  if (error) throw new Error(`No se pudo abrir la sesión anónima (¿está activado el acceso anónimo?): ${error.message}`)
  const usuario = data.user!.id
  const { data: perfil } = await db.from('perfiles').select('cliente_id').eq('id', usuario).single()
  const { data: webs } = await db.from('webs').select('id')
  return { db, usuario, clienteId: perfil!.cliente_id!, webs: (webs ?? []).map((w) => w.id) }
}

describe('aislamiento entre dos clientes de la demo', () => {
  let a: Awaited<ReturnType<typeof sesionAnonima>>
  let b: Awaited<ReturnType<typeof sesionAnonima>>
  let conversacionB: string
  let ticketB: string

  beforeAll(async () => {
    ;[a, b] = await Promise.all([sesionAnonima(), sesionAnonima()])

    const { data: conv, error: e1 } = await b.db
      .from('conversaciones')
      .insert({ cliente_id: b.clienteId, perfil_id: b.usuario })
      .select('id')
      .single()
    if (e1) throw e1
    conversacionB = conv.id

    const { error: e2 } = await b.db
      .from('mensajes')
      .insert({ conversacion_id: conversacionB, autor: 'cliente', contenido: 'Mensaje privado de B' })
    if (e2) throw e2

    const { data: ticket, error: e3 } = await b.db
      .from('tickets')
      .insert({ cliente_id: b.clienteId, web_id: b.webs[0], titulo: 'Ticket privado de B', descripcion: 'Solo para B', origen: 'cliente' })
      .select('id')
      .single()
    if (e3) throw e3
    ticketB = ticket.id
  })

  test('cada sesión recibe su propio cliente con 2 webs de ejemplo', () => {
    expect(a.clienteId).not.toBe(b.clienteId)
    expect(a.webs).toHaveLength(2)
    expect(b.webs).toHaveLength(2)
  })

  test('A no ve las webs, conversaciones, mensajes ni tickets de B', async () => {
    const [webs, conversaciones, mensajes, tickets] = await Promise.all([
      a.db.from('webs').select('id').in('id', b.webs),
      a.db.from('conversaciones').select('id').eq('id', conversacionB),
      a.db.from('mensajes').select('id').eq('conversacion_id', conversacionB),
      a.db.from('tickets').select('id').eq('id', ticketB),
    ])
    expect(webs.data).toEqual([])
    expect(conversaciones.data).toEqual([])
    expect(mensajes.data).toEqual([])
    expect(tickets.data).toEqual([])
  })

  test('A no puede escribir en la conversación de B', async () => {
    const { error } = await a.db
      .from('mensajes')
      .insert({ conversacion_id: conversacionB, autor: 'cliente', contenido: 'intruso' })
    expect(error?.code).toBe('42501')
  })

  test('A no puede abrir un ticket con la web de B', async () => {
    const { error } = await a.db
      .from('tickets')
      .insert({ cliente_id: a.clienteId, web_id: b.webs[0], titulo: 'Con web ajena', descripcion: 'x', origen: 'cliente' })
    expect(error).not.toBeNull()
  })

  test('un cliente no puede hacerse pasar por la IA', async () => {
    const { data: conv } = await a.db
      .from('conversaciones')
      .insert({ cliente_id: a.clienteId, perfil_id: a.usuario })
      .select('id')
      .single()
    const { error } = await a.db.from('mensajes').insert({ conversacion_id: conv!.id, autor: 'ia', contenido: 'Soy la IA' })
    expect(error?.code).toBe('42501')
  })

  test('B no puede cambiar el estado de su propio ticket (solo el admin)', async () => {
    const { data } = await b.db.from('tickets').update({ estado: 'cerrado' }).eq('id', ticketB).select('id')
    expect(data).toEqual([])
    const { data: ticket } = await b.db.from('tickets').select('estado').eq('id', ticketB).single()
    expect(ticket?.estado).toBe('abierto')
  })

  test('sin sesión no se ve nada', async () => {
    const anonimo = createClient<Database>(url, clave, { auth: { persistSession: false } })
    const [webs, tickets] = await Promise.all([anonimo.from('webs').select('id'), anonimo.from('tickets').select('id')])
    expect(webs.data ?? []).toEqual([])
    expect(tickets.data ?? []).toEqual([])
  })
})

import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import type { Database } from '@/lib/tipos-bd'

// Solo configuración pública: la URL y la clave publicable. La seguridad la da RLS en la base de datos.
// Si falta algo, mejor fallar al arrancar con un mensaje claro que a mitad de una petición.
const entorno = z
  .object({
    VITE_SUPABASE_URL: z.url(),
    VITE_SUPABASE_PUBLISHABLE_KEY: z.string().startsWith('sb_publishable_'),
  })
  .parse(import.meta.env)

export const supabase = createClient<Database>(entorno.VITE_SUPABASE_URL, entorno.VITE_SUPABASE_PUBLISHABLE_KEY)

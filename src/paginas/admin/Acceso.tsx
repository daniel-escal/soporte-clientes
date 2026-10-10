import { LogIn } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Marca } from '@/componentes/Marca'
import { Button } from '@/componentes/ui/button'
import { Input } from '@/componentes/ui/input'
import { Label } from '@/componentes/ui/label'
import { supabase } from '@/lib/supabase'

/** Acceso de Daniel al panel. La cuenta la crea él en Supabase; aquí solo se inicia sesión. */
export default function AccesoAdmin() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function entrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const datos = new FormData(evento.currentTarget)
    const email = String(datos.get('email') ?? '').trim()
    const contrasena = String(datos.get('contrasena') ?? '')
    if (!email || !contrasena) {
      setError('Escribe tu email y tu contraseña.')
      return
    }

    setEnviando(true)
    setError(null)
    // Si en este navegador había una sesión de la demo, la sustituye.
    const { data, error: errorAcceso } = await supabase.auth.signInWithPassword({ email, password: contrasena })
    if (errorAcceso || !data.user) {
      setEnviando(false)
      // Mensaje genérico: no se dice si el email existe.
      setError('El email o la contraseña no son correctos.')
      return
    }

    const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', data.user.id).maybeSingle()
    if (perfil?.rol !== 'admin') {
      await supabase.auth.signOut()
      setEnviando(false)
      setError('Esta cuenta no tiene acceso al panel.')
      return
    }
    navigate('/admin', { replace: true })
  }

  return (
    <div className="grid min-h-svh grid-rows-[auto_1fr]">
      <header className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6">
        {/* El nombre accesible empieza por el texto visible (WCAG 2.5.3) */}
        <Link to="/" className="inline-flex">
          <Marca />
          <span className="sr-only">: volver a la entrada</span>
        </Link>
      </header>

      <main className="grid place-items-center px-4 pb-16">
        <form noValidate onSubmit={entrar} className="grid w-full max-w-sm gap-4 rounded-xl border bg-card p-6">
          <div>
            <h1 className="text-xl font-semibold text-texto">Panel de soporte</h1>
            <p className="mt-1 text-sm text-texto-suave">Acceso solo para el administrador.</p>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="username" required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="contrasena">Contraseña</Label>
            <Input id="contrasena" name="contrasena" type="password" autoComplete="current-password" required />
          </div>

          <p role="alert" className="min-h-5 text-sm text-coral">
            {error}
          </p>

          <Button type="submit" variant="marca" size="tactil" disabled={enviando}>
            <LogIn data-icon="inline-start" />
            {enviando ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>
      </main>
    </div>
  )
}

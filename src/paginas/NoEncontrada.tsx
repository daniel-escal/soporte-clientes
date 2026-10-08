import { Link } from 'react-router'
import { Marca } from '@/componentes/Marca'
import { Button } from '@/componentes/ui/button'

export default function NoEncontrada() {
  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col items-start justify-center gap-4 px-4">
      <Marca />
      <h1 className="text-2xl font-semibold text-texto">Esta página no existe</h1>
      <p className="text-texto-suave">Puede que el enlace esté mal escrito o que la página se haya movido.</p>
      <Button asChild variant="outline" size="tactil">
        <Link to="/">Volver al inicio</Link>
      </Button>
    </main>
  )
}

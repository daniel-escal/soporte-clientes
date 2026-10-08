import { createBrowserRouter, RouterProvider } from 'react-router'
import { RutaProtegida } from '@/componentes/RutaProtegida'
import { ProveedorSesion } from '@/lib/sesion'
import Portal from '@/paginas/cliente/Portal'
import Entrada from '@/paginas/Entrada'
import NoEncontrada from '@/paginas/NoEncontrada'

// En GitHub Pages la app vive en /soporte-clientes/ (vite.config.ts → base).
const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

const router = createBrowserRouter(
  [
    { path: '/', element: <Entrada /> },
    {
      element: <RutaProtegida />,
      children: [{ path: '/portal', element: <Portal /> }],
    },
    { path: '*', element: <NoEncontrada /> },
  ],
  { basename },
)

export default function App() {
  return (
    <ProveedorSesion>
      <RouterProvider router={router} />
    </ProveedorSesion>
  )
}

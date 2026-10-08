import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { CargandoPanel, RutaAdmin } from '@/componentes/RutaAdmin'
import { RutaProtegida } from '@/componentes/RutaProtegida'
import { ProveedorSesion } from '@/lib/sesion'
import DetalleSolicitud from '@/paginas/cliente/DetalleSolicitud'
import Portal from '@/paginas/cliente/Portal'
import Entrada from '@/paginas/Entrada'
import NoEncontrada from '@/paginas/NoEncontrada'

// El panel se carga aparte: no pesa en el portal del cliente (docs/SPEC.md, módulo panel).
const AccesoAdmin = lazy(() => import('@/paginas/admin/Acceso'))
const Panel = lazy(() => import('@/paginas/admin/Panel'))
const Bandeja = lazy(() => import('@/paginas/admin/Bandeja'))
const DetalleTicket = lazy(() => import('@/paginas/admin/DetalleTicket'))
const Faq = lazy(() => import('@/paginas/admin/Faq'))

// En GitHub Pages la app vive en /soporte-clientes/ (vite.config.ts → base).
const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

const router = createBrowserRouter(
  [
    { path: '/', element: <Entrada /> },
    {
      element: <RutaProtegida />,
      children: [
        { path: '/portal', element: <Portal /> },
        { path: '/portal/solicitudes/:id', element: <DetalleSolicitud /> },
      ],
    },
    {
      path: '/admin/entrar',
      element: (
        <Suspense fallback={<CargandoPanel />}>
          <AccesoAdmin />
        </Suspense>
      ),
    },
    {
      element: <RutaAdmin />,
      children: [
        {
          path: '/admin',
          element: (
            <Suspense fallback={<CargandoPanel />}>
              <Panel />
            </Suspense>
          ),
          children: [
            { index: true, element: <Bandeja /> },
            { path: 'tickets/:id', element: <DetalleTicket /> },
            { path: 'faq', element: <Faq /> },
          ],
        },
      ],
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

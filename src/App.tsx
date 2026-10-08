import { createBrowserRouter, RouterProvider } from 'react-router'
import Entrada from '@/paginas/Entrada'
import NoEncontrada from '@/paginas/NoEncontrada'

// En GitHub Pages la app vive en /soporte-clientes/ (vite.config.ts → base).
const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

const router = createBrowserRouter(
  [
    { path: '/', element: <Entrada /> },
    { path: '*', element: <NoEncontrada /> },
  ],
  { basename },
)

export default function App() {
  return <RouterProvider router={router} />
}

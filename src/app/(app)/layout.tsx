import { redirect } from 'next/navigation'
import { getSesion } from '@/lib/auth'
import { Shell } from '@/components/Shell'

export const dynamic = 'force-dynamic'

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const sesion = await getSesion()
  if (!sesion) redirect('/login')

  return (
    <Shell usuario={{ nombre: sesion.nombre, rol: sesion.rol, email: sesion.email }}>
      {children}
    </Shell>
  )
}

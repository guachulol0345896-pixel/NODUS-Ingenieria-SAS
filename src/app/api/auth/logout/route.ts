import { cerrarSesion, getSesion } from '@/lib/auth'
import { handler, ok } from '@/lib/api'
import { registrar } from '@/lib/audit'

export const POST = handler(async () => {
  const sesion = await getSesion()
  if (sesion) {
    await registrar({ actor: sesion, accion: 'LOGOUT', entidad: 'usuario', entidadId: sesion.sub })
  }
  await cerrarSesion()
  return ok({ cerrada: true })
})

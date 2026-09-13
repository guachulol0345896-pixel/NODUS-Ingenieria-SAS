import { autenticar, crearSesion } from '@/lib/auth'
import { loginSchema } from '@/lib/validations'
import { fail, handler, ok } from '@/lib/api'
import { ipDeRequest, registrar } from '@/lib/audit'

export const POST = handler(async (req) => {
  const body = loginSchema.parse(await req.json())
  const u = await autenticar(body.email, body.password)

  if (!u) {
    await registrar({
      accion: 'LOGIN_FALLIDO',
      entidad: 'usuario',
      actorNombre: body.email,
      actorRol: 'ANONIMO',
      ip: ipDeRequest(req),
    })
    return fail('Credenciales inválidas', 401)
  }

  const sesion = {
    sub: u.id,
    email: u.email,
    nombre: u.nombre,
    rol: u.rol,
    empresaId: u.empresaId,
  }
  await crearSesion(sesion)
  await registrar({
    actor: sesion,
    accion: 'LOGIN',
    entidad: 'usuario',
    entidadId: u.id,
    ip: ipDeRequest(req),
  })

  return ok({ id: u.id, nombre: u.nombre, rol: u.rol })
})

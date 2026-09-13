import { handler, ok } from '@/lib/api'
import { requireSesion } from '@/lib/auth'
import { ejecutarTransicion } from '@/lib/casos'
import { transicionSchema } from '@/lib/validations'
import { ipDeRequest } from '@/lib/audit'
import type { EstadoCaso } from '@/db/schema'

type Ctx = { params: Promise<{ id: string }> }

/** POST /api/casos/:id/transicion — único punto de cambio de estado. */
export const POST = handler(async (req, ctx: Ctx) => {
  const sesion = await requireSesion()
  const { id } = await ctx.params
  const d = transicionSchema.parse(await req.json())

  const caso = await ejecutarTransicion({
    casoId: id,
    destino: d.destino as EstadoCaso,
    sesion,
    comentario: d.comentario || null,
    ip: ipDeRequest(req),
  })

  return ok({ id: caso.id, estado: caso.estado })
})

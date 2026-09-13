import { db } from '@/db'
import { actividades } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { fail, handler, ok } from '@/lib/api'
import { requireSesion } from '@/lib/auth'
import { registrar } from '@/lib/audit'
import { z } from 'zod'

type Ctx = { params: Promise<{ id: string }> }

const patchSchema = z.object({
  estado: z.enum(['PLANIFICADA', 'EN_CURSO', 'COMPLETADA', 'BLOQUEADA']),
})

export const PATCH = handler(async (req, ctx: Ctx) => {
  const sesion = await requireSesion()
  if (sesion.rol === 'CLIENTE_MIPYME') return fail('Sin permisos', 403)

  const { id } = await ctx.params
  const d = patchSchema.parse(await req.json())

  const [a] = await db.select().from(actividades).where(eq(actividades.id, id)).limit(1)
  if (!a) return fail('Actividad no encontrada', 404)

  await db
    .update(actividades)
    .set({
      estado: d.estado,
      fechaReal: d.estado === 'COMPLETADA' ? new Date() : a.fechaReal,
    })
    .where(eq(actividades.id, id))

  await registrar({
    actor: sesion,
    accion: 'ACTIVIDAD_ACTUALIZADA',
    entidad: 'actividad',
    entidadId: id,
    estadoAnterior: a.estado,
    estadoNuevo: d.estado,
  })

  return ok({ estado: d.estado })
})

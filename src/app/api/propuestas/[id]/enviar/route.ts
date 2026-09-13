/**
 * Envío formal de la propuesta al cliente (REQ-012).
 */

import { db } from '@/db'
import { casos, propuestas } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { fail, handler, ok } from '@/lib/api'
import { requireRol } from '@/lib/auth'
import { notificarCaso } from '@/lib/casos'
import { ipDeRequest, registrar } from '@/lib/audit'

type Ctx = { params: Promise<{ id: string }> }

export const POST = handler(async (req, ctx: Ctx) => {
  const sesion = await requireRol('ADVISORY', 'SUPER_ADMIN')
  const { id } = await ctx.params

  const [p] = await db.select().from(propuestas).where(eq(propuestas.id, id)).limit(1)
  if (!p) return fail('Propuesta no encontrada', 404)
  if (p.estado !== 'LISTA') {
    return fail('La propuesta debe tener el QA aprobado antes de enviarse.', 422)
  }

  await db
    .update(propuestas)
    .set({ estado: 'ENVIADA', enviadaAt: new Date(), updatedAt: new Date() })
    .where(eq(propuestas.id, id))

  const [caso] = await db.select().from(casos).where(eq(casos.id, p.casoId)).limit(1)

  await registrar({
    actor: sesion,
    accion: 'PROPUESTA_ENVIADA',
    entidad: 'propuesta',
    entidadId: id,
    detalle: { caso: caso?.codigo, version: p.version },
    ip: ipDeRequest(req),
  })

  await notificarCaso(p.casoId, {
    titulo: `${caso?.codigo} — propuesta enviada`,
    mensaje: 'La propuesta fue enviada formalmente al cliente.',
    url: `/casos/${p.casoId}`,
  })

  return ok({ enviada: true })
})

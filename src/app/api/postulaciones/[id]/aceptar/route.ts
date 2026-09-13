/**
 * Asignación del consultor responsable (REQ-008).
 * Regla de negocio dura: un caso no puede tener más de un responsable
 * principal activo. Al aceptar una postulación, las demás se rechazan.
 */

import { db } from '@/db'
import { casos, postulaciones } from '@/db/schema'
import { and, eq, ne } from 'drizzle-orm'
import { fail, handler, ok } from '@/lib/api'
import { requireRol } from '@/lib/auth'
import { notificarCaso } from '@/lib/casos'
import { ipDeRequest, registrar } from '@/lib/audit'

type Ctx = { params: Promise<{ id: string }> }

export const POST = handler(async (req, ctx: Ctx) => {
  const sesion = await requireRol('ADVISORY', 'SUPER_ADMIN')
  const { id } = await ctx.params

  const [p] = await db.select().from(postulaciones).where(eq(postulaciones.id, id)).limit(1)
  if (!p) return fail('Postulación no encontrada', 404)

  const [caso] = await db.select().from(casos).where(eq(casos.id, p.casoId)).limit(1)
  if (!caso) return fail('Caso no encontrado', 404)

  if (caso.consultorAsignadoId && caso.consultorAsignadoId !== p.consultorId) {
    return fail(
      'El caso ya tiene un consultor responsable principal. Debe liberarlo antes de reasignar.',
      422,
    )
  }

  await db.transaction(async (tx) => {
    await tx
      .update(postulaciones)
      .set({ estado: 'ACEPTADA' })
      .where(eq(postulaciones.id, id))

    await tx
      .update(postulaciones)
      .set({ estado: 'RECHAZADA', observacion: 'Se asignó otro consultor responsable.' })
      .where(and(eq(postulaciones.casoId, p.casoId), ne(postulaciones.id, id)))

    await tx
      .update(casos)
      .set({ consultorAsignadoId: p.consultorId, asignadoAt: new Date(), updatedAt: new Date() })
      .where(eq(casos.id, p.casoId))
  })

  await registrar({
    actor: sesion,
    accion: 'CONSULTOR_ASIGNADO',
    entidad: 'caso',
    entidadId: caso.id,
    detalle: { caso: caso.codigo, consultorId: p.consultorId },
    ip: ipDeRequest(req),
  })

  await notificarCaso(caso.id, {
    titulo: `${caso.codigo} — consultor asignado`,
    mensaje: 'Se definió el consultor responsable principal del caso.',
    url: `/casos/${caso.id}`,
  })

  return ok({ consultorAsignadoId: p.consultorId })
})

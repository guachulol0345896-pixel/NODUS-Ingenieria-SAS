/**
 * QA metodológico de la propuesta (REQ-010).
 * Sólo Advisory puede aprobar el checklist; sin todos los ítems marcados la
 * propuesta no pasa a estado LISTA y el workflow bloquea el envío al cliente.
 */

import { db } from '@/db'
import { casos, propuestas } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { fail, handler, ok } from '@/lib/api'
import { requireRol } from '@/lib/auth'
import { ITEMS_QA, qaSchema } from '@/lib/validations'
import { ipDeRequest, registrar } from '@/lib/audit'

type Ctx = { params: Promise<{ id: string }> }

export const POST = handler(async (req, ctx: Ctx) => {
  const sesion = await requireRol('ADVISORY', 'SUPER_ADMIN')
  const { id } = await ctx.params
  const d = qaSchema.parse(await req.json())

  const [p] = await db.select().from(propuestas).where(eq(propuestas.id, id)).limit(1)
  if (!p) return fail('Propuesta no encontrada', 404)

  const completo = ITEMS_QA.every((k) => d.checklist[k] === true)

  await db
    .update(propuestas)
    .set({
      qaChecklist: d.checklist,
      qaObservaciones: d.observaciones || null,
      qaAprobadaPor: completo ? sesion.nombre : null,
      estado: completo ? 'LISTA' : 'EN_QA',
      updatedAt: new Date(),
    })
    .where(eq(propuestas.id, id))

  const [caso] = await db.select().from(casos).where(eq(casos.id, p.casoId)).limit(1)

  await registrar({
    actor: sesion,
    accion: completo ? 'QA_APROBADO' : 'QA_REGISTRADO',
    entidad: 'propuesta',
    entidadId: id,
    detalle: { caso: caso?.codigo, checklist: d.checklist },
    ip: ipDeRequest(req),
  })

  return ok({ completo, estado: completo ? 'LISTA' : 'EN_QA' })
})

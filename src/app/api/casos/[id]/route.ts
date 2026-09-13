import { db } from '@/db'
import { casos } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { fail, handler, ok } from '@/lib/api'
import { requireSesion, requireRol } from '@/lib/auth'
import { puedeVerCaso } from '@/lib/casos'
import { cierreSchema, clasificacionSchema } from '@/lib/validations'
import { ipDeRequest, registrar } from '@/lib/audit'

type Ctx = { params: Promise<{ id: string }> }

export const GET = handler(async (_req, ctx: Ctx) => {
  const sesion = await requireSesion()
  const { id } = await ctx.params
  const [caso] = await db.select().from(casos).where(eq(casos.id, id)).limit(1)
  if (!caso) return fail('Caso no encontrado', 404)
  if (!puedeVerCaso(sesion, caso)) return fail('No tiene acceso a este caso', 403)
  return ok(caso)
})

/**
 * PATCH /api/casos/:id
 *  - accion="clasificar" -> REQ-004, taxonomías gobernadas (sólo Advisory)
 *  - accion="cerrar"     -> REQ-018, acta de cierre y evaluación final
 */
export const PATCH = handler(async (req, ctx: Ctx) => {
  const { id } = await ctx.params
  const body = await req.json()
  const [caso] = await db.select().from(casos).where(eq(casos.id, id)).limit(1)
  if (!caso) return fail('Caso no encontrado', 404)

  if (body.accion === 'clasificar') {
    const sesion = await requireRol('ADVISORY', 'SUPER_ADMIN')
    const d = clasificacionSchema.parse(body)
    await db
      .update(casos)
      .set({
        complejidad: d.complejidad,
        tipoIntervencion: d.tipoIntervencion,
        etiquetas: d.etiquetas,
        notasClasificacion: d.notasClasificacion || null,
        updatedAt: new Date(),
      })
      .where(eq(casos.id, id))

    await registrar({
      actor: sesion,
      accion: 'CASO_CLASIFICADO',
      entidad: 'caso',
      entidadId: id,
      detalle: d,
      ip: ipDeRequest(req),
    })
    return ok({ clasificado: true })
  }

  if (body.accion === 'cerrar') {
    const sesion = await requireRol('ADVISORY', 'SUPER_ADMIN')
    const d = cierreSchema.parse(body)
    await db
      .update(casos)
      .set({
        actaCierre: d.actaCierre,
        evaluacionFinal: d.evaluacionFinal,
        valorCerrado: d.valorCerrado ?? null,
        updatedAt: new Date(),
      })
      .where(eq(casos.id, id))

    await registrar({
      actor: sesion,
      accion: 'ACTA_CIERRE_REGISTRADA',
      entidad: 'caso',
      entidadId: id,
      detalle: { evaluacion: d.evaluacionFinal },
      ip: ipDeRequest(req),
    })
    return ok({ registrada: true })
  }

  return fail('Acción no reconocida', 400)
})

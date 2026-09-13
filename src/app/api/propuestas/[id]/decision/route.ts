/**
 * Decisión estructurada del cliente (REQ-013 / REQ-014, plantillas TP6A–TP6E).
 * La negociación no ocurre fuera del flujo: la decisión queda registrada en la
 * propuesta, en la bitácora y dispara la transición correspondiente del caso.
 */

import { db } from '@/db'
import { casos, checklistContratacion, propuestas } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { fail, handler, ok } from '@/lib/api'
import { requireSesion } from '@/lib/auth'
import { decisionSchema } from '@/lib/validations'
import { ejecutarTransicion } from '@/lib/casos'
import { ipDeRequest, registrar } from '@/lib/audit'

type Ctx = { params: Promise<{ id: string }> }

export const POST = handler(async (req, ctx: Ctx) => {
  const sesion = await requireSesion()
  const { id } = await ctx.params
  const d = decisionSchema.parse(await req.json())

  const [p] = await db.select().from(propuestas).where(eq(propuestas.id, id)).limit(1)
  if (!p) return fail('Propuesta no encontrada', 404)

  const [caso] = await db.select().from(casos).where(eq(casos.id, p.casoId)).limit(1)
  if (!caso) return fail('Caso no encontrado', 404)

  // Sólo el cliente dueño del caso (o Super Admin) decide.
  const esCliente = sesion.rol === 'CLIENTE_MIPYME' && sesion.empresaId === caso.empresaId
  if (!esCliente && sesion.rol !== 'SUPER_ADMIN') {
    return fail('Sólo el cliente titular del caso puede registrar la decisión.', 403)
  }
  if (p.estado !== 'ENVIADA') {
    return fail('Sólo se puede decidir sobre una propuesta enviada.', 422)
  }

  await db
    .update(propuestas)
    .set({
      estado: d.decision,
      decisionAt: new Date(),
      decisionComentario: d.comentario,
      updatedAt: new Date(),
    })
    .where(eq(propuestas.id, id))

  // Al aceptar, se pre-marca el primer ítem del checklist de contratación.
  if (d.decision === 'ACEPTADA') {
    const [chk] = await db
      .select()
      .from(checklistContratacion)
      .where(eq(checklistContratacion.casoId, caso.id))
      .limit(1)
    if (chk) {
      await db
        .update(checklistContratacion)
        .set({ propuestaAceptada: true, updatedAt: new Date() })
        .where(eq(checklistContratacion.casoId, caso.id))
    } else {
      await db
        .insert(checklistContratacion)
        .values({ casoId: caso.id, propuestaAceptada: true })
    }
  }

  await registrar({
    actor: sesion,
    accion: `DECISION_${d.decision}`,
    entidad: 'propuesta',
    entidadId: id,
    detalle: { caso: caso.codigo, version: p.version, comentario: d.comentario },
    ip: ipDeRequest(req),
  })

  // Transición automática del caso según la decisión.
  const destino =
    d.decision === 'ACEPTADA'
      ? 'PENDIENTE_CONTRATACION'
      : d.decision === 'AJUSTES_SOLICITADOS'
        ? 'PROPUESTA_EN_DISENO'
        : 'CERRADO'

  if (caso.estado === 'EN_DECISION_CLIENTE') {
    await ejecutarTransicion({
      casoId: caso.id,
      destino,
      sesion,
      comentario: d.comentario,
      ip: ipDeRequest(req),
    })
  }

  return ok({ decision: d.decision, estadoCaso: destino })
})

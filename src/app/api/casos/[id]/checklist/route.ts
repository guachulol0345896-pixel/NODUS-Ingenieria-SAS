/**
 * Checklist de contratación (REQ-015 / REQ-016).
 * NODUS no es parte contractual, pero gobierna la evidencia documental y
 * bloquea el paso a ejecución hasta que el checklist esté completo.
 */

import { db } from '@/db'
import { checklistContratacion } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { handler, ok } from '@/lib/api'
import { requireRol } from '@/lib/auth'
import { checklistSchema } from '@/lib/validations'
import { ipDeRequest, registrar } from '@/lib/audit'

type Ctx = { params: Promise<{ id: string }> }

export const PUT = handler(async (req, ctx: Ctx) => {
  const sesion = await requireRol('ADVISORY', 'SUPER_ADMIN')
  const { id } = await ctx.params
  const d = checklistSchema.parse(await req.json())

  const valores = {
    propuestaAceptada: d.propuestaAceptada,
    contratoFirmado: d.contratoFirmado,
    alcanceConfirmado: d.alcanceConfirmado,
    cronogramaAcordado: d.cronogramaAcordado,
    condicionesEconomicas: d.condicionesEconomicas,
    datosTratamiento: d.datosTratamiento,
    observaciones: d.observaciones || null,
    updatedAt: new Date(),
  }

  const [existente] = await db
    .select()
    .from(checklistContratacion)
    .where(eq(checklistContratacion.casoId, id))
    .limit(1)

  if (existente) {
    await db
      .update(checklistContratacion)
      .set(valores)
      .where(eq(checklistContratacion.casoId, id))
  } else {
    await db.insert(checklistContratacion).values({ casoId: id, ...valores })
  }

  await registrar({
    actor: sesion,
    accion: 'CHECKLIST_CONTRATACION_ACTUALIZADO',
    entidad: 'caso',
    entidadId: id,
    detalle: valores,
    ip: ipDeRequest(req),
  })

  const completo = Object.values(d).every((v) => typeof v !== 'boolean' || v === true)
  return ok({ completo })
})

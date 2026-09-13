/**
 * Propuestas (REQ-009): plantillas TP4A–TP4H con versionamiento automático.
 */

import { db } from '@/db'
import { casos, propuestas } from '@/db/schema'
import { desc, eq } from 'drizzle-orm'
import { fail, handler, ok } from '@/lib/api'
import { requireSesion } from '@/lib/auth'
import { propuestaSchema } from '@/lib/validations'
import { notificarCaso } from '@/lib/casos'
import { ipDeRequest, registrar } from '@/lib/audit'

export const POST = handler(async (req) => {
  const sesion = await requireSesion()
  if (!['CONSULTOR', 'ADVISORY', 'SUPER_ADMIN'].includes(sesion.rol)) {
    return fail('Sólo el consultor responsable o Advisory pueden crear propuestas.', 403)
  }

  const d = propuestaSchema.parse(await req.json())
  const [caso] = await db.select().from(casos).where(eq(casos.id, d.casoId)).limit(1)
  if (!caso) return fail('Caso no encontrado', 404)

  if (sesion.rol === 'CONSULTOR' && caso.consultorAsignadoId !== sesion.sub) {
    return fail('No es el consultor responsable de este caso.', 403)
  }

  const estadosValidos = ['ASIGNADO', 'PROPUESTA_EN_DISENO']
  if (!estadosValidos.includes(caso.estado)) {
    return fail(
      `No se pueden crear versiones de propuesta en el estado actual (${caso.estado}).`,
      422,
    )
  }

  // Versionamiento: la nueva propuesta es la versión n+1 del caso.
  const [ultima] = await db
    .select({ version: propuestas.version })
    .from(propuestas)
    .where(eq(propuestas.casoId, d.casoId))
    .orderBy(desc(propuestas.version))
    .limit(1)

  const version = (ultima?.version ?? 0) + 1

  const [p] = await db
    .insert(propuestas)
    .values({
      casoId: d.casoId,
      version,
      titulo: d.titulo,
      resumen: d.resumen,
      alcance: d.alcance,
      metodologia: d.metodologia,
      entregables: d.entregables,
      cronograma: d.cronograma,
      supuestos: d.supuestos || null,
      valorEstimado: d.valorEstimado ?? null,
      duracionDias: d.duracionDias ?? null,
      creadaPorId: sesion.sub,
    })
    .returning()

  await registrar({
    actor: sesion,
    accion: 'PROPUESTA_CREADA',
    entidad: 'propuesta',
    entidadId: p.id,
    detalle: { caso: caso.codigo, version },
    ip: ipDeRequest(req),
  })

  await notificarCaso(caso.id, {
    titulo: `${caso.codigo} — propuesta v${version}`,
    mensaje: `${sesion.nombre} registró una nueva versión de la propuesta.`,
    url: `/casos/${caso.id}`,
    excluir: sesion.sub,
  })

  return ok(p, 201)
})

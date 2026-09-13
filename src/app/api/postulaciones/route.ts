/**
 * Bolsa interna de consultores (REQ-006, REQ-007, REQ-008).
 */

import { db } from '@/db'
import { casos, consultorPerfiles, postulaciones } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { fail, handler, ok } from '@/lib/api'
import { requireRol } from '@/lib/auth'
import { postulacionSchema } from '@/lib/validations'
import { notificarCaso } from '@/lib/casos'
import { ipDeRequest, registrar } from '@/lib/audit'

/** POST /api/postulaciones — el consultor se postula con la plantilla T3C. */
export const POST = handler(async (req) => {
  const sesion = await requireRol('CONSULTOR', 'SUPER_ADMIN')
  const d = postulacionSchema.parse(await req.json())

  const [caso] = await db.select().from(casos).where(eq(casos.id, d.casoId)).limit(1)
  if (!caso) return fail('Caso no encontrado', 404)

  // REQ-006: sólo se puede postular a casos publicados en la bolsa.
  if (caso.estado !== 'EN_POSTULACION') {
    return fail('El caso no está abierto a postulaciones.', 422)
  }

  // Filtro de elegibilidad por especialidad y disponibilidad.
  const [perfil] = await db
    .select()
    .from(consultorPerfiles)
    .where(eq(consultorPerfiles.usuarioId, sesion.sub))
    .limit(1)

  if (!perfil) return fail('Su perfil de consultor no está configurado.', 422)
  if (perfil.disponibilidad === 'NO_DISPONIBLE') {
    return fail('Su disponibilidad actual no permite postularse.', 422)
  }
  if (!perfil.especialidades.includes(caso.areaNegocio)) {
    return fail(
      `El caso pertenece al área ${caso.areaNegocio} y no coincide con sus especialidades.`,
      422,
    )
  }

  const [duplicada] = await db
    .select()
    .from(postulaciones)
    .where(and(eq(postulaciones.casoId, d.casoId), eq(postulaciones.consultorId, sesion.sub)))
    .limit(1)
  if (duplicada) return fail('Ya se postuló a este caso.', 409)

  const [p] = await db
    .insert(postulaciones)
    .values({
      casoId: d.casoId,
      consultorId: sesion.sub,
      enfoque: d.enfoque,
      experiencia: d.experiencia,
      tiempoEstimado: d.tiempoEstimado,
    })
    .returning()

  await registrar({
    actor: sesion,
    accion: 'POSTULACION_CREADA',
    entidad: 'postulacion',
    entidadId: p.id,
    detalle: { caso: caso.codigo },
    ip: ipDeRequest(req),
  })

  await notificarCaso(caso.id, {
    titulo: `${caso.codigo} — nueva postulación`,
    mensaje: `${sesion.nombre} se postuló al caso.`,
    url: `/casos/${caso.id}`,
    excluir: sesion.sub,
  })

  return ok(p, 201)
})

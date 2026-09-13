import { db } from '@/db'
import { actividades, casos } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { fail, handler, ok } from '@/lib/api'
import { requireSesion } from '@/lib/auth'
import { actividadSchema } from '@/lib/validations'
import { ipDeRequest, registrar } from '@/lib/audit'

/** POST /api/actividades — seguimiento de hitos durante la ejecución (REQ-017). */
export const POST = handler(async (req) => {
  const sesion = await requireSesion()
  if (sesion.rol === 'CLIENTE_MIPYME') return fail('Sin permisos', 403)

  const d = actividadSchema.parse(await req.json())
  const [caso] = await db.select().from(casos).where(eq(casos.id, d.casoId)).limit(1)
  if (!caso) return fail('Caso no encontrado', 404)

  const [a] = await db
    .insert(actividades)
    .values({
      casoId: d.casoId,
      titulo: d.titulo,
      descripcion: d.descripcion || null,
      fechaPlan: d.fechaPlan ? new Date(d.fechaPlan) : null,
      responsableId: caso.consultorAsignadoId ?? sesion.sub,
    })
    .returning()

  await registrar({
    actor: sesion,
    accion: 'ACTIVIDAD_CREADA',
    entidad: 'actividad',
    entidadId: a.id,
    detalle: { caso: caso.codigo, titulo: a.titulo },
    ip: ipDeRequest(req),
  })

  return ok(a, 201)
})

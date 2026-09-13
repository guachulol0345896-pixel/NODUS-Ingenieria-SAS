import { db } from '@/db'
import { notificaciones } from '@/db/schema'
import { and, desc, eq } from 'drizzle-orm'
import { handler, ok } from '@/lib/api'
import { requireSesion } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export const GET = handler(async () => {
  const sesion = await requireSesion()
  const filas = await db
    .select()
    .from(notificaciones)
    .where(eq(notificaciones.usuarioId, sesion.sub))
    .orderBy(desc(notificaciones.createdAt))
    .limit(30)
  return ok(filas)
})

/** POST — marca todas las notificaciones del usuario como leídas. */
export const POST = handler(async () => {
  const sesion = await requireSesion()
  await db
    .update(notificaciones)
    .set({ leida: true })
    .where(and(eq(notificaciones.usuarioId, sesion.sub), eq(notificaciones.leida, false)))
  return ok({ leidas: true })
})

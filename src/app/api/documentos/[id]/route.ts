import { db } from '@/db'
import { casos, documentos } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { fail, handler } from '@/lib/api'
import { requireSesion } from '@/lib/auth'
import { puedeVerCaso } from '@/lib/casos'
import { registrar } from '@/lib/audit'
import { NextResponse } from 'next/server'

type Ctx = { params: Promise<{ id: string }> }

/** GET /api/documentos/:id — descarga controlada por permisos. */
export const GET = handler(async (_req, ctx: Ctx) => {
  const sesion = await requireSesion()
  const { id } = await ctx.params

  const [doc] = await db.select().from(documentos).where(eq(documentos.id, id)).limit(1)
  if (!doc) return fail('Documento no encontrado', 404)

  if (doc.casoId) {
    const [caso] = await db.select().from(casos).where(eq(casos.id, doc.casoId)).limit(1)
    if (!caso || !puedeVerCaso(sesion, caso)) return fail('Sin acceso al documento', 403)
  }

  await registrar({
    actor: sesion,
    accion: 'DOCUMENTO_DESCARGADO',
    entidad: 'documento',
    entidadId: doc.id,
    detalle: { nombre: doc.nombre },
  })

  const cuerpo = new Uint8Array(doc.contenido)
  return new NextResponse(cuerpo, {
    headers: {
      'Content-Type': doc.mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(doc.nombre)}"`,
      'Content-Length': String(doc.tamano),
    },
  }) as unknown as NextResponse
})

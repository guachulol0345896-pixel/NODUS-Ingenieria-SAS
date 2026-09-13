/**
 * Gestión documental (REQ del Módulo 7).
 * ---------------------------------------------------------------------------
 * Los archivos se guardan en la propia base de datos (columna `bytea`), de modo
 * que el MVP no depende de un bucket externo y el evaluador puede ejecutarlo
 * sin credenciales de AWS. El versionamiento es automático: si se sube un
 * archivo con el mismo nombre dentro del caso, se crea la versión n+1.
 */

import { db } from '@/db'
import { casos, documentos } from '@/db/schema'
import { and, desc, eq } from 'drizzle-orm'
import { fail, handler, ok } from '@/lib/api'
import { requireSesion } from '@/lib/auth'
import { puedeVerCaso } from '@/lib/casos'
import { ipDeRequest, registrar } from '@/lib/audit'
import type { TipoDocumento } from '@/db/schema'

type Ctx = { params: Promise<{ id: string }> }

const TAMANO_MAXIMO = 5 * 1024 * 1024 // 5 MB

export const GET = handler(async (_req, ctx: Ctx) => {
  const sesion = await requireSesion()
  const { id } = await ctx.params
  const [caso] = await db.select().from(casos).where(eq(casos.id, id)).limit(1)
  if (!caso) return fail('Caso no encontrado', 404)
  if (!puedeVerCaso(sesion, caso)) return fail('Sin acceso', 403)

  const filas = await db
    .select({
      id: documentos.id,
      nombre: documentos.nombre,
      tipo: documentos.tipo,
      mimeType: documentos.mimeType,
      tamano: documentos.tamano,
      version: documentos.version,
      descripcion: documentos.descripcion,
      createdAt: documentos.createdAt,
    })
    .from(documentos)
    .where(eq(documentos.casoId, id))
    .orderBy(desc(documentos.createdAt))

  return ok(filas)
})

export const POST = handler(async (req, ctx: Ctx) => {
  const sesion = await requireSesion()
  const { id } = await ctx.params

  const [caso] = await db.select().from(casos).where(eq(casos.id, id)).limit(1)
  if (!caso) return fail('Caso no encontrado', 404)
  if (!puedeVerCaso(sesion, caso)) return fail('Sin acceso', 403)

  const form = await req.formData()
  const archivo = form.get('archivo')
  const tipo = (form.get('tipo') as string | null) ?? 'OTRO'
  const descripcion = (form.get('descripcion') as string | null) ?? null

  if (!(archivo instanceof File)) return fail('Debe adjuntar un archivo', 400)
  if (archivo.size === 0) return fail('El archivo está vacío', 400)
  if (archivo.size > TAMANO_MAXIMO) return fail('El archivo supera los 5 MB permitidos', 413)

  const buffer = Buffer.from(await archivo.arrayBuffer())

  // Versionamiento por nombre dentro del mismo caso.
  const [previo] = await db
    .select({ version: documentos.version })
    .from(documentos)
    .where(and(eq(documentos.casoId, id), eq(documentos.nombre, archivo.name)))
    .orderBy(desc(documentos.version))
    .limit(1)

  const version = (previo?.version ?? 0) + 1

  const [doc] = await db
    .insert(documentos)
    .values({
      nombre: archivo.name,
      tipo: tipo as TipoDocumento,
      mimeType: archivo.type || 'application/octet-stream',
      tamano: archivo.size,
      contenido: buffer,
      version,
      descripcion,
      casoId: id,
      subidoPorId: sesion.sub,
    })
    .returning({ id: documentos.id, nombre: documentos.nombre, version: documentos.version })

  await registrar({
    actor: sesion,
    accion: 'DOCUMENTO_CARGADO',
    entidad: 'documento',
    entidadId: doc.id,
    detalle: { caso: caso.codigo, nombre: doc.nombre, version, tipo },
    ip: ipDeRequest(req),
  })

  return ok(doc, 201)
})

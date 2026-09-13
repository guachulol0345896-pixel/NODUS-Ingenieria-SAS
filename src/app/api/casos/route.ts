import { db } from '@/db'
import { casos, empresas, transiciones } from '@/db/schema'
import { and, desc, eq, ilike, or, type SQL } from 'drizzle-orm'
import { handler, ok } from '@/lib/api'
import { requireSesion } from '@/lib/auth'
import { filtroVisibilidad, siguienteCodigo } from '@/lib/casos'
import { casoSchema } from '@/lib/validations'
import { calcularVencimiento } from '@/lib/sla'
import { ipDeRequest, registrar } from '@/lib/audit'
import type { EstadoCaso } from '@/db/schema'

/** GET /api/casos?estado=&q= — listado filtrado por la visibilidad del rol. */
export const GET = handler(async (req) => {
  const sesion = await requireSesion()
  const url = new URL(req.url)
  const estado = url.searchParams.get('estado')
  const q = url.searchParams.get('q')

  const condiciones: SQL[] = []
  const visibilidad = filtroVisibilidad(sesion)
  if (visibilidad) condiciones.push(visibilidad as SQL)
  if (estado) condiciones.push(eq(casos.estado, estado as EstadoCaso))
  if (q) {
    condiciones.push(
      or(ilike(casos.titulo, `%${q}%`), ilike(casos.codigo, `%${q}%`))! ,
    )
  }

  const filas = await db
    .select({
      id: casos.id,
      codigo: casos.codigo,
      titulo: casos.titulo,
      estado: casos.estado,
      urgencia: casos.urgencia,
      impacto: casos.impacto,
      areaNegocio: casos.areaNegocio,
      slaVenceAt: casos.slaVenceAt,
      slaHoras: casos.slaHoras,
      createdAt: casos.createdAt,
      empresa: empresas.nombre,
    })
    .from(casos)
    .innerJoin(empresas, eq(casos.empresaId, empresas.id))
    .where(condiciones.length ? and(...condiciones) : undefined)
    .orderBy(desc(casos.createdAt))
    .limit(200)

  return ok(filas)
})

/** POST /api/casos — alta de caso desde dentro de la plataforma. */
export const POST = handler(async (req) => {
  const sesion = await requireSesion()
  const d = casoSchema.parse(await req.json())

  // Un cliente sólo puede crear casos para su propia empresa.
  const empresaId =
    sesion.rol === 'CLIENTE_MIPYME' ? (sesion.empresaId ?? d.empresaId) : d.empresaId

  const codigo = await siguienteCodigo()
  const { slaVenceAt, slaHoras } = await calcularVencimiento('CREADO')

  const [caso] = await db
    .insert(casos)
    .values({
      codigo,
      titulo: d.titulo,
      descripcion: d.descripcion,
      areaNegocio: d.areaNegocio,
      urgencia: d.urgencia,
      impacto: d.impacto,
      empresaId,
      creadoPorId: sesion.sub,
      slaVenceAt,
      slaHoras,
    })
    .returning()

  await db.insert(transiciones).values({
    casoId: caso.id,
    estadoAnterior: null,
    estadoNuevo: 'CREADO',
    actorId: sesion.sub,
    actorNombre: sesion.nombre,
    comentario: 'Caso registrado desde la plataforma.',
  })

  await registrar({
    actor: sesion,
    accion: 'CASO_CREADO',
    entidad: 'caso',
    entidadId: caso.id,
    estadoNuevo: 'CREADO',
    detalle: { codigo },
    ip: ipDeRequest(req),
  })

  return ok(caso, 201)
})

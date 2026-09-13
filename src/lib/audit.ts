/**
 * Bitácora y trazabilidad (REQ-005).
 * ---------------------------------------------------------------------------
 * Un único punto de escritura. Los registros son de sólo inserción: la
 * aplicación nunca actualiza ni borra filas de `bitacora`.
 */

import { db } from '@/db'
import { bitacora } from '@/db/schema'
import type { Sesion } from '@/lib/auth'

export type EntradaBitacora = {
  actor?: Sesion | null
  actorNombre?: string
  actorRol?: string
  accion: string
  entidad: string
  entidadId?: string | null
  estadoAnterior?: string | null
  estadoNuevo?: string | null
  detalle?: unknown
  ip?: string | null
}

export async function registrar(e: EntradaBitacora) {
  await db.insert(bitacora).values({
    actorId: e.actor?.sub ?? null,
    actorNombre: e.actor?.nombre ?? e.actorNombre ?? 'Sistema',
    actorRol: e.actor?.rol ?? e.actorRol ?? 'SISTEMA',
    accion: e.accion,
    entidad: e.entidad,
    entidadId: e.entidadId ?? null,
    estadoAnterior: e.estadoAnterior ?? null,
    estadoNuevo: e.estadoNuevo ?? null,
    detalle: (e.detalle ?? null) as never,
    ip: e.ip ?? null,
  })
}

/** Extrae la IP del cliente de las cabeceras de la petición. */
export function ipDeRequest(req: Request): string | null {
  const h = req.headers
  return (
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    h.get('x-real-ip') ??
    null
  )
}

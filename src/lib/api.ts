/**
 * Helpers para los Route Handlers: respuestas homogéneas y manejo de errores.
 * Todas las APIs devuelven `{ ok, data }` o `{ ok:false, error, detalles? }`.
 */

import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { ErrorAutorizacion } from '@/lib/auth'
import { ErrorWorkflow } from '@/lib/casos'

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status })
}

export function fail(error: string, status = 400, detalles?: unknown) {
  return NextResponse.json({ ok: false, error, detalles }, { status })
}

/** Envuelve un handler y traduce las excepciones conocidas a HTTP. */
export function handler<T extends unknown[]>(
  fn: (req: Request, ...args: T) => Promise<NextResponse>,
) {
  return async (req: Request, ...args: T): Promise<NextResponse> => {
    try {
      return await fn(req, ...args)
    } catch (e) {
      if (e instanceof ZodError) {
        return fail('Datos inválidos', 422, e.issues.map((i) => ({
          campo: i.path.join('.'),
          mensaje: i.message,
        })))
      }
      if (e instanceof ErrorAutorizacion) return fail(e.message, e.status)
      if (e instanceof ErrorWorkflow) return fail(e.message, 422)
      console.error('[API]', e)
      const msg = e instanceof Error ? e.message : 'Error interno del servidor'
      return fail(msg, 500)
    }
  }
}

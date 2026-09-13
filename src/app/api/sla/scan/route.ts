/**
 * Motor de SLA — POST /api/sla/scan
 * ---------------------------------------------------------------------------
 * Recorre los casos activos, marca los incumplimientos, crea alertas y
 * notifica a Advisory y al consultor responsable (escalamiento).
 *
 * En producción se ejecuta automáticamente con Vercel Cron (ver vercel.json).
 * También puede dispararse manualmente desde la pantalla "SLA y alertas".
 */

import { handler, ok } from '@/lib/api'
import { requireSesion } from '@/lib/auth'
import { escanearSla } from '@/lib/sla'

export const dynamic = 'force-dynamic'

export const POST = handler(async () => {
  await requireSesion()
  const r = await escanearSla()
  return ok(r)
})

/** GET permite que el cron de Vercel lo invoque sin cuerpo. */
export const GET = handler(async (req) => {
  const auth = req.headers.get('authorization')
  const secreto = process.env.CRON_SECRET

  if (secreto && auth === `Bearer ${secreto}`) {
    return ok(await escanearSla())
  }
  await requireSesion()
  return ok(await escanearSla())
})

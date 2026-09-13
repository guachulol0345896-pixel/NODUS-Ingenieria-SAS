import { handler, ok } from '@/lib/api'
import { requireRol } from '@/lib/auth'
import { calcularKpis } from '@/lib/kpis'

export const dynamic = 'force-dynamic'

export const GET = handler(async () => {
  await requireRol('ADVISORY', 'SUPER_ADMIN')
  return ok(await calcularKpis())
})

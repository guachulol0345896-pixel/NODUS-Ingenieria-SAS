import { db } from '@/db'
import { bitacora } from '@/db/schema'
import { desc, eq, and, type SQL } from 'drizzle-orm'
import { Chip, Tarjeta, TarjetaCabecera, Vacio } from '@/components/ui'
import { fechaHora } from '@/lib/utils'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

/**
 * Bitácora / auditoría (REQ-005).
 * Registro de sólo lectura: la aplicación nunca modifica ni elimina entradas.
 */
export default async function BitacoraPage({
  searchParams,
}: {
  searchParams: Promise<{ entidad?: string; accion?: string }>
}) {
  const sp = await searchParams

  const condiciones: SQL[] = []
  if (sp.entidad) condiciones.push(eq(bitacora.entidad, sp.entidad))
  if (sp.accion) condiciones.push(eq(bitacora.accion, sp.accion))

  const filas = await db
    .select()
    .from(bitacora)
    .where(condiciones.length ? and(...condiciones) : undefined)
    .orderBy(desc(bitacora.createdAt))
    .limit(300)

  const entidades = [...new Set(filas.map((f) => f.entidad))]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Bitácora y auditoría</h1>
        <p className="mt-0.5 text-sm text-slate-600">
          Registro inmutable de actor, acción, entidad y cambio de estado.
        </p>
      </div>

      <Tarjeta className="p-4">
        <form action="/bitacora" className="flex flex-wrap gap-3">
          <select name="entidad" defaultValue={sp.entidad ?? ''} className="campo max-w-48">
            <option value="">Todas las entidades</option>
            {entidades.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
          <input
            name="accion"
            defaultValue={sp.accion ?? ''}
            placeholder="Acción exacta (p. ej. CASO_TRANSICION)"
            className="campo max-w-72"
          />
          <button className="btn-secundario">Filtrar</button>
          {(sp.entidad || sp.accion) && (
            <Link href="/bitacora" className="btn-secundario">
              Limpiar
            </Link>
          )}
        </form>
      </Tarjeta>

      <Tarjeta>
        <TarjetaCabecera
          titulo={`${filas.length} registro(s)`}
          descripcion="Se muestran los 300 eventos más recientes"
        />
        {filas.length === 0 ? (
          <Vacio mensaje="No hay registros en la bitácora." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3 font-medium">Fecha</th>
                  <th className="px-5 py-3 font-medium">Actor</th>
                  <th className="px-5 py-3 font-medium">Rol</th>
                  <th className="px-5 py-3 font-medium">Acción</th>
                  <th className="px-5 py-3 font-medium">Entidad</th>
                  <th className="px-5 py-3 font-medium">Cambio de estado</th>
                  <th className="px-5 py-3 font-medium">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filas.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-5 py-3 text-xs text-slate-500">
                      {fechaHora(b.createdAt)}
                    </td>
                    <td className="px-5 py-3 text-slate-800">{b.actorNombre}</td>
                    <td className="px-5 py-3">
                      <Chip>{b.actorRol}</Chip>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-700">{b.accion}</td>
                    <td className="px-5 py-3 text-slate-600">
                      {b.entidad}
                      {b.entidadId && (
                        <span className="ml-1 font-mono text-[11px] text-slate-400">
                          {b.entidadId.slice(-6)}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-600">
                      {b.estadoAnterior || b.estadoNuevo
                        ? `${b.estadoAnterior ?? '—'} → ${b.estadoNuevo ?? '—'}`
                        : '—'}
                    </td>
                    <td className="px-5 py-3 font-mono text-[11px] text-slate-400">{b.ip ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>
    </div>
  )
}

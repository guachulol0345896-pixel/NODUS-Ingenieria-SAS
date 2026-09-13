import Link from 'next/link'
import { db } from '@/db'
import { casos, empresas } from '@/db/schema'
import { and, desc, eq, ilike, or, type SQL } from 'drizzle-orm'
import { getSesion } from '@/lib/auth'
import { filtroVisibilidad } from '@/lib/casos'
import { ESTADOS, ETIQUETA_ESTADO } from '@/lib/workflow'
import { estadoSla, horasRestantes } from '@/lib/sla'
import { Chip, ChipEstado, Tarjeta, Vacio } from '@/components/ui'
import { fecha } from '@/lib/utils'
import type { EstadoCaso } from '@/db/schema'

export const dynamic = 'force-dynamic'

export default async function CasosPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; q?: string }>
}) {
  const sesion = (await getSesion())!
  const sp = await searchParams

  const condiciones: SQL[] = []
  const visibilidad = filtroVisibilidad(sesion)
  if (visibilidad) condiciones.push(visibilidad as SQL)
  if (sp.estado) condiciones.push(eq(casos.estado, sp.estado as EstadoCaso))
  if (sp.q) {
    condiciones.push(or(ilike(casos.titulo, `%${sp.q}%`), ilike(casos.codigo, `%${sp.q}%`))!)
  }

  const filas = await db
    .select({
      id: casos.id,
      codigo: casos.codigo,
      titulo: casos.titulo,
      estado: casos.estado,
      urgencia: casos.urgencia,
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

  const conteoPorEstado = new Map<string, number>()
  filas.forEach((f) => conteoPorEstado.set(f.estado, (conteoPorEstado.get(f.estado) ?? 0) + 1))

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Casos</h1>
          <p className="mt-0.5 text-sm text-slate-600">
            {filas.length} caso{filas.length === 1 ? '' : 's'} visible
            {filas.length === 1 ? '' : 's'} para su rol
          </p>
        </div>
        <Link href="/casos/nuevo" className="btn-primario">
          Nuevo caso
        </Link>
      </div>

      {/* Buscador y filtros */}
      <Tarjeta className="p-4">
        <form className="flex flex-wrap gap-3" action="/casos">
          <input
            name="q"
            defaultValue={sp.q ?? ''}
            placeholder="Buscar por título o código…"
            className="campo max-w-xs flex-1"
          />
          <select name="estado" defaultValue={sp.estado ?? ''} className="campo max-w-56">
            <option value="">Todos los estados</option>
            {ESTADOS.map((e) => (
              <option key={e} value={e}>
                {ETIQUETA_ESTADO[e]}
              </option>
            ))}
          </select>
          <button className="btn-secundario">Filtrar</button>
          {(sp.q || sp.estado) && (
            <Link href="/casos" className="btn-secundario">
              Limpiar
            </Link>
          )}
        </form>
      </Tarjeta>

      <Tarjeta>
        {filas.length === 0 ? (
          <Vacio mensaje="No hay casos que coincidan con el filtro." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3 font-medium">Código</th>
                  <th className="px-5 py-3 font-medium">Caso</th>
                  <th className="px-5 py-3 font-medium">Empresa</th>
                  <th className="px-5 py-3 font-medium">Área</th>
                  <th className="px-5 py-3 font-medium">Estado</th>
                  <th className="px-5 py-3 font-medium">SLA</th>
                  <th className="px-5 py-3 font-medium">Creado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filas.map((c) => {
                  const sla = estadoSla(c.slaVenceAt, c.slaHoras)
                  const h = horasRestantes(c.slaVenceAt)
                  return (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-mono text-xs text-slate-500">
                        <Link href={`/casos/${c.id}`}>{c.codigo}</Link>
                      </td>
                      <td className="px-5 py-3">
                        <Link
                          href={`/casos/${c.id}`}
                          className="font-medium text-slate-900 hover:text-marca-600"
                        >
                          {c.titulo}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-slate-600">{c.empresa}</td>
                      <td className="px-5 py-3 text-slate-600">{c.areaNegocio}</td>
                      <td className="px-5 py-3">
                        <ChipEstado estado={c.estado} />
                      </td>
                      <td className="px-5 py-3">
                        {sla === 'VENCIDO' && <Chip tono="peligro">Vencido</Chip>}
                        {sla === 'POR_VENCER' && <Chip tono="alerta">{h} h</Chip>}
                        {sla === 'EN_TIEMPO' && <Chip tono="exito">{h} h</Chip>}
                        {sla === 'SIN_SLA' && <span className="text-xs text-slate-400">—</span>}
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-500">{fecha(c.createdAt)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>
    </div>
  )
}

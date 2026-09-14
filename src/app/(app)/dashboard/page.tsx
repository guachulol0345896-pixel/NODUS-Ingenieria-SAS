import Link from 'next/link'
import { db } from '@/db'
import { casos, empresas } from '@/db/schema'
import { and, desc, eq, type SQL } from 'drizzle-orm'
import { getSesion } from '@/lib/auth'
import { filtroVisibilidad } from '@/lib/casos'
import { calcularKpis } from '@/lib/kpis'
import { estadoSla, horasRestantes } from '@/lib/sla'
import { ChipEstado, Chip, Kpi, Tarjeta, TarjetaCabecera, Vacio } from '@/components/ui'
import { GraficoEstados } from '@/components/GraficoEstados'
import { fecha, moneda } from '@/lib/utils'
import { ETIQUETA_ROL } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const sesion = (await getSesion())!
  const esInterno = sesion.rol === 'ADVISORY' || sesion.rol === 'SUPER_ADMIN'

  const visibilidad = filtroVisibilidad(sesion)
  const condiciones: SQL[] = visibilidad ? [visibilidad as SQL] : []

  const misCasos = await db
    .select({
      id: casos.id,
      codigo: casos.codigo,
      titulo: casos.titulo,
      estado: casos.estado,
      slaVenceAt: casos.slaVenceAt,
      slaHoras: casos.slaHoras,
      createdAt: casos.createdAt,
      empresa: empresas.nombre,
    })
    .from(casos)
    .innerJoin(empresas, eq(casos.empresaId, empresas.id))
    .where(condiciones.length ? and(...condiciones) : undefined)
    .orderBy(desc(casos.updatedAt))
    .limit(8)

  const kpis = esInterno ? await calcularKpis() : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
        <p className="mt-0.5 text-sm text-slate-600">
          {sesion.nombre} — {ETIQUETA_ROL[sesion.rol]}
        </p>
      </div>

      {kpis && (
        <>
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Indicadores operativos
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <Kpi
                titulo="Casos activos"
                valor={kpis.operativos.casosActivos}
                detalle={`${kpis.operativos.casosTotales} casos en total`}
              />
              <Kpi
                titulo="SLA vencidos"
                valor={kpis.operativos.slaVencidos}
                tono={kpis.operativos.slaVencidos > 0 ? 'peligro' : 'exito'}
                detalle={`${kpis.operativos.slaPorVencer} próximos a vencer`}
              />
              <Kpi
                titulo="Cumplimiento SLA"
                valor={`${kpis.operativos.cumplimientoSla}%`}
                tono={kpis.operativos.cumplimientoSla >= 80 ? 'exito' : 'alerta'}
              />
              <Kpi
                titulo="Tiempo de clasificación"
                valor={
                  kpis.operativos.tiempoClasificacion === null
                    ? '—'
                    : `${kpis.operativos.tiempoClasificacion} h`
                }
                detalle="Promedio desde el registro"
              />
              <Kpi
                titulo="Casos sin asignar"
                valor={kpis.operativos.sinAsignar}
                tono={kpis.operativos.sinAsignar > 0 ? 'alerta' : 'exito'}
                detalle="Activos sin consultor responsable"
              />
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Indicadores comerciales
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi
                titulo="Conversión de propuestas"
                valor={`${kpis.comerciales.conversion}%`}
                detalle={`${kpis.comerciales.propuestasAceptadas} de ${kpis.comerciales.propuestasEnviadas} enviadas`}
              />
              <Kpi titulo="Ticket promedio" valor={moneda(kpis.comerciales.ticketPromedio)} />
              <Kpi titulo="Pipeline en decisión" valor={moneda(kpis.comerciales.pipeline)} />
              <Kpi
                titulo="Consultores activos"
                valor={kpis.ecosistema.consultoresActivos}
                detalle={`${kpis.ecosistema.empresasAtendidas} empresas atendidas`}
              />
            </div>
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            <Tarjeta>
              <TarjetaCabecera
                titulo="Casos por estado"
                descripcion="Distribución del pipeline en el ciclo de vida"
              />
              <div className="p-5">
                <GraficoEstados datos={kpis.porEstado} />
              </div>
            </Tarjeta>

            <Tarjeta>
              <TarjetaCabecera titulo="Casos por área de negocio" />
              <div className="space-y-3 p-5">
                {kpis.porArea.map((a) => {
                  const max = Math.max(...kpis.porArea.map((x) => x.total))
                  return (
                    <div key={a.area}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="text-slate-700">{a.area}</span>
                        <span className="font-medium tabular-nums text-slate-900">{a.total}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-marca-500"
                          style={{ width: `${(a.total / max) * 100}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </Tarjeta>
          </div>
        </>
      )}

      <Tarjeta>
        <TarjetaCabecera
          titulo={esInterno ? 'Actividad reciente' : 'Mis casos'}
          descripcion="Casos actualizados recientemente"
          accion={
            <Link href="/casos" className="text-sm font-medium text-marca-600 hover:underline">
              Ver todos
            </Link>
          }
        />
        {misCasos.length === 0 ? (
          <Vacio mensaje="Todavía no hay casos registrados." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {misCasos.map((c) => {
              const sla = estadoSla(c.slaVenceAt, c.slaHoras)
              const h = horasRestantes(c.slaVenceAt)
              return (
                <li key={c.id}>
                  <Link
                    href={`/casos/${c.id}`}
                    className="flex flex-wrap items-center gap-3 px-5 py-3.5 hover:bg-slate-50"
                  >
                    <span className="font-mono text-xs text-slate-500">{c.codigo}</span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">
                      {c.titulo}
                    </span>
                    <span className="hidden text-xs text-slate-500 sm:block">{c.empresa}</span>
                    <ChipEstado estado={c.estado} />
                    {sla === 'VENCIDO' && <Chip tono="peligro">SLA vencido</Chip>}
                    {sla === 'POR_VENCER' && <Chip tono="alerta">{h} h restantes</Chip>}
                    <span className="hidden text-xs text-slate-400 lg:block">
                      {fecha(c.createdAt)}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </Tarjeta>
    </div>
  )
}

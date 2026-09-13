import Link from 'next/link'
import { db } from '@/db'
import { alertas, casos, empresas, slaReglas } from '@/db/schema'
import { and, asc, desc, eq, ne } from 'drizzle-orm'
import { estadoSla, horasRestantes } from '@/lib/sla'
import { ESTADOS, ETIQUETA_ESTADO } from '@/lib/workflow'
import { Chip, ChipEstado, Kpi, Tarjeta, TarjetaCabecera, Vacio } from '@/components/ui'
import { BotonEscanearSla } from '@/components/BotonEscanearSla'
import { fechaHora } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function SlaPage() {
  const [activos, reglas, abiertas] = await Promise.all([
    db
      .select({
        id: casos.id,
        codigo: casos.codigo,
        titulo: casos.titulo,
        estado: casos.estado,
        slaVenceAt: casos.slaVenceAt,
        slaHoras: casos.slaHoras,
        empresa: empresas.nombre,
      })
      .from(casos)
      .innerJoin(empresas, eq(casos.empresaId, empresas.id))
      .where(ne(casos.estado, 'CERRADO'))
      .orderBy(asc(casos.slaVenceAt)),

    db.select().from(slaReglas),

    db
      .select({
        id: alertas.id,
        tipo: alertas.tipo,
        mensaje: alertas.mensaje,
        nivel: alertas.nivel,
        createdAt: alertas.createdAt,
        casoId: casos.id,
        codigo: casos.codigo,
      })
      .from(alertas)
      .innerJoin(casos, eq(alertas.casoId, casos.id))
      .where(eq(alertas.atendida, false))
      .orderBy(desc(alertas.createdAt)),
  ])

  const conEstado = activos.map((c) => ({ ...c, sla: estadoSla(c.slaVenceAt, c.slaHoras) }))
  const vencidos = conEstado.filter((c) => c.sla === 'VENCIDO')
  const porVencer = conEstado.filter((c) => c.sla === 'POR_VENCER')
  const enTiempo = conEstado.filter((c) => c.sla === 'EN_TIEMPO')

  const mapaReglas = new Map(reglas.map((r) => [r.estado, r]))

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">SLA y alertas</h1>
          <p className="mt-0.5 text-sm text-slate-600">
            Tiempos máximos por estado, incumplimientos y escalamiento.
          </p>
        </div>
        <BotonEscanearSla />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi titulo="En tiempo" valor={enTiempo.length} tono="exito" />
        <Kpi titulo="Por vencer" valor={porVencer.length} tono="alerta" />
        <Kpi titulo="Vencidos" valor={vencidos.length} tono="peligro" />
        <Kpi titulo="Alertas abiertas" valor={abiertas.length} />
      </div>

      <Tarjeta>
        <TarjetaCabecera
          titulo="Alertas abiertas"
          descripcion="Generadas automáticamente por el motor de SLA"
        />
        {abiertas.length === 0 ? (
          <Vacio mensaje="No hay alertas abiertas." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {abiertas.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                <Chip tono={a.tipo === 'SLA_VENCIDO' ? 'peligro' : 'alerta'}>{a.tipo}</Chip>
                <Link href={`/casos/${a.casoId}`} className="font-mono text-xs text-marca-600 hover:underline">
                  {a.codigo}
                </Link>
                <span className="min-w-0 flex-1 text-sm text-slate-700">{a.mensaje}</span>
                <Chip>Nivel {a.nivel}</Chip>
                <span className="text-xs text-slate-400">{fechaHora(a.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>

      <Tarjeta>
        <TarjetaCabecera titulo="Casos activos por vencimiento" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3 font-medium">Caso</th>
                <th className="px-5 py-3 font-medium">Empresa</th>
                <th className="px-5 py-3 font-medium">Estado</th>
                <th className="px-5 py-3 font-medium">SLA</th>
                <th className="px-5 py-3 font-medium">Vence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {conEstado.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <Link href={`/casos/${c.id}`} className="font-medium text-slate-900 hover:text-marca-600">
                      {c.codigo}
                    </Link>
                    <p className="truncate text-xs text-slate-500">{c.titulo}</p>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{c.empresa}</td>
                  <td className="px-5 py-3">
                    <ChipEstado estado={c.estado} />
                  </td>
                  <td className="px-5 py-3">
                    {c.sla === 'VENCIDO' && <Chip tono="peligro">Vencido</Chip>}
                    {c.sla === 'POR_VENCER' && <Chip tono="alerta">{horasRestantes(c.slaVenceAt)} h</Chip>}
                    {c.sla === 'EN_TIEMPO' && <Chip tono="exito">{horasRestantes(c.slaVenceAt)} h</Chip>}
                    {c.sla === 'SIN_SLA' && <span className="text-xs text-slate-400">—</span>}
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-500">
                    {c.slaVenceAt ? fechaHora(c.slaVenceAt) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Tarjeta>

      <Tarjeta>
        <TarjetaCabecera
          titulo="Reglas de SLA por estado"
          descripcion="Parametrizables en la tabla sla_reglas"
        />
        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
          {ESTADOS.filter((e) => mapaReglas.has(e)).map((e) => {
            const r = mapaReglas.get(e)!
            return (
              <div key={e} className="rounded-lg border border-slate-200 px-4 py-3">
                <p className="text-sm font-medium text-slate-900">{ETIQUETA_ESTADO[e]}</p>
                <p className="mt-1 text-xs text-slate-600">
                  {r.horas} horas · escalamiento nivel {r.nivelEscalamiento}
                </p>
              </div>
            )
          })}
        </div>
      </Tarjeta>
    </div>
  )
}

void and

import { db } from '@/db'
import { lov, slaReglas, usuarios } from '@/db/schema'
import { asc } from 'drizzle-orm'
import { Chip, Tarjeta, TarjetaCabecera } from '@/components/ui'
import { ETIQUETA_ESTADO, WORKFLOW, ESTADOS, DESCRIPCION_ESTADO } from '@/lib/workflow'
import { ETIQUETA_ROL } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function ConfiguracionPage() {
  const [taxonomias, reglas, listaUsuarios] = await Promise.all([
    db.select().from(lov).orderBy(asc(lov.grupo), asc(lov.orden)),
    db.select().from(slaReglas),
    db.select().from(usuarios).orderBy(asc(usuarios.nombre)),
  ])

  const grupos = new Map<string, typeof taxonomias>()
  taxonomias.forEach((t) => {
    const g = grupos.get(t.grupo) ?? []
    g.push(t)
    grupos.set(t.grupo, g)
  })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Configuración</h1>
        <p className="mt-0.5 text-sm text-slate-600">
          Parámetros de gobierno: taxonomías, workflow, SLA y usuarios.
        </p>
      </div>

      {/* ------------------------------------------------ Motor de workflow */}
      <Tarjeta>
        <TarjetaCabecera
          titulo="Máquina de estados"
          descripcion="Transiciones permitidas, roles autorizados y reglas de negocio"
        />
        <div className="space-y-3 p-5">
          {ESTADOS.map((e) => {
            const salidas = WORKFLOW[e]
            return (
              <div key={e} className="rounded-lg border border-slate-200 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-slate-900">{ETIQUETA_ESTADO[e]}</span>
                  <span className="text-xs text-slate-500">{DESCRIPCION_ESTADO[e]}</span>
                </div>
                {salidas.length === 0 ? (
                  <p className="mt-2 text-xs text-slate-500">Estado final.</p>
                ) : (
                  <ul className="mt-2 space-y-1.5">
                    {salidas.map((t) => (
                      <li key={t.destino} className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-slate-400">→</span>
                        <span className="font-medium text-slate-700">
                          {ETIQUETA_ESTADO[t.destino]}
                        </span>
                        {t.roles.map((r) => (
                          <Chip key={r}>{r}</Chip>
                        ))}
                        {t.guard && <Chip tono="alerta">con regla de negocio</Chip>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      </Tarjeta>

      {/* ----------------------------------------------------- Taxonomías */}
      <Tarjeta>
        <TarjetaCabecera
          titulo="Taxonomías gobernadas (LOV)"
          descripcion="Listas de valores parametrizadas que alimentan la clasificación"
        />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          {[...grupos.entries()].map(([grupo, items]) => (
            <div key={grupo} className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm font-medium text-slate-900">{grupo}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {items.map((i) => (
                  <Chip key={i.id}>{i.etiqueta}</Chip>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Tarjeta>

      {/* ----------------------------------------------------------- SLA */}
      <Tarjeta>
        <TarjetaCabecera titulo="Reglas de SLA" descripcion="Horas máximas por estado del workflow" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3 font-medium">Estado</th>
                <th className="px-5 py-3 font-medium">Horas</th>
                <th className="px-5 py-3 font-medium">Nivel de escalamiento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reglas.map((r) => (
                <tr key={r.id}>
                  <td className="px-5 py-2.5 text-slate-800">{ETIQUETA_ESTADO[r.estado]}</td>
                  <td className="px-5 py-2.5 tabular-nums text-slate-700">{r.horas}</td>
                  <td className="px-5 py-2.5 text-slate-700">{r.nivelEscalamiento}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Tarjeta>

      {/* ------------------------------------------------------- Usuarios */}
      <Tarjeta>
        <TarjetaCabecera titulo="Usuarios y roles" descripcion="Control de acceso basado en roles (RBAC)" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3 font-medium">Nombre</th>
                <th className="px-5 py-3 font-medium">Correo</th>
                <th className="px-5 py-3 font-medium">Rol</th>
                <th className="px-5 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {listaUsuarios.map((u) => (
                <tr key={u.id}>
                  <td className="px-5 py-2.5 text-slate-800">{u.nombre}</td>
                  <td className="px-5 py-2.5 text-slate-600">{u.email}</td>
                  <td className="px-5 py-2.5">
                    <Chip tono="info">{ETIQUETA_ROL[u.rol]}</Chip>
                  </td>
                  <td className="px-5 py-2.5">
                    {u.activo ? <Chip tono="exito">Activo</Chip> : <Chip tono="peligro">Inactivo</Chip>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Tarjeta>
    </div>
  )
}

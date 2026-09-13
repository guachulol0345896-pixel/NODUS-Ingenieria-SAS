import Link from 'next/link'
import { db } from '@/db'
import { casos, empresas } from '@/db/schema'
import { asc, eq, sql } from 'drizzle-orm'
import { Tarjeta, TarjetaCabecera, Vacio } from '@/components/ui'
import { fecha } from '@/lib/utils'

export const dynamic = 'force-dynamic'

/** Empresa Única – Casos Múltiples: un registro empresarial, N casos. */
export default async function EmpresasPage() {
  const filas = await db
    .select({
      id: empresas.id,
      nombre: empresas.nombre,
      nit: empresas.nit,
      dominioCorreo: empresas.dominioCorreo,
      ciudad: empresas.ciudad,
      pais: empresas.pais,
      sector: empresas.sector,
      createdAt: empresas.createdAt,
      totalCasos: sql<number>`count(${casos.id})`,
    })
    .from(empresas)
    .leftJoin(casos, eq(casos.empresaId, empresas.id))
    .groupBy(empresas.id)
    .orderBy(asc(empresas.nombre))

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Empresas</h1>
        <p className="mt-0.5 text-sm text-slate-600">
          Registro único por empresa con historial de casos asociado.
        </p>
      </div>

      <Tarjeta>
        <TarjetaCabecera
          titulo={`${filas.length} empresa(s) registrada(s)`}
          descripcion="La deduplicación se aplica por nombre normalizado, NIT y dominio de correo"
        />
        {filas.length === 0 ? (
          <Vacio mensaje="Aún no hay empresas registradas." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3 font-medium">Empresa</th>
                  <th className="px-5 py-3 font-medium">NIT</th>
                  <th className="px-5 py-3 font-medium">Dominio</th>
                  <th className="px-5 py-3 font-medium">Ubicación</th>
                  <th className="px-5 py-3 font-medium">Casos</th>
                  <th className="px-5 py-3 font-medium">Alta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filas.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <Link
                        href={`/casos?q=${encodeURIComponent(e.nombre)}`}
                        className="font-medium text-slate-900 hover:text-marca-600"
                      >
                        {e.nombre}
                      </Link>
                      {e.sector && <p className="text-xs text-slate-500">{e.sector}</p>}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-600">{e.nit ?? '—'}</td>
                    <td className="px-5 py-3 text-xs text-slate-600">{e.dominioCorreo ?? '—'}</td>
                    <td className="px-5 py-3 text-slate-600">
                      {e.ciudad}, {e.pais}
                    </td>
                    <td className="px-5 py-3 font-medium tabular-nums text-slate-900">
                      {Number(e.totalCasos)}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500">{fecha(e.createdAt)}</td>
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

import Link from 'next/link'
import { db } from '@/db'
import { casos, empresas, propuestas, usuarios } from '@/db/schema'
import { desc, eq } from 'drizzle-orm'
import { getSesion } from '@/lib/auth'
import { Chip, Tarjeta, TarjetaCabecera, Vacio } from '@/components/ui'
import { fecha, moneda } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function PropuestasPage() {
  const sesion = (await getSesion())!

  const todas = await db
    .select({
      id: propuestas.id,
      version: propuestas.version,
      titulo: propuestas.titulo,
      estado: propuestas.estado,
      valorEstimado: propuestas.valorEstimado,
      createdAt: propuestas.createdAt,
      casoId: casos.id,
      codigo: casos.codigo,
      empresaId: casos.empresaId,
      consultorAsignadoId: casos.consultorAsignadoId,
      empresa: empresas.nombre,
      autor: usuarios.nombre,
    })
    .from(propuestas)
    .innerJoin(casos, eq(propuestas.casoId, casos.id))
    .innerJoin(empresas, eq(casos.empresaId, empresas.id))
    .innerJoin(usuarios, eq(propuestas.creadaPorId, usuarios.id))
    .orderBy(desc(propuestas.createdAt))

  // Filtro de visibilidad por rol.
  const filas = todas.filter((p) => {
    if (sesion.rol === 'ADVISORY' || sesion.rol === 'SUPER_ADMIN') return true
    if (sesion.rol === 'CLIENTE_MIPYME') return p.empresaId === sesion.empresaId
    return p.consultorAsignadoId === sesion.sub
  })

  const tono = (e: string) =>
    e === 'ACEPTADA' ? 'exito' : e === 'RECHAZADA' ? 'peligro' : e === 'ENVIADA' || e === 'LISTA' ? 'info' : 'neutro'

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Propuestas</h1>
        <p className="mt-0.5 text-sm text-slate-600">
          Todas las versiones generadas bajo las plantillas oficiales.
        </p>
      </div>

      <Tarjeta>
        <TarjetaCabecera titulo={`${filas.length} propuesta(s)`} />
        {filas.length === 0 ? (
          <Vacio mensaje="No hay propuestas visibles para su rol." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3 font-medium">Caso</th>
                  <th className="px-5 py-3 font-medium">Propuesta</th>
                  <th className="px-5 py-3 font-medium">Empresa</th>
                  <th className="px-5 py-3 font-medium">Autor</th>
                  <th className="px-5 py-3 font-medium">Estado</th>
                  <th className="px-5 py-3 font-medium">Valor</th>
                  <th className="px-5 py-3 font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filas.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">
                      <Link href={`/casos/${p.casoId}`}>{p.codigo}</Link>
                    </td>
                    <td className="px-5 py-3">
                      <Link href={`/casos/${p.casoId}`} className="font-medium text-slate-900 hover:text-marca-600">
                        {p.titulo}
                      </Link>
                      <span className="ml-2 text-xs text-slate-500">v{p.version}</span>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{p.empresa}</td>
                    <td className="px-5 py-3 text-slate-600">{p.autor}</td>
                    <td className="px-5 py-3">
                      <Chip tono={tono(p.estado)}>{p.estado.replace('_', ' ')}</Chip>
                    </td>
                    <td className="px-5 py-3 tabular-nums text-slate-700">
                      {moneda(p.valorEstimado)}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500">{fecha(p.createdAt)}</td>
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

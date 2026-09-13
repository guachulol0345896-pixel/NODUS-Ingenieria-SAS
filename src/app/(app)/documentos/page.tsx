import Link from 'next/link'
import { db } from '@/db'
import { casos, documentos, empresas, usuarios } from '@/db/schema'
import { desc, eq } from 'drizzle-orm'
import { getSesion } from '@/lib/auth'
import { Chip, Tarjeta, TarjetaCabecera, Vacio } from '@/components/ui'
import { bytes, fechaHora } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function DocumentosPage() {
  const sesion = (await getSesion())!

  const todos = await db
    .select({
      id: documentos.id,
      nombre: documentos.nombre,
      tipo: documentos.tipo,
      tamano: documentos.tamano,
      version: documentos.version,
      createdAt: documentos.createdAt,
      casoId: casos.id,
      codigo: casos.codigo,
      empresaId: casos.empresaId,
      consultorAsignadoId: casos.consultorAsignadoId,
      empresa: empresas.nombre,
      autor: usuarios.nombre,
    })
    .from(documentos)
    .innerJoin(casos, eq(documentos.casoId, casos.id))
    .innerJoin(empresas, eq(casos.empresaId, empresas.id))
    .innerJoin(usuarios, eq(documentos.subidoPorId, usuarios.id))
    .orderBy(desc(documentos.createdAt))

  const filas = todos.filter((d) => {
    if (sesion.rol === 'ADVISORY' || sesion.rol === 'SUPER_ADMIN') return true
    if (sesion.rol === 'CLIENTE_MIPYME') return d.empresaId === sesion.empresaId
    return d.consultorAsignadoId === sesion.sub
  })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Repositorio documental</h1>
        <p className="mt-0.5 text-sm text-slate-600">
          Documentos organizados por caso, con versionamiento y descarga controlada.
        </p>
      </div>

      <Tarjeta>
        <TarjetaCabecera titulo={`${filas.length} documento(s)`} />
        {filas.length === 0 ? (
          <Vacio mensaje="No hay documentos visibles para su rol." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3 font-medium">Archivo</th>
                  <th className="px-5 py-3 font-medium">Caso</th>
                  <th className="px-5 py-3 font-medium">Empresa</th>
                  <th className="px-5 py-3 font-medium">Tipo</th>
                  <th className="px-5 py-3 font-medium">Versión</th>
                  <th className="px-5 py-3 font-medium">Tamaño</th>
                  <th className="px-5 py-3 font-medium">Cargado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filas.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <a href={`/api/documentos/${d.id}`} className="font-medium text-marca-600 hover:underline">
                        {d.nombre}
                      </a>
                      <p className="text-xs text-slate-500">por {d.autor}</p>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">
                      <Link href={`/casos/${d.casoId}`}>{d.codigo}</Link>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{d.empresa}</td>
                    <td className="px-5 py-3">
                      <Chip>{d.tipo}</Chip>
                    </td>
                    <td className="px-5 py-3 tabular-nums text-slate-700">v{d.version}</td>
                    <td className="px-5 py-3 text-slate-600">{bytes(d.tamano)}</td>
                    <td className="px-5 py-3 text-xs text-slate-500">{fechaHora(d.createdAt)}</td>
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

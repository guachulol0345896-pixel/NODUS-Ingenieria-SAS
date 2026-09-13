import { db } from '@/db'
import { empresas, lov } from '@/db/schema'
import { asc, eq } from 'drizzle-orm'
import { getSesion } from '@/lib/auth'
import { FormularioCaso } from '@/components/caso/FormularioCaso'

export const dynamic = 'force-dynamic'

export default async function NuevoCasoPage() {
  const sesion = (await getSesion())!

  const [listaEmpresas, areas] = await Promise.all([
    db.select({ id: empresas.id, nombre: empresas.nombre }).from(empresas).orderBy(asc(empresas.nombre)),
    db.select().from(lov).where(eq(lov.grupo, 'AREA_NEGOCIO')).orderBy(asc(lov.orden)),
  ])

  const disponibles =
    sesion.rol === 'CLIENTE_MIPYME'
      ? listaEmpresas.filter((e) => e.id === sesion.empresaId)
      : listaEmpresas

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Nuevo caso</h1>
        <p className="mt-0.5 text-sm text-slate-600">
          Registro de una necesidad empresarial dentro de la plataforma.
        </p>
      </div>

      <FormularioCaso
        empresas={disponibles}
        areas={areas.map((a) => ({ codigo: a.codigo, etiqueta: a.etiqueta }))}
        empresaFija={sesion.rol === 'CLIENTE_MIPYME' ? (sesion.empresaId ?? undefined) : undefined}
      />
    </div>
  )
}

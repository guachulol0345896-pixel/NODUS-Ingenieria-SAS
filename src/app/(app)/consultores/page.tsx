import { db } from '@/db'
import { casos, consultorPerfiles, usuarios } from '@/db/schema'
import { asc, eq, sql } from 'drizzle-orm'
import { Chip, Tarjeta, TarjetaCabecera, Vacio } from '@/components/ui'
import { iniciales } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function ConsultoresPage() {
  const filas = await db
    .select({
      id: usuarios.id,
      nombre: usuarios.nombre,
      email: usuarios.email,
      nivel: consultorPerfiles.nivel,
      disponibilidad: consultorPerfiles.disponibilidad,
      especialidades: consultorPerfiles.especialidades,
      anos: consultorPerfiles.anosExperiencia,
      bio: consultorPerfiles.bio,
      reputacion: consultorPerfiles.reputacion,
      cerrados: consultorPerfiles.casosCerrados,
      activos: sql<number>`(
        select count(*) from ${casos}
        where ${casos.consultorAsignadoId} = ${usuarios.id}
          and ${casos.estado} <> 'CERRADO'
      )`,
    })
    .from(usuarios)
    .innerJoin(consultorPerfiles, eq(consultorPerfiles.usuarioId, usuarios.id))
    .where(eq(usuarios.rol, 'CONSULTOR'))
    .orderBy(asc(usuarios.nombre))

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Consultores</h1>
        <p className="mt-0.5 text-sm text-slate-600">
          Elegibilidad por especialidad, nivel y disponibilidad.
        </p>
      </div>

      <Tarjeta>
        <TarjetaCabecera titulo={`${filas.length} consultor(es) en el ecosistema`} />
        {filas.length === 0 ? (
          <Vacio mensaje="No hay consultores registrados." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {filas.map((c) => (
              <li key={c.id} className="flex flex-wrap items-start gap-4 p-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
                  {iniciales(c.nombre)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-900">{c.nombre}</span>
                    <Chip>{c.nivel}</Chip>
                    <Chip
                      tono={
                        c.disponibilidad === 'DISPONIBLE'
                          ? 'exito'
                          : c.disponibilidad === 'PARCIAL'
                            ? 'alerta'
                            : 'peligro'
                      }
                    >
                      {c.disponibilidad}
                    </Chip>
                    <Chip tono="info">★ {c.reputacion.toFixed(1)}</Chip>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">{c.email}</p>
                  {c.bio && <p className="mt-1.5 text-sm text-slate-600">{c.bio}</p>}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {c.especialidades.map((e) => (
                      <Chip key={e}>{e}</Chip>
                    ))}
                  </div>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <p>
                    <span className="text-base font-semibold text-slate-900">
                      {Number(c.activos)}
                    </span>{' '}
                    activos
                  </p>
                  <p className="mt-1">{c.cerrados} cerrados</p>
                  <p className="mt-1">{c.anos} años exp.</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>
    </div>
  )
}

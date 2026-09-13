import Link from 'next/link'
import { db } from '@/db'
import { casos, consultorPerfiles, empresas, postulaciones } from '@/db/schema'
import { desc, eq } from 'drizzle-orm'
import { getSesion } from '@/lib/auth'
import { Alerta, Chip, Tarjeta, TarjetaCabecera, Vacio } from '@/components/ui'
import { fecha } from '@/lib/utils'

export const dynamic = 'force-dynamic'

/**
 * Bolsa interna (REQ-006): el consultor sólo ve los casos publicados que
 * coinciden con sus especialidades y su disponibilidad.
 */
export default async function BolsaPage() {
  const sesion = (await getSesion())!
  const esConsultor = sesion.rol === 'CONSULTOR'

  const [perfil] = esConsultor
    ? await db.select().from(consultorPerfiles).where(eq(consultorPerfiles.usuarioId, sesion.sub)).limit(1)
    : [undefined]

  const publicados = await db
    .select({
      id: casos.id,
      codigo: casos.codigo,
      titulo: casos.titulo,
      descripcion: casos.descripcion,
      areaNegocio: casos.areaNegocio,
      urgencia: casos.urgencia,
      impacto: casos.impacto,
      complejidad: casos.complejidad,
      tipoIntervencion: casos.tipoIntervencion,
      createdAt: casos.createdAt,
      empresa: empresas.nombre,
    })
    .from(casos)
    .innerJoin(empresas, eq(casos.empresaId, empresas.id))
    .where(eq(casos.estado, 'EN_POSTULACION'))
    .orderBy(desc(casos.createdAt))

  const mias = esConsultor
    ? await db.select({ casoId: postulaciones.casoId }).from(postulaciones).where(eq(postulaciones.consultorId, sesion.sub))
    : []
  const yaPostulado = new Set(mias.map((m) => m.casoId))

  // Filtro de elegibilidad
  const elegibles = esConsultor
    ? publicados.filter((c) => perfil?.especialidades.includes(c.areaNegocio))
    : publicados
  const noElegibles = esConsultor ? publicados.length - elegibles.length : 0

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Bolsa de consultores</h1>
        <p className="mt-0.5 text-sm text-slate-600">
          Casos clasificados y habilitados para postulación.
        </p>
      </div>

      {esConsultor && perfil && (
        <Alerta tono="info">
          Su perfil: <strong>{perfil.nivel}</strong> · disponibilidad{' '}
          <strong>{perfil.disponibilidad}</strong> · especialidades{' '}
          <strong>{perfil.especialidades.join(', ') || 'sin definir'}</strong>.
          {noElegibles > 0 && (
            <> Hay {noElegibles} caso(s) publicado(s) fuera de sus especialidades.</>
          )}
        </Alerta>
      )}

      {esConsultor && perfil?.disponibilidad === 'NO_DISPONIBLE' && (
        <Alerta tono="alerta">
          Su disponibilidad está marcada como no disponible: no podrá postularse hasta actualizarla.
        </Alerta>
      )}

      <Tarjeta>
        <TarjetaCabecera
          titulo={`${elegibles.length} caso(s) disponible(s)`}
          descripcion="Sólo se muestran casos en estado “En postulación”"
        />
        {elegibles.length === 0 ? (
          <Vacio mensaje="No hay casos disponibles para postulación en este momento." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {elegibles.map((c) => (
              <li key={c.id} className="p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-slate-500">{c.codigo}</span>
                  <Chip tono="info">{c.areaNegocio}</Chip>
                  {c.complejidad && <Chip>Complejidad {c.complejidad}</Chip>}
                  {c.tipoIntervencion && <Chip>{c.tipoIntervencion}</Chip>}
                  {c.urgencia === 'ALTA' && <Chip tono="peligro">Urgencia alta</Chip>}
                  {yaPostulado.has(c.id) && <Chip tono="exito">Ya se postuló</Chip>}
                  <span className="ml-auto text-xs text-slate-400">{fecha(c.createdAt)}</span>
                </div>
                <Link href={`/casos/${c.id}`} className="mt-2 block">
                  <h3 className="font-medium text-slate-900 hover:text-marca-600">{c.titulo}</h3>
                </Link>
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">{c.descripcion}</p>
                <div className="mt-3 flex items-center gap-3">
                  <span className="text-xs text-slate-500">{c.empresa}</span>
                  <Link href={`/casos/${c.id}`} className="btn-secundario ml-auto">
                    {yaPostulado.has(c.id) ? 'Ver caso' : 'Ver y postularme'}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>
    </div>
  )
}

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db } from '@/db'
import {
  actividades,
  casos,
  checklistContratacion,
  consultorPerfiles,
  documentos,
  empresas,
  lov,
  postulaciones,
  propuestas,
  transiciones,
  usuarios,
} from '@/db/schema'
import { asc, desc, eq } from 'drizzle-orm'
import { getSesion } from '@/lib/auth'
import { construirContexto, puedeVerCaso } from '@/lib/casos'
import { avance, ETIQUETA_ESTADO, DESCRIPCION_ESTADO, transicionesDisponibles } from '@/lib/workflow'
import { estadoSla, horasRestantes } from '@/lib/sla'
import { BarraAvance, Chip, ChipEstado, Tarjeta, TarjetaCabecera } from '@/components/ui'
import {
  AccionesWorkflow,
  PanelActividades,
  PanelChecklist,
  PanelCierre,
  PanelClasificacion,
  PanelDocumentos,
  PanelPostulaciones,
  PanelPropuestas,
  Timeline,
  type AccionWorkflow,
} from '@/components/caso/Paneles'
import { fecha, fechaHora } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function CasoDetalle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sesion = (await getSesion())!

  const [fila] = await db
    .select({
      caso: casos,
      empresa: empresas,
      creador: { nombre: usuarios.nombre, email: usuarios.email },
    })
    .from(casos)
    .innerJoin(empresas, eq(casos.empresaId, empresas.id))
    .innerJoin(usuarios, eq(casos.creadoPorId, usuarios.id))
    .where(eq(casos.id, id))
    .limit(1)

  if (!fila) notFound()
  const { caso, empresa, creador } = fila

  if (!puedeVerCaso(sesion, caso)) {
    return (
      <div className="tarjeta p-8 text-center">
        <p className="text-sm text-slate-600">No tiene permisos para ver este caso.</p>
        <Link href="/casos" className="btn-secundario mt-4">
          Volver a casos
        </Link>
      </div>
    )
  }

  // ------------------------------------------------------------- datos
  const esAdvisory = sesion.rol === 'ADVISORY' || sesion.rol === 'SUPER_ADMIN'
  const esConsultorDelCaso = caso.consultorAsignadoId === sesion.sub
  const esClienteDelCaso = sesion.rol === 'CLIENTE_MIPYME' && sesion.empresaId === caso.empresaId

  const [
    posts,
    props,
    docs,
    acts,
    [chk],
    trans,
    [consultor],
    opcionesComplejidad,
    opcionesTipo,
    ctx,
  ] = await Promise.all([
    db
      .select({
        id: postulaciones.id,
        consultor: usuarios.nombre,
        enfoque: postulaciones.enfoque,
        experiencia: postulaciones.experiencia,
        tiempoEstimado: postulaciones.tiempoEstimado,
        estado: postulaciones.estado,
        consultorId: postulaciones.consultorId,
        createdAt: postulaciones.createdAt,
        nivel: consultorPerfiles.nivel,
        reputacion: consultorPerfiles.reputacion,
        especialidades: consultorPerfiles.especialidades,
      })
      .from(postulaciones)
      .innerJoin(usuarios, eq(postulaciones.consultorId, usuarios.id))
      .leftJoin(consultorPerfiles, eq(consultorPerfiles.usuarioId, usuarios.id))
      .where(eq(postulaciones.casoId, id))
      .orderBy(desc(postulaciones.createdAt)),

    db.select().from(propuestas).where(eq(propuestas.casoId, id)).orderBy(desc(propuestas.version)),

    db
      .select({
        id: documentos.id,
        nombre: documentos.nombre,
        tipo: documentos.tipo,
        tamano: documentos.tamano,
        version: documentos.version,
        descripcion: documentos.descripcion,
        createdAt: documentos.createdAt,
      })
      .from(documentos)
      .where(eq(documentos.casoId, id))
      .orderBy(desc(documentos.createdAt)),

    db.select().from(actividades).where(eq(actividades.casoId, id)).orderBy(asc(actividades.createdAt)),

    db.select().from(checklistContratacion).where(eq(checklistContratacion.casoId, id)).limit(1),

    db.select().from(transiciones).where(eq(transiciones.casoId, id)).orderBy(desc(transiciones.createdAt)),

    caso.consultorAsignadoId
      ? db.select().from(usuarios).where(eq(usuarios.id, caso.consultorAsignadoId)).limit(1)
      : Promise.resolve([undefined]),

    db.select().from(lov).where(eq(lov.grupo, 'COMPLEJIDAD')).orderBy(asc(lov.orden)),
    db.select().from(lov).where(eq(lov.grupo, 'TIPO_INTERVENCION')).orderBy(asc(lov.orden)),
    construirContexto(id),
  ])

  // Transiciones disponibles + motivo de bloqueo calculado en el servidor.
  const acciones: AccionWorkflow[] = transicionesDisponibles(caso.estado, sesion.rol).map((t) => ({
    destino: t.destino,
    etiqueta: t.etiqueta,
    tono: t.tono,
    bloqueo: t.guard?.(ctx) ?? null,
  }))

  const sla = estadoSla(caso.slaVenceAt, caso.slaHoras)
  const horas = horasRestantes(caso.slaVenceAt)

  const yaPostulado = posts.some((p) => p.consultorId === sesion.sub)
  const puedePostular = sesion.rol === 'CONSULTOR' && caso.estado === 'EN_POSTULACION'

  return (
    <div className="space-y-5">
      <Link href="/casos" className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Casos
      </Link>

      {/* ------------------------------------------------------ Cabecera */}
      <Tarjeta className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-slate-500">{caso.codigo}</span>
              <ChipEstado estado={caso.estado} />
              {sla === 'VENCIDO' && <Chip tono="peligro">SLA vencido</Chip>}
              {sla === 'POR_VENCER' && <Chip tono="alerta">{horas} h restantes</Chip>}
              {sla === 'EN_TIEMPO' && <Chip tono="exito">{horas} h de SLA</Chip>}
            </div>
            <h1 className="mt-2 text-xl font-semibold text-slate-900">{caso.titulo}</h1>
            <p className="mt-1 text-sm text-slate-600">
              {empresa.nombre} · {empresa.ciudad}, {empresa.pais}
            </p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>Registrado {fecha(caso.createdAt)}</p>
            <p>Por {creador.nombre}</p>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-1.5 flex justify-between text-xs text-slate-500">
            <span>{DESCRIPCION_ESTADO[caso.estado]}</span>
            <span>{avance(caso.estado)}%</span>
          </div>
          <BarraAvance valor={avance(caso.estado)} />
        </div>

        <dl className="mt-6 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2 lg:grid-cols-4">
          <Dato titulo="Área de negocio" valor={caso.areaNegocio} />
          <Dato titulo="Urgencia" valor={caso.urgencia} />
          <Dato titulo="Impacto" valor={caso.impacto} />
          <Dato titulo="Complejidad" valor={caso.complejidad ?? 'Sin clasificar'} />
          <Dato titulo="Tipo de intervención" valor={caso.tipoIntervencion ?? 'Sin clasificar'} />
          <Dato titulo="Consultor responsable" valor={consultor?.nombre ?? 'Sin asignar'} />
          <Dato titulo="Vence SLA" valor={caso.slaVenceAt ? fechaHora(caso.slaVenceAt) : '—'} />
          <Dato titulo="Última actualización" valor={fechaHora(caso.updatedAt)} />
        </dl>

        <div className="mt-5 border-t border-slate-100 pt-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Necesidad registrada
          </p>
          <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
            {caso.descripcion}
          </p>
        </div>
      </Tarjeta>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <AccionesWorkflow casoId={caso.id} acciones={acciones} />

          {esAdvisory && ['CREADO', 'EN_REVISION', 'CLASIFICADO'].includes(caso.estado) && (
            <PanelClasificacion
              casoId={caso.id}
              inicial={{
                complejidad: caso.complejidad,
                tipoIntervencion: caso.tipoIntervencion,
                notas: caso.notasClasificacion,
              }}
              opciones={{
                complejidad: opcionesComplejidad.map((o) => ({ codigo: o.codigo, etiqueta: o.etiqueta })),
                tipo: opcionesTipo.map((o) => ({ codigo: o.codigo, etiqueta: o.etiqueta })),
              }}
            />
          )}

          {(posts.length > 0 || puedePostular) && (
            <PanelPostulaciones
              casoId={caso.id}
              postulaciones={posts.map((p) => ({
                id: p.id,
                consultor: p.consultor,
                nivel: p.nivel,
                reputacion: p.reputacion,
                especialidades: p.especialidades ?? [],
                enfoque: p.enfoque,
                experiencia: p.experiencia,
                tiempoEstimado: p.tiempoEstimado,
                estado: p.estado,
                createdAt: p.createdAt.toISOString(),
              }))}
              puedeAsignar={esAdvisory && !caso.consultorAsignadoId}
              puedePostular={puedePostular}
              yaPostulado={yaPostulado}
            />
          )}

          <PanelPropuestas
            casoId={caso.id}
            propuestas={props.map((p) => ({
              id: p.id,
              version: p.version,
              titulo: p.titulo,
              resumen: p.resumen,
              alcance: p.alcance,
              metodologia: p.metodologia,
              entregables: p.entregables,
              cronograma: p.cronograma,
              valorEstimado: p.valorEstimado,
              duracionDias: p.duracionDias,
              estado: p.estado,
              qaChecklist: p.qaChecklist,
              qaObservaciones: p.qaObservaciones,
              enviadaAt: p.enviadaAt?.toISOString() ?? null,
              decisionComentario: p.decisionComentario,
              createdAt: p.createdAt.toISOString(),
            }))}
            puedeCrear={
              (esConsultorDelCaso || esAdvisory) &&
              ['ASIGNADO', 'PROPUESTA_EN_DISENO'].includes(caso.estado)
            }
            puedeQa={esAdvisory}
            puedeDecidir={esClienteDelCaso || sesion.rol === 'SUPER_ADMIN'}
          />

          {['PENDIENTE_CONTRATACION', 'AUTORIZADO_EJECUCION'].includes(caso.estado) && esAdvisory && (
            <PanelChecklist
              casoId={caso.id}
              inicial={{
                propuestaAceptada: chk?.propuestaAceptada ?? false,
                contratoFirmado: chk?.contratoFirmado ?? false,
                alcanceConfirmado: chk?.alcanceConfirmado ?? false,
                cronogramaAcordado: chk?.cronogramaAcordado ?? false,
                condicionesEconomicas: chk?.condicionesEconomicas ?? false,
                datosTratamiento: chk?.datosTratamiento ?? false,
                observaciones: chk?.observaciones ?? '',
              }}
            />
          )}

          {['EN_EJECUCION', 'AUTORIZADO_EJECUCION', 'LISTO_CIERRE'].includes(caso.estado) && (
            <PanelActividades
              casoId={caso.id}
              actividades={acts.map((a) => ({
                id: a.id,
                titulo: a.titulo,
                descripcion: a.descripcion,
                estado: a.estado,
                fechaPlan: a.fechaPlan?.toISOString() ?? null,
              }))}
              puedeEditar={esAdvisory || esConsultorDelCaso}
            />
          )}

          {caso.estado === 'LISTO_CIERRE' && esAdvisory && (
            <PanelCierre
              casoId={caso.id}
              inicial={{
                actaCierre: caso.actaCierre,
                evaluacionFinal: caso.evaluacionFinal,
                valorCerrado: caso.valorCerrado,
              }}
            />
          )}

          {caso.estado === 'CERRADO' && caso.actaCierre && (
            <Tarjeta>
              <TarjetaCabecera titulo="Acta de cierre" />
              <div className="p-5">
                <p className="whitespace-pre-wrap text-sm text-slate-700">{caso.actaCierre}</p>
                <p className="mt-3 text-sm text-slate-600">
                  Evaluación final: <span className="font-medium">{caso.evaluacionFinal} / 5</span>
                </p>
              </div>
            </Tarjeta>
          )}
        </div>

        <div className="space-y-5">
          <PanelDocumentos
            casoId={caso.id}
            documentos={docs.map((d) => ({
              id: d.id,
              nombre: d.nombre,
              tipo: d.tipo,
              tamano: d.tamano,
              version: d.version,
              descripcion: d.descripcion,
              createdAt: d.createdAt.toISOString(),
            }))}
            puedeSubir={esAdvisory || esConsultorDelCaso || esClienteDelCaso}
          />

          <Timeline
            transiciones={trans.map((t) => ({
              id: t.id,
              estadoAnterior: t.estadoAnterior,
              estadoNuevo: t.estadoNuevo,
              actorNombre: t.actorNombre,
              comentario: t.comentario,
              createdAt: t.createdAt.toISOString(),
            }))}
          />
        </div>
      </div>
    </div>
  )
}

function Dato({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{titulo}</dt>
      <dd className="mt-0.5 text-sm text-slate-800">{valor}</dd>
    </div>
  )
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [c] = await db.select({ codigo: casos.codigo, titulo: casos.titulo }).from(casos).where(eq(casos.id, id)).limit(1)
  return { title: c ? `${c.codigo} — ${c.titulo} | NODUS` : 'Caso | NODUS' }
}

void ETIQUETA_ESTADO

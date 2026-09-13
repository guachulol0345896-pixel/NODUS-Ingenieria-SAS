/**
 * Indicadores del Dashboard PMO (Módulo 10 del blueprint).
 * Operativos, comerciales y de ecosistema.
 */

import { db } from '@/db'
import { alertas, casos, consultorPerfiles, propuestas, transiciones, usuarios } from '@/db/schema'
import { and, count, eq, isNotNull, ne, sql } from 'drizzle-orm'
import { ESTADOS, ETIQUETA_ESTADO } from '@/lib/workflow'
import { estadoSla } from '@/lib/sla'
import type { EstadoCaso } from '@/db/schema'

export type Kpis = Awaited<ReturnType<typeof calcularKpis>>

export async function calcularKpis() {
  const todos = await db.select().from(casos)

  const activos = todos.filter((c) => c.estado !== 'CERRADO')
  const cerrados = todos.filter((c) => c.estado === 'CERRADO')

  // --- SLA -----------------------------------------------------------------
  let vencidos = 0
  let porVencer = 0
  for (const c of activos) {
    const e = estadoSla(c.slaVenceAt, c.slaHoras)
    if (e === 'VENCIDO') vencidos++
    if (e === 'POR_VENCER') porVencer++
  }
  const conSla = activos.filter((c) => c.slaVenceAt).length
  const cumplimientoSla = conSla === 0 ? 100 : Math.round(((conSla - vencidos) / conSla) * 100)

  // --- Casos por estado ----------------------------------------------------
  const porEstado = ESTADOS.map((e) => ({
    estado: e,
    etiqueta: ETIQUETA_ESTADO[e],
    total: todos.filter((c) => c.estado === e).length,
  })).filter((x) => x.total > 0)

  // --- Casos por área ------------------------------------------------------
  const areas = new Map<string, number>()
  todos.forEach((c) => areas.set(c.areaNegocio, (areas.get(c.areaNegocio) ?? 0) + 1))
  const porArea = [...areas.entries()]
    .map(([area, total]) => ({ area, total }))
    .sort((a, b) => b.total - a.total)

  // --- Conversión de propuestas -------------------------------------------
  const props = await db.select().from(propuestas)
  const enviadas = props.filter((p) =>
    ['ENVIADA', 'ACEPTADA', 'RECHAZADA', 'AJUSTES_SOLICITADOS'].includes(p.estado),
  ).length
  const aceptadas = props.filter((p) => p.estado === 'ACEPTADA').length
  const conversion = enviadas === 0 ? 0 : Math.round((aceptadas / enviadas) * 100)

  const ticketPromedio =
    aceptadas === 0
      ? 0
      : Math.round(
          props
            .filter((p) => p.estado === 'ACEPTADA')
            .reduce((s, p) => s + (p.valorEstimado ?? 0), 0) / aceptadas,
        )

  const pipeline = props
    .filter((p) => ['ENVIADA', 'LISTA'].includes(p.estado))
    .reduce((s, p) => s + (p.valorEstimado ?? 0), 0)

  // --- Tiempos operativos --------------------------------------------------
  const tiempoClasificacion = await promedioHorasHasta('CLASIFICADO')
  const tiempoPropuesta = await promedioHorasHasta('PROPUESTA_ENVIADA')

  // --- Ecosistema ----------------------------------------------------------
  const [{ n: consultoresActivos } = { n: 0 }] = await db
    .select({ n: count() })
    .from(consultorPerfiles)
    .where(ne(consultorPerfiles.disponibilidad, 'NO_DISPONIBLE'))

  const [{ n: totalEmpresas } = { n: 0 }] = await db
    .select({ n: sql<number>`count(distinct ${casos.empresaId})` })
    .from(casos)

  const [{ n: alertasAbiertas } = { n: 0 }] = await db
    .select({ n: count() })
    .from(alertas)
    .where(eq(alertas.atendida, false))

  const [{ n: totalUsuarios } = { n: 0 }] = await db
    .select({ n: count() })
    .from(usuarios)
    .where(eq(usuarios.activo, true))

  return {
    operativos: {
      casosTotales: todos.length,
      casosActivos: activos.length,
      casosCerrados: cerrados.length,
      slaVencidos: vencidos,
      slaPorVencer: porVencer,
      cumplimientoSla,
      tiempoClasificacion,
      tiempoPropuesta,
      alertasAbiertas: Number(alertasAbiertas),
    },
    comerciales: {
      propuestasEnviadas: enviadas,
      propuestasAceptadas: aceptadas,
      conversion,
      ticketPromedio,
      pipeline,
    },
    ecosistema: {
      consultoresActivos: Number(consultoresActivos),
      empresasAtendidas: Number(totalEmpresas),
      usuariosActivos: Number(totalUsuarios),
    },
    porEstado,
    porArea,
  }
}

/** Horas promedio desde la creación del caso hasta llegar a un estado dado. */
async function promedioHorasHasta(estado: EstadoCaso): Promise<number | null> {
  const filas = await db
    .select({
      casoId: transiciones.casoId,
      llegada: transiciones.createdAt,
      creado: casos.createdAt,
    })
    .from(transiciones)
    .innerJoin(casos, eq(transiciones.casoId, casos.id))
    .where(and(eq(transiciones.estadoNuevo, estado), isNotNull(casos.createdAt)))

  if (filas.length === 0) return null

  // Primera llegada al estado por cada caso.
  const primera = new Map<string, { llegada: Date; creado: Date }>()
  for (const f of filas) {
    const prev = primera.get(f.casoId)
    if (!prev || f.llegada < prev.llegada) primera.set(f.casoId, { llegada: f.llegada, creado: f.creado })
  }

  const horas = [...primera.values()].map(
    (v) => (v.llegada.getTime() - v.creado.getTime()) / 3_600_000,
  )
  const prom = horas.reduce((a, b) => a + b, 0) / horas.length
  return Math.round(prom * 10) / 10
}

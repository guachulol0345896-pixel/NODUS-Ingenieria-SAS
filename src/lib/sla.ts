/**
 * Gestión de SLA, alertas y escalamiento (REQ-009 / REQ-017).
 * ---------------------------------------------------------------------------
 * Cada estado del workflow tiene un SLA en horas (tabla `sla_reglas`).
 * Al entrar a un estado se calcula `slaVenceAt`. El endpoint
 * POST /api/sla/scan recorre los casos activos y genera alertas.
 */

import { db } from '@/db'
import { alertas, casos, notificaciones, slaReglas, usuarios } from '@/db/schema'
import { and, eq, inArray, isNotNull, ne } from 'drizzle-orm'
import type { EstadoCaso } from '@/db/schema'
import { ETIQUETA_ESTADO } from '@/lib/workflow'
import { registrar } from '@/lib/audit'

/** SLA por defecto (horas) usado por el seed. */
export const SLA_POR_DEFECTO: Partial<Record<EstadoCaso, { horas: number; nivel: number }>> = {
  CREADO: { horas: 8, nivel: 1 },
  EN_REVISION: { horas: 24, nivel: 2 },
  CLASIFICADO: { horas: 12, nivel: 1 },
  EN_POSTULACION: { horas: 48, nivel: 2 },
  ASIGNADO: { horas: 24, nivel: 2 },
  PROPUESTA_EN_DISENO: { horas: 72, nivel: 3 },
  PROPUESTA_LISTA_QA: { horas: 24, nivel: 2 },
  PROPUESTA_ENVIADA: { horas: 12, nivel: 1 },
  EN_DECISION_CLIENTE: { horas: 120, nivel: 2 },
  PENDIENTE_CONTRATACION: { horas: 96, nivel: 3 },
  AUTORIZADO_EJECUCION: { horas: 24, nivel: 1 },
  EN_EJECUCION: { horas: 720, nivel: 3 },
  LISTO_CIERRE: { horas: 48, nivel: 2 },
}

export async function reglaSla(estado: EstadoCaso) {
  const [r] = await db.select().from(slaReglas).where(eq(slaReglas.estado, estado)).limit(1)
  return r ?? null
}

/** Calcula la fecha de vencimiento del SLA al entrar a un estado. */
export async function calcularVencimiento(estado: EstadoCaso, desde = new Date()) {
  const r = await reglaSla(estado)
  if (!r) return { slaVenceAt: null, slaHoras: null }
  return {
    slaVenceAt: new Date(desde.getTime() + r.horas * 3_600_000),
    slaHoras: r.horas,
  }
}

export type EstadoSla = 'SIN_SLA' | 'EN_TIEMPO' | 'POR_VENCER' | 'VENCIDO'

/** Clasifica el estado del SLA de un caso. "Por vencer" = queda <20% del tiempo. */
export function estadoSla(slaVenceAt: Date | null, slaHoras: number | null): EstadoSla {
  if (!slaVenceAt || !slaHoras) return 'SIN_SLA'
  const restanteMs = slaVenceAt.getTime() - Date.now()
  if (restanteMs <= 0) return 'VENCIDO'
  if (restanteMs <= slaHoras * 3_600_000 * 0.2) return 'POR_VENCER'
  return 'EN_TIEMPO'
}

export function horasRestantes(slaVenceAt: Date | null): number | null {
  if (!slaVenceAt) return null
  return Math.round(((slaVenceAt.getTime() - Date.now()) / 3_600_000) * 10) / 10
}

/**
 * Recorre los casos activos y genera alertas + notificaciones.
 * Idempotente: no duplica una alerta del mismo tipo abierta para el caso.
 */
export async function escanearSla() {
  const activos = await db
    .select()
    .from(casos)
    .where(and(ne(casos.estado, 'CERRADO'), isNotNull(casos.slaVenceAt)))

  const abiertas = await db.select().from(alertas).where(eq(alertas.atendida, false))
  const yaTiene = (casoId: string, tipo: string) =>
    abiertas.some((a) => a.casoId === casoId && a.tipo === tipo)

  const supervisores = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(inArray(usuarios.rol, ['ADVISORY', 'SUPER_ADMIN']))

  let creadas = 0
  let vencidos = 0

  for (const c of activos) {
    const est = estadoSla(c.slaVenceAt, c.slaHoras)
    if (est === 'EN_TIEMPO' || est === 'SIN_SLA') continue

    const tipo = est === 'VENCIDO' ? 'SLA_VENCIDO' : 'SLA_PROXIMO'
    if (est === 'VENCIDO') vencidos++

    if (!c.slaIncumplido && est === 'VENCIDO') {
      await db.update(casos).set({ slaIncumplido: true }).where(eq(casos.id, c.id))
    }
    if (yaTiene(c.id, tipo)) continue

    const regla = await reglaSla(c.estado)
    const mensaje =
      est === 'VENCIDO'
        ? `SLA vencido en estado "${ETIQUETA_ESTADO[c.estado]}" (${c.slaHoras} h).`
        : `SLA próximo a vencer en estado "${ETIQUETA_ESTADO[c.estado]}".`

    await db.insert(alertas).values({
      casoId: c.id,
      tipo,
      mensaje,
      nivel: regla?.nivelEscalamiento ?? 1,
    })
    creadas++

    // Escalamiento: notifica a Advisory y al consultor responsable.
    const destinatarios = new Set<string>(supervisores.map((s) => s.id))
    if (c.consultorAsignadoId) destinatarios.add(c.consultorAsignadoId)

    for (const uid of destinatarios) {
      await db.insert(notificaciones).values({
        usuarioId: uid,
        titulo: `${c.codigo} — ${est === 'VENCIDO' ? 'SLA vencido' : 'SLA por vencer'}`,
        mensaje,
        url: `/casos/${c.id}`,
      })
    }
  }

  await registrar({
    accion: 'SLA_SCAN',
    entidad: 'sla',
    detalle: { casosEvaluados: activos.length, alertasCreadas: creadas, vencidos },
  })

  return { evaluados: activos.length, alertasCreadas: creadas, vencidos }
}

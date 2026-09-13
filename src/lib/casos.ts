/**
 * Servicio de casos: creación, deduplicación de empresas y ejecución de
 * transiciones del workflow.
 * ---------------------------------------------------------------------------
 * Éste es el único lugar donde cambia `casos.estado`.
 */

import { db } from '@/db'
import {
  actividades,
  alertas,
  casos,
  checklistContratacion,
  empresas,
  notificaciones,
  postulaciones,
  propuestas,
  transiciones,
  usuarios,
} from '@/db/schema'
import { and, count, desc, eq, inArray, like, or, sql } from 'drizzle-orm'
import type { EstadoCaso, Rol } from '@/db/schema'
import { registrar } from '@/lib/audit'
import { calcularVencimiento } from '@/lib/sla'
import { ETIQUETA_ESTADO, validarTransicion, type ContextoCaso } from '@/lib/workflow'
import type { Sesion } from '@/lib/auth'

// ---------------------------------------------------------------- utilidades

export function normalizarNombre(nombre: string) {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\b(s\.?a\.?s\.?|s\.?a\.?|ltda\.?|sas|eu|spa|inc|llc)\b/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim()
}

export function dominioDe(email: string) {
  return email.toLowerCase().split('@')[1] ?? null
}

/** REQ-003: genera un código único legible NODUS-AAAA-NNNN. */
export async function siguienteCodigo(): Promise<string> {
  const anio = new Date().getFullYear()
  const prefijo = `NODUS-${anio}-`
  const [fila] = await db
    .select({ n: count() })
    .from(casos)
    .where(like(casos.codigo, `${prefijo}%`))
  const consecutivo = String((fila?.n ?? 0) + 1).padStart(4, '0')
  return `${prefijo}${consecutivo}`
}

/**
 * REQ-002: verificación de identidad empresarial antes de crear una empresa.
 * Busca coincidencias por nombre normalizado, NIT o dominio de correo.
 */
export async function buscarEmpresaExistente(input: {
  nombre: string
  correo: string
  nit?: string | null
}) {
  const norm = normalizarNombre(input.nombre)
  const dominio = dominioDe(input.correo)
  const genericos = new Set([
    'gmail.com',
    'hotmail.com',
    'outlook.com',
    'yahoo.com',
    'icloud.com',
    'live.com',
  ])

  const condiciones = [eq(empresas.nombreNormalizado, norm)]
  if (input.nit) condiciones.push(eq(empresas.nit, input.nit))
  if (dominio && !genericos.has(dominio)) condiciones.push(eq(empresas.dominioCorreo, dominio))

  const [existente] = await db
    .select()
    .from(empresas)
    .where(or(...condiciones))
    .limit(1)

  return existente ?? null
}

// ------------------------------------------------------------------ contexto

/** Reúne los datos que necesitan las reglas de negocio del workflow. */
export async function construirContexto(casoId: string): Promise<ContextoCaso> {
  const [caso] = await db.select().from(casos).where(eq(casos.id, casoId)).limit(1)
  if (!caso) throw new Error('Caso no encontrado')

  const props = await db.select().from(propuestas).where(eq(propuestas.casoId, casoId))
  const [{ n: nPost } = { n: 0 }] = await db
    .select({ n: count() })
    .from(postulaciones)
    .where(eq(postulaciones.casoId, casoId))
  const [chk] = await db
    .select()
    .from(checklistContratacion)
    .where(eq(checklistContratacion.casoId, casoId))
    .limit(1)
  const [{ n: nActPend } = { n: 0 }] = await db
    .select({ n: count() })
    .from(actividades)
    .where(
      and(eq(actividades.casoId, casoId), inArray(actividades.estado, ['PLANIFICADA', 'EN_CURSO', 'BLOQUEADA'])),
    )

  return {
    tieneClasificacion: Boolean(caso.complejidad && caso.tipoIntervencion),
    tieneConsultorAsignado: Boolean(caso.consultorAsignadoId),
    totalPostulaciones: Number(nPost),
    tienePropuestaBorrador: props.length > 0,
    tienePropuestaLista: props.some((p) => p.estado === 'LISTA' || p.estado === 'ENVIADA'),
    tienePropuestaAceptada: props.some((p) => p.estado === 'ACEPTADA'),
    checklistCompleto: Boolean(
      chk &&
        chk.propuestaAceptada &&
        chk.contratoFirmado &&
        chk.alcanceConfirmado &&
        chk.cronogramaAcordado &&
        chk.condicionesEconomicas &&
        chk.datosTratamiento,
    ),
    tieneActaCierre: Boolean(caso.actaCierre && caso.evaluacionFinal),
    actividadesPendientes: Number(nActPend),
  }
}

// ---------------------------------------------------------------- transición

export class ErrorWorkflow extends Error {
  status = 422
}

/**
 * Ejecuta una transición del workflow de forma atómica:
 *  1. valida rol y reglas de negocio,
 *  2. actualiza el caso y recalcula el SLA del nuevo estado,
 *  3. registra la transición y la bitácora,
 *  4. notifica a los actores involucrados.
 */
export async function ejecutarTransicion(opts: {
  casoId: string
  destino: EstadoCaso
  sesion: Sesion
  comentario?: string | null
  ip?: string | null
}) {
  const { casoId, destino, sesion } = opts

  const [caso] = await db.select().from(casos).where(eq(casos.id, casoId)).limit(1)
  if (!caso) throw new ErrorWorkflow('Caso no encontrado')

  const ctx = await construirContexto(casoId)
  const v = validarTransicion(caso.estado, destino, sesion.rol, ctx)
  if (!v.ok) throw new ErrorWorkflow(v.motivo)

  const { slaVenceAt, slaHoras } = await calcularVencimiento(destino)
  const ahora = new Date()

  await db.transaction(async (tx) => {
    await tx
      .update(casos)
      .set({
        estado: destino,
        slaVenceAt,
        slaHoras,
        slaIncumplido: false,
        updatedAt: ahora,
        ...(destino === 'CERRADO' ? { cerradoAt: ahora } : {}),
      })
      .where(eq(casos.id, casoId))

    await tx.insert(transiciones).values({
      casoId,
      estadoAnterior: caso.estado,
      estadoNuevo: destino,
      actorId: sesion.sub,
      actorNombre: sesion.nombre,
      comentario: opts.comentario ?? null,
    })

    // Las alertas del estado anterior dejan de ser relevantes.
    await tx.update(alertas).set({ atendida: true }).where(eq(alertas.casoId, casoId))
  })

  await registrar({
    actor: sesion,
    accion: 'CASO_TRANSICION',
    entidad: 'caso',
    entidadId: casoId,
    estadoAnterior: caso.estado,
    estadoNuevo: destino,
    detalle: { codigo: caso.codigo, comentario: opts.comentario ?? null },
    ip: opts.ip ?? null,
  })

  await notificarCaso(casoId, {
    titulo: `${caso.codigo} → ${ETIQUETA_ESTADO[destino]}`,
    mensaje: `${sesion.nombre} movió el caso a "${ETIQUETA_ESTADO[destino]}".`,
    url: `/casos/${casoId}`,
    excluir: sesion.sub,
  })

  return { ...caso, estado: destino, slaVenceAt, slaHoras }
}

/** REQ-019: notificación estructurada a los actores del caso. */
export async function notificarCaso(
  casoId: string,
  n: { titulo: string; mensaje: string; url?: string; excluir?: string },
) {
  const [caso] = await db.select().from(casos).where(eq(casos.id, casoId)).limit(1)
  if (!caso) return

  const destinatarios = new Set<string>()
  destinatarios.add(caso.creadoPorId)
  if (caso.consultorAsignadoId) destinatarios.add(caso.consultorAsignadoId)

  const advisory = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(inArray(usuarios.rol, ['ADVISORY', 'SUPER_ADMIN']))
  advisory.forEach((a) => destinatarios.add(a.id))

  if (n.excluir) destinatarios.delete(n.excluir)
  if (destinatarios.size === 0) return

  await db.insert(notificaciones).values(
    [...destinatarios].map((usuarioId) => ({
      usuarioId,
      titulo: n.titulo,
      mensaje: n.mensaje,
      url: n.url ?? null,
    })),
  )
}

// ------------------------------------------------------- visibilidad / RBAC

/**
 * Filtro de visibilidad de casos por rol. Se aplica en TODAS las consultas de
 * listado para que ningún actor vea información fuera de su alcance.
 */
export function filtroVisibilidad(sesion: Sesion) {
  switch (sesion.rol) {
    case 'SUPER_ADMIN':
    case 'ADVISORY':
      return undefined // ven todo
    case 'CLIENTE_MIPYME':
      return sesion.empresaId
        ? eq(casos.empresaId, sesion.empresaId)
        : sql`false`
    case 'CONSULTOR':
      // Sus casos asignados + los publicados en la bolsa interna.
      return or(eq(casos.consultorAsignadoId, sesion.sub), eq(casos.estado, 'EN_POSTULACION'))
    default:
      return sql`false`
  }
}

export function puedeVerCaso(sesion: Sesion, caso: { empresaId: string; consultorAsignadoId: string | null; estado: EstadoCaso }) {
  if (sesion.rol === 'SUPER_ADMIN' || sesion.rol === 'ADVISORY') return true
  if (sesion.rol === 'CLIENTE_MIPYME') return caso.empresaId === sesion.empresaId
  if (sesion.rol === 'CONSULTOR')
    return caso.consultorAsignadoId === sesion.sub || caso.estado === 'EN_POSTULACION'
  return false
}

export const ROLES_ADVISORY: Rol[] = ['ADVISORY', 'SUPER_ADMIN']

/** Últimas transiciones de un caso, para el timeline. */
export async function timelineCaso(casoId: string) {
  return db
    .select()
    .from(transiciones)
    .where(eq(transiciones.casoId, casoId))
    .orderBy(desc(transiciones.createdAt))
}

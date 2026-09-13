/**
 * Motor de Workflow de NODUS.
 * ---------------------------------------------------------------------------
 * El ciclo de vida del caso es una máquina de estados explícita. Cada
 * transición declara:
 *   - `destino`  : estado al que se puede pasar
 *   - `roles`    : quién está autorizado a ejecutarla (RBAC a nivel de proceso)
 *   - `etiqueta` : texto que ve el usuario en la UI
 *   - `guard`    : regla de negocio que debe cumplirse (REQ-008, 014, 016)
 *
 * Ninguna parte de la aplicación cambia `casos.estado` directamente: todo pasa
 * por `ejecutarTransicion()` en src/lib/casos.ts, lo que garantiza que la
 * bitácora, las transiciones y el SLA se registren siempre.
 */

import type { EstadoCaso, Rol } from '@/db/schema'

export const ESTADOS: EstadoCaso[] = [
  'CREADO',
  'EN_REVISION',
  'CLASIFICADO',
  'EN_POSTULACION',
  'ASIGNADO',
  'PROPUESTA_EN_DISENO',
  'PROPUESTA_LISTA_QA',
  'PROPUESTA_ENVIADA',
  'EN_DECISION_CLIENTE',
  'PENDIENTE_CONTRATACION',
  'AUTORIZADO_EJECUCION',
  'EN_EJECUCION',
  'LISTO_CIERRE',
  'CERRADO',
]

export const ETIQUETA_ESTADO: Record<EstadoCaso, string> = {
  CREADO: 'Creado',
  EN_REVISION: 'En revisión',
  CLASIFICADO: 'Clasificado',
  EN_POSTULACION: 'En postulación',
  ASIGNADO: 'Asignado',
  PROPUESTA_EN_DISENO: 'Propuesta en diseño',
  PROPUESTA_LISTA_QA: 'Propuesta lista para QA',
  PROPUESTA_ENVIADA: 'Propuesta enviada',
  EN_DECISION_CLIENTE: 'En decisión del cliente',
  PENDIENTE_CONTRATACION: 'Pendiente de contratación',
  AUTORIZADO_EJECUCION: 'Autorizado para ejecución',
  EN_EJECUCION: 'En ejecución',
  LISTO_CIERRE: 'Listo para cierre',
  CERRADO: 'Cerrado',
}

export const DESCRIPCION_ESTADO: Record<EstadoCaso, string> = {
  CREADO: 'Caso registrado por la Mipyme.',
  EN_REVISION: 'Caso en análisis y debida diligencia.',
  CLASIFICADO: 'Caso validado y habilitado bajo taxonomías gobernadas.',
  EN_POSTULACION: 'Caso visible para los consultores elegibles.',
  ASIGNADO: 'Consultor responsable principal definido.',
  PROPUESTA_EN_DISENO: 'Construcción de la propuesta técnica.',
  PROPUESTA_LISTA_QA: 'Propuesta lista para revisión metodológica.',
  PROPUESTA_ENVIADA: 'Propuesta enviada formalmente al cliente.',
  EN_DECISION_CLIENTE: 'Cliente evaluando la propuesta.',
  PENDIENTE_CONTRATACION: 'Formalización contractual entre las partes.',
  AUTORIZADO_EJECUCION: 'Checklist contractual completo; puede iniciar ejecución.',
  EN_EJECUCION: 'Caso en operación con seguimiento de hitos.',
  LISTO_CIERRE: 'Pendiente de acta y evaluación final.',
  CERRADO: 'Caso cerrado formalmente.',
}

/** Contexto que el motor recibe para evaluar las reglas de negocio. */
export type ContextoCaso = {
  tieneClasificacion: boolean
  tieneConsultorAsignado: boolean
  totalPostulaciones: number
  tienePropuestaBorrador: boolean
  tienePropuestaLista: boolean
  tienePropuestaAceptada: boolean
  checklistCompleto: boolean
  tieneActaCierre: boolean
  actividadesPendientes: number
}

export type Transicion = {
  destino: EstadoCaso
  etiqueta: string
  roles: Rol[]
  /** Devuelve null si se permite, o el motivo del bloqueo. */
  guard?: (ctx: ContextoCaso) => string | null
  /** Variante destructiva/negativa: se pinta distinto en la UI. */
  tono?: 'primario' | 'neutro' | 'peligro'
}

const ADVISORY: Rol[] = ['ADVISORY', 'SUPER_ADMIN']
const CONSULTOR: Rol[] = ['CONSULTOR', 'SUPER_ADMIN']
const CLIENTE: Rol[] = ['CLIENTE_MIPYME', 'SUPER_ADMIN']

export const WORKFLOW: Record<EstadoCaso, Transicion[]> = {
  CREADO: [
    {
      destino: 'EN_REVISION',
      etiqueta: 'Iniciar debida diligencia',
      roles: ADVISORY,
    },
  ],

  EN_REVISION: [
    {
      destino: 'CLASIFICADO',
      etiqueta: 'Clasificar caso',
      roles: ADVISORY,
      // REQ-004: no se puede clasificar sin taxonomías gobernadas completas.
      guard: (c) =>
        c.tieneClasificacion
          ? null
          : 'Debe registrar complejidad y tipo de intervención antes de clasificar.',
    },
    {
      destino: 'CERRADO',
      etiqueta: 'Descartar caso',
      roles: ADVISORY,
      tono: 'peligro',
    },
  ],

  CLASIFICADO: [
    {
      destino: 'EN_POSTULACION',
      etiqueta: 'Publicar en bolsa interna',
      roles: ADVISORY,
    },
  ],

  EN_POSTULACION: [
    {
      destino: 'ASIGNADO',
      etiqueta: 'Asignar consultor',
      roles: ADVISORY,
      // REQ-008: debe existir un único consultor responsable principal.
      guard: (c) =>
        c.tieneConsultorAsignado
          ? null
          : 'Debe aceptar una postulación para definir el consultor responsable.',
    },
  ],

  ASIGNADO: [
    {
      destino: 'PROPUESTA_EN_DISENO',
      etiqueta: 'Iniciar diseño de propuesta',
      roles: [...CONSULTOR, 'ADVISORY'],
    },
  ],

  PROPUESTA_EN_DISENO: [
    {
      destino: 'PROPUESTA_LISTA_QA',
      etiqueta: 'Enviar a QA metodológico',
      roles: [...CONSULTOR, 'ADVISORY'],
      // REQ-009: debe existir una propuesta construida con las plantillas.
      guard: (c) =>
        c.tienePropuestaBorrador
          ? null
          : 'Debe crear una versión de propuesta antes de enviarla a QA.',
    },
  ],

  PROPUESTA_LISTA_QA: [
    {
      destino: 'PROPUESTA_ENVIADA',
      etiqueta: 'Aprobar QA y enviar al cliente',
      roles: ADVISORY,
      // REQ-010 / REQ-012: sin QA aprobado no sale nada al cliente.
      guard: (c) =>
        c.tienePropuestaLista
          ? null
          : 'La propuesta debe tener el checklist de QA aprobado por Advisory.',
    },
    {
      destino: 'PROPUESTA_EN_DISENO',
      etiqueta: 'Devolver al consultor',
      roles: ADVISORY,
      tono: 'neutro',
    },
  ],

  PROPUESTA_ENVIADA: [
    {
      destino: 'EN_DECISION_CLIENTE',
      etiqueta: 'Marcar como recibida por el cliente',
      roles: [...ADVISORY, 'CLIENTE_MIPYME'],
    },
  ],

  // REQ-013 / REQ-014: decisiones estructuradas TP6A–TP6E dentro del flujo.
  EN_DECISION_CLIENTE: [
    {
      destino: 'PENDIENTE_CONTRATACION',
      etiqueta: 'Aceptar propuesta',
      roles: CLIENTE,
      guard: (c) =>
        c.tienePropuestaAceptada
          ? null
          : 'Registre la decisión de aceptación sobre la propuesta enviada.',
    },
    {
      destino: 'PROPUESTA_EN_DISENO',
      etiqueta: 'Solicitar ajustes',
      roles: CLIENTE,
      tono: 'neutro',
    },
    {
      destino: 'CERRADO',
      etiqueta: 'Rechazar propuesta',
      roles: CLIENTE,
      tono: 'peligro',
    },
  ],

  PENDIENTE_CONTRATACION: [
    {
      destino: 'AUTORIZADO_EJECUCION',
      etiqueta: 'Autorizar ejecución',
      roles: ADVISORY,
      // REQ-016: bloqueo duro hasta que el checklist esté completo.
      guard: (c) =>
        c.checklistCompleto
          ? null
          : 'El checklist de contratación debe estar completo antes de autorizar la ejecución.',
    },
  ],

  AUTORIZADO_EJECUCION: [
    {
      destino: 'EN_EJECUCION',
      etiqueta: 'Iniciar ejecución',
      roles: [...ADVISORY, 'CONSULTOR'],
    },
  ],

  EN_EJECUCION: [
    {
      destino: 'LISTO_CIERRE',
      etiqueta: 'Solicitar cierre',
      roles: [...CONSULTOR, 'ADVISORY'],
      guard: (c) =>
        c.actividadesPendientes === 0
          ? null
          : `Quedan ${c.actividadesPendientes} actividad(es) sin completar.`,
    },
  ],

  LISTO_CIERRE: [
    {
      destino: 'CERRADO',
      etiqueta: 'Cerrar caso',
      roles: ADVISORY,
      // REQ-018: cierre formal con acta y evaluación.
      guard: (c) =>
        c.tieneActaCierre ? null : 'Debe registrar el acta de cierre y la evaluación final.',
    },
    {
      destino: 'EN_EJECUCION',
      etiqueta: 'Reabrir ejecución',
      roles: ADVISORY,
      tono: 'neutro',
    },
  ],

  CERRADO: [],
}

/** Transiciones disponibles para un rol en un estado dado. */
export function transicionesDisponibles(estado: EstadoCaso, rol: Rol): Transicion[] {
  return (WORKFLOW[estado] ?? []).filter((t) => t.roles.includes(rol))
}

/** Valida una transición completa: existencia, rol y regla de negocio. */
export function validarTransicion(
  estadoActual: EstadoCaso,
  destino: EstadoCaso,
  rol: Rol,
  ctx: ContextoCaso,
): { ok: true } | { ok: false; motivo: string } {
  const posibles = WORKFLOW[estadoActual] ?? []
  const t = posibles.find((x) => x.destino === destino)

  if (!t) {
    return {
      ok: false,
      motivo: `Transición no permitida: ${ETIQUETA_ESTADO[estadoActual]} → ${ETIQUETA_ESTADO[destino]}.`,
    }
  }
  if (!t.roles.includes(rol)) {
    return { ok: false, motivo: `Su rol (${rol}) no puede ejecutar esta transición.` }
  }
  const bloqueo = t.guard?.(ctx) ?? null
  if (bloqueo) return { ok: false, motivo: bloqueo }

  return { ok: true }
}

/** Porcentaje de avance del caso dentro del ciclo de vida (para la UI). */
export function avance(estado: EstadoCaso): number {
  const i = ESTADOS.indexOf(estado)
  return Math.round(((i + 1) / ESTADOS.length) * 100)
}

/** Estados que se consideran "abiertos" para los KPIs del dashboard. */
export const ESTADOS_ACTIVOS: EstadoCaso[] = ESTADOS.filter((e) => e !== 'CERRADO')

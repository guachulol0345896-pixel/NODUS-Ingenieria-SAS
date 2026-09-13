import type { EstadoCaso } from '@/db/schema'

/** Une clases de Tailwind ignorando valores falsy. */
export function cn(...clases: (string | false | null | undefined)[]) {
  return clases.filter(Boolean).join(' ')
}

export function fecha(d: Date | string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function fechaHora(d: Date | string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function tiempoRelativo(d: Date | string) {
  const ms = Date.now() - new Date(d).getTime()
  const min = Math.round(ms / 60000)
  if (min < 1) return 'hace un momento'
  if (min < 60) return `hace ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `hace ${h} h`
  const dias = Math.round(h / 24)
  if (dias < 30) return `hace ${dias} d`
  return fecha(d)
}

export function moneda(v: number | null | undefined) {
  if (v === null || v === undefined) return '—'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(v)
}

export function bytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

/** Color del chip de estado del caso. */
export function colorEstado(e: EstadoCaso): string {
  const mapa: Record<EstadoCaso, string> = {
    CREADO: 'bg-slate-100 text-slate-700 ring-slate-200',
    EN_REVISION: 'bg-amber-100 text-amber-800 ring-amber-200',
    CLASIFICADO: 'bg-sky-100 text-sky-800 ring-sky-200',
    EN_POSTULACION: 'bg-indigo-100 text-indigo-800 ring-indigo-200',
    ASIGNADO: 'bg-violet-100 text-violet-800 ring-violet-200',
    PROPUESTA_EN_DISENO: 'bg-purple-100 text-purple-800 ring-purple-200',
    PROPUESTA_LISTA_QA: 'bg-fuchsia-100 text-fuchsia-800 ring-fuchsia-200',
    PROPUESTA_ENVIADA: 'bg-cyan-100 text-cyan-800 ring-cyan-200',
    EN_DECISION_CLIENTE: 'bg-teal-100 text-teal-800 ring-teal-200',
    PENDIENTE_CONTRATACION: 'bg-orange-100 text-orange-800 ring-orange-200',
    AUTORIZADO_EJECUCION: 'bg-lime-100 text-lime-800 ring-lime-200',
    EN_EJECUCION: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
    LISTO_CIERRE: 'bg-blue-100 text-blue-800 ring-blue-200',
    CERRADO: 'bg-zinc-200 text-zinc-700 ring-zinc-300',
  }
  return mapa[e]
}

export const ETIQUETA_ROL: Record<string, string> = {
  SUPER_ADMIN: 'Super administrador',
  ADVISORY: 'Advisory / PMO',
  CONSULTOR: 'Consultor',
  CLIENTE_MIPYME: 'Cliente Mipyme',
}

export function iniciales(nombre: string) {
  return nombre
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

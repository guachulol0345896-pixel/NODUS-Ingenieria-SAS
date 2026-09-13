/**
 * Componentes de interfaz reutilizables (sin librerías externas).
 */

import { cn, colorEstado } from '@/lib/utils'
import { ETIQUETA_ESTADO } from '@/lib/workflow'
import type { EstadoCaso } from '@/db/schema'

export function Tarjeta({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn('tarjeta', className)}>{children}</div>
}

export function TarjetaCabecera({
  titulo,
  descripcion,
  accion,
}: {
  titulo: string
  descripcion?: string
  accion?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">{titulo}</h2>
        {descripcion && <p className="mt-0.5 text-xs text-slate-500">{descripcion}</p>}
      </div>
      {accion}
    </div>
  )
}

export function ChipEstado({ estado }: { estado: EstadoCaso }) {
  return <span className={cn('chip', colorEstado(estado))}>{ETIQUETA_ESTADO[estado]}</span>
}

export function Chip({
  children,
  tono = 'neutro',
}: {
  children: React.ReactNode
  tono?: 'neutro' | 'exito' | 'alerta' | 'peligro' | 'info'
}) {
  const tonos = {
    neutro: 'bg-slate-100 text-slate-700 ring-slate-200',
    exito: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
    alerta: 'bg-amber-100 text-amber-800 ring-amber-200',
    peligro: 'bg-rose-100 text-rose-800 ring-rose-200',
    info: 'bg-marca-100 text-marca-800 ring-marca-200',
  }
  return <span className={cn('chip', tonos[tono])}>{children}</span>
}

export function Kpi({
  titulo,
  valor,
  detalle,
  tono = 'neutro',
}: {
  titulo: string
  valor: string | number
  detalle?: string
  tono?: 'neutro' | 'exito' | 'alerta' | 'peligro'
}) {
  const colores = {
    neutro: 'text-slate-900',
    exito: 'text-emerald-600',
    alerta: 'text-amber-600',
    peligro: 'text-rose-600',
  }
  return (
    <div className="tarjeta px-5 py-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{titulo}</p>
      <p className={cn('mt-1.5 text-2xl font-semibold tabular-nums', colores[tono])}>{valor}</p>
      {detalle && <p className="mt-1 text-xs text-slate-500">{detalle}</p>}
    </div>
  )
}

export function Vacio({ mensaje, icono }: { mensaje: string; icono?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      {icono && <div className="text-slate-300">{icono}</div>}
      <p className="text-sm text-slate-500">{mensaje}</p>
    </div>
  )
}

export function Campo({
  etiqueta,
  children,
  ayuda,
  requerido,
}: {
  etiqueta: string
  children: React.ReactNode
  ayuda?: string
  requerido?: boolean
}) {
  return (
    <div>
      <label className="etiqueta">
        {etiqueta}
        {requerido && <span className="ml-0.5 text-rose-500">*</span>}
      </label>
      {children}
      {ayuda && <p className="mt-1 text-xs text-slate-500">{ayuda}</p>}
    </div>
  )
}

export function Alerta({
  tono = 'info',
  children,
}: {
  tono?: 'info' | 'exito' | 'alerta' | 'peligro'
  children: React.ReactNode
}) {
  const tonos = {
    info: 'border-marca-200 bg-marca-50 text-marca-900',
    exito: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    alerta: 'border-amber-200 bg-amber-50 text-amber-900',
    peligro: 'border-rose-200 bg-rose-50 text-rose-900',
  }
  return (
    <div className={cn('rounded-lg border px-4 py-3 text-sm', tonos[tono])}>{children}</div>
  )
}

export function BarraAvance({ valor }: { valor: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
      <div
        className="h-full rounded-full bg-marca-600 transition-all"
        style={{ width: `${Math.min(100, Math.max(0, valor))}%` }}
      />
    </div>
  )
}

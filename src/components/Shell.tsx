'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  Bell,
  Briefcase,
  Building2,
  FileText,
  FolderOpen,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  ScrollText,
  Settings,
  Users,
  X,
} from 'lucide-react'
import { cn, ETIQUETA_ROL, iniciales, tiempoRelativo } from '@/lib/utils'
import type { Rol } from '@/db/schema'

type Item = { href: string; etiqueta: string; icono: React.ElementType; roles: Rol[] }

const TODOS: Rol[] = ['SUPER_ADMIN', 'ADVISORY', 'CONSULTOR', 'CLIENTE_MIPYME']
const INTERNOS: Rol[] = ['SUPER_ADMIN', 'ADVISORY']

const NAV: Item[] = [
  { href: '/dashboard', etiqueta: 'Dashboard', icono: LayoutDashboard, roles: TODOS },
  { href: '/casos', etiqueta: 'Casos', icono: Briefcase, roles: TODOS },
  { href: '/bolsa', etiqueta: 'Bolsa de consultores', icono: ListChecks, roles: ['CONSULTOR', ...INTERNOS] },
  { href: '/empresas', etiqueta: 'Empresas', icono: Building2, roles: INTERNOS },
  { href: '/consultores', etiqueta: 'Consultores', icono: Users, roles: INTERNOS },
  { href: '/propuestas', etiqueta: 'Propuestas', icono: FileText, roles: TODOS },
  { href: '/documentos', etiqueta: 'Documentos', icono: FolderOpen, roles: TODOS },
  { href: '/sla', etiqueta: 'SLA y alertas', icono: AlertTriangle, roles: INTERNOS },
  { href: '/bitacora', etiqueta: 'Bitácora', icono: ScrollText, roles: INTERNOS },
  { href: '/configuracion', etiqueta: 'Configuración', icono: Settings, roles: INTERNOS },
]

type Notificacion = {
  id: string
  titulo: string
  mensaje: string
  url: string | null
  leida: boolean
  createdAt: string
}

export function Shell({
  usuario,
  children,
}: {
  usuario: { nombre: string; rol: Rol; email: string }
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [panelNotis, setPanelNotis] = useState(false)
  const [notis, setNotis] = useState<Notificacion[]>([])

  const visibles = NAV.filter((i) => i.roles.includes(usuario.rol))
  const sinLeer = notis.filter((n) => !n.leida).length

  useEffect(() => {
    fetch('/api/notificaciones')
      .then((r) => r.json())
      .then((j) => j.ok && setNotis(j.data))
      .catch(() => {})
  }, [pathname])

  async function marcarLeidas() {
    await fetch('/api/notificaciones', { method: 'POST' })
    setNotis((n) => n.map((x) => ({ ...x, leida: true })))
  }

  async function salir() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="flex min-h-screen">
      {/* ---------------------------------------------------------- Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 shrink-0 border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0',
          abierto ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-marca-600 text-sm font-bold text-white">
            N
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight text-slate-900">NODUS</p>
            <p className="text-[11px] leading-tight text-slate-500">Ingeniería SAS</p>
          </div>
          <button
            className="ml-auto lg:hidden"
            onClick={() => setAbierto(false)}
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <nav className="space-y-0.5 p-3">
          {visibles.map((i) => {
            const activo = pathname === i.href || pathname.startsWith(i.href + '/')
            const Icono = i.icono
            return (
              <Link
                key={i.href}
                href={i.href}
                onClick={() => setAbierto(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition',
                  activo
                    ? 'bg-marca-50 font-medium text-marca-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                )}
              >
                <Icono className="h-4 w-4 shrink-0" />
                {i.etiqueta}
              </Link>
            )
          })}
        </nav>

        <div className="absolute inset-x-0 bottom-0 border-t border-slate-200 p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
              {iniciales(usuario.nombre)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">{usuario.nombre}</p>
              <p className="truncate text-xs text-slate-500">{ETIQUETA_ROL[usuario.rol]}</p>
            </div>
            <button onClick={salir} title="Cerrar sesión" className="text-slate-400 hover:text-rose-600">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {abierto && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/30 lg:hidden"
          onClick={() => setAbierto(false)}
        />
      )}

      {/* ------------------------------------------------------------ Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:px-8">
          <button className="lg:hidden" onClick={() => setAbierto(true)} aria-label="Abrir menú">
            <Menu className="h-5 w-5 text-slate-600" />
          </button>

          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => {
                  setPanelNotis((v) => !v)
                  if (!panelNotis && sinLeer) marcarLeidas()
                }}
                className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Notificaciones"
              >
                <Bell className="h-5 w-5" />
                {sinLeer > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                    {sinLeer}
                  </span>
                )}
              </button>

              {panelNotis && (
                <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                  <p className="border-b border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-900">
                    Notificaciones
                  </p>
                  <div className="max-h-80 overflow-y-auto">
                    {notis.length === 0 && (
                      <p className="px-4 py-6 text-center text-sm text-slate-500">
                        No tiene notificaciones.
                      </p>
                    )}
                    {notis.map((n) => (
                      <Link
                        key={n.id}
                        href={n.url ?? '#'}
                        onClick={() => setPanelNotis(false)}
                        className="block border-b border-slate-100 px-4 py-3 hover:bg-slate-50"
                      >
                        <p className="text-sm font-medium text-slate-900">{n.titulo}</p>
                        <p className="mt-0.5 text-xs text-slate-600">{n.mensaje}</p>
                        <p className="mt-1 text-[11px] text-slate-400">
                          {tiempoRelativo(n.createdAt)}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Link href="/casos/nuevo" className="btn-primario hidden sm:inline-flex">
              Nuevo caso
            </Link>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  )
}

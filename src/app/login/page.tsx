'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Alerta, Campo } from '@/components/ui'

const DEMO = [
  { rol: 'Super administrador', email: 'admin@nodus.co' },
  { rol: 'Advisory / PMO', email: 'advisory@nodus.co' },
  { rol: 'Consultor', email: 'consultor@nodus.co' },
  { rol: 'Cliente Mipyme', email: 'cliente@nodus.co' },
]

function Formulario() {
  const router = useRouter()
  const params = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setCargando(true)
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const j = await r.json()
      if (!j.ok) {
        setError(j.error ?? 'No fue posible iniciar sesión')
        return
      }
      router.push(params.get('redirect') || '/dashboard')
      router.refresh()
    } catch {
      setError('Error de conexión con el servidor')
    } finally {
      setCargando(false)
    }
  }

  function usar(correo: string) {
    setEmail(correo)
    setPassword('nodus123')
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-marca-600 text-base font-bold text-white">
          N
        </div>
        <div>
          <p className="font-semibold leading-tight text-slate-900">NODUS</p>
          <p className="text-xs leading-tight text-slate-500">Ingeniería SAS</p>
        </div>
      </div>

      <h1 className="text-xl font-semibold text-slate-900">Iniciar sesión</h1>
      <p className="mt-1 text-sm text-slate-600">Acceda con las credenciales de su cuenta.</p>

      <form onSubmit={enviar} className="mt-6 space-y-4">
        {error && <Alerta tono="peligro">{error}</Alerta>}

        <Campo etiqueta="Correo electrónico" requerido>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="campo"
            placeholder="usuario@empresa.com"
            autoComplete="username"
          />
        </Campo>

        <Campo etiqueta="Contraseña" requerido>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="campo"
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </Campo>

        <button type="submit" disabled={cargando} className="btn-primario w-full">
          {cargando ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>

      <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Usuarios de demostración
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Contraseña para todos: <code className="font-mono text-slate-700">nodus123</code>
        </p>
        <div className="mt-3 space-y-1">
          {DEMO.map((d) => (
            <button
              key={d.email}
              type="button"
              onClick={() => usar(d.email)}
              className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs hover:bg-white"
            >
              <span className="font-medium text-slate-700">{d.rol}</span>
              <span className="font-mono text-slate-500">{d.email}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-slate-600">
        ¿Es una Mipyme sin cuenta?{' '}
        <Link href="/intake" className="font-medium text-marca-600 hover:underline">
          Registre su caso
        </Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <Suspense fallback={null}>
        <Formulario />
      </Suspense>
    </div>
  )
}

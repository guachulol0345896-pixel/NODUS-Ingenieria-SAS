'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, RefreshCw } from 'lucide-react'

export function BotonEscanearSla() {
  const router = useRouter()
  const [cargando, setCargando] = useState(false)
  const [resultado, setResultado] = useState<string | null>(null)

  async function escanear() {
    setCargando(true)
    setResultado(null)
    try {
      const r = await fetch('/api/sla/scan', { method: 'POST' })
      const j = await r.json()
      if (j.ok) {
        setResultado(
          `${j.data.evaluados} casos evaluados · ${j.data.alertasCreadas} alertas nuevas · ${j.data.vencidos} vencidos`,
        )
        router.refresh()
      } else {
        setResultado(j.error ?? 'Error al ejecutar el escaneo')
      }
    } catch {
      setResultado('Error de conexión')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="text-right">
      <button onClick={escanear} disabled={cargando} className="btn-primario">
        {cargando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        Ejecutar escaneo de SLA
      </button>
      {resultado && <p className="mt-1.5 text-xs text-slate-600">{resultado}</p>}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Alerta, Campo, Tarjeta } from '@/components/ui'

export function FormularioCaso({
  empresas,
  areas,
  empresaFija,
}: {
  empresas: { id: string; nombre: string }[]
  areas: { codigo: string; etiqueta: string }[]
  empresaFija?: string
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [detalles, setDetalles] = useState<{ campo: string; mensaje: string }[]>([])
  const [cargando, setCargando] = useState(false)
  const [d, setD] = useState({
    empresaId: empresaFija ?? '',
    titulo: '',
    descripcion: '',
    areaNegocio: '',
    urgencia: 'MEDIA',
    impacto: 'MEDIO',
  })

  const set = (k: keyof typeof d, v: string) => setD((p) => ({ ...p, [k]: v }))

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setDetalles([])
    setCargando(true)
    try {
      const r = await fetch('/api/casos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(d),
      })
      const j = await r.json()
      if (!j.ok) {
        setError(j.error)
        setDetalles(j.detalles ?? [])
        return
      }
      router.push(`/casos/${j.data.id}`)
      router.refresh()
    } catch {
      setError('Error de conexión')
    } finally {
      setCargando(false)
    }
  }

  return (
    <Tarjeta className="p-6">
      <form onSubmit={enviar} className="space-y-4">
        {error && (
          <Alerta tono="peligro">
            {error}
            {detalles.length > 0 && (
              <ul className="mt-2 list-inside list-disc text-xs">
                {detalles.map((x, i) => (
                  <li key={i}>
                    <span className="font-medium">{x.campo}</span>: {x.mensaje}
                  </li>
                ))}
              </ul>
            )}
          </Alerta>
        )}

        <Campo etiqueta="Empresa" requerido>
          <select
            className="campo"
            value={d.empresaId}
            onChange={(e) => set('empresaId', e.target.value)}
            disabled={Boolean(empresaFija)}
          >
            <option value="">Seleccione…</option>
            {empresas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
        </Campo>

        <Campo etiqueta="Título del caso" requerido>
          <input className="campo" value={d.titulo} onChange={(e) => set('titulo', e.target.value)} />
        </Campo>

        <Campo etiqueta="Descripción de la necesidad" requerido ayuda="Mínimo 20 caracteres.">
          <textarea
            className="campo min-h-32"
            value={d.descripcion}
            onChange={(e) => set('descripcion', e.target.value)}
          />
        </Campo>

        <Campo etiqueta="Área de negocio" requerido>
          <select className="campo" value={d.areaNegocio} onChange={(e) => set('areaNegocio', e.target.value)}>
            <option value="">Seleccione…</option>
            {areas.map((a) => (
              <option key={a.codigo} value={a.codigo}>
                {a.etiqueta}
              </option>
            ))}
          </select>
        </Campo>

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Urgencia" requerido>
            <select className="campo" value={d.urgencia} onChange={(e) => set('urgencia', e.target.value)}>
              <option value="ALTA">Alta</option>
              <option value="MEDIA">Media</option>
              <option value="BAJA">Baja</option>
            </select>
          </Campo>
          <Campo etiqueta="Impacto" requerido>
            <select className="campo" value={d.impacto} onChange={(e) => set('impacto', e.target.value)}>
              <option value="ALTO">Alto</option>
              <option value="MEDIO">Medio</option>
              <option value="BAJO">Bajo</option>
            </select>
          </Campo>
        </div>

        <button disabled={cargando} className="btn-primario w-full">
          {cargando ? 'Creando…' : 'Crear caso'}
        </button>
      </form>
    </Tarjeta>
  )
}

'use client'

/**
 * Punto 1 — Onboarding y apertura del caso (Plantilla T1).
 * Dos bloques, un solo envío, diseñado para completarse en menos de 3 minutos.
 */

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Alerta, Campo } from '@/components/ui'

const AREAS = [
  ['ESTRATEGIA', 'Estrategia'],
  ['TECNOLOGIA', 'Tecnología'],
  ['FINANZAS', 'Finanzas'],
  ['OPERACIONES', 'Operaciones'],
  ['LEGAL', 'Legal / Cumplimiento'],
  ['TALENTO', 'Talento humano'],
  ['MERCADEO', 'Mercadeo y ventas'],
  ['OTRO', 'Otro'],
]

export default function IntakePage() {
  const router = useRouter()
  const [paso, setPaso] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [detalles, setDetalles] = useState<{ campo: string; mensaje: string }[]>([])
  const [cargando, setCargando] = useState(false)
  const [listo, setListo] = useState<{ codigo: string; reutilizada: boolean } | null>(null)

  const [d, setD] = useState({
    empresaNombre: '',
    nit: '',
    contactoNombre: '',
    cargo: '',
    email: '',
    telefono: '',
    pais: 'Colombia',
    ciudad: '',
    aceptaTerminos: false,
    titulo: '',
    descripcion: '',
    areaNegocio: '',
    urgencia: 'MEDIA',
    impacto: 'MEDIO',
    password: '',
  })

  const set = (k: keyof typeof d, v: string | boolean) => setD((p) => ({ ...p, [k]: v }))

  const bloque1Ok =
    d.empresaNombre.length > 1 &&
    d.contactoNombre.length > 1 &&
    d.cargo.length > 1 &&
    /\S+@\S+\.\S+/.test(d.email) &&
    d.telefono.length > 5 &&
    d.ciudad.length > 1 &&
    d.aceptaTerminos

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setDetalles([])
    setCargando(true)
    try {
      const r = await fetch('/api/auth/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(d),
      })
      const j = await r.json()
      if (!j.ok) {
        setError(j.error ?? 'No fue posible registrar el caso')
        setDetalles(j.detalles ?? [])
        return
      }
      setListo({ codigo: j.data.codigo, reutilizada: j.data.empresaReutilizada })
    } catch {
      setError('Error de conexión con el servidor')
    } finally {
      setCargando(false)
    }
  }

  if (listo) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 text-center">
        <CheckCircle2 className="h-12 w-12 text-emerald-500" />
        <h1 className="mt-4 text-2xl font-semibold text-slate-900">Caso registrado</h1>
        <p className="mt-2 text-slate-600">
          Su necesidad quedó registrada con el código{' '}
          <span className="font-mono font-semibold text-slate-900">{listo.codigo}</span> y en
          estado <span className="font-medium">Creado</span>.
        </p>
        {listo.reutilizada && (
          <p className="mt-3 text-sm text-slate-500">
            Su empresa ya existía en la plataforma: el caso se asoció al registro empresarial
            existente.
          </p>
        )}
        <p className="mt-3 text-sm text-slate-500">
          El equipo Advisory iniciará la debida diligencia. Puede seguir el avance desde su panel.
        </p>
        <button className="btn-primario mt-6" onClick={() => router.push('/dashboard')}>
          Ir a mi panel
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Link href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Volver
      </Link>

      <h1 className="text-2xl font-semibold text-slate-900">Registrar una necesidad</h1>
      <p className="mt-1.5 text-slate-600">
        Dos bloques, menos de tres minutos. No necesita crear una cuenta aparte.
      </p>

      {/* Indicador de pasos */}
      <div className="mt-6 flex items-center gap-3">
        {[1, 2].map((n) => (
          <div key={n} className="flex flex-1 items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                paso >= n ? 'bg-marca-600 text-white' : 'bg-slate-200 text-slate-500'
              }`}
            >
              {n}
            </div>
            <span className={`text-sm ${paso >= n ? 'text-slate-900' : 'text-slate-500'}`}>
              {n === 1 ? 'Su empresa' : 'Su necesidad'}
            </span>
          </div>
        ))}
      </div>

      <form onSubmit={enviar} className="tarjeta mt-6 space-y-5 p-6">
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

        {paso === 1 && (
          <>
            <Campo etiqueta="Nombre de la empresa" requerido>
              <input
                className="campo"
                value={d.empresaNombre}
                onChange={(e) => set('empresaNombre', e.target.value)}
                placeholder="Textiles Andinas SAS"
              />
            </Campo>

            <Campo etiqueta="NIT o identificación empresarial" ayuda="Opcional. Mejora la verificación de identidad de su empresa.">
              <input
                className="campo"
                value={d.nit}
                onChange={(e) => set('nit', e.target.value)}
                placeholder="900123456-1"
              />
            </Campo>

            <div className="grid gap-4 sm:grid-cols-2">
              <Campo etiqueta="Nombre del contacto" requerido>
                <input
                  className="campo"
                  value={d.contactoNombre}
                  onChange={(e) => set('contactoNombre', e.target.value)}
                />
              </Campo>
              <Campo etiqueta="Cargo" requerido>
                <input
                  className="campo"
                  value={d.cargo}
                  onChange={(e) => set('cargo', e.target.value)}
                  placeholder="Gerente general"
                />
              </Campo>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Campo etiqueta="Correo corporativo" requerido>
                <input
                  type="email"
                  className="campo"
                  value={d.email}
                  onChange={(e) => set('email', e.target.value)}
                />
              </Campo>
              <Campo etiqueta="Teléfono o WhatsApp" requerido>
                <input
                  className="campo"
                  value={d.telefono}
                  onChange={(e) => set('telefono', e.target.value)}
                  placeholder="+57 310 000 0000"
                />
              </Campo>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Campo etiqueta="País" requerido>
                <input className="campo" value={d.pais} onChange={(e) => set('pais', e.target.value)} />
              </Campo>
              <Campo etiqueta="Ciudad" requerido>
                <input className="campo" value={d.ciudad} onChange={(e) => set('ciudad', e.target.value)} />
              </Campo>
            </div>

            <Campo etiqueta="Contraseña de acceso" requerido ayuda="Con ella podrá seguir el avance de su caso.">
              <input
                type="password"
                className="campo"
                value={d.password}
                onChange={(e) => set('password', e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </Campo>

            <label className="flex items-start gap-2.5 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={d.aceptaTerminos}
                onChange={(e) => set('aceptaTerminos', e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300"
              />
              Acepto los términos de uso y la política de tratamiento de datos personales.
            </label>

            <button
              type="button"
              disabled={!bloque1Ok || d.password.length < 6}
              onClick={() => setPaso(2)}
              className="btn-primario w-full"
            >
              Continuar
            </button>
          </>
        )}

        {paso === 2 && (
          <>
            <Campo etiqueta="Título del caso" requerido>
              <input
                className="campo"
                value={d.titulo}
                onChange={(e) => set('titulo', e.target.value)}
                placeholder="Reducción de desperdicio en la línea de corte"
              />
            </Campo>

            <Campo
              etiqueta="Describa el problema o necesidad"
              requerido
              ayuda="Cuente qué está pasando, desde cuándo y qué le gustaría lograr."
            >
              <textarea
                className="campo min-h-32 resize-y"
                value={d.descripcion}
                onChange={(e) => set('descripcion', e.target.value)}
              />
            </Campo>

            <Campo etiqueta="Área del negocio involucrada" requerido>
              <select
                className="campo"
                value={d.areaNegocio}
                onChange={(e) => set('areaNegocio', e.target.value)}
              >
                <option value="">Seleccione…</option>
                {AREAS.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </Campo>

            <div className="grid gap-4 sm:grid-cols-2">
              <Campo etiqueta="Nivel de urgencia" requerido>
                <select className="campo" value={d.urgencia} onChange={(e) => set('urgencia', e.target.value)}>
                  <option value="ALTA">Alta</option>
                  <option value="MEDIA">Media</option>
                  <option value="BAJA">Baja</option>
                </select>
              </Campo>
              <Campo etiqueta="Impacto estimado" requerido>
                <select className="campo" value={d.impacto} onChange={(e) => set('impacto', e.target.value)}>
                  <option value="ALTO">Alto</option>
                  <option value="MEDIO">Medio</option>
                  <option value="BAJO">Bajo</option>
                </select>
              </Campo>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setPaso(1)} className="btn-secundario flex-1">
                Atrás
              </button>
              <button type="submit" disabled={cargando} className="btn-primario flex-1">
                {cargando ? 'Registrando…' : 'Registrar caso'}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  )
}

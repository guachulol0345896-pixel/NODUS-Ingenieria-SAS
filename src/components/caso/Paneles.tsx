'use client'

/**
 * Componentes interactivos de la ficha del caso.
 * Todos llaman a las APIs REST y refrescan la vista del servidor.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Check, Loader2, Upload } from 'lucide-react'
import { Alerta, Campo, Chip, Tarjeta, TarjetaCabecera } from '@/components/ui'
import { bytes, fechaHora, moneda } from '@/lib/utils'
import { ETIQUETA_ESTADO } from '@/lib/workflow'
import type { EstadoCaso } from '@/db/schema'

// ------------------------------------------------------------------ helpers

function useAccion() {
  const router = useRouter()
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function ejecutar(url: string, init?: RequestInit) {
    setCargando(true)
    setError(null)
    try {
      const r = await fetch(url, init)
      const j = await r.json().catch(() => ({ ok: false, error: 'Respuesta inválida' }))
      if (!j.ok) {
        const det = Array.isArray(j.detalles)
          ? ' ' + j.detalles.map((d: { campo: string; mensaje: string }) => `${d.campo}: ${d.mensaje}`).join(' · ')
          : ''
        setError((j.error ?? 'Error') + det)
        return null
      }
      router.refresh()
      return j.data
    } catch {
      setError('Error de conexión')
      return null
    } finally {
      setCargando(false)
    }
  }

  return { ejecutar, cargando, error, setError }
}

const json = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

// ----------------------------------------------------------------- workflow

export type AccionWorkflow = {
  destino: EstadoCaso
  etiqueta: string
  bloqueo: string | null
  tono?: 'primario' | 'neutro' | 'peligro'
}

export function AccionesWorkflow({
  casoId,
  acciones,
}: {
  casoId: string
  acciones: AccionWorkflow[]
}) {
  const { ejecutar, cargando, error } = useAccion()
  const [comentario, setComentario] = useState('')

  if (acciones.length === 0) {
    return (
      <Tarjeta className="p-5">
        <p className="text-sm text-slate-500">
          No hay acciones de workflow disponibles para su rol en el estado actual.
        </p>
      </Tarjeta>
    )
  }

  return (
    <Tarjeta>
      <TarjetaCabecera
        titulo="Acciones del workflow"
        descripcion="Sólo se muestran las transiciones permitidas para su rol"
      />
      <div className="space-y-3 p-5">
        {error && <Alerta tono="peligro">{error}</Alerta>}

        <textarea
          className="campo min-h-16 resize-y"
          placeholder="Comentario para la bitácora (opcional)…"
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
        />

        <div className="flex flex-wrap gap-2">
          {acciones.map((a) => (
            <div key={a.destino} className="flex flex-col">
              <button
                disabled={cargando || Boolean(a.bloqueo)}
                title={a.bloqueo ?? undefined}
                onClick={() =>
                  ejecutar(
                    `/api/casos/${casoId}/transicion`,
                    json({ destino: a.destino, comentario }),
                  )
                }
                className={
                  a.tono === 'peligro'
                    ? 'btn-peligro'
                    : a.tono === 'neutro'
                      ? 'btn-secundario'
                      : 'btn-primario'
                }
              >
                {cargando && <Loader2 className="h-4 w-4 animate-spin" />}
                {a.etiqueta}
              </button>
              {a.bloqueo && (
                <span className="mt-1 max-w-64 text-xs text-amber-700">⚠ {a.bloqueo}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </Tarjeta>
  )
}

// ------------------------------------------------------------ clasificación

export function PanelClasificacion({
  casoId,
  inicial,
  opciones,
}: {
  casoId: string
  inicial: { complejidad: string | null; tipoIntervencion: string | null; notas: string | null }
  opciones: { complejidad: { codigo: string; etiqueta: string }[]; tipo: { codigo: string; etiqueta: string }[] }
}) {
  const { ejecutar, cargando, error } = useAccion()
  const [complejidad, setComplejidad] = useState(inicial.complejidad ?? '')
  const [tipo, setTipo] = useState(inicial.tipoIntervencion ?? '')
  const [notas, setNotas] = useState(inicial.notas ?? '')

  return (
    <Tarjeta>
      <TarjetaCabecera
        titulo="Clasificación gobernada"
        descripcion="Taxonomías parametrizadas — debida diligencia (REQ-004)"
      />
      <div className="space-y-4 p-5">
        {error && <Alerta tono="peligro">{error}</Alerta>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Complejidad" requerido>
            <select className="campo" value={complejidad} onChange={(e) => setComplejidad(e.target.value)}>
              <option value="">Seleccione…</option>
              {opciones.complejidad.map((o) => (
                <option key={o.codigo} value={o.codigo}>
                  {o.etiqueta}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Tipo de intervención" requerido>
            <select className="campo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="">Seleccione…</option>
              {opciones.tipo.map((o) => (
                <option key={o.codigo} value={o.codigo}>
                  {o.etiqueta}
                </option>
              ))}
            </select>
          </Campo>
        </div>

        <Campo etiqueta="Notas de clasificación">
          <textarea
            className="campo min-h-20 resize-y"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Observaciones internas de la debida diligencia…"
          />
        </Campo>

        <button
          disabled={cargando || !complejidad || !tipo}
          onClick={() =>
            ejecutar(`/api/casos/${casoId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                accion: 'clasificar',
                complejidad,
                tipoIntervencion: tipo,
                etiquetas: [],
                notasClasificacion: notas,
              }),
            })
          }
          className="btn-primario"
        >
          Guardar clasificación
        </button>
      </div>
    </Tarjeta>
  )
}

// ------------------------------------------------------------ postulaciones

export type PostulacionVista = {
  id: string
  consultor: string
  nivel: string | null
  reputacion: number | null
  especialidades: string[]
  enfoque: string
  experiencia: string
  tiempoEstimado: number
  estado: string
  createdAt: string
}

export function PanelPostulaciones({
  postulaciones,
  puedeAsignar,
  puedePostular,
  casoId,
  yaPostulado,
}: {
  postulaciones: PostulacionVista[]
  puedeAsignar: boolean
  puedePostular: boolean
  casoId: string
  yaPostulado: boolean
}) {
  const { ejecutar, cargando, error } = useAccion()
  const [form, setForm] = useState({ enfoque: '', experiencia: '', tiempoEstimado: '' })

  return (
    <Tarjeta>
      <TarjetaCabecera
        titulo="Bolsa interna — postulaciones"
        descripcion="Plantilla T3C · sólo consultores elegibles por especialidad y disponibilidad"
      />
      <div className="p-5">
        {error && <Alerta tono="peligro">{error}</Alerta>}

        {postulaciones.length === 0 && (
          <p className="text-sm text-slate-500">Aún no hay postulaciones para este caso.</p>
        )}

        <ul className="space-y-3">
          {postulaciones.map((p) => (
            <li key={p.id} className="rounded-lg border border-slate-200 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-slate-900">{p.consultor}</span>
                {p.nivel && <Chip>{p.nivel}</Chip>}
                {p.reputacion ? <Chip tono="info">★ {p.reputacion.toFixed(1)}</Chip> : null}
                {p.estado === 'ACEPTADA' && <Chip tono="exito">Aceptada</Chip>}
                {p.estado === 'RECHAZADA' && <Chip tono="neutro">Rechazada</Chip>}
                <span className="ml-auto text-xs text-slate-400">{fechaHora(p.createdAt)}</span>
              </div>
              <p className="mt-2 text-sm text-slate-700">
                <span className="font-medium">Enfoque:</span> {p.enfoque}
              </p>
              <p className="mt-1 text-sm text-slate-700">
                <span className="font-medium">Experiencia:</span> {p.experiencia}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Tiempo estimado: <span className="font-medium">{p.tiempoEstimado} días</span>
              </p>

              {puedeAsignar && p.estado === 'POSTULADA' && (
                <button
                  disabled={cargando}
                  onClick={() => ejecutar(`/api/postulaciones/${p.id}/aceptar`, { method: 'POST' })}
                  className="btn-primario mt-3"
                >
                  <Check className="h-4 w-4" /> Asignar como responsable
                </button>
              )}
            </li>
          ))}
        </ul>

        {puedePostular && !yaPostulado && (
          <div className="mt-5 space-y-3 rounded-lg border border-dashed border-slate-300 p-4">
            <p className="text-sm font-semibold text-slate-900">Postularme a este caso</p>
            <Campo etiqueta="Enfoque propuesto" requerido>
              <textarea
                className="campo min-h-20 resize-y"
                value={form.enfoque}
                onChange={(e) => setForm({ ...form, enfoque: e.target.value })}
                placeholder="Cómo abordaría el caso, en al menos 20 caracteres…"
              />
            </Campo>
            <Campo etiqueta="Experiencia relevante" requerido>
              <textarea
                className="campo min-h-20 resize-y"
                value={form.experiencia}
                onChange={(e) => setForm({ ...form, experiencia: e.target.value })}
              />
            </Campo>
            <Campo etiqueta="Tiempo estimado (días)" requerido>
              <input
                type="number"
                min={1}
                className="campo max-w-32"
                value={form.tiempoEstimado}
                onChange={(e) => setForm({ ...form, tiempoEstimado: e.target.value })}
              />
            </Campo>
            <button
              disabled={cargando}
              onClick={() => ejecutar('/api/postulaciones', json({ casoId, ...form }))}
              className="btn-primario"
            >
              Enviar postulación
            </button>
          </div>
        )}

        {puedePostular && yaPostulado && (
          <Alerta tono="exito">Ya envió su postulación para este caso.</Alerta>
        )}
      </div>
    </Tarjeta>
  )
}

// ---------------------------------------------------------------- propuestas

export type PropuestaVista = {
  id: string
  version: number
  titulo: string
  resumen: string
  alcance: string
  metodologia: string
  entregables: string
  cronograma: string
  valorEstimado: number | null
  duracionDias: number | null
  estado: string
  qaChecklist: Record<string, boolean> | null
  qaObservaciones: string | null
  enviadaAt: string | null
  decisionComentario: string | null
  createdAt: string
}

const ITEMS_QA: [string, string][] = [
  ['alcanceClaro', 'El alcance está delimitado y es verificable'],
  ['metodologiaConsistente', 'La metodología es consistente con el alcance'],
  ['entregablesMedibles', 'Los entregables son medibles'],
  ['cronogramaViable', 'El cronograma es viable'],
  ['riesgosIdentificados', 'Se identificaron supuestos y riesgos'],
  ['valorJustificado', 'El valor propuesto está justificado'],
]

export function PanelPropuestas({
  casoId,
  propuestas,
  puedeCrear,
  puedeQa,
  puedeDecidir,
}: {
  casoId: string
  propuestas: PropuestaVista[]
  puedeCrear: boolean
  puedeQa: boolean
  puedeDecidir: boolean
}) {
  const { ejecutar, cargando, error } = useAccion()
  const [nueva, setNueva] = useState(false)
  const [qaAbierto, setQaAbierto] = useState<string | null>(null)
  const [checklist, setChecklist] = useState<Record<string, boolean>>({})
  const [obsQa, setObsQa] = useState('')
  const [decisionComentario, setDecisionComentario] = useState('')

  const [f, setF] = useState({
    titulo: '',
    resumen: '',
    alcance: '',
    metodologia: '',
    entregables: '',
    cronograma: '',
    supuestos: '',
    valorEstimado: '',
    duracionDias: '',
  })

  return (
    <Tarjeta>
      <TarjetaCabecera
        titulo="Propuestas"
        descripcion="Plantillas TP4A–TP4H con versionamiento y QA metodológico"
        accion={
          puedeCrear ? (
            <button onClick={() => setNueva((v) => !v)} className="btn-secundario">
              {nueva ? 'Cancelar' : 'Nueva versión'}
            </button>
          ) : undefined
        }
      />
      <div className="space-y-4 p-5">
        {error && <Alerta tono="peligro">{error}</Alerta>}

        {nueva && (
          <div className="space-y-3 rounded-lg border border-dashed border-slate-300 p-4">
            <Campo etiqueta="Título" requerido>
              <input className="campo" value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} />
            </Campo>
            <Campo etiqueta="Resumen ejecutivo" requerido>
              <textarea className="campo min-h-20" value={f.resumen} onChange={(e) => setF({ ...f, resumen: e.target.value })} />
            </Campo>
            <Campo etiqueta="Alcance" requerido>
              <textarea className="campo min-h-20" value={f.alcance} onChange={(e) => setF({ ...f, alcance: e.target.value })} />
            </Campo>
            <Campo etiqueta="Metodología" requerido>
              <textarea className="campo min-h-20" value={f.metodologia} onChange={(e) => setF({ ...f, metodologia: e.target.value })} />
            </Campo>
            <Campo etiqueta="Entregables" requerido>
              <textarea className="campo min-h-16" value={f.entregables} onChange={(e) => setF({ ...f, entregables: e.target.value })} />
            </Campo>
            <Campo etiqueta="Cronograma" requerido>
              <textarea className="campo min-h-16" value={f.cronograma} onChange={(e) => setF({ ...f, cronograma: e.target.value })} />
            </Campo>
            <Campo etiqueta="Supuestos y riesgos">
              <textarea className="campo min-h-16" value={f.supuestos} onChange={(e) => setF({ ...f, supuestos: e.target.value })} />
            </Campo>
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo etiqueta="Valor estimado (COP)">
                <input type="number" className="campo" value={f.valorEstimado} onChange={(e) => setF({ ...f, valorEstimado: e.target.value })} />
              </Campo>
              <Campo etiqueta="Duración (días)">
                <input type="number" className="campo" value={f.duracionDias} onChange={(e) => setF({ ...f, duracionDias: e.target.value })} />
              </Campo>
            </div>
            <button
              disabled={cargando}
              className="btn-primario"
              onClick={async () => {
                const r = await ejecutar(
                  '/api/propuestas',
                  json({
                    casoId,
                    ...f,
                    valorEstimado: f.valorEstimado || undefined,
                    duracionDias: f.duracionDias || undefined,
                  }),
                )
                if (r) setNueva(false)
              }}
            >
              Guardar propuesta
            </button>
          </div>
        )}

        {propuestas.length === 0 && !nueva && (
          <p className="text-sm text-slate-500">Todavía no hay propuestas para este caso.</p>
        )}

        {propuestas.map((p) => (
          <div key={p.id} className="rounded-lg border border-slate-200 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Chip tono="info">v{p.version}</Chip>
              <span className="font-medium text-slate-900">{p.titulo}</span>
              <Chip
                tono={
                  p.estado === 'ACEPTADA'
                    ? 'exito'
                    : p.estado === 'RECHAZADA'
                      ? 'peligro'
                      : p.estado === 'ENVIADA' || p.estado === 'LISTA'
                        ? 'info'
                        : 'neutro'
                }
              >
                {p.estado.replace('_', ' ')}
              </Chip>
              {p.valorEstimado ? (
                <span className="ml-auto text-sm font-medium text-slate-700">
                  {moneda(p.valorEstimado)}
                </span>
              ) : null}
            </div>

            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <Dato titulo="Resumen" valor={p.resumen} />
              <Dato titulo="Alcance" valor={p.alcance} />
              <Dato titulo="Metodología" valor={p.metodologia} />
              <Dato titulo="Entregables" valor={p.entregables} />
              <Dato titulo="Cronograma" valor={p.cronograma} />
              {p.duracionDias ? <Dato titulo="Duración" valor={`${p.duracionDias} días`} /> : null}
            </dl>

            {p.qaChecklist && (
              <div className="mt-3 rounded-md bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Checklist QA</p>
                <ul className="mt-1.5 space-y-0.5">
                  {ITEMS_QA.map(([k, label]) => (
                    <li key={k} className="flex items-center gap-1.5 text-xs text-slate-700">
                      {p.qaChecklist?.[k] ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                      )}
                      {label}
                    </li>
                  ))}
                </ul>
                {p.qaObservaciones && (
                  <p className="mt-2 text-xs text-slate-600">Obs.: {p.qaObservaciones}</p>
                )}
              </div>
            )}

            {p.decisionComentario && (
              <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm text-slate-700">
                <span className="font-medium">Decisión del cliente:</span> {p.decisionComentario}
              </p>
            )}

            {/* --- Acciones sobre la propuesta --- */}
            <div className="mt-3 flex flex-wrap gap-2">
              {puedeQa && ['BORRADOR', 'EN_QA'].includes(p.estado) && (
                <button
                  className="btn-secundario"
                  onClick={() => {
                    setQaAbierto(qaAbierto === p.id ? null : p.id)
                    setChecklist(p.qaChecklist ?? {})
                    setObsQa(p.qaObservaciones ?? '')
                  }}
                >
                  Revisar QA
                </button>
              )}
              {puedeQa && p.estado === 'LISTA' && (
                <button
                  disabled={cargando}
                  className="btn-primario"
                  onClick={() => ejecutar(`/api/propuestas/${p.id}/enviar`, { method: 'POST' })}
                >
                  Enviar al cliente
                </button>
              )}
            </div>

            {qaAbierto === p.id && (
              <div className="mt-3 space-y-2 rounded-lg border border-slate-200 p-4">
                {ITEMS_QA.map(([k, label]) => (
                  <label key={k} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300"
                      checked={Boolean(checklist[k])}
                      onChange={(e) => setChecklist({ ...checklist, [k]: e.target.checked })}
                    />
                    {label}
                  </label>
                ))}
                <textarea
                  className="campo min-h-16"
                  placeholder="Observaciones metodológicas…"
                  value={obsQa}
                  onChange={(e) => setObsQa(e.target.value)}
                />
                <button
                  disabled={cargando}
                  className="btn-primario"
                  onClick={async () => {
                    const full = Object.fromEntries(
                      ITEMS_QA.map(([k]) => [k, Boolean(checklist[k])]),
                    )
                    const r = await ejecutar(
                      `/api/propuestas/${p.id}/qa`,
                      json({ checklist: full, observaciones: obsQa }),
                    )
                    if (r) setQaAbierto(null)
                  }}
                >
                  Guardar QA
                </button>
              </div>
            )}

            {puedeDecidir && p.estado === 'ENVIADA' && (
              <div className="mt-3 space-y-2 rounded-lg border border-marca-200 bg-marca-50 p-4">
                <p className="text-sm font-semibold text-marca-900">Su decisión sobre la propuesta</p>
                <textarea
                  className="campo min-h-16"
                  placeholder="Explique el motivo de su decisión…"
                  value={decisionComentario}
                  onChange={(e) => setDecisionComentario(e.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    disabled={cargando || decisionComentario.length < 5}
                    className="btn-primario"
                    onClick={() =>
                      ejecutar(
                        `/api/propuestas/${p.id}/decision`,
                        json({ decision: 'ACEPTADA', comentario: decisionComentario }),
                      )
                    }
                  >
                    Aceptar
                  </button>
                  <button
                    disabled={cargando || decisionComentario.length < 5}
                    className="btn-secundario"
                    onClick={() =>
                      ejecutar(
                        `/api/propuestas/${p.id}/decision`,
                        json({ decision: 'AJUSTES_SOLICITADOS', comentario: decisionComentario }),
                      )
                    }
                  >
                    Solicitar ajustes
                  </button>
                  <button
                    disabled={cargando || decisionComentario.length < 5}
                    className="btn-peligro"
                    onClick={() =>
                      ejecutar(
                        `/api/propuestas/${p.id}/decision`,
                        json({ decision: 'RECHAZADA', comentario: decisionComentario }),
                      )
                    }
                  >
                    Rechazar
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </Tarjeta>
  )
}

function Dato({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{titulo}</dt>
      <dd className="mt-0.5 whitespace-pre-wrap text-sm text-slate-700">{valor}</dd>
    </div>
  )
}

// --------------------------------------------------------------- documentos

export type DocumentoVista = {
  id: string
  nombre: string
  tipo: string
  tamano: number
  version: number
  descripcion: string | null
  createdAt: string
}

export function PanelDocumentos({
  casoId,
  documentos,
  puedeSubir,
}: {
  casoId: string
  documentos: DocumentoVista[]
  puedeSubir: boolean
}) {
  const router = useRouter()
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tipo, setTipo] = useState('EVIDENCIA')

  async function subir(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    if (!archivo) return
    setSubiendo(true)
    setError(null)
    const fd = new FormData()
    fd.append('archivo', archivo)
    fd.append('tipo', tipo)
    try {
      const r = await fetch(`/api/casos/${casoId}/documentos`, { method: 'POST', body: fd })
      const j = await r.json()
      if (!j.ok) setError(j.error)
      else router.refresh()
    } catch {
      setError('Error al subir el archivo')
    } finally {
      setSubiendo(false)
      e.target.value = ''
    }
  }

  return (
    <Tarjeta>
      <TarjetaCabecera
        titulo="Repositorio documental"
        descripcion="Versionamiento automático por nombre de archivo · máximo 5 MB"
      />
      <div className="p-5">
        {error && <Alerta tono="peligro">{error}</Alerta>}

        {puedeSubir && (
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <Campo etiqueta="Tipo de documento">
              <select className="campo max-w-48" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                <option value="INTAKE">Intake</option>
                <option value="PROPUESTA">Propuesta</option>
                <option value="CONTRACTUAL">Contractual</option>
                <option value="EVIDENCIA">Evidencia</option>
                <option value="ACTA_CIERRE">Acta de cierre</option>
                <option value="OTRO">Otro</option>
              </select>
            </Campo>
            <label className="btn-secundario cursor-pointer">
              {subiendo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {subiendo ? 'Subiendo…' : 'Subir archivo'}
              <input type="file" className="hidden" onChange={subir} disabled={subiendo} />
            </label>
          </div>
        )}

        {documentos.length === 0 ? (
          <p className="text-sm text-slate-500">No hay documentos asociados al caso.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {documentos.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-3 py-3">
                <a
                  href={`/api/documentos/${d.id}`}
                  className="min-w-0 flex-1 truncate text-sm font-medium text-marca-600 hover:underline"
                >
                  {d.nombre}
                </a>
                <Chip>{d.tipo}</Chip>
                <Chip tono="info">v{d.version}</Chip>
                <span className="text-xs text-slate-500">{bytes(d.tamano)}</span>
                <span className="text-xs text-slate-400">{fechaHora(d.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Tarjeta>
  )
}

// --------------------------------------------------------- checklist + cierre

export function PanelChecklist({
  casoId,
  inicial,
}: {
  casoId: string
  inicial: {
    propuestaAceptada: boolean
    contratoFirmado: boolean
    alcanceConfirmado: boolean
    cronogramaAcordado: boolean
    condicionesEconomicas: boolean
    datosTratamiento: boolean
    observaciones: string | null
  }
}) {
  const { ejecutar, cargando, error } = useAccion()
  const items: [string, string][] = [
    ['propuestaAceptada', 'Propuesta aceptada por el cliente'],
    ['contratoFirmado', 'Contrato firmado entre las partes'],
    ['alcanceConfirmado', 'Alcance confirmado por escrito'],
    ['cronogramaAcordado', 'Cronograma acordado'],
    ['condicionesEconomicas', 'Condiciones económicas definidas'],
    ['datosTratamiento', 'Autorización de tratamiento de datos'],
  ]
  const [v, setV] = useState<Record<string, boolean>>(
    Object.fromEntries(
      items.map(([k]) => [k, Boolean((inicial as Record<string, unknown>)[k])]),
    ),
  )
  const [obs, setObs] = useState(inicial.observaciones ?? '')
  const completo = items.every(([k]) => v[k])

  return (
    <Tarjeta>
      <TarjetaCabecera
        titulo="Checklist de contratación"
        descripcion="NODUS no es parte contractual, pero bloquea la ejecución sin evidencia completa"
        accion={completo ? <Chip tono="exito">Completo</Chip> : <Chip tono="alerta">Incompleto</Chip>}
      />
      <div className="space-y-3 p-5">
        {error && <Alerta tono="peligro">{error}</Alerta>}
        {items.map(([k, label]) => (
          <label key={k} className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300"
              checked={v[k]}
              onChange={(e) => setV({ ...v, [k]: e.target.checked })}
            />
            {label}
          </label>
        ))}
        <textarea
          className="campo min-h-16"
          placeholder="Observaciones…"
          value={obs}
          onChange={(e) => setObs(e.target.value)}
        />
        <button
          disabled={cargando}
          className="btn-primario"
          onClick={() =>
            ejecutar(`/api/casos/${casoId}/checklist`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...v, observaciones: obs }),
            })
          }
        >
          Guardar checklist
        </button>
      </div>
    </Tarjeta>
  )
}

export function PanelActividades({
  casoId,
  actividades,
  puedeEditar,
}: {
  casoId: string
  actividades: { id: string; titulo: string; descripcion: string | null; estado: string; fechaPlan: string | null }[]
  puedeEditar: boolean
}) {
  const { ejecutar, cargando, error } = useAccion()
  const [titulo, setTitulo] = useState('')

  return (
    <Tarjeta>
      <TarjetaCabecera titulo="Seguimiento de actividades" descripcion="Hitos de la ejecución del caso" />
      <div className="p-5">
        {error && <Alerta tono="peligro">{error}</Alerta>}

        {actividades.length === 0 && (
          <p className="text-sm text-slate-500">No hay actividades registradas.</p>
        )}

        <ul className="space-y-2">
          {actividades.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5">
              <span className="min-w-0 flex-1 text-sm text-slate-800">{a.titulo}</span>
              <Chip
                tono={
                  a.estado === 'COMPLETADA' ? 'exito' : a.estado === 'BLOQUEADA' ? 'peligro' : 'neutro'
                }
              >
                {a.estado}
              </Chip>
              {puedeEditar && a.estado !== 'COMPLETADA' && (
                <select
                  className="campo max-w-40 py-1 text-xs"
                  value={a.estado}
                  disabled={cargando}
                  onChange={(e) =>
                    ejecutar(`/api/actividades/${a.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ estado: e.target.value }),
                    })
                  }
                >
                  <option value="PLANIFICADA">Planificada</option>
                  <option value="EN_CURSO">En curso</option>
                  <option value="COMPLETADA">Completada</option>
                  <option value="BLOQUEADA">Bloqueada</option>
                </select>
              )}
            </li>
          ))}
        </ul>

        {puedeEditar && (
          <div className="mt-4 flex gap-2">
            <input
              className="campo flex-1"
              placeholder="Nueva actividad…"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
            />
            <button
              disabled={cargando || titulo.length < 3}
              className="btn-secundario"
              onClick={async () => {
                const r = await ejecutar('/api/actividades', json({ casoId, titulo }))
                if (r) setTitulo('')
              }}
            >
              Agregar
            </button>
          </div>
        )}
      </div>
    </Tarjeta>
  )
}

export function PanelCierre({
  casoId,
  inicial,
}: {
  casoId: string
  inicial: { actaCierre: string | null; evaluacionFinal: number | null; valorCerrado: number | null }
}) {
  const { ejecutar, cargando, error } = useAccion()
  const [acta, setActa] = useState(inicial.actaCierre ?? '')
  const [evaluacion, setEvaluacion] = useState(String(inicial.evaluacionFinal ?? '5'))
  const [valor, setValor] = useState(String(inicial.valorCerrado ?? ''))

  return (
    <Tarjeta>
      <TarjetaCabecera titulo="Acta de cierre" descripcion="Cierre formal y evaluación final del caso" />
      <div className="space-y-3 p-5">
        {error && <Alerta tono="peligro">{error}</Alerta>}
        <Campo etiqueta="Acta de cierre" requerido>
          <textarea
            className="campo min-h-24"
            value={acta}
            onChange={(e) => setActa(e.target.value)}
            placeholder="Resultados obtenidos, entregables recibidos y conformidad de las partes…"
          />
        </Campo>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo etiqueta="Evaluación final (1 a 5)" requerido>
            <select className="campo" value={evaluacion} onChange={(e) => setEvaluacion(e.target.value)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Valor cerrado (COP)">
            <input type="number" className="campo" value={valor} onChange={(e) => setValor(e.target.value)} />
          </Campo>
        </div>
        <button
          disabled={cargando || acta.length < 20}
          className="btn-primario"
          onClick={() =>
            ejecutar(`/api/casos/${casoId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                accion: 'cerrar',
                actaCierre: acta,
                evaluacionFinal: evaluacion,
                valorCerrado: valor || undefined,
              }),
            })
          }
        >
          Guardar acta
        </button>
      </div>
    </Tarjeta>
  )
}

// ------------------------------------------------------------------ timeline

export function Timeline({
  transiciones,
}: {
  transiciones: {
    id: string
    estadoAnterior: string | null
    estadoNuevo: string
    actorNombre: string
    comentario: string | null
    createdAt: string
  }[]
}) {
  return (
    <Tarjeta>
      <TarjetaCabecera titulo="Trazabilidad del caso" descripcion="Historial completo de transiciones" />
      <ol className="p-5">
        {transiciones.map((t, i) => (
          <li key={t.id} className="relative flex gap-3 pb-5 last:pb-0">
            {i < transiciones.length - 1 && (
              <span className="absolute left-[7px] top-4 h-full w-px bg-slate-200" />
            )}
            <span className="relative z-10 mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-white bg-marca-500 ring-1 ring-marca-200" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900">
                {t.estadoAnterior
                  ? `${ETIQUETA_ESTADO[t.estadoAnterior as EstadoCaso]} → ${ETIQUETA_ESTADO[t.estadoNuevo as EstadoCaso]}`
                  : ETIQUETA_ESTADO[t.estadoNuevo as EstadoCaso]}
              </p>
              <p className="text-xs text-slate-500">
                {t.actorNombre} · {fechaHora(t.createdAt)}
              </p>
              {t.comentario && (
                <p className="mt-1 rounded-md bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600">
                  {t.comentario}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </Tarjeta>
  )
}

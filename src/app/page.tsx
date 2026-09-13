import Link from 'next/link'
import { ArrowRight, CheckCircle2, GitBranch, ShieldCheck, Timer } from 'lucide-react'

const PILARES = [
  {
    icono: GitBranch,
    titulo: 'Workflow gobernado',
    texto:
      'Catorce estados con reglas de negocio explícitas. Ningún caso avanza sin cumplir las validaciones definidas.',
  },
  {
    icono: Timer,
    titulo: 'SLA y escalamiento',
    texto:
      'Cada estado tiene un tiempo máximo. La plataforma detecta incumplimientos y escala automáticamente.',
  },
  {
    icono: ShieldCheck,
    titulo: 'Trazabilidad total',
    texto:
      'Bitácora inmutable de actor, acción, fecha y cambio de estado sobre cada entidad del sistema.',
  },
]

const FLUJO = [
  'La Mipyme registra su necesidad en menos de tres minutos.',
  'Advisory hace debida diligencia y clasifica el caso bajo taxonomías gobernadas.',
  'El caso se publica en la bolsa interna y sólo los consultores elegibles lo ven.',
  'Se asigna un único consultor responsable y se diseña la propuesta bajo plantillas.',
  'Advisory aprueba el QA metodológico y la propuesta se envía formalmente.',
  'El cliente decide, se completa el checklist contractual y arranca la ejecución.',
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-marca-600 text-sm font-bold text-white">
            N
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">NODUS</p>
            <p className="text-[11px] leading-tight text-slate-500">Ingeniería SAS</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="btn-secundario">
            Iniciar sesión
          </Link>
          <Link href="/intake" className="btn-primario">
            Registrar caso
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-16 pt-10 lg:pt-20">
        <p className="mb-4 inline-flex rounded-full bg-marca-50 px-3 py-1 text-xs font-medium text-marca-700 ring-1 ring-inset ring-marca-200">
          Ecosistema empresarial de orquestación
        </p>
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-slate-900 lg:text-5xl">
          Del problema de una Mipyme a un consultor asignado, con trazabilidad completa.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
          NODUS conecta Mipymes, consultores y equipos Advisory/PMO bajo un mismo proceso
          gobernado: intake estructurado, debida diligencia, bolsa interna, propuestas
          versionadas, SLA y auditoría.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/intake" className="btn-primario">
            Registrar una necesidad <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/login" className="btn-secundario">
            Entrar a la plataforma
          </Link>
        </div>

        <div className="mt-16 grid gap-5 md:grid-cols-3">
          {PILARES.map((p) => {
            const Icono = p.icono
            return (
              <div key={p.titulo} className="tarjeta p-5">
                <Icono className="h-5 w-5 text-marca-600" />
                <h3 className="mt-3 text-sm font-semibold text-slate-900">{p.titulo}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{p.texto}</p>
              </div>
            )
          })}
        </div>

        <div className="mt-16 rounded-2xl border border-slate-200 bg-slate-50 p-8">
          <h2 className="text-lg font-semibold text-slate-900">El ciclo de vida de un caso</h2>
          <ol className="mt-5 space-y-3">
            {FLUJO.map((f, i) => (
              <li key={i} className="flex gap-3 text-sm text-slate-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-marca-600" />
                {f}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <footer className="border-t border-slate-200 py-8">
        <p className="mx-auto max-w-6xl px-6 text-xs text-slate-500">
          NODUS — Prueba técnica de desarrollo de software. Construido con Next.js, PostgreSQL y
          Drizzle ORM.
        </p>
      </footer>
    </div>
  )
}

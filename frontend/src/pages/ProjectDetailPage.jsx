import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Atom,
  ChevronRight,
  FlaskConical,
  Gauge,
  Leaf,
  RefreshCw,
  ShieldCheck,
  Thermometer,
  UserCheck
} from 'lucide-react'
import Button from '../components/ui/Button.jsx'
import { mapApiProject, projectApi } from '../services/api.js'

export default function ProjectDetailPage() {
  const { id } = useParams()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = () => {
    setLoading(true)
    setError(null)
    projectApi
      .get(id)
      .then((data) => {
        setProject(mapApiProject(data))
      })
      .catch((err) => {
        setError(err)
        setProject(null)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!id) return
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (loading) {
    return (
      <div className="surface p-10 text-center text-sm text-ink-300 max-w-2xl mx-auto">
        Loading project…
      </div>
    )
  }

  if (error || !project) {
    const notFound = error?.status === 404 || (!error && !project)
    return (
      <div className="mx-auto max-w-2xl text-center py-16">
        <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-rose-300">
          {notFound ? 'PROJECT NOT FOUND' : 'COULD NOT LOAD PROJECT'}
        </div>
        <h1 className="mt-2 text-xl font-semibold text-ink-100">
          {notFound
            ? `We couldn't find a project with id "${id}".`
            : (error?.message || 'Something went wrong.')}
        </h1>
        <p className="mt-2 text-sm text-ink-300">
          {notFound
            ? 'It may have been removed, or the link is stale.'
            : 'Please check your connection and try again.'}
        </p>
        <div className="mt-5 flex items-center justify-center gap-3">
          <Link
            to="/app/projects"
            className="inline-flex items-center gap-1.5 text-sm text-cyan-300 hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to all projects
          </Link>
          {!notFound && (
            <Button variant="outline" size="sm" icon={RefreshCw} onClick={load}>
              Retry
            </Button>
          )}
        </div>
      </div>
    )
  }

  const iterationsUsed = project.iterationsUsed || 0
  const maxIterations = project.maxIterations || 0
  const iterationLabel = maxIterations
    ? `${iterationsUsed} / ${maxIterations}`
    : String(iterationsUsed)

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-300/80">
            PROJECT HOME
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink-100">
            {project.name}
          </h1>
          <p className="mt-1 text-sm text-ink-300">
            A snapshot of this project — reaction definition, governance, and progress so far.
          </p>
        </div>
        <Button variant="ghost" size="sm" icon={RefreshCw} onClick={load}>
          Refresh
        </Button>
      </div>

      {/* Reaction */}
      <div className="surface p-5">
        <div className="flex items-center gap-2">
          <Atom className="h-4 w-4 text-cyan-300" />
          <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-300/80">
            REACTION
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-3">
          <FieldBlock label="Reactants" value={project.reactants || '—'} />
          <div className="hidden md:grid h-8 w-8 mx-auto place-items-center rounded-full bg-ink-800 ring-1 ring-cyan-400/30 text-cyan-300">
            →
          </div>
          <FieldBlock label="Products" value={project.products || '—'} />
        </div>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Mini Icon={Thermometer} label="Temperature" value={project.temperature || '—'} />
          <Mini Icon={Gauge} label="Pressure" value={project.pressure || '—'} />
          <Mini Icon={Atom} label="Catalysis" value={catalysisLabel(project.catalysisType)} />
          <Mini Icon={Leaf} label="Sustainability" value={project.sustainability || '—'} />
        </div>
      </div>

      {/* Governance */}
      <div className="surface p-5">
        <div className="flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-cyan-300" />
          <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-300/80">
            GOVERNANCE
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FieldBlock
            label="Creator / Lead"
            value={
              project.creator?.email
                ? `${project.leadPI || '—'} · ${project.creator.email}`
                : (project.leadPI || '—')
            }
          />
          <FieldBlock
            label="Reviewers"
            value="Anyone in the workspace (other than the creator) can review submissions."
          />
          {project.notes ? (
            <div className="sm:col-span-2">
              <FieldBlock label="Notes" value={project.notes} />
            </div>
          ) : null}
        </div>
      </div>

      {/* Progress */}
      <div className="surface p-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-cyan-300" />
          <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-300/80">
            PROGRESS
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatBox label="Candidates generated" value={project.candidatesCount ?? 0} />
          <StatBox
            label="Failure insights"
            value={project.failureInsightsCount ?? 0}
            accent={project.failureInsightsCount ? 'emerald' : undefined}
          />
          <StatBox label="Current version" value={project.versionLabel || 'V1.0'} />
          <StatBox label="Iterations" value={iterationLabel} />
        </div>
        {(project.candidatesCount ?? 0) === 0 ? (
          <div className="mt-4 rounded-md border border-dashed border-ink-700/70 bg-ink-900/40 px-3 py-3 text-[12px] text-ink-300">
            No discovery runs yet — head to the Discovery tab to generate the first version of
            candidates for this project.
          </div>
        ) : (
          <div className="mt-4 text-[11px] text-ink-400 font-mono">
            Last run {formatRunTime(project.lastRunAt)}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap items-center gap-2">
        <Link to={`/app/projects/${project.id}/discovery`}>
          <Button variant="primary" size="sm" iconRight={ChevronRight}>
            Open discovery
          </Button>
        </Link>
        <Link to={`/app/projects/${project.id}/candidates`}>
          <Button variant="outline" size="sm" iconRight={ChevronRight}>
            View candidates
          </Button>
        </Link>
        <Link to={`/app/projects/${project.id}/experiments`}>
          <Button variant="outline" size="sm" icon={FlaskConical}>
            Experiments
          </Button>
        </Link>
      </div>
    </div>
  )
}

function catalysisLabel(t) {
  if (!t) return '—'
  if (t === 'synthetic') return 'Synthetic biology'
  if (t === 'metal') return 'Metal catalysis'
  return t
}

function formatRunTime(iso) {
  if (!iso) return 'never'
  try {
    const d = new Date(iso)
    return d.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return iso
  }
}

function FieldBlock({ label, value }) {
  return (
    <div className="rounded-md bg-ink-900/50 ring-1 ring-inset ring-ink-700/60 px-3 py-2.5">
      <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-400">
        {label}
      </div>
      <div className="mt-1 text-sm text-ink-100 font-mono break-words">{value}</div>
    </div>
  )
}

function Mini({ Icon, label, value }) {
  return (
    <div className="rounded-md bg-ink-800/70 px-2.5 py-2 ring-1 ring-ink-700/60">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-ink-400">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </div>
      <div className="text-ink-100 text-sm">{value}</div>
    </div>
  )
}

function StatBox({ label, value, accent }) {
  const ring =
    accent === 'emerald'
      ? 'ring-emerald-400/30'
      : 'ring-ink-700/60'
  return (
    <div className={`rounded-md bg-ink-900/50 px-3 py-2.5 ring-1 ring-inset ${ring}`}>
      <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-400">
        {label}
      </div>
      <div className="mt-1 text-base font-semibold text-ink-100">{value}</div>
    </div>
  )
}

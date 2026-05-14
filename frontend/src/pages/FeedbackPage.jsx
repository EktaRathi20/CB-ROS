import { useEffect, useState } from 'react'
import { CheckCircle2, GitBranch, Info, Sparkles } from 'lucide-react'
import Button from '../components/ui/Button.jsx'
import StatusChip from '../components/ui/StatusChip.jsx'
import { projectApi } from '../services/api.js'
import { useAuth } from '../auth/AuthContext.jsx'

export default function FeedbackPage() {
  const { user } = useAuth()
  const creatorId = user?.id || user?.email || ''

  const [projects, setProjects] = useState([])
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [projectsError, setProjectsError] = useState(null)
  const [projectId, setProjectId] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (!creatorId) {
      setProjectsLoading(false)
      return
    }
    let cancelled = false
    setProjectsLoading(true)
    projectApi
      .list({ creatorId, limit: 100 })
      .then((data) => {
        if (cancelled) return
        const list = data?.projects || []
        setProjects(list)
        setProjectsError(null)
        if (list[0]?.id) setProjectId((cur) => cur || list[0].id)
      })
      .catch((err) => {
        if (cancelled) return
        setProjectsError(err?.message || 'Could not load projects.')
      })
      .finally(() => {
        if (!cancelled) setProjectsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [creatorId])

  const handleRetrain = async () => {
    if (!projectId || submitting) return
    setSubmitting(true)
    setError(null)
    setResult(null)
    try {
      const data = await projectApi.retrain(projectId, {
        scope: 'project',
        triggeredBy: user?.email || user?.id || ''
      })
      setResult(data)
    } catch (err) {
      setError(err?.message || 'Failed to trigger retraining.')
    } finally {
      setSubmitting(false)
    }
  }

  const reset = () => {
    setResult(null)
    setError(null)
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-300/80">
        FEEDBACK
      </div>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">
        Retrain the model
      </h1>
      <p className="mt-2 text-sm text-ink-300 leading-relaxed">
        Once enough experiments have been reviewed for a project, retraining folds
        those outcomes back into the model so the next discovery run is better
        calibrated.
      </p>

      <div className="surface mt-6 p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-cyan-500/15 ring-1 ring-cyan-400/30 text-cyan-300">
            <GitBranch className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-ink-100">
              Trigger a retraining cycle
            </h3>
            <p className="mt-1 text-[12px] text-ink-300 leading-relaxed">
              Pick a project. The retraining job will index its approved
              experiments and apply any bias correction. The next discovery run
              for this project will benefit automatically.
            </p>
          </div>
        </div>

        <div className="mt-5">
          <label className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-400">
            Project
          </label>
          <select
            value={projectId}
            onChange={(e) => {
              setProjectId(e.target.value)
              reset()
            }}
            disabled={submitting || projectsLoading || projects.length === 0}
            className="mt-1.5 w-full rounded-md bg-ink-900/60 px-3 py-2 text-sm text-ink-100 ring-1 ring-inset ring-ink-700/60 outline-none focus:ring-cyan-400/40 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {projectsLoading && <option>Loading…</option>}
            {!projectsLoading && projects.length === 0 && (
              <option>No projects available</option>
            )}
            {!projectsLoading &&
              projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
          {projectsError && (
            <p className="mt-1.5 text-[11px] text-rose-300">{projectsError}</p>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 border-t divider-soft pt-4">
          {result ? (
            <StatusChip dot tone="emerald">Retraining complete</StatusChip>
          ) : (
            <span className="text-[11px] font-mono text-ink-400">
              {projectsLoading
                ? 'Loading projects…'
                : projects.length === 0
                ? 'Create a project to enable retraining.'
                : 'Ready to retrain.'}
            </span>
          )}
          <Button
            variant="primary"
            size="sm"
            icon={GitBranch}
            onClick={handleRetrain}
            disabled={!projectId || submitting || projectsLoading}
          >
            {submitting ? 'Submitting…' : 'Yes, please train'}
          </Button>
        </div>

        {error && (
          <div className="mt-4 rounded-md border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-200">
            {error}
          </div>
        )}
      </div>

      {result && <ResultCard result={result} />}

      <div className="mt-4 rounded-md border border-ink-700/60 bg-ink-900/40 px-3 py-2.5 text-[11px] text-ink-400 flex items-start gap-2">
        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-ink-300" />
        <span>
          Retraining only affects the selected project's future discovery runs.
          You can always trigger another cycle as more experiments get reviewed.
        </span>
      </div>
    </div>
  )
}

function ResultCard({ result }) {
  const recs = Array.isArray(result?.recommendations) ? result.recommendations : []
  const stats = [
    {
      label: 'Indexed',
      value: result?.experiments_indexed,
      sub: 'experiments'
    },
    { label: 'Approved', value: result?.approved_count },
    { label: 'Rejected', value: result?.rejected_count },
    {
      label: 'Changes requested',
      value: result?.changes_requested_count
    }
  ].filter((s) => s.value != null)

  const driftBefore = result?.avg_drift_before
  const driftAfter = result?.avg_drift_after
  const bias = result?.bias_correction

  return (
    <div className="surface mt-4 p-5">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-emerald-300" />
        <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-emerald-300">
          RETRAINING RESULT
        </div>
      </div>

      {stats.length > 0 && (
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {stats.map((s) => (
            <Stat key={s.label} label={s.label} value={s.value} sub={s.sub} />
          ))}
        </div>
      )}

      {(driftBefore != null || driftAfter != null || bias != null) && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
          {driftBefore != null && (
            <Stat label="Drift before" value={fmt(driftBefore)} />
          )}
          {driftAfter != null && (
            <Stat
              label="Drift after"
              value={fmt(driftAfter)}
              accent="emerald"
            />
          )}
          {bias != null && (
            <Stat label="Bias correction" value={fmt(bias)} accent="amber" />
          )}
        </div>
      )}

      {recs.length > 0 && (
        <div className="mt-4 border-t divider-soft pt-4">
          <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-cyan-300/80 mb-2">
            RECOMMENDATIONS
          </div>
          <ul className="space-y-1.5 text-[12px] text-ink-200 leading-relaxed">
            {recs.map((r, i) => (
              <li key={i} className="flex items-start gap-2">
                <Sparkles className="h-3 w-3 mt-1 text-cyan-300 shrink-0" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result?.snapshot_id && (
        <div className="mt-3 text-[10px] font-mono text-ink-400 truncate">
          snapshot · {result.snapshot_id}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, sub, accent }) {
  const text =
    accent === 'emerald'
      ? 'text-emerald-200'
      : accent === 'amber'
      ? 'text-amber-200'
      : 'text-ink-100'
  return (
    <div className="rounded-md bg-ink-900/50 ring-1 ring-inset ring-ink-700/60 px-3 py-2">
      <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-400">
        {label}
      </div>
      <div className={`mt-0.5 text-sm font-semibold tabular ${text}`}>{value}</div>
      {sub && <div className="text-[10px] font-mono text-ink-500">{sub}</div>}
    </div>
  )
}

function fmt(v) {
  if (v == null) return '—'
  const n = Number(v)
  if (!Number.isFinite(n)) return String(v)
  return n.toFixed(3)
}

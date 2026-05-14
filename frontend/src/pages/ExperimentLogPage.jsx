import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowRight,
  ChevronRight,
  FlaskConical,
  History,
  ShieldCheck,
  X
} from 'lucide-react'
import StatusChip from '../components/ui/StatusChip.jsx'
import Button from '../components/ui/Button.jsx'
import ExperimentLogForm from '../components/domain/ExperimentLogForm.jsx'
import {
  useProjectCandidates,
  useProjectPicks,
  useProjectStore
} from '../data/projectStore.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { candidateApi, experimentApi, mapApiCandidate } from '../services/api.js'

export default function ExperimentLogPage() {
  const { id: projectId } = useParams()
  const { togglePick } = useProjectStore()
  const { user } = useAuth()
  const pickIds = useProjectPicks(projectId)

  // Fetch the project's candidates from the API so the queue carries real
  // UUIDs (the same IDs the picks were stored with on the candidates page).
  // Local manual additions are still merged in for continuity.
  const localCandidates = useProjectCandidates(projectId)
  const localManual = useMemo(
    () => localCandidates.filter((c) => c.addedBy === 'user'),
    [localCandidates]
  )

  const [apiCandidates, setApiCandidates] = useState([])
  const [candidatesLoading, setCandidatesLoading] = useState(true)
  const [candidatesError, setCandidatesError] = useState(null)

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    setCandidatesLoading(true)
    setCandidatesError(null)
    candidateApi
      .listForProject(projectId)
      .then((data) => {
        if (cancelled) return
        const raw = (data?.candidates || [])
          .slice()
          .sort((a, b) => (b.predicted_score ?? 0) - (a.predicted_score ?? 0))
        setApiCandidates(raw.map((c, i) => mapApiCandidate(c, i)).filter(Boolean))
      })
      .catch((err) => {
        if (!cancelled) {
          setCandidatesError(err?.message || 'Could not load candidates.')
          setApiCandidates([])
        }
      })
      .finally(() => {
        if (!cancelled) setCandidatesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [projectId])

  const allCandidates = useMemo(
    () => (localManual.length ? [...apiCandidates, ...localManual] : apiCandidates),
    [apiCandidates, localManual]
  )
  const queue = useMemo(
    () => allCandidates.filter((c) => pickIds.includes(c.id)),
    [allCandidates, pickIds]
  )

  // Prune ghost picks: pickIds that don't match any current candidate (e.g.
  // candidates that were dropped after a fresh discovery run).
  useEffect(() => {
    if (candidatesLoading || !pickIds.length) return
    const validIds = new Set(allCandidates.map((c) => c.id))
    const stale = pickIds.filter((id) => !validIds.has(id))
    if (!stale.length) return
    for (const id of stale) togglePick(projectId, id)
    // togglePick changes pickIds; the next run will see no stale entries and
    // bail out of the early return — no infinite loop.
  }, [candidatesLoading, pickIds, allCandidates, projectId, togglePick])

  const [activeId, setActiveId] = useState(queue[0]?.id ?? null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const formRef = useRef(null)

  // Keep activeId valid when the queue changes (new pick / unpick).
  useEffect(() => {
    if (!queue.length) {
      setActiveId(null)
      return
    }
    if (!activeId || !queue.some((c) => c.id === activeId)) {
      setActiveId(queue[0].id)
    }
  }, [queue, activeId])

  const startRun = (id) => {
    setActiveId(id)
    setSubmitError(null)
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

  const handleSubmit = async ({ candidate, actualScore, outcome, observations }) => {
    if (!candidate || !user || submitting) return

    // API expects 0..1. Candidates from the API carry predictedScore in 0..1;
    // legacy local candidates use a 0..100 score. The form's actualScore is
    // entered as a 0..100 percentage.
    const predictedScore = clamp01(
      candidate.predictedScore ??
        (typeof candidate.score === 'number' ? candidate.score / 100 : 0)
    )
    const actualScore01 = clamp01((actualScore ?? 0) / 100)

    const payload = {
      candidateId: candidate.id,
      predictedScore,
      actualScore: actualScore01,
      outcome: outcome || 'success',
      observations: observations || '',
      submittedBy: user.id || user.email
    }

    setSubmitting(true)
    setSubmitError(null)
    try {
      await experimentApi.create(payload)
      // Unpick the candidate so it falls out of the queue — full thread lives
      // on the Review & audit tab from here on.
      togglePick(projectId, candidate.id)
    } catch (err) {
      setSubmitError(err?.message || 'Failed to submit experiment.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-300/80">
          EXPERIMENT LOG
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Capture lab outcomes</h1>
        <p className="mt-1 text-sm text-ink-300 max-w-2xl">
          Candidates picked from the dashboard queue up here. Log each run, pair it with the
          prediction that produced it, and feed the active-learning loop.
        </p>
      </div>

      {/* Pick queue */}
      <ExperimentQueue
        queue={queue}
        activeId={activeId}
        projectId={projectId}
        onStart={startRun}
        onRemove={(id) => togglePick(projectId, id)}
      />

      {candidatesError && (
        <div className="rounded-md border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-200">
          {candidatesError}
        </div>
      )}

      {queue.length === 0 ? (
        candidatesLoading ? (
          <div className="surface p-10 text-center text-sm text-ink-300">
            Loading candidates…
          </div>
        ) : (
          <EmptyState projectId={projectId} />
        )
      ) : (
        <div ref={formRef} className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
          <ExperimentLogForm
            candidates={queue}
            candidateId={activeId}
            onCandidateChange={setActiveId}
            onSubmit={handleSubmit}
            submitting={submitting}
            submitError={submitError}
          />
          <SideHelp />
        </div>
      )}
    </div>
  )
}

function ExperimentQueue({ queue, activeId, projectId, onStart, onRemove }) {
  return (
    <div className="surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <FlaskConical className="h-4 w-4 text-cyan-300" />
        <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-300/80">
          EXPERIMENT QUEUE
        </div>
        <StatusChip dot tone={queue.length === 0 ? 'slate' : 'cyan'}>
          {queue.length === 0 ? 'no candidates picked' : `${queue.length} ready`}
        </StatusChip>
        <Link
          to={`/app/projects/${projectId}/candidates`}
          className="ml-auto inline-flex items-center gap-1 text-[11px] text-cyan-300 hover:underline"
        >
          Pick more from dashboard <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {queue.length > 0 ? (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
          {queue.map((c) => {
            const isActive = c.id === activeId
            return (
              <div
                key={c.id}
                className={
                  'rounded-md border px-3 py-2.5 transition-colors ' +
                  (isActive
                    ? 'border-cyan-400/50 bg-cyan-400/10'
                    : 'border-ink-700/60 bg-ink-900/40 hover:border-cyan-400/25')
                }
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-ink-100 truncate">{c.name}</div>
                    <div className="text-[11px] font-mono text-ink-400 truncate">{c.formula}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(c.id)}
                    className="grid h-5 w-5 shrink-0 place-items-center rounded-md text-ink-400 hover:bg-rose-500/15 hover:text-rose-300"
                    title="Remove from queue"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <StatusChip tone={c.type === 'AI Generated' ? 'violet' : 'slate'}>
                    {c.type}
                  </StatusChip>
                  <StatusChip dot>{c.status}</StatusChip>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[11px] text-ink-400 font-mono">
                    score {c.score}
                  </span>
                  <button
                    type="button"
                    onClick={() => onStart(c.id)}
                    className="inline-flex items-center gap-1 text-[11px] text-cyan-300 hover:text-cyan-200"
                  >
                    {isActive ? 'Logging…' : 'Log run'} <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="mt-2 text-[12px] text-ink-400">
          Pick candidates on the Candidates tab — they'll show up here ready to log.
        </p>
      )}
    </div>
  )
}

function EmptyState({ projectId }) {
  return (
    <div className="surface p-10 text-center">
      <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-ink-800 ring-1 ring-cyan-400/30 text-cyan-300">
        <FlaskConical className="h-5 w-5" />
      </div>
      <h3 className="mt-3 text-base font-semibold text-ink-100">
        No experiments queued yet
      </h3>
      <p className="mt-1 text-sm text-ink-300 max-w-md mx-auto">
        Head to the Candidates tab, pick the catalysts you want to validate in the lab,
        and they'll line up here for logging.
      </p>
      <Link
        to={`/app/projects/${projectId}/candidates`}
        className="mt-4 inline-block"
      >
        <Button variant="primary" size="sm" iconRight={ChevronRight}>
          Go to candidates
        </Button>
      </Link>
    </div>
  )
}

function SideHelp() {
  return (
    <aside className="space-y-4">
      <div className="surface p-4">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-cyan-300" />
          <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-300/80">
            REMINDERS
          </div>
        </div>
        <ul className="mt-2 space-y-1.5 text-[12px] text-ink-300">
          <li className="flex items-start gap-2">
            <Bullet />
            Record both nominal and steady-state values.
          </li>
          <li className="flex items-start gap-2">
            <Bullet />
            Reviewer must be different from creator.
          </li>
          <li className="flex items-start gap-2">
            <Bullet />
            Attach raw instrument output (GC-MS, XRD, BET).
          </li>
        </ul>
      </div>
      <div className="surface p-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-cyan-300" />
          <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-300/80">
            VERIFICATION
          </div>
        </div>
        <p className="mt-1 text-[12px] text-ink-300">
          Two-eyes principle: a creator records the outcome; a reviewer signs it.
          Verification unlocks ingestion into the learning loop.
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
          <Mini label="Drafts" value="3" />
          <Mini label="In review" value="2" />
          <Mini label="Verified" value="14" />
        </div>
      </div>
    </aside>
  )
}

function Mini({ label, value }) {
  return (
    <div className="rounded-md bg-ink-800/70 px-2.5 py-2 ring-1 ring-ink-700/60">
      <div className="text-[10px] uppercase text-ink-400">{label}</div>
      <div className="text-ink-100 tabular text-sm">{value}</div>
    </div>
  )
}

function Bullet() {
  return (
    <span className="mt-1.5 inline-block h-1 w-1 rounded-full bg-cyan-400 shrink-0" />
  )
}

function clamp01(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return 0
  if (n < 0) return 0
  if (n > 1) return 1
  return n
}

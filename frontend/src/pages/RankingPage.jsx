import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ChevronRight,
  Download,
  FlaskConical,
  GitCompare,
  ListFilter,
  Plus,
  RefreshCw,
  Sparkles,
  X
} from 'lucide-react'
import Chip from '../components/ui/Chip.jsx'
import Button from '../components/ui/Button.jsx'
import StatusChip from '../components/ui/StatusChip.jsx'
import PredictionTable from '../components/domain/PredictionTable.jsx'
import ComparisonDrawer from '../components/domain/ComparisonDrawer.jsx'
import CustomCandidateForm from '../components/domain/CustomCandidateForm.jsx'
import {
  useProjectCandidates,
  useProjectPicks,
  useProjectStore,
  useVisualizeId
} from '../data/projectStore.jsx'
import { candidateApi, mapApiCandidate } from '../services/api.js'
import { useAuth } from '../auth/AuthContext.jsx'

const statusFilters = ['All', 'High', 'Medium', 'Low', 'Failed']
const originFilters = ['All', 'AI Generated', 'Known', 'User-defined']

function clamp01(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return 0
  if (n < 0) return 0
  if (n > 1) return 1
  return n
}

function versionKey(v) {
  if (typeof v === 'number') return `1.${v}`
  if (v && typeof v === 'object' && 'major' in v) return `${v.major}.${v.minor}`
  return null
}

function compareVersionKeys(a, b) {
  const [aM, am] = a.split('.').map(Number)
  const [bM, bm] = b.split('.').map(Number)
  return aM - bM || am - bm
}

export default function RankingPage() {
  const navigate = useNavigate()
  const { id: projectId } = useParams()
  const { user } = useAuth()

  // API candidates (read-only from server)
  const [apiCandidates, setApiCandidates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Local-only candidates (Add custom candidate, etc.) — until that has a
  // dedicated API we keep the existing local store behavior on top.
  const localCandidates = useProjectCandidates(projectId)
  const localManual = useMemo(
    () => localCandidates.filter((c) => c.addedBy === 'user'),
    [localCandidates]
  )

  const visualizeId = useVisualizeId(projectId)
  const { togglePick, clearPicks, selectVisualize } = useProjectStore()
  const pickIds = useProjectPicks(projectId)
  const pickSet = useMemo(() => new Set(pickIds), [pickIds])

  const [statusF, setStatusF] = useState('All')
  const [originF, setOriginF] = useState('All')
  const [versionF, setVersionF] = useState('All')
  const [compareSet, setCompareSet] = useState(new Set())
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [customOpen, setCustomOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState(null)

  const fetchCandidates = useCallback(() => {
    if (!projectId) return
    setLoading(true)
    setError(null)
    candidateApi
      .listForProject(projectId)
      .then((data) => {
        // Sort by predicted_score desc so rank/index is meaningful.
        const raw = (data?.candidates || [])
          .slice()
          .sort((a, b) => (b.predicted_score ?? 0) - (a.predicted_score ?? 0))
        const mapped = raw.map((c, i) => mapApiCandidate(c, i)).filter(Boolean)
        setApiCandidates(mapped)
      })
      .catch((err) => {
        setError(err?.message || 'Failed to load candidates.')
        setApiCandidates([])
      })
      .finally(() => setLoading(false))
  }, [projectId])

  useEffect(() => {
    fetchCandidates()
  }, [fetchCandidates])

  // Combined list: API first, then any local manual additions.
  const candidates = useMemo(() => {
    if (!localManual.length) return apiCandidates
    return [...apiCandidates, ...localManual]
  }, [apiCandidates, localManual])

  const versions = useMemo(() => {
    const set = new Set()
    for (const c of candidates) {
      const key = versionKey(c.version)
      if (key) set.add(key)
    }
    return [...set].sort(compareVersionKeys)
  }, [candidates])

  const hasManual = useMemo(
    () => candidates.some((c) => c.addedBy === 'user'),
    [candidates]
  )

  const filtered = useMemo(() => {
    return candidates.filter((c) => {
      if (statusF !== 'All' && c.status !== statusF) return false
      if (originF !== 'All' && c.type !== originF) return false
      if (versionF === 'manual') {
        if (c.addedBy !== 'user') return false
      } else if (versionF !== 'All') {
        if (versionKey(c.version) !== versionF) return false
      }
      return true
    })
  }, [candidates, statusF, originF, versionF])

  const compareItems = candidates.filter((c) => compareSet.has(c.id))

  const toggleCompare = (id) =>
    setCompareSet((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const openVisualization = (cand) => {
    selectVisualize(projectId, cand.id)
    navigate(`/app/projects/${projectId}/visualize?candidate=${cand.id}`)
  }

  const handleCreate = async (data, { reset } = {}) => {
    if (!projectId || creating) return

    const payload = {
      formula: data.formula,
      predicted_score: clamp01((data.predictedScore ?? 0) / 100),
      confidence: clamp01((data.confidence ?? 0) / 100),
      stability: clamp01((data.stability ?? 0) / 100),
      activity_score: clamp01((data.activity ?? 0) / 100),
      activation_energy: Number(data.activationEnergy) || 0,
      operating_temp: data.operatingTemp || '',
      operating_pressure: data.operatingPressure || '',
      reasoning: data.reasoning || '',
      createdBy: user?.id || user?.email || ''
    }

    setCreating(true)
    setCreateError(null)
    try {
      await candidateApi.create(projectId, payload)
      reset?.()
      setCustomOpen(false)
      // Refresh the candidates list so the new entry shows up.
      fetchCandidates()
    } catch (err) {
      setCreateError(err?.message || 'Failed to add custom candidate.')
    } finally {
      setCreating(false)
    }
  }

  if (loading && candidates.length === 0) {
    return (
      <div className="space-y-5">
        <Header projectId={projectId} loading />
        <div className="surface p-10 text-center text-sm text-ink-300">
          Loading candidates…
        </div>
      </div>
    )
  }

  if (error && candidates.length === 0) {
    return (
      <div className="space-y-5">
        <Header projectId={projectId} onRefresh={fetchCandidates} />
        <div className="rounded-md border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-200">
          {error}
        </div>
      </div>
    )
  }

  // First-run / empty-project state — no candidates and no error.
  if (candidates.length === 0) {
    return (
      <EmptyState projectId={projectId} onCustom={() => setCustomOpen(true)} />
    )
  }

  return (
    <>
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-300/80">
              RANKING & PREDICTIONS
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              Candidate dashboard
            </h1>
            <p className="mt-1 text-sm text-ink-300 max-w-2xl">
              {candidates.length} candidate{candidates.length === 1 ? '' : 's'}
              {versions.length > 0 && (
                <>
                  {' '}across {versions.length} iteration
                  {versions.length === 1 ? '' : 's'}
                </>
              )}
              . Pick for experiment, compare, or open one to visualize.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              icon={RefreshCw}
              onClick={fetchCandidates}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={Plus}
              onClick={() => setCustomOpen(true)}
            >
              Add custom candidate
            </Button>
            <Button
              variant={compareSet.size > 1 ? 'primary' : 'outline'}
              size="sm"
              icon={GitCompare}
              onClick={() => setDrawerOpen(true)}
              disabled={compareSet.size === 0}
            >
              Compare ({compareSet.size})
            </Button>
            <Button variant="outline" size="sm" icon={Download}>
              Export
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-200">
            {error}
          </div>
        )}

        {/* Picks tray */}
        <PicksTray
          pickIds={pickIds}
          candidates={candidates}
          onClear={() => clearPicks(projectId)}
          onUnpick={(id) => togglePick(projectId, id)}
          onGoExperiments={() => navigate(`/app/projects/${projectId}/experiments`)}
        />

        {/* Filters */}
        <div className="surface p-3 space-y-2.5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
              <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-400">
                VERSION
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Chip active={versionF === 'All'} onClick={() => setVersionF('All')}>
                All
              </Chip>
              {versions.map((v) => (
                <Chip
                  key={v}
                  active={versionF === v}
                  onClick={() => setVersionF(v)}
                >
                  V{v}
                </Chip>
              ))}
              {hasManual && (
                <Chip
                  active={versionF === 'manual'}
                  onClick={() => setVersionF('manual')}
                >
                  Manual
                </Chip>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <ListFilter className="h-3.5 w-3.5 text-ink-300" />
              <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-400">
                STATUS
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {statusFilters.map((f) => (
                <Chip key={f} active={statusF === f} onClick={() => setStatusF(f)}>
                  {f}
                </Chip>
              ))}
            </div>
            <span className="mx-1 hidden md:block h-5 w-px bg-ink-700" />
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-400">
                ORIGIN
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {originFilters.map((f) => (
                <Chip key={f} active={originF === f} onClick={() => setOriginF(f)}>
                  {f}
                </Chip>
              ))}
            </div>
            <span className="ml-auto text-[11px] font-mono text-ink-400">
              {filtered.length} of {candidates.length}
            </span>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="surface p-10 text-center text-sm text-ink-300">
            No candidates match these filters.
          </div>
        ) : (
          <PredictionTable
            rows={filtered}
            compareSet={compareSet}
            onCompare={(id) => toggleCompare(id)}
            onOpen={openVisualization}
            pickSet={pickSet}
            onTogglePick={(id) => togglePick(projectId, id)}
            visualizeId={visualizeId}
          />
        )}
      </div>

      <ComparisonDrawer
        open={drawerOpen}
        candidates={compareItems}
        onClose={() => setDrawerOpen(false)}
        onRemove={(id) => toggleCompare(id)}
      />

      <CustomCandidateForm
        open={customOpen}
        onClose={() => {
          if (creating) return
          setCustomOpen(false)
          setCreateError(null)
        }}
        onCreate={handleCreate}
        submitting={creating}
        submitError={createError}
      />
    </>
  )
}

function Header({ projectId, loading, onRefresh }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-300/80">
          RANKING & PREDICTIONS
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Candidate dashboard</h1>
        <p className="mt-1 text-sm text-ink-300 max-w-2xl">
          {loading ? 'Loading candidates…' : 'Could not load candidates.'}
        </p>
      </div>
      {onRefresh && (
        <Button variant="outline" size="sm" icon={RefreshCw} onClick={onRefresh}>
          Retry
        </Button>
      )}
    </div>
  )
}

function EmptyState({ projectId, onCustom }) {
  return (
    <div className="space-y-5">
      <div>
        <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-300/80">
          RANKING & PREDICTIONS
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Candidate dashboard</h1>
        <p className="mt-1 text-sm text-ink-300 max-w-2xl">
          No candidates yet for this project. Run discovery to surface your first version,
          or add one manually if you already have a candidate in mind.
        </p>
      </div>
      <div className="surface relative overflow-hidden p-10 text-center">
        <div className="pointer-events-none absolute inset-0 bg-grid-faint bg-[length:24px_24px] opacity-30" />
        <div className="relative">
          <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-ink-800 ring-1 ring-cyan-400/30 text-cyan-300">
            <Sparkles className="h-5 w-5" />
          </div>
          <h3 className="mt-3 text-base font-semibold text-ink-100">
            Nothing here yet
          </h3>
          <p className="mt-1 text-sm text-ink-300 max-w-md mx-auto">
            Discovery hasn't been run for this project. Each run produces a new candidate
            version (V1, V2, …) so you can track how the search evolves.
          </p>
          <div className="mt-5 flex items-center justify-center gap-2">
            <Link to={`/app/projects/${projectId}/discovery`}>
              <Button variant="primary" size="sm" iconRight={ChevronRight}>
                Go to Discovery
              </Button>
            </Link>
            <Button variant="outline" size="sm" icon={Plus} onClick={onCustom}>
              Add custom candidate
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function PicksTray({ pickIds, candidates, onClear, onUnpick, onGoExperiments }) {
  const items = candidates.filter((c) => pickIds.includes(c.id))
  const isEmpty = items.length === 0

  return (
    <div className="surface p-3">
      <div className="flex flex-wrap items-center gap-2">
        <FlaskConical className="h-3.5 w-3.5 text-cyan-300" />
        <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-cyan-300/80">
          PICKED FOR EXPERIMENT
        </span>
        <StatusChip dot tone={isEmpty ? 'slate' : 'cyan'}>
          {isEmpty ? 'none' : `${items.length} selected`}
        </StatusChip>

        <div className="ml-auto flex items-center gap-2">
          {!isEmpty && (
            <button
              type="button"
              onClick={onClear}
              className="text-[11px] text-ink-300 hover:text-rose-300"
            >
              Clear
            </button>
          )}
          <Button
            variant={isEmpty ? 'outline' : 'primary'}
            size="sm"
            iconRight={ChevronRight}
            onClick={onGoExperiments}
            disabled={isEmpty}
          >
            Send to experiments
          </Button>
        </div>
      </div>

      {!isEmpty && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {items.map((c) => (
            <span
              key={c.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-400/5 px-2.5 py-1 text-[11px] text-cyan-200"
            >
              <span className="font-medium">{c.name}</span>
              <span className="text-ink-400 font-mono">{c.formula}</span>
              <button
                type="button"
                onClick={() => onUnpick(c.id)}
                className="ml-0.5 grid h-4 w-4 place-items-center rounded-full text-ink-400 hover:bg-rose-500/15 hover:text-rose-300"
                title="Remove"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {isEmpty && (
        <p className="mt-2 text-[11px] text-ink-400">
          Pick candidates from the table — they'll queue up here and on the Experiments tab.
        </p>
      )}
    </div>
  )
}

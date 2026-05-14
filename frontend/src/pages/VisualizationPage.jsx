import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ChevronRight, Download, Microscope } from 'lucide-react'
import StatusChip from '../components/ui/StatusChip.jsx'
import Button from '../components/ui/Button.jsx'
import ScientificStatCard from '../components/ui/ScientificStatCard.jsx'
import MoleculeViewerPanel from '../components/domain/MoleculeViewerPanel.jsx'
import {
  formatVersion,
  useProjectCandidates,
  useProjectStore,
  useVisualizeId
} from '../data/projectStore.jsx'
import { candidateApi, mapApiCandidate } from '../services/api.js'

export default function VisualizationPage() {
  const { id: projectId } = useParams()
  const [search] = useSearchParams()
  const visualizeId = useVisualizeId(projectId)
  const { selectVisualize } = useProjectStore()
  const localCandidates = useProjectCandidates(projectId)

  const [apiCandidates, setApiCandidates] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    setLoading(true)
    setFetchError(null)
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
          setFetchError(err?.message || 'Could not load candidate.')
          setApiCandidates([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [projectId])

  const localManual = useMemo(
    () => localCandidates.filter((c) => c.addedBy === 'user'),
    [localCandidates]
  )
  const candidates = useMemo(
    () => (localManual.length ? [...apiCandidates, ...localManual] : apiCandidates),
    [apiCandidates, localManual]
  )

  const queryId = search.get('candidate')
  useEffect(() => {
    if (queryId && queryId !== visualizeId && candidates.some((c) => c.id === queryId)) {
      selectVisualize(projectId, queryId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryId, candidates.length])

  const candidate = useMemo(() => {
    if (!candidates.length) return null
    if (queryId) {
      const byUrl = candidates.find((c) => c.id === queryId)
      if (byUrl) return byUrl
    }
    if (visualizeId) {
      const byStore = candidates.find((c) => c.id === visualizeId)
      if (byStore) return byStore
    }
    return null
  }, [candidates, queryId, visualizeId])

  if (loading && !candidate) {
    return (
      <div className="surface p-10 text-center text-sm text-ink-300">
        Loading candidate…
      </div>
    )
  }

  if (fetchError && !candidate) {
    return (
      <div className="rounded-md border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-200">
        {fetchError}
      </div>
    )
  }

  if (!candidate) {
    return <EmptyState projectId={projectId} hasCandidates={candidates.length > 0} />
  }

  const isUser = candidate.type === 'User-defined'
  const isAi = candidate.type === 'AI Generated'

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-300/80">
            VISUALIZATION
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{candidate.name}</h1>
          <p className="mt-1 text-sm text-ink-300 font-mono">
            {[candidate.formula, candidate.family, candidate.source]
              .filter(Boolean)
              .join(' · ') || '—'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusChip dot>{candidate.status}</StatusChip>
          <StatusChip tone={isAi ? 'violet' : isUser ? 'amber' : 'slate'}>
            {candidate.type}
          </StatusChip>
          {candidate.version && (
            <StatusChip tone="cyan">{formatVersion(candidate.version)}</StatusChip>
          )}
          <Button variant="outline" size="sm" icon={Download}>
            Export experimental package
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <MoleculeViewerPanel
          className="lg:col-span-2"
          title={candidate.name}
          formula={candidate.formula}
        />
        <div className="surface p-4">
          <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-300/80">
            CATALYST STRUCTURE
          </div>
          <h4 className="mt-1 text-sm font-semibold text-ink-100">
            Composition & operating window
          </h4>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-mono">
            <Mini label="Formula" value={candidate.formula || '—'} />
            <Mini label="Source" value={candidate.source || '—'} />
            <Mini label="Operating T" value={candidate.operatingTemp || '—'} />
            <Mini label="Operating P" value={candidate.operatingPressure || '—'} />
            <Mini
              label="Confidence"
              value={
                candidate.confidence != null
                  ? `${Math.round(candidate.confidence * 100)}%`
                  : '—'
              }
            />
            <Mini
              label="Iteration"
              value={
                candidate.iterationNumber != null
                  ? `#${candidate.iterationNumber}`
                  : '—'
              }
            />
          </div>
          {candidate.reasoning && (
            <p className="mt-3 text-[11px] text-ink-300 leading-relaxed border-t divider-soft pt-3">
              {candidate.reasoning}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <ScientificStatCard
          label="ACTIVITY"
          value={candidate.activity.toFixed(2)}
          unit=""
          sub="0..1 scale"
          accent="cyan"
        />
        <ScientificStatCard
          label="PREDICTED SCORE"
          value={(candidate.predictedScore ?? candidate.selectivity ?? 0).toFixed(2)}
          unit=""
          sub="model output"
          accent="emerald"
        />
        <ScientificStatCard
          label="STABILITY"
          value={candidate.stability.toFixed(2)}
          unit=""
          sub="0..1 scale"
          accent="teal"
        />
        <ScientificStatCard
          label="ACTIVATION E"
          value={String(candidate.activationEnergy)}
          unit="kJ/mol"
          sub={`±${Math.round(candidate.uncertainty * 100)}%`}
          accent="amber"
        />
      </div>
    </div>
  )
}

function EmptyState({ projectId, hasCandidates }) {
  return (
    <div className="space-y-5">
      <div>
        <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-300/80">
          VISUALIZATION
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">No candidate selected</h1>
      </div>
      <div className="surface relative overflow-hidden p-10 text-center">
        <div className="pointer-events-none absolute inset-0 bg-grid-faint bg-[length:24px_24px] opacity-30" />
        <div className="relative">
          <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-ink-800 ring-1 ring-violet-400/30 text-violet-300">
            <Microscope className="h-5 w-5" />
          </div>
          <h3 className="mt-3 text-base font-semibold text-ink-100">
            Pick a candidate to visualize
          </h3>
          <p className="mt-1 text-sm text-ink-300 max-w-md mx-auto">
            {hasCandidates
              ? 'Open a candidate from the Candidates tab — its structure and predictions will load here.'
              : 'There are no candidates in this project yet. Run discovery first, then pick one to visualize.'}
          </p>
          <div className="mt-5 flex items-center justify-center gap-2">
            {hasCandidates ? (
              <Link to={`/app/projects/${projectId}/candidates`}>
                <Button variant="primary" size="sm" iconRight={ChevronRight}>
                  Go to candidates
                </Button>
              </Link>
            ) : (
              <Link to={`/app/projects/${projectId}/discovery`}>
                <Button variant="primary" size="sm" iconRight={ChevronRight}>
                  Go to discovery
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Mini({ label, value }) {
  return (
    <div className="rounded-md bg-ink-800/70 px-2.5 py-1.5 ring-1 ring-ink-700/60">
      <div className="text-[9px] uppercase tracking-wider text-ink-400">{label}</div>
      <div className="text-ink-100 tabular text-xs break-words">{value}</div>
    </div>
  )
}

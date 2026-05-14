import { useCallback, useEffect, useMemo, useState } from 'react'
import { BookOpen, Filter, Inbox, RefreshCw, Users } from 'lucide-react'
import Chip from '../components/ui/Chip.jsx'
import StatusChip from '../components/ui/StatusChip.jsx'
import Button from '../components/ui/Button.jsx'
import SubmissionCard from '../components/domain/SubmissionCard.jsx'
import { experimentApi, mapApiSubmission } from '../services/api.js'

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending review' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'changes-requested', label: 'Changes requested' }
]

const PAGE_SIZE = 20

export default function ExperimentLibraryPage() {
  const [statusF, setStatusF] = useState('all')
  const [scientistF, setScientistF] = useState('all')

  const [submissions, setSubmissions] = useState([])
  const [stats, setStats] = useState(null)
  const [scientists, setScientists] = useState([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)

  const fetchPage = useCallback(
    async ({ append = false, nextOffset = 0 } = {}) => {
      const params = { limit: PAGE_SIZE, offset: nextOffset }
      if (statusF !== 'all') params.status = statusF
      if (scientistF !== 'all') params.submittedBy = scientistF

      if (append) setLoadingMore(true)
      else setLoading(true)
      setError(null)

      try {
        const data = await experimentApi.list(params)
        const list = (data?.submissions || []).map(mapApiSubmission).filter(Boolean)
        setStats(data?.stats || null)
        // The scientist filter list comes from the unfiltered server view —
        // only refresh it on the first (unfiltered) load so picking a scientist
        // doesn't collapse the chip set down to just that one.
        if (!append && statusF === 'all' && scientistF === 'all') {
          setScientists(data?.filters?.scientists || [])
        } else if (!scientists.length && data?.filters?.scientists?.length) {
          setScientists(data.filters.scientists)
        }
        setTotal(data?.pagination?.total ?? list.length)
        setOffset(nextOffset + list.length)
        setSubmissions((prev) => (append ? [...prev, ...list] : list))
      } catch (err) {
        setError(err?.message || 'Failed to load experiments.')
        if (!append) setSubmissions([])
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    // scientists ref intentionally not in deps — we only seed it when empty
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [statusF, scientistF]
  )

  useEffect(() => {
    fetchPage({ append: false, nextOffset: 0 })
  }, [fetchPage])

  // Build a project lookup from the candidate.project payload that ships with
  // each submission, so the project link in SubmissionCard renders without a
  // separate /projects fetch.
  const projectsById = useMemo(() => {
    const out = {}
    for (const s of submissions) {
      if (s.projectId && !out[s.projectId]) {
        out[s.projectId] = { id: s.projectId, name: s.projectName }
      }
    }
    return out
  }, [submissions])

  const totals = {
    submissions: stats?.total_submissions ?? total,
    pending: stats?.pending_review ?? 0,
    scientists: stats?.active_scientists ?? scientists.length
  }

  const canLoadMore = !loading && submissions.length < total

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-300/80">
            EXPERIMENT LIBRARY
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Workspace experiments
          </h1>
          <p className="mt-1 text-sm text-ink-300 max-w-2xl">
            Every experiment submitted across the workspace, by every scientist. Filter to find
            things to review, learn from, or build on.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusChip dot tone="cyan">{totals.submissions} submissions</StatusChip>
          <StatusChip dot tone="amber">{totals.pending} pending</StatusChip>
          <Button
            variant="ghost"
            size="sm"
            icon={RefreshCw}
            onClick={() => fetchPage({ append: false, nextOffset: 0 })}
            disabled={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <SummaryTile Icon={BookOpen} label="Total submissions" value={totals.submissions} />
        <SummaryTile Icon={Inbox} label="Pending review" value={totals.pending} accent="amber" />
        <SummaryTile Icon={Users} label="Active scientists" value={totals.scientists} accent="cyan" />
      </div>

      <div className="surface p-3 space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-ink-300" />
            <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-400">
              STATUS
            </span>
          </div>
          {STATUS_FILTERS.map((f) => (
            <Chip key={f.id} active={statusF === f.id} onClick={() => setStatusF(f.id)}>
              {f.label}
            </Chip>
          ))}
        </div>
        {scientists.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-ink-300" />
              <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-400">
                SCIENTIST
              </span>
            </div>
            <Chip active={scientistF === 'all'} onClick={() => setScientistF('all')}>
              All
            </Chip>
            {scientists.map((s) => (
              <Chip
                key={s.id}
                active={scientistF === s.id}
                onClick={() => setScientistF(s.id)}
              >
                {s.name}
              </Chip>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="surface p-10 text-center text-sm text-ink-300">
          Loading experiments…
        </div>
      ) : submissions.length === 0 ? (
        <EmptyState totalUnfiltered={totals.submissions} />
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {submissions.map((s) => (
              <SubmissionCard
                key={s.id}
                submission={s}
                project={projectsById[s.projectId]}
                onReviewed={() =>
                  fetchPage({ append: false, nextOffset: 0 })
                }
              />
            ))}
          </div>
          {canLoadMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchPage({ append: true, nextOffset: offset })}
                disabled={loadingMore}
              >
                {loadingMore ? 'Loading…' : `Load more (${total - submissions.length} remaining)`}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function SummaryTile({ Icon, label, value, accent }) {
  const ring = accent === 'amber' ? 'ring-amber-400/30' : accent === 'cyan' ? 'ring-cyan-400/30' : 'ring-ink-700/60'
  return (
    <div className={`surface p-4 ring-1 ring-inset ${ring}`}>
      <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.16em] text-ink-400">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular text-ink-100">{value}</div>
    </div>
  )
}

function EmptyState({ totalUnfiltered }) {
  return (
    <div className="surface p-10 text-center">
      <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-ink-800 ring-1 ring-cyan-400/30 text-cyan-300">
        <BookOpen className="h-5 w-5" />
      </div>
      <h3 className="mt-3 text-base font-semibold text-ink-100">
        {totalUnfiltered === 0 ? 'No submissions yet' : 'No matches for these filters'}
      </h3>
      <p className="mt-1 text-sm text-ink-300 max-w-md mx-auto">
        {totalUnfiltered === 0
          ? 'When scientists submit experiments for review from any project, they show up here.'
          : 'Try clearing a filter to see more.'}
      </p>
    </div>
  )
}

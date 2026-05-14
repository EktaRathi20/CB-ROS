import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bell, CheckCircle2, Inbox, RefreshCw } from 'lucide-react'
import StatusChip from '../components/ui/StatusChip.jsx'
import Button from '../components/ui/Button.jsx'
import SubmissionCard from '../components/domain/SubmissionCard.jsx'
import { inboxApi, mapApiSubmission } from '../services/api.js'
import { useAuth } from '../auth/AuthContext.jsx'

const PAGE_LIMIT = 20

export default function NotificationsPage() {
  const { user } = useAuth()
  const userKey = user?.id || user?.email || ''

  const [pending, setPending] = useState([])
  const [recentlyReviewed, setRecentlyReviewed] = useState([])
  const [stats, setStats] = useState({
    pending_review: 0,
    recently_reviewed_by_me: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchInbox = useCallback(() => {
    if (!userKey) return
    setLoading(true)
    setError(null)
    inboxApi
      .get({ userId: userKey, limit: PAGE_LIMIT })
      .then((data) => {
        setStats(data?.stats || { pending_review: 0, recently_reviewed_by_me: 0 })
        setPending((data?.pending || []).map(mapApiSubmission).filter(Boolean))
        setRecentlyReviewed(
          (data?.recently_reviewed || []).map(mapApiSubmission).filter(Boolean)
        )
      })
      .catch((err) => {
        setError(err?.message || 'Failed to load inbox.')
        setPending([])
        setRecentlyReviewed([])
      })
      .finally(() => setLoading(false))
  }, [userKey])

  useEffect(() => {
    fetchInbox()
  }, [fetchInbox])

  // Build a project lookup from the submissions themselves so SubmissionCard
  // can render the project link without a separate /projects fetch.
  const projectsById = useMemo(() => {
    const out = {}
    for (const s of [...pending, ...recentlyReviewed]) {
      if (s.projectId && !out[s.projectId]) {
        out[s.projectId] = { id: s.projectId, name: s.projectName }
      }
    }
    return out
  }, [pending, recentlyReviewed])

  const pendingCount = stats.pending_review ?? pending.length

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-300/80">
            NOTIFICATIONS
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Your inbox</h1>
          <p className="mt-1 text-sm text-ink-300 max-w-2xl">
            Submissions from other scientists in this workspace that are waiting on a review.
            Approve, reject, or request changes — at least one review is required.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusChip dot tone={pendingCount === 0 ? 'slate' : 'amber'}>
            {pendingCount === 0 ? 'inbox zero' : `${pendingCount} awaiting you`}
          </StatusChip>
          <Button
            variant="ghost"
            size="sm"
            icon={RefreshCw}
            onClick={fetchInbox}
            disabled={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-200">
          {error}
        </div>
      )}

      <div className="surface p-3 flex items-center gap-2">
        <Inbox className="h-4 w-4 text-cyan-300" />
        <div className="text-sm text-ink-100">Pending review</div>
        <span className="rounded-md bg-ink-800 px-2 py-0.5 text-[10px] font-mono text-ink-300 ring-1 ring-ink-700">
          {pendingCount}
        </span>
      </div>

      {loading && pending.length === 0 ? (
        <div className="surface p-10 text-center text-sm text-ink-300">
          Loading inbox…
        </div>
      ) : pending.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {pending.map((s) => (
            <SubmissionCard
              key={s.id}
              submission={s}
              project={projectsById[s.projectId]}
              defaultExpanded
              onReviewed={fetchInbox}
            />
          ))}
        </div>
      )}

      {(recentlyReviewed.length > 0 || (stats.recently_reviewed_by_me ?? 0) > 0) && (
        <>
          <div className="surface p-3 flex items-center gap-2 mt-6">
            <CheckCircle2 className="h-4 w-4 text-emerald-300" />
            <div className="text-sm text-ink-100">Recently reviewed by you</div>
            <span className="rounded-md bg-ink-800 px-2 py-0.5 text-[10px] font-mono text-ink-300 ring-1 ring-ink-700">
              {stats.recently_reviewed_by_me ?? recentlyReviewed.length}
            </span>
          </div>
          {recentlyReviewed.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {recentlyReviewed.map((s) => (
                <SubmissionCard
                  key={s.id}
                  submission={s}
                  project={projectsById[s.projectId]}
                  onReviewed={fetchInbox}
                />
              ))}
            </div>
          ) : (
            <div className="surface p-6 text-center text-sm text-ink-400">
              No recent reviews loaded.
            </div>
          )}
        </>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="surface p-10 text-center">
      <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-ink-800 ring-1 ring-emerald-400/30 text-emerald-300">
        <Bell className="h-5 w-5" />
      </div>
      <h3 className="mt-3 text-base font-semibold text-ink-100">
        No notifications right now
      </h3>
      <p className="mt-1 text-sm text-ink-300 max-w-md mx-auto">
        When a scientist in this workspace submits an experiment for review, it'll appear here.
      </p>
    </div>
  )
}

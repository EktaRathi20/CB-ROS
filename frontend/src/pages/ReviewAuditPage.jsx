import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  GitBranch,
  Inbox,
  MessageSquare,
  RefreshCw,
  ShieldCheck
} from 'lucide-react'
import Chip from '../components/ui/Chip.jsx'
import StatusChip from '../components/ui/StatusChip.jsx'
import Tabs from '../components/ui/Tabs.jsx'
import SectionHeading from '../components/ui/SectionHeading.jsx'
import Button from '../components/ui/Button.jsx'
import SubmissionCard from '../components/domain/SubmissionCard.jsx'
import { mapApiSubmission, projectApi } from '../services/api.js'

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'changes-requested', label: 'Changes requested' }
]

export default function ReviewAuditPage() {
  const { id: projectId } = useParams()
  const [tab, setTab] = useState('reviews')
  const [statusF, setStatusF] = useState('all')

  const [audit, setAudit] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAudit = useCallback(() => {
    if (!projectId) return
    setLoading(true)
    setError(null)
    projectApi
      .getAudit(projectId)
      .then((data) => setAudit(data))
      .catch((err) => {
        setError(err?.message || 'Failed to load audit data.')
        setAudit(null)
      })
      .finally(() => setLoading(false))
  }, [projectId])

  useEffect(() => {
    fetchAudit()
  }, [fetchAudit])

  // Flatten the candidate-centric audit response into a list of submissions.
  // Each experiment becomes a submission; we inject the parent candidate +
  // project info so mapApiSubmission can populate name/formula/projectName.
  const submissions = useMemo(() => {
    if (!audit) return []
    const project = audit.project || {}
    const out = []
    for (const c of audit.candidates || []) {
      for (const exp of c.experiments || []) {
        const enriched = {
          ...exp,
          candidate: {
            ...c,
            project: { id: project.id, name: project.name }
          }
        }
        const mapped = mapApiSubmission(enriched)
        if (mapped) out.push(mapped)
      }
    }
    // Most recent submissions first.
    out.sort((a, b) => {
      const ta = a.submittedAt ? new Date(a.submittedAt).getTime() : 0
      const tb = b.submittedAt ? new Date(b.submittedAt).getTime() : 0
      return tb - ta
    })
    return out
  }, [audit])

  const filtered = useMemo(
    () => (statusF === 'all' ? submissions : submissions.filter((s) => s.status === statusF)),
    [submissions, statusF]
  )

  const counts = useMemo(() => {
    const out = { all: submissions.length, pending: 0, approved: 0, rejected: 0, 'changes-requested': 0 }
    for (const s of submissions) out[s.status] = (out[s.status] || 0) + 1
    return out
  }, [submissions])

  const reviewerSet = useMemo(() => {
    const seen = new Map()
    for (const s of submissions) {
      for (const r of s.reviews || []) {
        if (r.reviewerId) seen.set(r.reviewerId, r)
      }
    }
    return [...seen.values()]
  }, [submissions])

  // Iteration breakdown for the audit log tab.
  const iterations = useMemo(() => {
    if (!audit) return []
    const buckets = new Map()
    for (const c of audit.candidates || []) {
      const key = c.iteration_number ?? 0
      const bucket = buckets.get(key) || { iteration: key, candidates: 0, experiments: 0 }
      bucket.candidates += 1
      bucket.experiments += (c.experiments || []).length
      buckets.set(key, bucket)
    }
    return [...buckets.values()].sort((a, b) => a.iteration - b.iteration)
  }, [audit])

  const project = audit?.project || null

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-300/80">
            REVIEW & AUDIT
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Reviews on this project
          </h1>
          <p className="mt-1 text-sm text-ink-300 max-w-2xl">
            Each submission shows who reviewed and what they said. Anyone in the workspace
            (other than the submitter) can review.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusChip dot tone="emerald">Audit chain · valid</StatusChip>
          <Button
            variant="ghost"
            size="sm"
            icon={RefreshCw}
            onClick={fetchAudit}
            disabled={loading}
          >
            Refresh
          </Button>
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { id: 'reviews', label: 'Reviews' },
              { id: 'audit', label: 'Audit log' }
            ]}
          />
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-200">
          {error}
        </div>
      )}

      {tab === 'reviews' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryTile Icon={Inbox} label="Total submissions" value={counts.all} />
            <SummaryTile Icon={MessageSquare} label="Pending" value={counts.pending} accent="amber" />
            <SummaryTile Icon={ShieldCheck} label="Approved" value={counts.approved} accent="emerald" />
            <SummaryTile Icon={MessageSquare} label="Reviewers" value={reviewerSet.length} accent="cyan" />
          </div>

          <div className="surface p-3 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-400">
              FILTER
            </span>
            {STATUS_FILTERS.map((f) => (
              <Chip
                key={f.id}
                active={statusF === f.id}
                onClick={() => setStatusF(f.id)}
              >
                {f.label}
                {f.id !== 'all' && counts[f.id] > 0 && (
                  <span className="ml-1 text-[10px] font-mono opacity-70">{counts[f.id]}</span>
                )}
              </Chip>
            ))}
          </div>

          {loading && submissions.length === 0 ? (
            <div className="surface p-10 text-center text-sm text-ink-300">
              Loading reviews…
            </div>
          ) : filtered.length === 0 ? (
            <EmptyReviews allCount={submissions.length} />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {filtered.map((s) => (
                <SubmissionCard
                  key={s.id}
                  submission={s}
                  project={project}
                  showProjectLink={false}
                  defaultExpanded
                  onReviewed={fetchAudit}
                />
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'audit' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 surface p-4">
            <SectionHeading
              kicker="ITERATIONS"
              title="Discovery iterations"
              subtitle="Each row is one server-side discovery iteration; experiments are runs the lab logged against those candidates."
            />
            {loading && iterations.length === 0 ? (
              <div className="mt-4 text-[12px] text-ink-400">Loading…</div>
            ) : iterations.length === 0 ? (
              <div className="mt-4 text-[12px] text-ink-400">
                No discovery iterations yet on this project.
              </div>
            ) : (
              <ol className="mt-4 space-y-2">
                {iterations.map((it) => (
                  <li key={it.iteration} className="surface-raised p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <GitBranch className="h-3.5 w-3.5 text-cyan-300" />
                        <span className="font-mono text-cyan-200">
                          Iteration {it.iteration}
                        </span>
                        <StatusChip tone="emerald">discovery</StatusChip>
                      </div>
                      <span className="text-[11px] text-ink-400 font-mono tabular">
                        {it.candidates} candidate{it.candidates === 1 ? '' : 's'}
                        {' · '}
                        {it.experiments} experiment{it.experiments === 1 ? '' : 's'}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <aside className="space-y-4">
            <div className="surface p-4">
              <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-300/80">
                PROJECT
              </div>
              {project ? (
                <ul className="mt-2 space-y-1.5 text-[12px] text-ink-300">
                  <li>
                    <span className="text-ink-400">Name: </span>
                    <span className="text-ink-100">{project.name}</span>
                  </li>
                  {(project.reactants || project.products) && (
                    <li className="font-mono">
                      <span className="text-ink-400">Target: </span>
                      <span className="text-ink-100">
                        {project.reactants} → {project.products}
                      </span>
                    </li>
                  )}
                  {project.max_iterations != null && (
                    <li>
                      <span className="text-ink-400">Iterations: </span>
                      <span className="text-ink-100 tabular">
                        {project.iterations_used ?? 0} / {project.max_iterations}
                      </span>
                    </li>
                  )}
                  {audit && (
                    <li>
                      <span className="text-ink-400">Candidates: </span>
                      <span className="text-ink-100 tabular">
                        {audit.total_candidates}
                        {audit.unique_candidates != null
                          && audit.unique_candidates !== audit.total_candidates
                          && ` (${audit.unique_candidates} unique)`}
                      </span>
                    </li>
                  )}
                </ul>
              ) : (
                <p className="mt-2 text-[12px] text-ink-400">No project info loaded.</p>
              )}
            </div>
            <div className="surface p-4">
              <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-300/80">
                POLICY
              </div>
              <p className="mt-1 text-[12px] text-ink-300">
                At least one review is required before a submission is considered approved.
                Reviewers leave decisions and comments — both are kept for audit.
              </p>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}

function SummaryTile({ Icon, label, value, accent }) {
  const ring =
    accent === 'amber'
      ? 'ring-amber-400/30'
      : accent === 'emerald'
      ? 'ring-emerald-400/30'
      : accent === 'cyan'
      ? 'ring-cyan-400/30'
      : 'ring-ink-700/60'
  return (
    <div className={`surface p-3 ring-1 ring-inset ${ring}`}>
      <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.16em] text-ink-400">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold tabular text-ink-100">{value}</div>
    </div>
  )
}

function EmptyReviews({ allCount }) {
  return (
    <div className="surface p-10 text-center">
      <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-ink-800 ring-1 ring-cyan-400/30 text-cyan-300">
        <MessageSquare className="h-5 w-5" />
      </div>
      <h3 className="mt-3 text-base font-semibold text-ink-100">
        {allCount === 0 ? 'No submissions yet' : 'No matches for this filter'}
      </h3>
      <p className="mt-1 text-sm text-ink-300 max-w-md mx-auto">
        {allCount === 0
          ? 'Submit an experiment from the Experiments tab — it will show up here for the workspace to review.'
          : 'Try clearing the filter to see other submissions.'}
      </p>
    </div>
  )
}

import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  Check,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  X
} from 'lucide-react'
import StatusChip from '../ui/StatusChip.jsx'
import Avatar from '../ui/Avatar.jsx'
import Button from '../ui/Button.jsx'
import { useAuth } from '../../auth/AuthContext.jsx'
import { experimentApi } from '../../services/api.js'

const STATUS_TONE = {
  pending: 'amber',
  approved: 'emerald',
  rejected: 'rose',
  'changes-requested': 'amber'
}

const STATUS_LABEL = {
  pending: 'Pending review',
  approved: 'Approved',
  rejected: 'Rejected',
  'changes-requested': 'Changes requested'
}

export default function SubmissionCard({
  submission,
  project,
  showProjectLink = true,
  defaultExpanded = false,
  onReviewed
}) {
  const { user } = useAuth()
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submittedDecision, setSubmittedDecision] = useState(null)

  const reviewCount = submission.reviewCount ?? submission.reviews.length
  // Match on either id or email so the creator check is robust even when one
  // side uses UUIDs and the other carries email (user picker vs API payload).
  const isOwn = sameUser(submission.submittedBy, user)
  const alreadyReviewedByMe = submission.reviews.some(
    (r) => sameUserId(r.reviewerId, user?.id) || sameUserId(r.reviewerEmail, user?.email)
  )
  const justReviewedByMe = submittedDecision != null
  const canReview =
    !isOwn &&
    !alreadyReviewedByMe &&
    !justReviewedByMe &&
    submission.status === 'pending'

  const submitReview = async (decision) => {
    if (!user) {
      setError('Sign in to review.')
      return
    }
    if (isOwn) {
      // Defense in depth — buttons should already be disabled when isOwn.
      setError("You can't review your own submission.")
      return
    }
    if (decision !== 'approve' && !comment.trim()) {
      setError('A comment is required when rejecting or requesting changes.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await experimentApi.addReview(submission.id, {
        reviewer: user.id || user.email,
        decision: apiDecision(decision),
        comment: comment.trim()
      })
      setSubmittedDecision(decision)
      setComment('')
      onReviewed?.(submission, decision)
    } catch (err) {
      setError(err?.message || 'Failed to submit review.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[11px] text-ink-400 font-mono">
            <span>{submission.runId}</span>
            <span>·</span>
            <span>{formatTime(submission.submittedAt)}</span>
            {showProjectLink && project && (
              <>
                <span>·</span>
                <Link
                  to={`/app/projects/${project.id}/audit`}
                  className="inline-flex items-center gap-0.5 text-cyan-300 hover:underline"
                >
                  {project.name}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </>
            )}
          </div>
          <div className="mt-1 text-sm font-medium text-ink-100">
            {submission.summary}
          </div>
          {submission.candidateName && (
            <div className="mt-1 text-[12px] font-mono text-ink-300">
              {submission.candidateName}
              {submission.candidateFormula && (
                <span className="ml-2 text-ink-400">{submission.candidateFormula}</span>
              )}
            </div>
          )}
          <div className="mt-2 flex items-center gap-2">
            <Avatar
              initials={submission.submittedBy?.initials || '??'}
              tone="cyan"
              size="xs"
            />
            <span className="text-[11px] text-ink-300">
              <span className="text-ink-100">{submission.submittedBy?.name || 'Unknown'}</span> submitted
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <StatusChip dot tone={STATUS_TONE[submission.status]}>
            {STATUS_LABEL[submission.status]}
          </StatusChip>
          {reviewCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-ink-800/70 px-2 py-0.5 text-[11px] text-ink-200 ring-1 ring-ink-700">
              <MessageSquare className="h-3 w-3" />
              {reviewCount}
            </span>
          )}
        </div>
      </div>

      {submission.metrics && (
        <div className="mt-3 grid grid-cols-3 gap-1.5 text-[11px] font-mono">
          <Stat label="Yield" value={`${submission.metrics.yield ?? '—'}%`} />
          <Stat label="Selectivity" value={`${submission.metrics.selectivity ?? '—'}%`} />
          <Stat label="Stability" value={`${submission.metrics.stability ?? '—'}%`} />
        </div>
      )}

      {submission.notes && (
        <p className="mt-2 text-[12px] text-ink-300 leading-relaxed">{submission.notes}</p>
      )}

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-3 inline-flex items-center gap-1 text-[11px] text-ink-300 hover:text-cyan-300"
      >
        <ChevronRight
          className={`h-3 w-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
        />
        {reviewCount > 0
          ? `${expanded ? 'Hide' : 'Show'} ${reviewCount} review${reviewCount === 1 ? '' : 's'}`
          : expanded ? 'Hide review form' : canReview ? 'Add review' : 'View thread'}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3 border-t divider-soft pt-3">
          {submission.reviews.length === 0 && (
            <p className="text-[11px] text-ink-400">
              {reviewCount > 0
                ? `${reviewCount} review${reviewCount === 1 ? '' : 's'} on this submission — open it to see the thread.`
                : 'No reviews yet.'}
            </p>
          )}
          {submission.reviews.map((r) => (
            <ReviewItem key={r.id} review={r} />
          ))}

          {isOwn && (
            <div className="rounded-md border border-ink-700/60 bg-ink-900/50 px-3 py-2 text-[11px] text-ink-400">
              You submitted this — review actions are disabled. Wait for someone
              in the workspace to review.
            </div>
          )}

          {(alreadyReviewedByMe || justReviewedByMe) && !isOwn && (
            <div className="rounded-md border border-emerald-400/20 bg-emerald-500/5 px-3 py-2 text-[11px] text-emerald-200">
              {justReviewedByMe
                ? `Submitted — your decision (${labelFor(submittedDecision)}) has been recorded.`
                : "You've already reviewed this submission."}
            </div>
          )}

          {(canReview || isOwn) && (
            <div>
              <textarea
                rows={2}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={
                  isOwn
                    ? 'Comment field disabled — you submitted this run.'
                    : 'Comment (required for reject / request changes)'
                }
                disabled={submitting || isOwn}
                className="w-full rounded-md bg-ink-900/60 px-3 py-2 text-[12px] text-ink-100 ring-1 ring-inset ring-ink-700/60 placeholder:text-ink-500 outline-none focus:ring-cyan-400/40 disabled:opacity-60 disabled:cursor-not-allowed"
              />
              {error && (
                <div className="mt-2 text-[11px] text-rose-300">{error}</div>
              )}
              <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
                <Button
                  size="xs"
                  variant="ghost"
                  icon={X}
                  onClick={() => submitReview('reject')}
                  disabled={submitting || isOwn}
                  title={isOwn ? "You can't review your own submission" : undefined}
                >
                  Reject
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  icon={AlertCircle}
                  onClick={() => submitReview('changes')}
                  disabled={submitting || isOwn}
                  title={isOwn ? "You can't review your own submission" : undefined}
                >
                  Request changes
                </Button>
                <Button
                  size="xs"
                  variant="primary"
                  icon={Check}
                  onClick={() => submitReview('approve')}
                  disabled={submitting || isOwn}
                  title={isOwn ? "You can't review your own submission" : undefined}
                >
                  {submitting ? 'Submitting…' : 'Approve'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ReviewItem({ review }) {
  const decisionTone = {
    approve: { tone: 'emerald', label: 'Approved', Icon: Check },
    reject: { tone: 'rose', label: 'Rejected', Icon: X },
    changes: { tone: 'amber', label: 'Changes requested', Icon: AlertCircle }
  }[review.decision] || { tone: 'slate', label: review.decision, Icon: MessageSquare }

  const Icon = decisionTone.Icon

  return (
    <div className="rounded-md border border-ink-700/60 bg-ink-900/40 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Avatar initials={review.reviewerInitials} tone={decisionTone.tone} size="xs" />
          <div className="text-[11px]">
            <span className="text-ink-100 font-medium">{review.reviewerName}</span>
            <span className="text-ink-400 ml-1.5">· {formatTime(review.reviewedAt)}</span>
          </div>
        </div>
        <StatusChip tone={decisionTone.tone}>
          <Icon className="h-3 w-3" />
          <span className="ml-1">{decisionTone.label}</span>
        </StatusChip>
      </div>
      {review.comment && (
        <p className="mt-1.5 text-[12px] text-ink-200 leading-relaxed">{review.comment}</p>
      )}
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-md bg-ink-800/70 px-2.5 py-1.5 ring-1 ring-ink-700/60">
      <div className="text-[10px] uppercase text-ink-400">{label}</div>
      <div className="text-ink-100 tabular text-sm">{value}</div>
    </div>
  )
}

function sameUserId(a, b) {
  if (!a || !b) return false
  return String(a).toLowerCase() === String(b).toLowerCase()
}

function sameUser(submittedBy, user) {
  if (!submittedBy || !user) return false
  if (sameUserId(submittedBy.id, user.id)) return true
  if (sameUserId(submittedBy.email, user.email)) return true
  return false
}

function labelFor(decision) {
  if (decision === 'approve') return 'approved'
  if (decision === 'reject') return 'rejected'
  if (decision === 'changes') return 'changes requested'
  return decision || 'reviewed'
}

// The UI uses short keys ('approve' / 'reject' / 'changes'); the API expects
// 'request_changes' for the changes case.
function apiDecision(decision) {
  if (decision === 'changes') return 'request_changes'
  return decision
}

function formatTime(iso) {
  if (!iso) return ''
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


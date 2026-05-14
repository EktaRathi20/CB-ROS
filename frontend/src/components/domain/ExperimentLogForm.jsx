import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, FileText, FlaskConical, UserCheck } from 'lucide-react'
import Button from '../ui/Button.jsx'
import StatusChip from '../ui/StatusChip.jsx'
import Avatar from '../ui/Avatar.jsx'
import { useAuth } from '../../auth/AuthContext.jsx'

const OUTCOME_OPTIONS = [
  { value: 'success', label: 'Success' },
  { value: 'partial', label: 'Partial success' },
  { value: 'failure', label: 'Failure' }
]

export default function ExperimentLogForm({
  candidates,
  candidateId,
  onCandidateChange,
  onSubmit,
  lastSubmissionId,
  submitting = false,
  submitError = null
}) {
  const { user } = useAuth()
  const list = candidates || []
  const fallbackId = list[0]?.id ?? ''
  const [internalId, setInternalId] = useState(candidateId ?? fallbackId)

  useEffect(() => {
    if (candidateId && candidateId !== internalId) setInternalId(candidateId)
  }, [candidateId])

  const setCandidate = (id) => {
    setInternalId(id)
    onCandidateChange?.(id)
  }

  const [actualScore, setActualScore] = useState(84)
  const [outcome, setOutcome] = useState('success')
  const [observations, setObservations] = useState(
    'Run conducted at the project conditions. Steady-state reached at t = 26 min.'
  )

  const candidate = useMemo(
    () => list.find((c) => c.id === internalId) || null,
    [list, internalId]
  )

  // The candidate carries its own predicted score (0..1 from the API mapper,
  // 0..100 for legacy local candidates). Show it read-only so the user knows
  // what the prediction was — server uses the candidate's value either way.
  const predictedDisplay = useMemo(() => {
    if (!candidate) return null
    if (typeof candidate.predictedScore === 'number') {
      return Math.round(candidate.predictedScore * 100)
    }
    if (typeof candidate.score === 'number') return Math.round(candidate.score)
    return null
  }, [candidate])

  const justSubmitted = lastSubmissionId !== undefined && lastSubmissionId !== null

  const handleSubmit = () => {
    if (!candidate || submitting) return
    onSubmit?.({
      candidate,
      actualScore,
      outcome,
      observations
    })
  }

  return (
    <div className="surface p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-300/80">
            EXPERIMENT LOG
          </div>
          <h3 className="mt-1 text-base font-semibold text-ink-100">Record lab outcome</h3>
        </div>
        {justSubmitted ? (
          <StatusChip dot tone="emerald">Submitted for review</StatusChip>
        ) : (
          <StatusChip dot tone="amber">Draft · unverified</StatusChip>
        )}
      </div>

      <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Field label="Candidate" hint="Linked to lineage; pinned at submission." full>
          <select
            value={internalId}
            onChange={(e) => setCandidate(e.target.value)}
            className="input"
          >
            {list.map((c) => (
              <option key={c.id} value={c.id}>{c.name} — {c.formula}</option>
            ))}
          </select>
        </Field>

        <Field label="Predicted score" hint="From the candidate's prediction — read-only.">
          <div className="flex items-center gap-2">
            <input
              className="input flex-1 font-mono"
              value={predictedDisplay != null ? `${predictedDisplay}` : '—'}
              readOnly
            />
            <span className="text-xs font-mono text-ink-300 w-8">%</span>
          </div>
          <div className="mt-2 h-1 w-full rounded-full bg-ink-800 overflow-hidden">
            <div
              className="h-full bar-cyan"
              style={{ width: `${Math.min(100, predictedDisplay ?? 0)}%` }}
            />
          </div>
        </Field>

        <NumberField
          label="Actual score (measured)"
          unit="%"
          value={actualScore}
          onChange={setActualScore}
          hint="What the lab actually saw — sent as actualScore."
        />

        <Field label="Outcome" hint="How did the run land vs. the prediction?">
          <select
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            className="input"
          >
            {OUTCOME_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Field>

        <Field
          label="Observations"
          full
          hint="Free-form notes — conditions, side-products, instrument output, anything worth recording."
        >
          <textarea
            rows={5}
            className="input"
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
          />
        </Field>

        <Field label="Submitting as" full hint="Anyone in the workspace (other than you) can review the submission.">
          <div className="flex items-center gap-2 rounded-md bg-ink-900/60 px-3 py-2 ring-1 ring-inset ring-ink-700/60">
            <Avatar initials={user?.initials || 'DU'} tone="cyan" size="xs" />
            <span className="text-sm text-ink-100">{user?.name || 'Demo User'}</span>
          </div>
        </Field>
      </div>

      {submitError && (
        <div className="mt-4 rounded-md border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-200">
          {submitError}
        </div>
      )}

      <div className="mt-5 flex items-center justify-between border-t divider-soft pt-4">
        <div className="flex items-center gap-2 text-[11px] text-ink-400 font-mono">
          <FileText className="h-3.5 w-3.5" />
          Audit trail: every edit is permanently logged.
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" icon={FlaskConical} type="button" disabled={submitting}>
            Save draft
          </Button>
          <Button
            variant="primary"
            icon={justSubmitted ? CheckCircle2 : UserCheck}
            onClick={handleSubmit}
            type="button"
            disabled={!candidate || submitting}
          >
            {submitting
              ? 'Submitting…'
              : justSubmitted
              ? 'Submit another'
              : 'Submit for review'}
          </Button>
        </div>
      </div>

      <style>{`
        .input {
          width: 100%;
          background: rgba(13,19,30,0.7);
          border: 1px solid rgba(91,107,138,0.22);
          border-radius: 8px;
          padding: 8px 10px;
          font-size: 13px;
          color: #DDE5F2;
          outline: none;
          transition: border-color .15s, box-shadow .15s;
        }
        .input:focus { border-color: rgba(34,211,238,0.5); box-shadow: 0 0 0 3px rgba(34,211,238,0.12); }
        .input[readonly] { opacity: 0.85; cursor: not-allowed; }
      `}</style>
    </div>
  )
}

function Field({ label, hint, children, full }) {
  return (
    <div className={full ? 'lg:col-span-2' : ''}>
      <label className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-400">{label}</label>
      <div className="mt-1.5">{children}</div>
      {hint && <div className="mt-1 text-[11px] text-ink-400">{hint}</div>}
    </div>
  )
}

function NumberField({ label, value, unit, onChange, hint }) {
  return (
    <Field label={label} hint={hint}>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="input flex-1 font-mono"
        />
        <span className="text-xs font-mono text-ink-300 w-8">{unit}</span>
      </div>
      <div className="mt-2 h-1 w-full rounded-full bg-ink-800 overflow-hidden">
        <div className="h-full bar-cyan" style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </Field>
  )
}

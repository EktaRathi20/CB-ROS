import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import Button from '../ui/Button.jsx'

export default function CustomCandidateForm({
  open,
  onClose,
  onCreate,
  submitting = false,
  submitError = null
}) {
  const [formula, setFormula] = useState('')
  const [activity, setActivity] = useState(70)
  const [predictedScore, setPredictedScore] = useState(75)
  const [stability, setStability] = useState(70)
  const [confidence, setConfidence] = useState(85)
  const [activationEnergy, setActivationEnergy] = useState(65)
  const [operatingTemp, setOperatingTemp] = useState('')
  const [operatingPressure, setOperatingPressure] = useState('')
  const [reasoning, setReasoning] = useState('')
  const [error, setError] = useState('')

  if (!open) return null

  const reset = () => {
    setFormula('')
    setActivity(70)
    setPredictedScore(75)
    setStability(70)
    setConfidence(85)
    setActivationEnergy(65)
    setOperatingTemp('')
    setOperatingPressure('')
    setReasoning('')
    setError('')
  }

  const submit = (e) => {
    e.preventDefault()
    if (!formula.trim()) {
      setError('Formula is required.')
      return
    }
    setError('')
    // Pass UI values to the parent. The parent shapes & posts the API body.
    onCreate(
      {
        formula: formula.trim(),
        activity,
        predictedScore,
        stability,
        confidence,
        activationEnergy: Number(activationEnergy) || 0,
        operatingTemp: operatingTemp.trim(),
        operatingPressure: operatingPressure.trim(),
        reasoning: reasoning.trim()
      },
      { reset }
    )
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm"
        onClick={submitting ? undefined : onClose}
      />
      <form
        onSubmit={submit}
        className="relative surface-raised w-full max-w-2xl border border-ink-700/60 shadow-panel"
      >
        <div className="flex items-center justify-between border-b divider-soft px-5 py-3">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-300/80">
              ADD YOUR OWN
            </div>
            <h3 className="mt-0.5 text-base font-semibold text-ink-100">
              Custom candidate
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="grid h-7 w-7 place-items-center rounded-md text-ink-300 hover:bg-ink-800/60 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Formula *" full>
            <input
              className="cinput font-mono"
              value={formula}
              onChange={(e) => setFormula(e.target.value)}
              placeholder="e.g. Pt-CeO2/Al2O3"
              disabled={submitting}
            />
          </Field>

          <SliderField
            label="Activity"
            value={activity}
            onChange={setActivity}
            disabled={submitting}
          />
          <SliderField
            label="Predicted score"
            value={predictedScore}
            onChange={setPredictedScore}
            disabled={submitting}
          />
          <SliderField
            label="Stability"
            value={stability}
            onChange={setStability}
            disabled={submitting}
          />
          <SliderField
            label="Confidence"
            value={confidence}
            onChange={setConfidence}
            disabled={submitting}
          />

          <Field label="Activation energy">
            <div className="flex items-center gap-2">
              <input
                type="number"
                className="cinput flex-1 font-mono"
                value={activationEnergy}
                onChange={(e) => setActivationEnergy(e.target.value)}
                disabled={submitting}
              />
              <span className="text-[11px] font-mono text-ink-300">kJ/mol</span>
            </div>
          </Field>
          <Field label="Operating T">
            <input
              className="cinput font-mono"
              value={operatingTemp}
              onChange={(e) => setOperatingTemp(e.target.value)}
              placeholder="e.g. 240C"
              disabled={submitting}
            />
          </Field>
          <Field label="Operating P" full>
            <input
              className="cinput font-mono"
              value={operatingPressure}
              onChange={(e) => setOperatingPressure(e.target.value)}
              placeholder="e.g. 50 bar"
              disabled={submitting}
            />
          </Field>

          <Field label="Reasoning" full>
            <textarea
              rows={3}
              className="cinput"
              value={reasoning}
              onChange={(e) => setReasoning(e.target.value)}
              placeholder="Why this candidate is interesting; supporting references…"
              disabled={submitting}
            />
          </Field>
        </div>

        {(error || submitError) && (
          <div className="mx-5 mb-3 rounded-md border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-200">
            {error || submitError}
          </div>
        )}

        <div className="flex items-center justify-between border-t divider-soft px-5 py-3">
          <p className="text-[11px] text-ink-400">
            Custom candidates are tagged{' '}
            <span className="text-amber-300">User-defined</span> on the server.
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              icon={Plus}
              disabled={submitting}
            >
              {submitting ? 'Adding…' : 'Add candidate'}
            </Button>
          </div>
        </div>

        <style>{`
          .cinput {
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
          .cinput:focus { border-color: rgba(34,211,238,0.5); box-shadow: 0 0 0 3px rgba(34,211,238,0.12); }
          .cinput:disabled { opacity: 0.6; cursor: not-allowed; }
        `}</style>
      </form>
    </div>
  )
}

function Field({ label, children, full }) {
  return (
    <div className={full ? 'md:col-span-2' : ''}>
      <label className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-400">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
    </div>
  )
}

function SliderField({ label, value, onChange, disabled }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1"
          disabled={disabled}
        />
        <input
          type="number"
          min={0}
          max={100}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="cinput w-20 font-mono"
          disabled={disabled}
        />
        <span className="text-[11px] font-mono text-ink-300">%</span>
      </div>
    </Field>
  )
}

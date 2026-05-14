import { useEffect, useRef, useState } from 'react'
import { ArrowRight, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import Button from '../ui/Button.jsx'

const advancedFields = [
  { key: 'temperature', label: 'Temperature',     placeholder: 'e.g. 240°C' },
  { key: 'pressure',    label: 'Pressure',        placeholder: 'e.g. 50 bar' },
  { key: 'catalyst',    label: 'Catalyst class',  placeholder: 'e.g. Mixed oxide' },
  { key: 'h2Source',    label: 'H₂ source',       placeholder: 'e.g. Green H₂' },
  { key: 'solvent',     label: 'Solvent',         placeholder: 'e.g. Gas-phase' },
  { key: 'flow',        label: 'Flow / GHSV',     placeholder: 'e.g. 12 000 h⁻¹' }
]

export default function ReactionInputPanel({ initial, onRun, running = false }) {
  const [reactants, setReactants] = useState(initial?.reactants ?? '')
  const [products, setProducts] = useState(initial?.products ?? '')
  const [advanced, setAdvanced] = useState({
    temperature: initial?.temperature ?? '',
    pressure: initial?.pressure ?? '',
    catalyst: '',
    h2Source: '',
    solvent: '',
    flow: ''
  })
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [count, setCount] = useState(5)

  // The project loads asynchronously, so `initial` arrives one render after
  // mount. Mirror it into local state on first arrival, and again whenever the
  // project's reaction definition itself changes (e.g. after an Edit).
  // Don't clobber user edits made between syncs — track the last-seen initial
  // and only sync when it actually changes.
  const lastInitialRef = useRef(null)
  useEffect(() => {
    if (!initial) return
    const key = JSON.stringify({
      r: initial.reactants,
      p: initial.products,
      t: initial.temperature,
      pr: initial.pressure
    })
    if (lastInitialRef.current === key) return
    lastInitialRef.current = key

    if (initial.reactants != null) setReactants(initial.reactants)
    if (initial.products != null) setProducts(initial.products)
    setAdvanced((cur) => ({
      ...cur,
      temperature: initial.temperature ?? cur.temperature,
      pressure: initial.pressure ?? cur.pressure
    }))
  }, [initial])

  const triggerRun = () => {
    onRun?.({
      count: Math.max(1, Math.min(50, Number(count) || 1)),
      reactants,
      products,
      reactionInput: `${reactants || ''} -> ${products || ''}`.trim(),
      conditions: {
        ...(advanced.temperature ? { temp: advanced.temperature } : {}),
        ...(advanced.pressure ? { pressure: advanced.pressure } : {})
      },
      advanced
    })
  }

  return (
    <div className="surface p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-300/80">REACTION INPUT</div>
          <h3 className="mt-1 text-base font-semibold text-ink-100">Define your target reaction</h3>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-[11px] font-mono text-ink-400">
            COUNT
            <input
              type="number"
              min={1}
              max={50}
              value={count}
              onChange={(e) => setCount(e.target.value)}
              disabled={running}
              className="w-16 rounded-md bg-ink-900/60 px-2 py-1 text-sm text-ink-100 ring-1 ring-inset ring-ink-700/60 outline-none focus:ring-cyan-400/40 font-mono disabled:opacity-60"
            />
          </label>
          <Button
            variant="primary"
            size="sm"
            icon={Sparkles}
            onClick={triggerRun}
            disabled={running}
          >
            {running ? 'Running…' : 'Run discovery'}
          </Button>
        </div>
      </div>

      {/* Reactants → Products as plain text fields */}
      <div className="mt-5 grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] items-end gap-3">
        <Field label="Reactants" hint="Free-form text. e.g. CO₂ + H₂">
          <input
            type="text"
            value={reactants}
            onChange={(e) => setReactants(e.target.value)}
            placeholder="CO₂ + H₂"
            className={inputCls}
          />
        </Field>

        <div className="hidden lg:flex items-center justify-center pb-1.5">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-ink-800 ring-1 ring-cyan-400/30 text-cyan-300">
            <ArrowRight className="h-4 w-4" />
          </div>
        </div>

        <Field label="Products" hint="Free-form text. e.g. CH₃OH + H₂O">
          <input
            type="text"
            value={products}
            onChange={(e) => setProducts(e.target.value)}
            placeholder="CH₃OH + H₂O"
            className={inputCls}
          />
        </Field>
      </div>

      {/* Advanced inputs toggle */}
      <div className="mt-4">
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] text-ink-300 hover:text-cyan-300"
        >
          {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {showAdvanced ? 'Hide' : 'Show'} advanced inputs
          <span className="text-[10px] font-mono text-ink-400">(optional)</span>
        </button>

        {showAdvanced && (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {advancedFields.map((f) => (
              <Field key={f.key} label={f.label}>
                <input
                  type="text"
                  value={advanced[f.key]}
                  onChange={(e) => setAdvanced({ ...advanced, [f.key]: e.target.value })}
                  placeholder={f.placeholder}
                  className={inputCls}
                />
              </Field>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const inputCls =
  'w-full rounded-md bg-ink-900/60 px-3 py-2 text-sm text-ink-100 ring-1 ring-inset ring-ink-700/60 placeholder:text-ink-500 outline-none focus:ring-cyan-400/40 font-mono'

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-400">{label}</label>
      <div className="mt-1.5">{children}</div>
      {hint && <div className="mt-1 text-[10px] text-ink-500">{hint}</div>}
    </div>
  )
}
